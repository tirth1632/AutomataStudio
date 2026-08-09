import type { TransitionMap } from './EpsilonClosure';

export function findReachableStates(
  startState: string,
  transitions: TransitionMap
): Set<string> {
  const reachable = new Set<string>([startState]);
  const queue = [startState];

  while (queue.length > 0) {
    const current = queue.shift()!;
    const stateTrans = transitions[current];
    if (!stateTrans) continue;

    for (const symbol of Object.keys(stateTrans)) {
      const targets = stateTrans[symbol] || [];
      for (const target of targets) {
        if (!reachable.has(target)) {
          reachable.add(target);
          queue.push(target);
        }
      }
    }
  }

  return reachable;
}
