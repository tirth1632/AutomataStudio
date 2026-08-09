import type { NFA } from '../NFA';
import { renameNFAStates } from '../../shared/RenameStates';
import { removeUnreachableNFAStates } from './RemoveUnreachableStates';

/**
 * concatNFA:
 * Optimal NFA Concatenation (L(A) · L(B)):
 * Connects accept states of NFA A to the start state of NFA B via ε-transitions.
 * Sets startState to NFA A startState and acceptStates to NFA B acceptStates.
 */
export function concatNFA(nfa1: NFA, nfa2: NFA): NFA {
  const r1 = renameNFAStates(nfa1.states, nfa1.startState, nfa1.acceptStates, nfa1.transitions, 'A');
  const r2 = renameNFAStates(nfa2.states, nfa2.startState, nfa2.acceptStates, nfa2.transitions, 'B');

  const alphabet = Array.from(new Set([...nfa1.alphabet, ...nfa2.alphabet])).sort();
  const states = [...r1.states, ...r2.states];

  const transitions: { [state: string]: { [symbol: string]: string[] } } = {};
  for (const s of states) {
    transitions[s] = {};
  }

  for (const s of r1.states) {
    for (const sym of Object.keys(r1.transitions[s] || {})) {
      transitions[s][sym] = [...(r1.transitions[s][sym] || [])];
    }
  }

  for (const s of r2.states) {
    for (const sym of Object.keys(r2.transitions[s] || {})) {
      transitions[s][sym] = [...(r2.transitions[s][sym] || [])];
    }
  }

  // Connect NFA A accept states to NFA B start state via ε
  for (const acc of r1.acceptStates) {
    if (!transitions[acc]['ε']) transitions[acc]['ε'] = [];
    if (!transitions[acc]['ε'].includes(r2.startState)) {
      transitions[acc]['ε'].push(r2.startState);
    }
  }

  // Accept states are NFA B's accept states.
  // If NFA B accepts ε (its start state is accepting), NFA A's accept states also remain accepting!
  const acceptStates = [...r2.acceptStates];
  if (r2.acceptStates.includes(r2.startState)) {
    for (const acc of r1.acceptStates) {
      if (!acceptStates.includes(acc)) {
        acceptStates.push(acc);
      }
    }
  }

  const rawConcat: NFA = {
    alphabet,
    states,
    startState: r1.startState,
    acceptStates,
    transitions,
  };

  return removeUnreachableNFAStates(rawConcat);
}
