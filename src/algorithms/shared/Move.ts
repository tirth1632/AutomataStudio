import type { TransitionMap } from './EpsilonClosure';

export function computeMove(
  states: Set<string> | string[],
  symbol: string,
  transitions: TransitionMap
): Set<string> {
  const result = new Set<string>();

  for (const state of states) {
    const stateTrans = transitions[state];
    if (!stateTrans) continue;

    const targets = stateTrans[symbol];
    if (targets && Array.isArray(targets)) {
      for (const target of targets) {
        result.add(target);
      }
    }
  }

  return result;
}
