import type { NFA, DFA } from '../../../types/dfa';
import { computeEpsilonClosure } from './EpsilonClosure';

/**
 * Executes Powerset / Subset Construction algorithm to convert any NFA to an equivalent DFA.
 */
export function convertNFAToDFA(nfa: NFA): DFA {
  const dfaAlphabet = nfa.alphabet.filter((sym) => sym !== 'ε');
  const acceptSet = new Set(nfa.acceptStates);

  const formatStateName = (subset: string[]) =>
    subset.length > 0 ? `{${subset.join(',')}}` : 'q_trap';

  const startClosure = computeEpsilonClosure(nfa, nfa.startState);
  const startDFAState = formatStateName(startClosure);

  const dfaStates: string[] = [startDFAState];
  const dfaAcceptStates: string[] = [];
  const dfaTransitions: DFA['transitions'] = {};

  const subsetMap = new Map<string, string[]>();
  subsetMap.set(startDFAState, startClosure);

  const queue: string[] = [startDFAState];

  while (queue.length > 0) {
    const currDFAState = queue.shift()!;
    const currSubset = subsetMap.get(currDFAState)!;

    // Check if accept state
    if (currSubset.some((st) => acceptSet.has(st))) {
      if (!dfaAcceptStates.includes(currDFAState)) {
        dfaAcceptStates.push(currDFAState);
      }
    }

    dfaTransitions[currDFAState] = {};

    for (const symbol of dfaAlphabet) {
      // Step 1: Find all move(currSubset, symbol)
      const moveSet = new Set<string>();
      for (const st of currSubset) {
        const targets = nfa.transitions[st]?.[symbol] || [];
        targets.forEach((t) => moveSet.add(t));
      }

      // Step 2: Compute ε-closure of moveSet
      const nextClosure = computeEpsilonClosure(nfa, Array.from(moveSet));
      const nextDFAState = formatStateName(nextClosure);

      dfaTransitions[currDFAState][symbol] = nextDFAState;

      if (!subsetMap.has(nextDFAState)) {
        subsetMap.set(nextDFAState, nextClosure);
        dfaStates.push(nextDFAState);
        queue.push(nextDFAState);
      }
    }
  }

  return {
    alphabet: dfaAlphabet,
    states: dfaStates,
    startState: startDFAState,
    acceptStates: dfaAcceptStates,
    transitions: dfaTransitions,
  };
}
