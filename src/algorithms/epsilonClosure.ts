import type { AutomatonTransition } from '../types/automata';

export const EPSILON_SYMBOLS = new Set(['ε', 'eps', 'epsilon', '']);

export function isEpsilonSymbol(symbol: string): boolean {
  return EPSILON_SYMBOLS.has(symbol.trim());
}

/**
 * Computes the ε-closure for a single state ID in the graph.
 */
export function getEpsilonClosureSingle(
  stateId: string,
  transitions: AutomatonTransition[]
): Set<string> {
  const closure = new Set<string>([stateId]);
  const queue: string[] = [stateId];

  while (queue.length > 0) {
    const current = queue.shift()!;
    // Find all outgoing epsilon transitions from current
    const outgoingEpsilon = transitions.filter(
      (t) => t.source === current && t.symbols.some(isEpsilonSymbol)
    );

    for (const edge of outgoingEpsilon) {
      if (!closure.has(edge.target)) {
        closure.add(edge.target);
        queue.push(edge.target);
      }
    }
  }

  return closure;
}

/**
 * Computes the ε-closure for a set of state IDs.
 */
export function getEpsilonClosureSet(
  stateIds: Iterable<string>,
  transitions: AutomatonTransition[]
): Set<string> {
  const resultSet = new Set<string>();
  for (const id of stateIds) {
    const singleClosure = getEpsilonClosureSingle(id, transitions);
    singleClosure.forEach((st) => resultSet.add(st));
  }
  return resultSet;
}
