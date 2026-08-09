import type { DFA } from '../../types/dfa';

export function unionSets<T>(setA: Set<T>, setB: Set<T>): Set<T> {
  const res = new Set<T>(setA);
  for (const item of setB) {
    res.add(item);
  }
  return res;
}

export function areSetsEqual<T>(setA: Set<T>, setB: Set<T>): boolean {
  if (setA.size !== setB.size) return false;
  for (const item of setA) {
    if (!setB.has(item)) return false;
  }
  return true;
}

export function generatePowersetName(states: string[], index: number): string {
  if (states.length === 0) return 'Trap';
  let name = '';
  let i = index;
  while (i >= 0) {
    name = String.fromCharCode(65 + (i % 26)) + name;
    i = Math.floor(i / 26) - 1;
  }
  return name;
}

/**
 * Standardizes state names into clean numeric order (q0, q1, q2, q3...).
 * Uses BFS reachability ordering starting at startState so that startState is ALWAYS q0.
 */
export function canonicalizeDFAStates(dfa: DFA): DFA {
  const stateMap: Record<string, string> = {};
  const orderedStates: string[] = [];

  // Start state is ALWAYS q0
  if (dfa.states.includes(dfa.startState)) {
    orderedStates.push(dfa.startState);
  }

  // Add remaining states via BFS order for clean numeric indexing
  const queue = [dfa.startState];
  const visited = new Set<string>([dfa.startState]);

  while (queue.length > 0) {
    const curr = queue.shift()!;
    for (const sym of dfa.alphabet) {
      const next = dfa.transitions[curr]?.[sym];
      if (next && !visited.has(next) && dfa.states.includes(next)) {
        visited.add(next);
        queue.push(next);
        orderedStates.push(next);
      }
    }
  }

  // Append any unreachable states
  for (const s of dfa.states) {
    if (!visited.has(s)) {
      orderedStates.push(s);
    }
  }

  orderedStates.forEach((oldState, idx) => {
    stateMap[oldState] = `q${idx}`;
  });

  const newStates = orderedStates.map((s) => stateMap[s]);
  const newStartState = stateMap[dfa.startState] || 'q0';
  const newAcceptStates = dfa.acceptStates.map((s) => stateMap[s] || s);
  const newTransitions: DFA['transitions'] = {};

  for (const s of newStates) {
    newTransitions[s] = {};
  }

  for (const oldState of orderedStates) {
    const newState = stateMap[oldState];
    const symMap = dfa.transitions[oldState] || {};
    for (const sym of Object.keys(symMap)) {
      const oldTarget = symMap[sym];
      newTransitions[newState][sym] = stateMap[oldTarget] || oldTarget;
    }
  }

  return {
    alphabet: dfa.alphabet,
    states: newStates,
    startState: newStartState,
    acceptStates: newAcceptStates,
    transitions: newTransitions,
  };
}
