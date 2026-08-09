import type { NFA } from '../NFA';
import { renameNFAStates } from '../../shared/RenameStates';
import { removeUnreachableNFAStates } from './RemoveUnreachableStates';

/**
 * plusNFA:
 * Optimal Kleene Plus NFA (L(A)+):
 * Adds ε-loop transitions from accept states back to original startState.
 */
export function plusNFA(nfa: NFA): NFA {
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

  // Loop ε-transitions from accept states back to startState
  for (const acc of r.acceptStates) {
    if (!transitions[acc]['ε']) transitions[acc]['ε'] = [];
    if (!transitions[acc]['ε'].includes(r.startState)) {
      transitions[acc]['ε'].push(r.startState);
    }
  }

  const rawPlus: NFA = {
    alphabet: nfa.alphabet,
    states,
    startState: r.startState,
    acceptStates: [...r.acceptStates],
    transitions,
  };

  return removeUnreachableNFAStates(rawPlus);
}
