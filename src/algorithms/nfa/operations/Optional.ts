import type { NFA } from '../NFA';
import { renameNFAStates } from '../../shared/RenameStates';
import { removeUnreachableNFAStates } from './RemoveUnreachableStates';

/**
 * optionalNFA:
 * Optimal Optional NFA (L(A)? = L(A) ∪ {ε}):
 * Makes the startState accepting (or adds ε-edge from start to accept).
 */
export function optionalNFA(nfa: NFA): NFA {
  const r = renameNFAStates(nfa.states, nfa.startState, nfa.acceptStates, nfa.transitions, 'A');

  const states = [...r.states];
  const transitions: { [state: string]: { [symbol: string]: string[] } } = {};
  for (const s of states) {
    transitions[s] = {};
  }

  for (const s of r.states) {
    for (const sym of Object.keys(r.transitions[s] || {})) {
      transitions[s][sym] = [...(r.transitions[s][sym] || [])];
    }
  }

  // Make startState accepting to accept ε
  const acceptStates = Array.from(new Set([r.startState, ...r.acceptStates]));

  const rawOpt: NFA = {
    alphabet: nfa.alphabet,
    states,
    startState: r.startState,
    acceptStates,
    transitions,
  };

  return removeUnreachableNFAStates(rawOpt);
}
