import type { AutomatonGraph, AutomatonState, AutomatonTransition } from '../types/automata';
import { applyDagreLayout, sanitizeGraphTransitions } from '../services/layoutEngine';

/**
 * Normalizes and validates any JSON data into a valid, well-formed AutomatonGraph.
 * Returns null if the data cannot be parsed into a valid graph.
 */
export function normalizeAutomatonGraph(inputData: any): AutomatonGraph | null {
  if (!inputData) return null;

  let raw: any = inputData;

  // Handle string input
  if (typeof raw === 'string') {
    try {
      raw = JSON.parse(raw);
    } catch {
      return null;
    }
  }

  if (typeof raw !== 'object' || raw === null) return null;

  // Unwrap nested graph objects up to 5 levels deep (handles { graph: { ... } }, { version, graph: ... }, etc.)
  let depth = 0;
  while (depth < 5) {
    if (raw.graph && typeof raw.graph === 'object' && !Array.isArray(raw.graph)) {
      raw = raw.graph;
      depth++;
    } else if (raw.automaton && typeof raw.automaton === 'object' && !Array.isArray(raw.automaton)) {
      raw = raw.automaton;
      depth++;
    } else if (raw.dfa && typeof raw.dfa === 'object' && !Array.isArray(raw.dfa)) {
      raw = raw.dfa;
      depth++;
    } else if (raw.nfa && typeof raw.nfa === 'object' && !Array.isArray(raw.nfa)) {
      raw = raw.nfa;
      depth++;
    } else {
      break;
    }
  }

  // Extract raw states
  const rawStates: any[] = Array.isArray(raw.states)
    ? raw.states
    : Array.isArray(raw.nodes)
    ? raw.nodes
    : Array.isArray(raw.Q)
    ? raw.Q
    : [];

  if (rawStates.length === 0) {
    return {
      id: typeof raw.id === 'string' ? raw.id : `graph_${Date.now()}`,
      name: typeof raw.name === 'string' ? raw.name : 'Empty Automaton',
      type: raw.type === 'NFA' || raw.type === 'ENFA' ? raw.type : 'DFA',
      alphabet: Array.isArray(raw.alphabet) ? raw.alphabet : ['0', '1'],
      states: [],
      transitions: [],
    };
  }

  const startStateId =
    raw.startState !== undefined
      ? raw.startState
      : raw.start_state !== undefined
      ? raw.start_state
      : raw.q0 !== undefined
      ? raw.q0
      : raw.initialState !== undefined
      ? raw.initialState
      : raw.initial_state !== undefined
      ? raw.initial_state
      : null;

  const acceptStateIdsRaw =
    raw.acceptStates ||
    raw.accept_states ||
    raw.F ||
    raw.finalStates ||
    raw.final_states ||
    [];

  const acceptStateSet = new Set<string>(
    Array.isArray(acceptStateIdsRaw) ? acceptStateIdsRaw.map(String) : []
  );

  const stateIdSet = new Set<string>();

  // Process & normalize states
  const states: AutomatonState[] = rawStates.map((s, idx) => {
    let id = `q${idx}`;
    let label = `q${idx}`;
    let isStart = idx === 0;
    let isAccept = false;
    let x = 0;
    let y = 0;

    if (typeof s === 'string' || typeof s === 'number') {
      id = String(s);
      label = String(s);
    } else if (typeof s === 'object' && s !== null) {
      id = String(s.id || s.name || s.key || `q${idx}`);
      label = String(s.label || s.name || id);
      x = typeof s.x === 'number' && !isNaN(s.x) ? s.x : 0;
      y = typeof s.y === 'number' && !isNaN(s.y) ? s.y : 0;

      if (typeof s.isStart === 'boolean') isStart = s.isStart;
      else if (typeof s.isInitial === 'boolean') isStart = s.isInitial;

      if (typeof s.isAccept === 'boolean') isAccept = s.isAccept;
      else if (typeof s.isFinal === 'boolean') isAccept = s.isFinal;
    }

    if (startStateId !== null && startStateId !== undefined) {
      isStart = String(startStateId) === id;
    }
    if (acceptStateSet.size > 0) {
      if (acceptStateSet.has(id)) isAccept = true;
    }

    stateIdSet.add(id);

    return {
      id,
      label,
      isStart,
      isAccept,
      x,
      y,
    };
  });

  // Ensure at least one start state exists
  if (!states.some((s) => s.isStart) && states.length > 0) {
    states[0].isStart = true;
  }

  // Extract raw transitions
  const rawTransitions: any[] = Array.isArray(raw.transitions)
    ? raw.transitions
    : Array.isArray(raw.edges)
    ? raw.edges
    : Array.isArray(raw.delta)
    ? raw.delta
    : Array.isArray(raw.transitionTable)
    ? raw.transitionTable
    : [];

  const transitions: AutomatonTransition[] = [];

  rawTransitions.forEach((t, idx) => {
    if (!t || typeof t !== 'object') return;

    const source = String(t.source || t.from || t.start || t.src || '');
    const target = String(t.target || t.to || t.end || t.dst || '');

    if (!source || !target || !stateIdSet.has(source) || !stateIdSet.has(target)) {
      return;
    }

    let symbolsRaw = t.symbols !== undefined ? t.symbols : (t.symbol !== undefined ? t.symbol : (t.label !== undefined ? t.label : (t.read !== undefined ? t.read : (t.input !== undefined ? t.input : t.char))));

    let symbolList: string[] = [];
    if (Array.isArray(symbolsRaw)) {
      symbolList = symbolsRaw.map(String).map((sym) => sym.trim());
    } else if (typeof symbolsRaw === 'string') {
      symbolList = symbolsRaw.split(/[,|]/).map((sym) => sym.trim());
    } else if (typeof symbolsRaw === 'number') {
      symbolList = [String(symbolsRaw)];
    }

    symbolList = symbolList.filter((sym) => sym.length > 0);
    if (symbolList.length === 0) {
      symbolList = ['ε'];
    }

    const id = String(t.id || `t_${source}_${target}_${idx}`);

    transitions.push({
      id,
      source,
      target,
      symbols: symbolList,
    });
  });

  // Determine alphabet
  let alphabet: string[] = [];
  if (Array.isArray(raw.alphabet) && raw.alphabet.length > 0) {
    alphabet = raw.alphabet.map(String);
  } else if (Array.isArray(raw.Sigma) && raw.Sigma.length > 0) {
    alphabet = raw.Sigma.map(String);
  } else {
    const symSet = new Set<string>();
    transitions.forEach((t) => t.symbols.forEach((sym) => symSet.add(sym)));
    symSet.delete('ε');
    symSet.delete('');
    alphabet = Array.from(symSet).sort();
    if (alphabet.length === 0) alphabet = ['0', '1'];
  }

  // Determine type
  let type: 'DFA' | 'NFA' = 'DFA';
  if (raw.type === 'NFA' || raw.type === 'ENFA' || raw.type === 'NFA-ε') {
    type = 'NFA';
  } else {
    const hasEpsilon = transitions.some((t) => t.symbols.some((sym) => sym === 'ε' || sym === ''));
    if (hasEpsilon) {
      type = 'NFA';
    } else {
      const seen = new Set<string>();
      for (const t of transitions) {
        for (const sym of t.symbols) {
          const key = `${t.source}__${sym}`;
          if (seen.has(key)) {
            type = 'NFA';
            break;
          }
          seen.add(key);
        }
      }
    }
  }

  const resultGraph: AutomatonGraph = {
    id: String(raw.id || `graph_${Date.now()}`),
    name: String(raw.name || 'Imported Automaton'),
    type,
    alphabet,
    states,
    transitions,
  };

  const allZeroCoords = states.every((s) => s.x === 0 && s.y === 0);
  const graphWithLayout = allZeroCoords ? applyDagreLayout(resultGraph) : sanitizeGraphTransitions(resultGraph);

  return graphWithLayout;
}
