import type { NFA } from '../NFA';
import { renameNFAStates } from '../../shared/RenameStates';

export function sanitizeAndRenameNFA(nfa: NFA, prefix: string = 'q'): NFA {
  const result = renameNFAStates(nfa.states, nfa.startState, nfa.acceptStates, nfa.transitions, prefix);
  return {
    alphabet: nfa.alphabet,
    states: result.states,
    startState: result.startState,
    acceptStates: result.acceptStates,
    transitions: result.transitions,
  };
}
