import type { TransitionMap } from './EpsilonClosure';

export interface StateRenameResult {
  states: string[];
  startState: string;
  acceptStates: string[];
  transitions: TransitionMap;
  stateMap: Record<string, string>;
}

export function renameNFAStates(
  states: string[],
  startState: string,
  acceptStates: string[],
  transitions: TransitionMap,
  prefix: string = 'q'
): StateRenameResult {
  const stateMap: Record<string, string> = {};
  states.forEach((s, idx) => {
    stateMap[s] = `${prefix}${idx}`;
  });

  const newStates = states.map((s) => stateMap[s]);
  const newStartState = stateMap[startState] || startState;
  const newAcceptStates = acceptStates.map((s) => stateMap[s] || s);

  const newTransitions: TransitionMap = {};
  for (const s of newStates) {
    newTransitions[s] = {};
  }

  for (const oldState of Object.keys(transitions)) {
    const newState = stateMap[oldState];
    if (!newState) continue;

    const symMap = transitions[oldState];
    for (const sym of Object.keys(symMap)) {
      const oldTargets = symMap[sym] || [];
      const newTargets = oldTargets.map((t) => stateMap[t]).filter(Boolean);

      if (!newTransitions[newState][sym]) {
        newTransitions[newState][sym] = [];
      }
      newTransitions[newState][sym].push(...newTargets);
    }
  }

  return {
    states: newStates,
    startState: newStartState,
    acceptStates: newAcceptStates,
    transitions: newTransitions,
    stateMap,
  };
}
