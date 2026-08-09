export const EPSILON = 'ε';

export type TransitionMap = {
  [state: string]: {
    [symbol: string]: string[];
  };
};

export function computeEpsilonClosure(
  initialStates: string[] | Set<string>,
  transitions: TransitionMap
): Set<string> {
  const closure = new Set<string>(initialStates);
  const stack = Array.from(initialStates);

  while (stack.length > 0) {
    const currentState = stack.pop()!;
    const stateTransitions = transitions[currentState];
    if (!stateTransitions) continue;

    const epsTargets = stateTransitions[EPSILON] || [];
    for (const target of epsTargets) {
      if (!closure.has(target)) {
        closure.add(target);
        stack.push(target);
      }
    }
  }

  return closure;
}
