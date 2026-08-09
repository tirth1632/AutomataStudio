import type { NFA } from '../NFA';
import { performSubsetConstruction } from '../../shared/SubsetConstruction';
import { findReachableStates } from '../../shared/Reachability';

export interface ConvertedDFA {
  alphabet: string[];
  states: string[];
  startState: string;
  acceptStates: string[];
  transitions: { [state: string]: { [symbol: string]: string } };
  subsetMap: { [dfaState: string]: string[] };
}

export function convertNFAToDFA(nfa: NFA): ConvertedDFA {
  const rawDfa = performSubsetConstruction(nfa);

  const transMapForReachability: { [state: string]: { [symbol: string]: string[] } } = {};
  for (const s of rawDfa.states) {
    transMapForReachability[s] = {};
    for (const sym of Object.keys(rawDfa.transitions[s] || {})) {
      transMapForReachability[s][sym] = [rawDfa.transitions[s][sym]];
    }
  }

  const reachable = findReachableStates(rawDfa.startState, transMapForReachability);
  const prunedStates = rawDfa.states.filter((s) => reachable.has(s));
  const prunedAccept = rawDfa.acceptStates.filter((s) => reachable.has(s));

  const prunedTransitions: { [state: string]: { [symbol: string]: string } } = {};
  const prunedSubsetMap: { [dfaState: string]: string[] } = {};

  for (const s of prunedStates) {
    prunedTransitions[s] = { ...(rawDfa.transitions[s] || {}) };
    prunedSubsetMap[s] = rawDfa.subsetMap[s] || [];
  }

  return {
    alphabet: rawDfa.alphabet,
    states: prunedStates,
    startState: rawDfa.startState,
    acceptStates: prunedAccept,
    transitions: prunedTransitions,
    subsetMap: prunedSubsetMap,
  };
}
