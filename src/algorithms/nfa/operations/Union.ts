import type { NFA } from '../NFA';
import { renameNFAStates } from '../../shared/RenameStates';
import { removeUnreachableNFAStates } from './RemoveUnreachableStates';

/**
 * unionNFA:
 * Optimal NFA Union (L(A) ∪ L(B)):
 * Creates a clean start state 'q0' branching via ε-transitions to NFA A and NFA B start states.
 * Preserves original accept states directly without adding redundant trailing ε-edges or artificial accept states.
 */
export function unionNFA(nfa1: NFA, nfa2: NFA): NFA {
  const r1 = renameNFAStates(nfa1.states, nfa1.startState, nfa1.acceptStates, nfa1.transitions, 'A');
  const r2 = renameNFAStates(nfa2.states, nfa2.startState, nfa2.acceptStates, nfa2.transitions, 'B');

  const startState = 'q_start';
  const alphabet = Array.from(new Set([...nfa1.alphabet, ...nfa2.alphabet])).sort();
  const states = [startState, ...r1.states, ...r2.states];

  const transitions: { [state: string]: { [symbol: string]: string[] } } = {};
  for (const s of states) {
    transitions[s] = {};
  }

  // Copy NFA A transitions
  for (const s of r1.states) {
    for (const sym of Object.keys(r1.transitions[s] || {})) {
      transitions[s][sym] = [...(r1.transitions[s][sym] || [])];
    }
  }

  // Copy NFA B transitions
  for (const s of r2.states) {
    for (const sym of Object.keys(r2.transitions[s] || {})) {
      transitions[s][sym] = [...(r2.transitions[s][sym] || [])];
    }
  }

  // ε-transitions from startState to both start states
  transitions[startState]['ε'] = [r1.startState, r2.startState];

  // Combine accept states directly
  const acceptStates = Array.from(new Set([...r1.acceptStates, ...r2.acceptStates]));

  // If either start state was an accept state, q_start is also an accept state
  const isR1StartAccept = r1.acceptStates.includes(r1.startState);
  const isR2StartAccept = r2.acceptStates.includes(r2.startState);
  if (isR1StartAccept || isR2StartAccept) {
    if (!acceptStates.includes(startState)) {
      acceptStates.push(startState);
    }
  }

  const rawUnion: NFA = {
    alphabet,
    states,
    startState,
    acceptStates,
    transitions,
  };

  return removeUnreachableNFAStates(rawUnion);
}
