import type { NFA } from '../NFA';
import { findReachableStates } from '../../shared/Reachability';
import { sanitizeAndRenameNFA } from './RenameStates';

export function removeUnreachableNFAStates(nfa: NFA): NFA {
  const reachable = findReachableStates(nfa.startState, nfa.transitions);
  const newStates = nfa.states.filter((s) => reachable.has(s));
  const newAccept = nfa.acceptStates.filter((s) => reachable.has(s));

  const newTransitions: { [state: string]: { [symbol: string]: string[] } } = {};
  for (const s of newStates) {
    newTransitions[s] = {};
    const symMap = nfa.transitions[s] || {};
    for (const sym of Object.keys(symMap)) {
      const targets = (symMap[sym] || []).filter((t) => reachable.has(t));
      if (targets.length > 0) {
        newTransitions[s][sym] = targets;
      }
    }
  }

  const prunedNFA: NFA = {
    alphabet: nfa.alphabet,
    states: newStates,
    startState: nfa.startState,
    acceptStates: newAccept,
    transitions: newTransitions,
  };

  return sanitizeAndRenameNFA(prunedNFA, 'q');
}
