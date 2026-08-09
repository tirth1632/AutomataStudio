import dagre from '@dagrejs/dagre';
import type { AutomatonGraph, AutomatonTransition } from '../types/automata';

export const NODE_WIDTH = 120;
export const NODE_HEIGHT = 80;
const RANKSEP = 180; // horizontal spacing between ranks
const NODESEP = 160; // vertical spacing between nodes on same rank

/**
 * Sanitizes an automaton graph by consolidating multiple transitions
 * between the exact same (source, target) into a single transition object with combined symbols.
 */
export function sanitizeGraphTransitions(graph: AutomatonGraph): AutomatonGraph {
  if (!graph.transitions || graph.transitions.length === 0) return graph;

  const map = new Map<string, { id: string; source: string; target: string; symbols: Set<string> }>();

  for (const t of graph.transitions) {
    const key = `${t.source.trim()}__${t.target.trim()}`;
    if (!map.has(key)) {
      map.set(key, {
        id: `t_${t.source.trim()}_${t.target.trim()}`,
        source: t.source.trim(),
        target: t.target.trim(),
        symbols: new Set((t.symbols || []).map((s) => s.trim())),
      });
    } else {
      const existing = map.get(key)!;
      (t.symbols || []).forEach((s) => existing.symbols.add(s.trim()));
    }
  }

  const cleanTransitions: AutomatonTransition[] = Array.from(map.values()).map((item) => ({
    id: item.id,
    source: item.source,
    target: item.target,
    symbols: Array.from(item.symbols).sort(),
  }));

  return {
    ...graph,
    transitions: cleanTransitions,
  };
}

/**
 * Applies dagre left-to-right layout to an automaton graph.
 * Enforces ranksep = 180, nodesep = 160, rankdir = 'LR'.
 * Automatically consolidates duplicate transitions first.
 */
export function applyDagreLayout(rawGraph: AutomatonGraph): AutomatonGraph {
  if (rawGraph.states.length === 0) return rawGraph;

  const graph = sanitizeGraphTransitions(rawGraph);

  const g = new dagre.graphlib.Graph({ multigraph: true });
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({
    rankdir: 'LR',
    nodesep: NODESEP,
    ranksep: RANKSEP,
    marginx: 100,
    marginy: 100,
    align: 'DL',
  });

  for (const state of graph.states) {
    g.setNode(state.id, { width: NODE_WIDTH, height: NODE_HEIGHT });
  }

  for (const t of graph.transitions) {
    if (t.source !== t.target) {
      g.setEdge(t.source, t.target, {}, t.id);
    }
  }

  dagre.layout(g);

  const laidOutStates = graph.states.map((state) => {
    const node = g.node(state.id);
    if (!node) return state;
    return {
      ...state,
      x: Math.round(node.x - NODE_WIDTH / 2),
      y: Math.round(node.y - NODE_HEIGHT / 2),
    };
  });

  return { ...graph, states: laidOutStates };
}
