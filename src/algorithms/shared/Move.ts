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

    for (const [symKey, targets] of Object.entries(stateTrans)) {
      const symList = symKey.split(',').map((s) => s.trim());
      if (symList.includes(symbol) && Array.isArray(targets)) {
        for (const target of targets) {
          result.add(target);
        }
      }
    }
  }

  return result;
}
