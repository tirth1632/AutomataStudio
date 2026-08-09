import type { DFA } from '../types/dfa';
import type { AutomatonGraph, AutomatonTransition, GeneratedAutomatonResult } from '../types/automata';
import { applyDagreLayout } from '../services/layoutEngine';

/**
 * Converts an AutomatonGraph into a pure DFA interface structure.
 */
export function graphToDFA(graph: AutomatonGraph): DFA {
  const alphabet = graph.alphabet && graph.alphabet.length > 0 ? graph.alphabet : ['0', '1'];
  const states = graph.states.map((s) => s.id);
  const startState = graph.states.find((s) => s.isStart)?.id || (states[0] || 'q0');
  const acceptStates = graph.states.filter((s) => s.isAccept).map((s) => s.id);

  const transitions: { [state: string]: { [symbol: string]: string } } = {};
  states.forEach((s) => {
    transitions[s] = {};
  });

  graph.transitions.forEach((t) => {
    if (!transitions[t.source]) transitions[t.source] = {};
    t.symbols.forEach((sym) => {
      transitions[t.source][sym] = t.target;
    });
  });

  return {
    alphabet,
    states,
    startState,
    acceptStates,
    transitions,
  };
}

export function formatStateLabel(id: string): string {
  if (!id) return id;
  if (!id.includes('(') && !id.includes(')')) return id;
  const matches = id.match(/[A-Za-z0-9_]+/g);
  if (matches && matches.length > 0) {
    const unique = Array.from(new Set(matches));
    if (unique.length === 1) return unique[0];
    return `(${unique.join(', ')})`;
  }
  return id;
}

/**
 * Converts a pure DFA interface instance into an AutomatonGraph with Dagre auto-layout.
 */
export function dfaToGraph(dfa: DFA, name = 'Generated DFA'): AutomatonGraph {
  const states = dfa.states.map((id) => ({
    id,
    label: formatStateLabel(id),
    x: 0,
    y: 0,
    isStart: id === dfa.startState,
    isAccept: dfa.acceptStates.includes(id),
  }));

  const transitionMap = new Map<string, { source: string; target: string; symbols: Set<string> }>();

  for (const src of dfa.states) {
    const srcTransitions = dfa.transitions[src] || {};
    for (const [sym, tgt] of Object.entries(srcTransitions)) {
      const key = `${src}__${tgt}`;
      if (!transitionMap.has(key)) {
        transitionMap.set(key, { source: src, target: tgt, symbols: new Set([sym]) });
      } else {
        transitionMap.get(key)!.symbols.add(sym);
      }
    }
  }

  const transitions: AutomatonTransition[] = Array.from(transitionMap.values()).map((t, idx) => ({
    id: `t_${t.source}_${t.target}_${idx}`,
    source: t.source,
    target: t.target,
    symbols: Array.from(t.symbols).sort(),
  }));

  const rawGraph: AutomatonGraph = {
    id: `dfa_${Date.now()}`,
    name,
    type: 'DFA',
    alphabet: [...dfa.alphabet],
    states,
    transitions,
    description: `Complete DFA with ${dfa.states.length} states.`,
  };

  return applyDagreLayout(rawGraph);
}

function getSampleStringsForDFA(dfa: DFA): { accepted: string[]; rejected: string[] } {
  const accepted: string[] = [];
  const rejected: string[] = [];
  const alphabet = dfa.alphabet.length > 0 ? dfa.alphabet : ['0', '1'];

  const queue: string[] = [''];
  const visited = new Set<string>();

  while (queue.length > 0 && (accepted.length < 3 || rejected.length < 3)) {
    const curr = queue.shift()!;
    if (visited.has(curr)) continue;
    visited.add(curr);

    let state = dfa.startState;
    let isValid = true;
    for (const char of curr) {
      if (dfa.transitions[state] && dfa.transitions[state][char] !== undefined) {
        state = dfa.transitions[state][char];
      } else {
        isValid = false;
        break;
      }
    }

    if (isValid) {
      const isAcc = dfa.acceptStates.includes(state);
      if (isAcc) {
        if (accepted.length < 3) accepted.push(curr);
      } else {
        if (rejected.length < 3) rejected.push(curr);
      }
    }

    if (curr.length < 5 && visited.size < 128) {
      for (const sym of alphabet) {
        queue.push(curr + sym);
      }
    }
  }

  return {
    accepted: accepted.length > 0 ? accepted : ['0'],
    rejected: rejected.length > 0 ? rejected : ['1'],
  };
}

/**
 * Wraps a DFA interface into a complete GeneratedAutomatonResult.
 */
export function dfaToGeneratedResult(dfa: DFA, prompt: string): GeneratedAutomatonResult {
  const graph = dfaToGraph(dfa, prompt);

  const stateDescriptions: Record<string, string> = {};
  dfa.states.forEach((s) => {
    stateDescriptions[s] = s === dfa.startState ? 'Start State' : dfa.acceptStates.includes(s) ? 'Accept State' : 'State';
  });

  const transitionTable: Array<{ state: string; [symbol: string]: string }> = dfa.states.map((st) => {
    const row: { state: string; [symbol: string]: string } = { state: st };
    dfa.alphabet.forEach((sym) => {
      row[sym] = dfa.transitions[st]?.[sym] || '-';
    });
    return row;
  });

  const { accepted, rejected } = getSampleStringsForDFA(dfa);

  return {
    graph,
    explanation: `Deterministically generated complete DFA for "${prompt}". Contains ${dfa.states.length} states and ${dfa.states.length * dfa.alphabet.length} transitions over alphabet {${dfa.alphabet.join(', ')}}.`,
    stateDescriptions,
    transitionTable,
    acceptedSamples: accepted,
    rejectedSamples: rejected,
  };
}
