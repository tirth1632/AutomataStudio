import type { NFA } from '../NFA';
import { renameNFAStates } from '../../shared/RenameStates';
import { removeUnreachableNFAStates } from './RemoveUnreachableStates';

/**
 * starNFA:
 * Optimal Kleene Star NFA (L(A)*):
 * Adds ε-transitions from accept states back to start state.
 * Adds a new start state 'q_start' (accepting) with an ε-transition to original startState.
 */
export function starNFA(nfa: NFA): NFA {
  const r = renameNFAStates(nfa.states, nfa.startState, nfa.acceptStates, nfa.transitions, 'A');

  const startState = 'q_start';
  const states = [startState, ...r.states];

  const transitions: { [state: string]: { [symbol: string]: string[] } } = {};
  for (const s of states) {
    transitions[s] = {};
  }

  for (const s of r.states) {
    for (const sym of Object.keys(r.transitions[s] || {})) {
      transitions[s][sym] = [...(r.transitions[s][sym] || [])];
    }
  }

  // ε-transition from new startState to original startState
  transitions[startState]['ε'] = [r.startState];

  // Loop ε-transitions from accept states back to original startState
  for (const acc of r.acceptStates) {
    if (!transitions[acc]['ε']) transitions[acc]['ε'] = [];
    if (!transitions[acc]['ε'].includes(r.startState)) {
      transitions[acc]['ε'].push(r.startState);
    }
  }

  // Accept states are startState (to accept ε) and all original accept states
  const acceptStates = Array.from(new Set([startState, ...r.acceptStates]));

  const rawStar: NFA = {
    alphabet: nfa.alphabet,
    states,
    startState,
    acceptStates,
    transitions,
  };

  return removeUnreachableNFAStates(rawStar);
}
