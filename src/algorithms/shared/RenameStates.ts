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

  // Ensure startState is ordered first so it is assigned index 0 (e.g. q0 / A0)
  const orderedStates = [
    ...(states.includes(startState) ? [startState] : []),
    ...states.filter((s) => s !== startState),
  ];

  orderedStates.forEach((s, idx) => {
    stateMap[s] = `${prefix}${idx}`;
  });

  const newStates = orderedStates.map((s) => stateMap[s]);
  const newStartState = stateMap[startState] || `${prefix}0`;
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
