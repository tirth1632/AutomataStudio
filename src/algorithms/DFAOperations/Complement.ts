import type { DFA } from '../../types/dfa';
import { TrapStateGenerator } from '../AutomataEngine/DFAGenerators/TrapStateGenerator';

/**
 * Computes the complement of a DFA (L(M') = Σ* \ L(M)).
 * Swaps accepting and non-accepting states.
 * Automatically ensures the input DFA is complete before complementing.
 */
export function complement(dfa: DFA): DFA {
  // 1. Automatically complete the DFA (adding trap state if missing)
  const completeDfa = TrapStateGenerator.completeDFA(dfa);

  // 2. Flip accept states: F' = Q \ F
  const acceptSet = new Set(completeDfa.acceptStates);
  const newAcceptStates = completeDfa.states.filter((s) => !acceptSet.has(s));

  return {
    alphabet: [...completeDfa.alphabet],
    states: [...completeDfa.states],
    startState: completeDfa.startState,
    acceptStates: newAcceptStates,
    transitions: JSON.parse(JSON.stringify(completeDfa.transitions)),
  };
}
