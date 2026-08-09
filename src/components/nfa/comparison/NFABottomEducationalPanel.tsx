import React from 'react';
import type { NFA } from '../../../algorithms/nfa/NFA';

export interface NFABottomEducationalPanelProps {
  nfa: NFA;
  toolKey:
    | 'nfa_vs_dfa'
    | 'branch_tree'
    | 'subset_construction'
    | 'epsilon_closure'
    | 'epsilon_elimination'
    | 'simulation_comparison'
    | 'path_explorer'
    | 'state_explosion'
    | 'thompson_construction';
  toolTitle: string;
  customEngineMetrics?: Record<string, string | number>;
}

export const NFABottomEducationalPanel: React.FC<NFABottomEducationalPanelProps> = () => {
  return null;
};
