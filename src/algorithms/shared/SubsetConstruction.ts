import { computeEpsilonClosure } from './EpsilonClosure';
import { computeMove } from './Move';
import { generatePowersetName } from './StateUtilities';

export interface SubsetDFA {
  alphabet: string[];
  states: string[];
  startState: string;
  acceptStates: string[];
  transitions: { [state: string]: { [symbol: string]: string } };
  subsetMap: { [dfaState: string]: string[] };
}

export function performSubsetConstruction(nfa: {
  alphabet: string[];
  states: string[];
  startState: string;
  acceptStates: string[];
  transitions: { [state: string]: { [symbol: string]: string[] } };
}): SubsetDFA {
  const alphabet = nfa.alphabet.filter((sym) => sym !== 'ε');

  const startClosure = Array.from(computeEpsilonClosure([nfa.startState], nfa.transitions)).sort();
  const subsetList: string[][] = [startClosure];
  const subsetKeyMap = new Map<string, string>(); // sorted stringified subset -> letter label
  const dfaStateMap: { [dfaState: string]: string[] } = {};

  const startName = generatePowersetName(startClosure, 0);
  const startKey = startClosure.join(',');
  subsetKeyMap.set(startKey, startName);
  dfaStateMap[startName] = startClosure;

  const dfaTransitions: { [state: string]: { [symbol: string]: string } } = {};
  const queue: string[][] = [startClosure];
  let stateCounter = 1;

  while (queue.length > 0) {
    const currentSubset = queue.shift()!;
    const currentKey = currentSubset.join(',');
    const currentDfaName = subsetKeyMap.get(currentKey)!;

    if (!dfaTransitions[currentDfaName]) {
      dfaTransitions[currentDfaName] = {};
    }

    for (const sym of alphabet) {
      const moved = computeMove(currentSubset, sym, nfa.transitions);
      const nextClosure = Array.from(computeEpsilonClosure(moved, nfa.transitions)).sort();
      const nextKey = nextClosure.join(',');

      let targetDfaName: string;
      if (!subsetKeyMap.has(nextKey)) {
        targetDfaName = generatePowersetName(nextClosure, stateCounter++);
        subsetKeyMap.set(nextKey, targetDfaName);
        dfaStateMap[targetDfaName] = nextClosure;
        subsetList.push(nextClosure);
        queue.push(nextClosure);
      } else {
        targetDfaName = subsetKeyMap.get(nextKey)!;
      }

      dfaTransitions[currentDfaName][sym] = targetDfaName;
    }
  }

  const dfaStates = Array.from(subsetKeyMap.values());
  const acceptSet = new Set(nfa.acceptStates);

  const dfaAcceptStates = dfaStates.filter((dfaState) => {
    const originalSubset = dfaStateMap[dfaState] || [];
    return originalSubset.some((s) => acceptSet.has(s));
  });

  return {
    alphabet,
    states: dfaStates,
    startState: startName,
    acceptStates: dfaAcceptStates,
    transitions: dfaTransitions,
    subsetMap: dfaStateMap,
  };
}
