import type { NFA } from '../NFA';
import { removeUnreachableNFAStates } from './RemoveUnreachableStates';

/**
 * reverseNFA:
 * Optimal Reverse NFA (L(A)^R):
 * Inverts all transition directions.
 * If original NFA has 1 accept state, sets it directly as startState.
 * If multiple accept states, creates start state 'q_start' with ε-transitions to all original accept states.
 */
export function reverseNFA(nfa: NFA): NFA {
  const transitions: { [state: string]: { [symbol: string]: string[] } } = {};
  for (const s of nfa.states) {
    transitions[s] = {};
  }

  // Reverse all transition edges
  for (const u of Object.keys(nfa.transitions)) {
    const symMap = nfa.transitions[u] || {};
    for (const sym of Object.keys(symMap)) {
      const targets = symMap[sym] || [];
      for (const v of targets) {
        if (!transitions[v]) transitions[v] = {};
        if (!transitions[v][sym]) transitions[v][sym] = [];
        if (!transitions[v][sym].includes(u)) {
          transitions[v][sym].push(u);
        }
      }
    }
  }

  let startState: string;
  let states = [...nfa.states];

  if (nfa.acceptStates.length === 1) {
    startState = nfa.acceptStates[0];
  } else {
    startState = 'q_start';
    states = [startState, ...nfa.states];
    transitions[startState] = { ε: [...nfa.acceptStates] };
  }

  const acceptStates = [nfa.startState];

  const rawRev: NFA = {
    alphabet: nfa.alphabet,
    states,
    startState,
    acceptStates,
    transitions,
  };

  return removeUnreachableNFAStates(rawRev);
}
