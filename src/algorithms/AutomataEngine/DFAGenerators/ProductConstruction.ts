import type { DFA } from '../../../types/dfa';
import { TrapStateGenerator } from './TrapStateGenerator';

/**
 * Returns the complement of a DFA (L(M') = Σ* \ L(M)).
 * Flips accept states: F' = Q \ F.
 */
export function complementDFA(dfa: DFA): DFA {
  const completed = TrapStateGenerator.completeDFA(dfa);
  const acceptSet = new Set(completed.acceptStates);
  const newAcceptStates = completed.states.filter((s) => !acceptSet.has(s));

  return {
    alphabet: [...completed.alphabet],
    states: [...completed.states],
    startState: completed.startState,
    acceptStates: newAcceptStates,
    transitions: JSON.parse(JSON.stringify(completed.transitions)),
  };
}

/**
 * Executes Product Construction on two DFAs (M1 and M2).
 * Supports AND (Intersection), OR (Union), DIFF (Difference M1 \ M2), XOR (Symmetric Difference).
 */
export function productConstruction(
  dfa1: DFA,
  dfa2: DFA,
  operation: 'AND' | 'OR' | 'DIFF' | 'XOR'
): DFA {
  const c1 = TrapStateGenerator.completeDFA(dfa1);
  const c2 = TrapStateGenerator.completeDFA(dfa2);

  // Ensure common alphabet
  const alphabet = Array.from(new Set([...c1.alphabet, ...c2.alphabet])).sort();

  const pairToStateName = (q1: string, q2: string) => `(${q1},${q2})`;

  const states: string[] = [];
  const acceptStates: string[] = [];
  const acceptSet1 = new Set(c1.acceptStates);
  const acceptSet2 = new Set(c2.acceptStates);

  for (const q1 of c1.states) {
    for (const q2 of c2.states) {
      const pairName = pairToStateName(q1, q2);
      states.push(pairName);

      const isAcc1 = acceptSet1.has(q1);
      const isAcc2 = acceptSet2.has(q2);

      let isAccept = false;
      if (operation === 'AND') {
        isAccept = isAcc1 && isAcc2;
      } else if (operation === 'OR') {
        isAccept = isAcc1 || isAcc2;
      } else if (operation === 'DIFF') {
        isAccept = isAcc1 && !isAcc2;
      } else if (operation === 'XOR') {
        isAccept = (isAcc1 && !isAcc2) || (!isAcc1 && isAcc2);
      }

      if (isAccept) {
        acceptStates.push(pairName);
      }
    }
  }

  const startState = pairToStateName(c1.startState, c2.startState);
  const transitions: DFA['transitions'] = {};

  for (const q1 of c1.states) {
    for (const q2 of c2.states) {
      const pairName = pairToStateName(q1, q2);
      transitions[pairName] = {};

      for (const symbol of alphabet) {
        const next1 = c1.transitions[q1]?.[symbol] ?? q1;
        const next2 = c2.transitions[q2]?.[symbol] ?? q2;
        transitions[pairName][symbol] = pairToStateName(next1, next2);
      }
    }
  }

  // BFS Reachability Pruning: keep only states reachable from startState
  const reachableStates = new Set<string>([startState]);
  const queue: string[] = [startState];

  while (queue.length > 0) {
    const curr = queue.shift()!;
    for (const symbol of alphabet) {
      const nextState = transitions[curr]?.[symbol];
      if (nextState && !reachableStates.has(nextState)) {
        reachableStates.add(nextState);
        queue.push(nextState);
      }
    }
  }

  const prunedStates = Array.from(reachableStates);
  const prunedAcceptStates = acceptStates.filter((st) => reachableStates.has(st));
  const prunedTransitions: DFA['transitions'] = {};

  for (const st of prunedStates) {
    prunedTransitions[st] = transitions[st] || {};
  }

  return {
    alphabet,
    states: prunedStates,
    startState,
    acceptStates: prunedAcceptStates,
    transitions: prunedTransitions,
  };
}

export function intersectionDFA(dfa1: DFA, dfa2: DFA): DFA {
  return productConstruction(dfa1, dfa2, 'AND');
}

export function unionDFA(dfa1: DFA, dfa2: DFA): DFA {
  return productConstruction(dfa1, dfa2, 'OR');
}

export function differenceDFA(dfa1: DFA, dfa2: DFA): DFA {
  return productConstruction(dfa1, dfa2, 'DIFF');
}
