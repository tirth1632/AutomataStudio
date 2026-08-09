import type { AutomatonGraph } from '../types/automata';

/**
 * Dynamically computes a contextually relevant test string for any given AutomatonGraph.
 * Performs a BFS traversal starting from the start state to find the shortest non-empty
 * accepted string. If no accepted string exists, returns a valid reachable string.
 */
export function getRelevantTestString(graph: AutomatonGraph): string {
  if (!graph || !graph.states || graph.states.length === 0) return '101';

  const startId = graph.states.find((s) => s.isStart)?.id || graph.states[0]?.id;
  if (!startId) return '101';

  const alphabet = graph.alphabet && graph.alphabet.length > 0 ? graph.alphabet : ['0', '1'];
  const acceptSet = new Set(graph.states.filter((s) => s.isAccept).map((s) => s.id));

  const queue: Array<{ state: string; str: string }> = [{ state: startId, str: '' }];
  const visited = new Set<string>();
  visited.add(`${startId}:`);

  let fallbackNonEmpty: string | null = null;
  let emptyAccepted = false;

  while (queue.length > 0) {
    const { state, str } = queue.shift()!;

    const isAccepting = acceptSet.has(state);

    if (str.length > 0) {
      if (isAccepting) {
        return str; // Return shortest non-empty accepted string!
      }
      if (!fallbackNonEmpty) {
        fallbackNonEmpty = str;
      }
    } else if (isAccepting) {
      emptyAccepted = true;
    }

    if (str.length >= 8) continue;

    for (const sym of alphabet) {
      // Find matching transitions (supporting both DFA and NFA symbol matching)
      const edges = graph.transitions.filter(
        (t) => t.source === state && (t.symbols.includes(sym) || t.symbols.includes('ε'))
      );

      for (const e of edges) {
        const addedSym = e.symbols.includes('ε') && !e.symbols.includes(sym) ? '' : sym;
        const nextStr = str + addedSym;
        const key = `${e.target}:${nextStr}`;

        if (!visited.has(key)) {
          visited.add(key);
          queue.push({ state: e.target, str: nextStr });
        }
      }
    }
  }

  if (emptyAccepted) return '';
  return fallbackNonEmpty || '0';
}
