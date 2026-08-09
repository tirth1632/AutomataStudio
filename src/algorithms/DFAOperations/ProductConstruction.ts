import type { DFA } from '../../types/dfa';
import { TrapStateGenerator } from '../AutomataEngine/DFAGenerators/TrapStateGenerator';

export type ProductOperation = 'AND' | 'OR' | 'DIFF' | 'XOR';

/**
 * Executes Cartesian Product Construction on two DFAs (M1 and M2).
 * Supports AND (Intersection), OR (Union), DIFF (Difference M1 \ M2), XOR (Symmetric Difference).
 * Automatically validates and completes both input DFAs before construction.
 */
export function productConstruction(
  dfa1: DFA,
  dfa2: DFA,
  operation: ProductOperation
): DFA {
  const alphabet = Array.from(new Set([...(dfa1.alphabet || []), ...(dfa2.alphabet || [])])).sort();

  const statesCount1 = Array.isArray(dfa1.states) ? dfa1.states.length : (dfa1.states as unknown as Set<string>)?.size || 0;
  const statesCount2 = Array.isArray(dfa2.states) ? dfa2.states.length : (dfa2.states as unknown as Set<string>)?.size || 0;

  if (statesCount2 === 0) {
    if (operation === 'OR' || operation === 'DIFF' || operation === 'XOR') return dfa1;
    if (operation === 'AND') return { states: ['q_empty'], alphabet, transitions: { q_empty: {} }, startState: 'q_empty', acceptStates: [] };
  }

  if (statesCount1 === 0) {
    if (operation === 'OR' || operation === 'XOR') return dfa2;
    if (operation === 'AND' || operation === 'DIFF') return { states: ['q_empty'], alphabet, transitions: { q_empty: {} }, startState: 'q_empty', acceptStates: [] };
  }

  // 1. Complete both DFAs over the same alphabet before forming pairs.
  const dA = TrapStateGenerator.completeDFA({ ...dfa1, alphabet });
  const dB = TrapStateGenerator.completeDFA({ ...dfa2, alphabet });

  const pairToStateName = (q1: string, q2: string) => `(${q1},${q2})`;

  const acceptSet1 = new Set(dA.acceptStates);
  const acceptSet2 = new Set(dB.acceptStates);
  const startState = pairToStateName(dA.startState, dB.startState);

  // Build full transition table for candidate pairs
  const fullTransitions: DFA['transitions'] = {};
  const fullAcceptMap = new Map<string, boolean>();

  for (const q1 of dA.states) {
    for (const q2 of dB.states) {
      const pairName = pairToStateName(q1, q2);
      fullTransitions[pairName] = {};

      for (const symbol of alphabet) {
        const next1 = dA.transitions[q1]?.[symbol] ?? q1;
        const next2 = dB.transitions[q2]?.[symbol] ?? q2;
        fullTransitions[pairName][symbol] = pairToStateName(next1, next2);
      }

      const isAcc1 = acceptSet1.has(q1);
      const isAcc2 = acceptSet2.has(q2);

      let isAccept = false;
      if (operation === 'AND') isAccept = isAcc1 && isAcc2;
      else if (operation === 'OR') isAccept = isAcc1 || isAcc2;
      else if (operation === 'DIFF') isAccept = isAcc1 && !isAcc2;
      else if (operation === 'XOR') isAccept = (isAcc1 && !isAcc2) || (!isAcc1 && isAcc2);

      fullAcceptMap.set(pairName, isAccept);
    }
  }

  // 2. BFS Reachability Pruning: keep ONLY states reachable from startState
  const reachableStates = new Set<string>([startState]);
  const queue: string[] = [startState];

  while (queue.length > 0) {
    const curr = queue.shift()!;
    for (const symbol of alphabet) {
      const nextState = fullTransitions[curr]?.[symbol];
      if (nextState && !reachableStates.has(nextState)) {
        reachableStates.add(nextState);
        queue.push(nextState);
      }
    }
  }

  const states = Array.from(reachableStates);
  const acceptStates: string[] = states.filter((st) => fullAcceptMap.get(st) === true);
  const transitions: DFA['transitions'] = {};

  for (const st of states) {
    transitions[st] = fullTransitions[st] || {};
  }

  return {
    alphabet,
    states,
    startState,
    acceptStates,
    transitions,
  };
}
