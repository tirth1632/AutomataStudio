import type { NFA } from '../NFA';
import type { AutomatonGraph, AutomatonState, AutomatonTransition } from '../../../types/automata';
import { applyDagreLayout } from '../../../services/layoutEngine';

export function nfaToAutomatonGraph(nfa: NFA, name: string = 'Generated NFA'): AutomatonGraph {
  const nodeCount = nfa.states.length;
  const radius = Math.max(160, nodeCount * 45);
  const centerX = 350;
  const centerY = 250;

  const states: AutomatonState[] = nfa.states.map((s, idx) => {
    const angle = (2 * Math.PI * idx) / Math.max(1, nodeCount);
    const x = Math.round(centerX + radius * Math.cos(angle));
    const y = Math.round(centerY + radius * Math.sin(angle));

    return {
      id: s,
      label: s,
      isStart: s === nfa.startState,
      isAccept: nfa.acceptStates.includes(s),
      x,
      y,
    };
  });

  const transitions: AutomatonTransition[] = [];
  let transCounter = 0;

  for (const source of Object.keys(nfa.transitions)) {
    const symMap = nfa.transitions[source] || {};
    const targetSymbolGroup: Record<string, Set<string>> = {};

    for (const sym of Object.keys(symMap)) {
      const targets = symMap[sym] || [];
      for (const target of targets) {
        if (!targetSymbolGroup[target]) {
          targetSymbolGroup[target] = new Set<string>();
        }
        targetSymbolGroup[target].add(sym);
      }
    }

    for (const target of Object.keys(targetSymbolGroup)) {
      const symbols = Array.from(targetSymbolGroup[target]).sort();
      transitions.push({
        id: `t_${source}_${target}_${transCounter++}`,
        source,
        target,
        symbols,
      });
    }
  }

  const rawGraph: AutomatonGraph = {
    id: `nfa_${Date.now()}`,
    name,
    type: 'NFA',
    alphabet: nfa.alphabet,
    states,
    transitions,
  };

  // Apply Dagre left-to-right layout to ensure start state (q0) is on the left
  return applyDagreLayout(rawGraph);
}
