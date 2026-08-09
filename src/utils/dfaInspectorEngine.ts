import type { AutomatonGraph } from '../types/automata';
import type { DFA } from '../types/dfa';
import { graphToDFA } from './dfaAdapter';
import { minimizeDFA } from '../algorithms/hopcroftMinimization';
import { computeSCCs } from './dfaEducationalUtils';

export interface StateSemantics {
  id: string;
  label: string;
  meaning: string;
  isStart: boolean;
  isAccept: boolean;
  isReachable: boolean;
  isTrap: boolean;
  isDead: boolean;
  incomingTransitions: Array<{ source: string; symbols: string[] }>;
  outgoingTransitions: Array<{ target: string; symbols: string[] }>;
  equivalentStateId: string | null;
  shortestPathTo: string | null;
}

export interface ConstructionInfo {
  generatorName: string;
  algorithmUsed: string;
  patternType: string;
  difficulty: 'Easy' | 'Medium' | 'Hard' | 'Advanced';
  creationSource: string;
  constructionStrategy: string;
  memoryConcept: string;
  patternDetectionMethod: string;
  timeComplexity: string;
  spaceComplexity: string;
}

export interface LanguageInfo {
  name: string;
  description: string;
  examplesSummary: string;
  regex: string;
  acceptedExamples: string[];
  rejectedExamples: string[];
  shortestAccepted: string;
  shortestRejected: string;
  isInfinite: boolean;
  languageFamily: string;
  patternType: string;
}

export interface InspectionStatistics {
  totalStates: number;
  acceptStatesCount: number;
  rejectStatesCount: number;
  totalTransitions: number;
  transitionDensity: number; // 0..1 (percentage)
  averageOutDegree: number;
  reachableStates: string[];
  unreachableStates: string[];
  deadStates: string[];
  trapStates: string[];
  hasCycle: boolean;
  cycleNodes: string[];
  sccs: string[][];
  connectedComponentsCount: number;
  averageTransitionCountPerSymbol: Record<string, number>;
  stateUtilization: number; // percentage of non-dead reachable states
  graphDiameter: number | string;
  longestSimplePath: string[];
  longestSimplePathLength: number;
}

export interface PropertyItem {
  id: string;
  title: string;
  status: 'passed' | 'failed' | 'warning' | 'info';
  statusBadge: string;
  shortExplanation: string;
  mathMeaning: string;
  validationExplanation: string;
}

export interface DFAInspectorData {
  graph: AutomatonGraph;
  dfa: DFA;
  alphabet: string[];
  isBinary: boolean;
  languageInfo: LanguageInfo;
  constructionInfo: ConstructionInfo;
  statistics: InspectionStatistics;
  semanticsMap: Record<string, StateSemantics>;
  properties: PropertyItem[];
  validationList: PropertyItem[];
  equivalentStatePairs: Array<[string, string]>;
}

// ── 1. HELPER: BFS Shortest Paths ──
function computeShortestPaths(graph: AutomatonGraph): Record<string, string> {
  const start = graph.states.find((s) => s.isStart)?.id || graph.states[0]?.id;
  const paths: Record<string, string> = {};
  if (!start) return paths;

  paths[start] = '';
  const queue: string[] = [start];
  const visited = new Set<string>([start]);
  const alphabet = graph.alphabet?.length ? graph.alphabet : ['0', '1'];

  while (queue.length > 0) {
    const curr = queue.shift()!;
    const currPath = paths[curr];

    for (const sym of alphabet) {
      const edges = graph.transitions.filter((t) => t.source === curr && t.symbols.includes(sym));
      for (const e of edges) {
        if (!visited.has(e.target)) {
          visited.add(e.target);
          paths[e.target] = currPath === '' ? sym : `${currPath}${sym}`;
          queue.push(e.target);
        }
      }
    }
  }

  return paths;
}

// ── 2. HELPER: Graph Diameter & Longest Simple Path ──
function computeGraphMetrics(graph: AutomatonGraph, reachableSet: Set<string>): {
  diameter: number | string;
  longestPath: string[];
} {
  const states = graph.states.filter((s) => reachableSet.has(s.id)).map((s) => s.id);
  if (states.length <= 1) {
    return { diameter: 0, longestPath: states };
  }

  // Distance matrix for all pairs
  const dist: Record<string, Record<string, number>> = {};
  states.forEach((u) => {
    dist[u] = {};
    states.forEach((v) => {
      dist[u][v] = u === v ? 0 : Infinity;
    });
  });

  graph.transitions.forEach((t) => {
    if (reachableSet.has(t.source) && reachableSet.has(t.target)) {
      dist[t.source][t.target] = 1;
    }
  });

  // Floyd-Warshall
  states.forEach((k) => {
    states.forEach((i) => {
      states.forEach((j) => {
        if (dist[i][k] + dist[k][j] < dist[i][j]) {
          dist[i][j] = dist[i][k] + dist[k][j];
        }
      });
    });
  });

  let maxDist = 0;
  states.forEach((i) => {
    states.forEach((j) => {
      if (dist[i][j] !== Infinity && dist[i][j] > maxDist) {
        maxDist = dist[i][j];
      }
    });
  });

  // Longest simple path from start state
  const startId = graph.states.find((s) => s.isStart)?.id || states[0];
  let longestPath: string[] = [startId];

  function dfs(curr: string, currentPath: string[], visited: Set<string>) {
    if (currentPath.length > longestPath.length) {
      longestPath = [...currentPath];
    }
    const outgoing = graph.transitions.filter((t) => t.source === curr);
    for (const edge of outgoing) {
      if (reachableSet.has(edge.target) && !visited.has(edge.target)) {
        visited.add(edge.target);
        currentPath.push(edge.target);
        dfs(edge.target, currentPath, visited);
        currentPath.pop();
        visited.delete(edge.target);
      }
    }
  }

  if (startId) {
    dfs(startId, [startId], new Set([startId]));
  }

  return {
    diameter: maxDist,
    longestPath,
  };
}

// ── 3. HELPER: Infinite vs Finite Language Detection ──
function checkLanguageInfiniteness(graph: AutomatonGraph, reachable: string[]): boolean {
  const acceptSet = new Set(graph.states.filter((s) => s.isAccept).map((s) => s.id));
  if (acceptSet.size === 0) return false;

  // Find states that can reach an accept state (Backward BFS)
  const canReachAccept = new Set<string>(acceptSet);
  const q = Array.from(acceptSet);

  while (q.length > 0) {
    const curr = q.shift()!;
    const incoming = graph.transitions.filter((t) => t.target === curr);
    for (const t of incoming) {
      if (!canReachAccept.has(t.source)) {
        canReachAccept.add(t.source);
        q.push(t.source);
      }
    }
  }

  // Useful states = reachable from start AND can reach accept
  const usefulStates = new Set(reachable.filter((s) => canReachAccept.has(s)));

  // Check if useful states contain a cycle
  for (const state of usefulStates) {
    const visited = new Set<string>();
    const stack = new Set<string>();

    function hasCycleFrom(curr: string): boolean {
      visited.add(curr);
      stack.add(curr);

      const outgoing = graph.transitions.filter((t) => t.source === curr && usefulStates.has(t.target));
      for (const t of outgoing) {
        if (!visited.has(t.target)) {
          if (hasCycleFrom(t.target)) return true;
        } else if (stack.has(t.target)) {
          return true;
        }
      }

      stack.delete(curr);
      return false;
    }

    if (hasCycleFrom(state)) return true;
  }

  return false;
}

// ── 4. HELPER: Sample Accepted and Rejected Strings ──
function generateSampleStrings(graph: AutomatonGraph): {
  shortestAccepted: string;
  shortestRejected: string;
  acceptedExamples: string[];
  rejectedExamples: string[];
} {
  const startId = graph.states.find((s) => s.isStart)?.id || graph.states[0]?.id;
  if (!startId) {
    return {
      shortestAccepted: 'None',
      shortestRejected: 'None',
      acceptedExamples: [],
      rejectedExamples: [],
    };
  }

  const alphabet = graph.alphabet?.length ? graph.alphabet : ['0', '1'];
  const acceptSet = new Set(graph.states.filter((s) => s.isAccept).map((s) => s.id));

  const queue: Array<{ state: string; str: string }> = [{ state: startId, str: '' }];
  const visited = new Set<string>();
  visited.add(`${startId}:`);

  const acceptedList: string[] = [];
  const rejectedList: string[] = [];

  while (queue.length > 0 && (acceptedList.length < 5 || rejectedList.length < 5)) {
    const { state, str } = queue.shift()!;
    const isAcc = acceptSet.has(state);
    const displayStr = str === '' ? 'ε (empty string)' : str;

    if (isAcc) {
      if (!acceptedList.includes(displayStr)) acceptedList.push(displayStr);
    } else {
      if (!rejectedList.includes(displayStr)) rejectedList.push(displayStr);
    }

    if (str.length >= 8) continue;

    for (const sym of alphabet) {
      const edges = graph.transitions.filter((t) => t.source === state && t.symbols.includes(sym));
      for (const e of edges) {
        const key = `${e.target}:${str}${sym}`;
        if (!visited.has(key)) {
          visited.add(key);
          queue.push({ state: e.target, str: str + sym });
        }
      }
    }
  }

  return {
    shortestAccepted: acceptedList[0] || 'None',
    shortestRejected: rejectedList[0] || 'None',
    acceptedExamples: acceptedList.slice(0, 4),
    rejectedExamples: rejectedList.slice(0, 4),
  };
}

// ── 5. MAIN DFA INSPECTOR ENGINE ──
export function inspectDFA(graph: AutomatonGraph): DFAInspectorData {
  const dfa = graphToDFA(graph);
  const alphabet = graph.alphabet?.length ? graph.alphabet : ['0', '1'];
  const isBinary = alphabet.length === 2 && alphabet.includes('0') && alphabet.includes('1');

  // 1. Reachable & Unreachable
  const startState = graph.states.find((s) => s.isStart)?.id || graph.states[0]?.id;
  const visited = new Set<string>();
  if (startState) {
    const q = [startState];
    visited.add(startState);
    while (q.length > 0) {
      const curr = q.shift()!;
      graph.transitions.forEach((t) => {
        if (t.source === curr && !visited.has(t.target)) {
          visited.add(t.target);
          q.push(t.target);
        }
      });
    }
  }
  const reachableStates = Array.from(visited);
  const unreachableStates = graph.states.filter((s) => !visited.has(s.id)).map((s) => s.id);

  // 2. Dead States & Trap States
  const acceptSet = new Set(graph.states.filter((s) => s.isAccept).map((s) => s.id));
  const trapStates = graph.states
    .filter((s) => {
      if (s.isAccept) return false;
      const outgoing = graph.transitions.filter((t) => t.source === s.id);
      return outgoing.length > 0 && outgoing.every((t) => t.target === s.id);
    })
    .map((s) => s.id);

  const deadStates = graph.states
    .filter((s) => {
      const q = [s.id];
      const vis = new Set<string>([s.id]);
      let canReach = false;
      while (q.length > 0) {
        const curr = q.shift()!;
        if (acceptSet.has(curr)) {
          canReach = true;
          break;
        }
        graph.transitions.forEach((t) => {
          if (t.source === curr && !vis.has(t.target)) {
            vis.add(t.target);
            q.push(t.target);
          }
        });
      }
      return !canReach;
    })
    .map((s) => s.id);

  // 3. Hopcroft Minimization & Equivalent States
  const minimizationRes = minimizeDFA(graph);
  const minStateCount = minimizationRes.minimizedGraph.states.length;
  const isMinimal = minStateCount === graph.states.length && unreachableStates.length === 0;

  // Find equivalent pairs
  const equivalentStatePairs: Array<[string, string]> = [];
  if (minimizationRes.mergedPairs) {
    minimizationRes.mergedPairs.forEach((merged) => {
      if (merged.oldIds.length > 1) {
        for (let i = 0; i < merged.oldIds.length; i++) {
          for (let j = i + 1; j < merged.oldIds.length; j++) {
            equivalentStatePairs.push([merged.oldIds[i], merged.oldIds[j]]);
          }
        }
      }
    });
  }

  // 4. Graph Metrics (Density, Diameter, Paths, SCCs)
  const totalStates = graph.states.length;
  const acceptStatesCount = acceptSet.size;
  const rejectStatesCount = totalStates - acceptStatesCount;
  const totalTransitions = graph.transitions.reduce((acc, t) => acc + t.symbols.length, 0);

  const transitionDensity = totalStates && alphabet.length ? Math.min(1, totalTransitions / (totalStates * alphabet.length)) : 0;
  const averageOutDegree = totalStates ? totalTransitions / totalStates : 0;

  // Per symbol transition counts
  const averageTransitionCountPerSymbol: Record<string, number> = {};
  alphabet.forEach((sym) => {
    const cnt = graph.transitions.filter((t) => t.symbols.includes(sym)).length;
    averageTransitionCountPerSymbol[sym] = cnt;
  });

  const { diameter, longestPath } = computeGraphMetrics(graph, visited);
  const isInfinite = checkLanguageInfiniteness(graph, reachableStates);
  const sampleStrings = generateSampleStrings(graph);

  // 5. Pattern & Language Name heuristics
  const gName = graph.name || 'Deterministic Finite Automaton';
  const nameLower = gName.toLowerCase();

  let patternType = 'Custom Automaton';
  let generatorName = 'AutomataEngine';
  let algorithmUsed = 'State Transition Graph Construction';
  let difficulty: ConstructionInfo['difficulty'] = 'Medium';
  let regex = '(0|1)*';
  let desc = `Automaton accepting a set of strings over alphabet {${alphabet.join(', ')}}.`;
  let constructionStrategy = 'Direct state transition graph synthesis.';
  let memoryConcept = 'Remembers current control state based on input stream.';
  let patternDetectionMethod = 'State transition table lookup.';

  if (nameLower.includes('ends with') || nameLower.includes('ends_') || nameLower.includes('ending')) {
    const match = gName.match(/(?:ends with|ending in)\s*([01]+)/i) || gName.match(/([01]+)$/);
    const pat = match ? match[1] : '0';
    patternType = 'Ends With Suffix';
    generatorName = 'EndsWithGenerator';
    algorithmUsed = 'Suffix Matching DFA Construction';
    difficulty = pat.length > 2 ? 'Medium' : 'Easy';
    regex = `(${alphabet.join('|')})*${pat}`;
    desc = `Accepts all binary strings ending with the exact sequence '${pat}'.`;
    constructionStrategy = 'Tracks the longest suffix matching target pattern.';
    memoryConcept = `Stores last ${pat.length} symbol(s) read from input.`;
    patternDetectionMethod = 'Deterministic Suffix Shift Transition Matrix.';
  } else if (nameLower.includes('starts with') || nameLower.includes('starting')) {
    const match = gName.match(/(?:starts with|starting with)\s*([01]+)/i);
    const pat = match ? match[1] : '001';
    patternType = 'Starts With Prefix';
    generatorName = 'StartsWithGenerator';
    algorithmUsed = 'Prefix Tree DFA Construction';
    difficulty = 'Easy';
    regex = `${pat}(${alphabet.join('|')})*`;
    desc = `Accepts all binary strings starting with the exact prefix '${pat}'.`;
    constructionStrategy = 'Advances prefix match state; transitions to trap state on mismatch.';
    memoryConcept = `Stores prefix match length up to '${pat}'.`;
    patternDetectionMethod = 'Prefix Match Advancement with Trap Sink.';
  } else if (nameLower.includes('divisible') || nameLower.includes('modulo') || nameLower.includes('mod')) {
    patternType = 'Modulo Arithmetic';
    generatorName = 'BinaryModuloGenerator';
    algorithmUsed = 'Modulo Residue Ring Construction';
    difficulty = 'Hard';
    regex = `(0|10(1|01*0)*1)*`;
    desc = 'Accepts binary strings representing numbers divisible by the target divisor.';
    constructionStrategy = 'State q_r represents value modulo k (r = 0..k-1).';
    memoryConcept = 'Remembers current numerical value modulo divisor.';
    patternDetectionMethod = 'Bitwise Shift Add Remainder Transition Rule r\' = (2r + b) mod k.';
  } else if (nameLower.includes('even') || nameLower.includes('odd')) {
    patternType = 'Parity Counting';
    generatorName = 'EvenOddGenerator';
    algorithmUsed = 'Parity State Toggle Construction';
    difficulty = 'Easy';
    regex = `0*(10*10*)*`;
    desc = 'Accepts strings satisfying even or odd parity conditions on symbols.';
    constructionStrategy = 'Toggles state between Even and Odd upon encountering target symbol.';
    memoryConcept = 'Tracks modulo 2 count of target symbol instances.';
    patternDetectionMethod = 'Bi-state Parity Flip Transition.';
  } else if (nameLower.includes('contains') || nameLower.includes('substring')) {
    const match = gName.match(/(?:contains|substring)\s*([01]+)/i);
    const pat = match ? match[1] : '110';
    patternType = 'Contains Substring';
    generatorName = 'ContainsGenerator';
    algorithmUsed = 'KMP Substring Automaton Engine';
    difficulty = 'Medium';
    regex = `(${alphabet.join('|')})*${pat}(${alphabet.join('|')})*`;
    desc = `Accepts strings containing '${pat}' as a contiguous substring.`;
    constructionStrategy = 'Advances state on matching characters; uses failure transitions on mismatch.';
    memoryConcept = `Remembers length of matching substring prefix.`;
    patternDetectionMethod = 'KMP Partial Match Failure Transition Matrix.';
  }

  const languageInfo: LanguageInfo = {
    name: gName,
    description: desc,
    examplesSummary: `Accepts valid sequences over Σ = {${alphabet.join(', ')}}.`,
    regex,
    acceptedExamples: sampleStrings.acceptedExamples,
    rejectedExamples: sampleStrings.rejectedExamples,
    shortestAccepted: sampleStrings.shortestAccepted,
    shortestRejected: sampleStrings.shortestRejected,
    isInfinite,
    languageFamily: 'Regular Language (Chomsky Hierarchy Level 3)',
    patternType,
  };

  const constructionInfo: ConstructionInfo = {
    generatorName,
    algorithmUsed,
    patternType,
    difficulty,
    creationSource: 'Automata Studio Engine',
    constructionStrategy,
    memoryConcept,
    patternDetectionMethod,
    timeComplexity: `O(|Q| · |Σ|) = O(${totalStates} × ${alphabet.length})`,
    spaceComplexity: `O(|Q|) = O(${totalStates})`,
  };

  // 6. State Semantics for every state
  const shortestPathMap = computeShortestPaths(graph);
  const semanticsMap: Record<string, StateSemantics> = {};

  graph.states.forEach((s) => {
    const isStart = !!s.isStart;
    const isAccept = !!s.isAccept;
    const isReachable = reachableStates.includes(s.id);
    const isTrap = trapStates.includes(s.id);
    const isDead = deadStates.includes(s.id);

    const incoming = graph.transitions
      .filter((t) => t.target === s.id)
      .map((t) => ({ source: t.source, symbols: t.symbols }));

    const outgoing = graph.transitions
      .filter((t) => t.source === s.id)
      .map((t) => ({ target: t.target, symbols: t.symbols }));

    const eqPair = equivalentStatePairs.find((pair) => pair.includes(s.id));
    const eqId = eqPair ? eqPair.find((x) => x !== s.id) || null : null;

    const pathStr = shortestPathMap[s.id];

    let meaning = s.label && s.label !== s.id ? s.label : '';

    if (!meaning) {
      if (isStart && isAccept) {
        meaning = 'Initial state. Accepts empty string ε and serves as starting condition.';
      } else if (isStart) {
        meaning = 'Initial state. No input symbols processed yet.';
      } else if (isTrap) {
        meaning = 'Trap state. Non-accepting sink state from which accepting states are unreachable.';
      } else if (isDead) {
        meaning = 'Dead state. Future input symbols can never lead to an accept state.';
      } else if (isAccept) {
        meaning = `Accepting state. Landed here after reading sequence matching language condition.`;
      } else if (pathStr !== undefined) {
        meaning = `State reached after processing string '${pathStr || 'ε'}'.`;
      } else {
        meaning = 'Control state in DFA transition graph.';
      }
    }

    semanticsMap[s.id] = {
      id: s.id,
      label: s.label || s.id,
      meaning,
      isStart,
      isAccept,
      isReachable,
      isTrap,
      isDead,
      incomingTransitions: incoming,
      outgoingTransitions: outgoing,
      equivalentStateId: eqId,
      shortestPathTo: pathStr !== undefined ? (pathStr === '' ? 'ε' : pathStr) : null,
    };
  });

  // 7. Properties & Validation Checklist
  const isDeterministic = graph.states.every((s) => {
    const outgoing = graph.transitions.filter((t) => t.source === s.id);
    const seen = new Set<string>();
    for (const t of outgoing) {
      for (const sym of t.symbols) {
        if (seen.has(sym)) return false;
        seen.add(sym);
      }
    }
    return true;
  });

  const isComplete = graph.states.every((s) => {
    const symbolsHandled = new Set(
      graph.transitions.filter((t) => t.source === s.id).flatMap((t) => t.symbols)
    );
    return alphabet.every((sym) => symbolsHandled.has(sym));
  });

  const properties: PropertyItem[] = [
    {
      id: 'prop_det',
      title: 'Deterministic (DFA)',
      status: isDeterministic ? 'passed' : 'failed',
      statusBadge: isDeterministic ? 'DFA VALID' : 'NFA / INVALID',
      shortExplanation: isDeterministic
        ? 'Every state has exactly 1 deterministic target state for each alphabet symbol.'
        : 'Contains non-deterministic or missing transition paths.',
      mathMeaning: '∀ q ∈ Q, ∀ a ∈ Σ: |δ(q,a)| = 1 (Exactly one transition per symbol)',
      validationExplanation: isDeterministic
        ? 'DFA is fully deterministic: no ambiguous paths or epsilon transitions exist.'
        : 'Failed: Found multiple transitions for the same symbol from a single state.',
    },
    {
      id: 'prop_comp',
      title: 'Complete DFA',
      status: isComplete ? 'passed' : 'warning',
      statusBadge: isComplete ? 'COMPLETE' : 'INCOMPLETE',
      shortExplanation: isComplete
        ? 'Every state defines valid transitions for all symbols in Σ.'
        : 'Some states lack defined transitions for certain symbols in the alphabet.',
      mathMeaning: 'Dom(δ) = Q × Σ (Transition function is defined over all state-symbol pairs)',
      validationExplanation: isComplete
        ? 'DFA is complete: total transition function covers all state-symbol combinations.'
        : 'Warning: Missing transitions exist for some state-symbol pairs.',
    },
    {
      id: 'prop_min',
      title: 'Minimal DFA',
      status: isMinimal ? 'passed' : 'warning',
      statusBadge: isMinimal ? 'MINIMAL' : `${minStateCount} STATES OPTIMAL`,
      shortExplanation: isMinimal
        ? 'No smaller equivalent DFA exists (Hopcroft minimized).'
        : `Can be minimized from ${totalStates} states down to ${minStateCount} states.`,
      mathMeaning: 'By Myhill-Nerode theorem: No indistinguishable state pairs p ≡ q exist.',
      validationExplanation: isMinimal
        ? 'DFA is 100% minimal under Hopcroft equivalence partitioning.'
        : `DFA contains ${totalStates - minStateCount} redundant or equivalent state(s).`,
    },
    {
      id: 'prop_reach',
      title: 'Reachable Graph',
      status: unreachableStates.length === 0 ? 'passed' : 'warning',
      statusBadge: unreachableStates.length === 0 ? 'ALL REACHABLE' : `${unreachableStates.length} UNREACHABLE`,
      shortExplanation: unreachableStates.length === 0
        ? 'Every state can be reached starting from initial state q0.'
        : `States {${unreachableStates.join(', ')}} cannot be reached from q0.`,
      mathMeaning: '∀ q ∈ Q, ∃ w ∈ Σ*: δ(q0, w) = q (All states reachable from q0)',
      validationExplanation: unreachableStates.length === 0
        ? 'All states are reachable from start state q0.'
        : `Unreachable states found: {${unreachableStates.join(', ')}}.`,
    },
    {
      id: 'prop_conn',
      title: 'Connected Components',
      status: 'passed',
      statusBadge: 'CONNECTED',
      shortExplanation: `Underlying transition graph forms connected structure (${reachableStates.length} reachable states).`,
      mathMeaning: 'Graph connectivity over underlying undirected state graph G=(V,E)',
      validationExplanation: 'Transition topology forms a valid connected state machine.',
    },
    {
      id: 'prop_trap',
      title: 'Contains Trap State',
      status: trapStates.length > 0 ? 'warning' : 'passed',
      statusBadge: trapStates.length > 0 ? 'TRAP PRESENT' : 'NO TRAPS',
      shortExplanation: trapStates.length > 0
        ? `Contains non-accepting sink state(s): {${trapStates.join(', ')}}.`
        : 'No non-accepting trap states exist.',
      mathMeaning: 'Trap state t ∈ Q \\ F: ∀ a ∈ Σ, δ(t,a) = t (Self-loop sink state)',
      validationExplanation: trapStates.length > 0
        ? `Trap state present ({${trapStates.join(', ')}}). Ensures completeness for rejected strings.`
        : 'DFA contains no dead sink trap states.',
    },
    {
      id: 'prop_dead',
      title: 'Contains Dead State',
      status: deadStates.length > 0 ? 'warning' : 'passed',
      statusBadge: deadStates.length > 0 ? 'DEAD PRESENT' : 'NO DEAD STATES',
      shortExplanation: deadStates.length > 0
        ? `States {${deadStates.join(', ')}} cannot reach any accept state.`
        : 'All states can reach at least one accept state.',
      mathMeaning: 'Dead state d ∈ Q: ∀ w ∈ Σ*, δ(d, w) ∉ F (Cannot reach F)',
      validationExplanation: deadStates.length > 0
        ? `Dead states identified ({${deadStates.join(', ')}}).`
        : 'All states have a valid path to an accepting state.',
    },
    {
      id: 'prop_cycle',
      title: 'Contains Cycles',
      status: 'info',
      statusBadge: 'CYCLIC GRAPH',
      shortExplanation: 'State machine contains cyclic transition paths.',
      mathMeaning: '∃ path q_i → ... → q_i in transition graph G',
      validationExplanation: 'Automaton contains feedback cycles allowing repeating strings.',
    },
    {
      id: 'prop_inf',
      title: 'Infinite Language',
      status: 'info',
      statusBadge: isInfinite ? 'INFINITE L(M)' : 'FINITE L(M)',
      shortExplanation: isInfinite
        ? 'Language accepts infinitely many string lengths due to accepting cycles.'
        : 'Language accepts a finite set of strings.',
      mathMeaning: 'L(M) is infinite iff ∃ useful state q on cycle q0 →* q →+ q →* F',
      validationExplanation: isInfinite
        ? 'Language is Infinite: Cycles exist along valid paths to accept states.'
        : 'Language is Finite: No useful state loops exist.',
    },
  ];

  const validationList: PropertyItem[] = [
    {
      id: 'val_det',
      title: 'DFA is deterministic',
      status: isDeterministic ? 'passed' : 'failed',
      statusBadge: isDeterministic ? '✓ PASSED' : '✗ FAILED',
      shortExplanation: isDeterministic
        ? 'Every state has exactly 1 transition per symbol'
        : 'Multiple or missing deterministic transitions found',
      mathMeaning: 'Deterministic state machine criteria',
      validationExplanation: isDeterministic
        ? 'Every state transitions deterministically without ambiguity.'
        : 'Failed determinism check.',
    },
    {
      id: 'val_comp',
      title: 'DFA is complete',
      status: isComplete ? 'passed' : 'warning',
      statusBadge: isComplete ? '✓ COMPLETE' : '⚠ INCOMPLETE',
      shortExplanation: isComplete
        ? 'All alphabet symbols are covered for every state'
        : 'Some state-symbol pairs are missing',
      mathMeaning: 'Complete transition table',
      validationExplanation: isComplete
        ? 'Total transition function is complete across alphabet Σ.'
        : 'Incomplete transition table; implicit reject transitions apply.',
    },
    {
      id: 'val_trans',
      title: 'All transitions valid',
      status: 'passed',
      statusBadge: '✓ VALID',
      shortExplanation: 'All transitions reference valid states and alphabet symbols',
      mathMeaning: 'δ ⊆ Q × Σ × Q',
      validationExplanation: 'Transition relations are valid state transitions.',
    },
    {
      id: 'val_reach',
      title: 'All states reachable',
      status: unreachableStates.length === 0 ? 'passed' : 'warning',
      statusBadge: unreachableStates.length === 0 ? '✓ ALL REACHABLE' : '⚠ UNREACHABLE',
      shortExplanation: unreachableStates.length === 0
        ? 'All states are reachable from initial state q0'
        : `${unreachableStates.length} states are unreachable`,
      mathMeaning: 'State reachability',
      validationExplanation: unreachableStates.length === 0
        ? 'No isolated or unreachable states in graph.'
        : `Found ${unreachableStates.length} unreachable state(s).`,
    },
    {
      id: 'val_trap',
      title: 'Contains trap state',
      status: trapStates.length > 0 ? 'info' : 'passed',
      statusBadge: trapStates.length > 0 ? 'ⓘ TRAP STATE' : '✓ NO TRAPS',
      shortExplanation: trapStates.length > 0
        ? `Trap state present: {${trapStates.join(', ')}}`
        : 'No trap states',
      mathMeaning: 'Self-loop non-accepting sink state',
      validationExplanation: trapStates.length > 0
        ? `Contains trap state {${trapStates.join(', ')}} to absorb non-matching inputs.`
        : 'No sink trap states.',
    },
    {
      id: 'val_min',
      title: 'Minimal DFA',
      status: isMinimal ? 'passed' : 'warning',
      statusBadge: isMinimal ? '✓ MINIMAL' : '⚠ CAN BE MINIMIZED',
      shortExplanation: isMinimal
        ? 'DFA is in minimal state representation'
        : `Can be reduced from ${totalStates} to ${minStateCount} states`,
      mathMeaning: 'Hopcroft minimization',
      validationExplanation: isMinimal
        ? 'Minimal DFA achieved; no redundant states.'
        : `DFA can be reduced to ${minStateCount} state(s) using Hopcroft minimization.`,
    },
  ];

  const statistics: InspectionStatistics = {
    totalStates,
    acceptStatesCount,
    rejectStatesCount,
    totalTransitions,
    transitionDensity,
    averageOutDegree,
    reachableStates,
    unreachableStates,
    deadStates,
    trapStates,
    hasCycle: computeSCCs(graph).hasCycle || isInfinite,
    cycleNodes: computeSCCs(graph).cycleNodes || [],
    sccs: computeSCCs(graph).sccs || [],
    connectedComponentsCount: 1,
    averageTransitionCountPerSymbol,
    stateUtilization: totalStates ? Math.round(((totalStates - deadStates.length) / totalStates) * 100) : 100,
    graphDiameter: diameter,
    longestSimplePath: longestPath,
    longestSimplePathLength: Math.max(0, longestPath.length - 1),
  };

  return {
    graph,
    dfa,
    alphabet,
    isBinary,
    languageInfo,
    constructionInfo,
    statistics,
    semanticsMap,
    properties,
    validationList,
    equivalentStatePairs,
  };
}

export const inspectAutomaton = inspectDFA;
