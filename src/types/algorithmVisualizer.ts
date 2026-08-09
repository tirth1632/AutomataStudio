import type { DFA } from './dfa';
import type { AutomatonGraph } from './automata';

export type AlgorithmType =
  | 'UNION'
  | 'INTERSECTION'
  | 'DIFFERENCE'
  | 'SYMMETRIC_DIFFERENCE'
  | 'COMPLEMENT'
  | 'PRODUCT_CONSTRUCTION'
  | 'MINIMIZATION'
  | 'EQUIVALENCE'
  | 'INCLUSION';

export interface AlgorithmStep {
  stepNumber: number;
  title: string;
  description: string;
  explanation: string;
  formula?: string;
  rule?: string;
  complexity?: string;
  highlightStateIds: string[];
  highlightTransitionIds: string[];
  generatedGraph: AutomatonGraph;
  acceptStateRule?: string;
  partitionGroups?: string[][];
  counterexamplePath?: string[];
  notes?: string;
}

export interface AlgorithmTrace {
  algorithmType: AlgorithmType;
  algorithmName: string;
  algorithmDescription: string;
  inputDFA1: DFA;
  inputDFA2?: DFA;
  resultDFA: DFA;
  resultGraph: AutomatonGraph;
  steps: AlgorithmStep[];
  theoryMarkdown: string;
  proofMarkdown: string;
  examples: string[];
  complexityInfo: {
    time: string;
    space: string;
  };
}
