import type { NFA } from '../../../types/dfa';

/**
 * Computes ε-closure for a single state or set of states in an NFA.
 * ε-closure(S) = set of states reachable from S taking 0 or more ε (epsilon) transitions.
 */
export function computeEpsilonClosure(
  nfa: NFA,
  states: string | string[],
  epsilonSymbol: string = 'ε'
): string[] {
  const initialStates = Array.isArray(states) ? states : [states];
  const closureSet = new Set<string>(initialStates);
  const queue: string[] = [...initialStates];

  while (queue.length > 0) {
    const current = queue.shift()!;
    const epsTargets = nfa.transitions[current]?.[epsilonSymbol] || [];

    for (const target of epsTargets) {
      if (!closureSet.has(target)) {
        closureSet.add(target);
        queue.push(target);
      }
    }
  }

  return Array.from(closureSet).sort();
}
