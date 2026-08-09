import type { DFA } from '../../types/dfa';
import type { AlgorithmTrace, AlgorithmStep } from '../../types/algorithmVisualizer';
import { DFAOperations } from '../DFAOperations/DFAOperations';
import { dfaToGraph } from '../../utils/dfaAdapter';

export function generateMinimizationTrace(dfa: DFA): AlgorithmTrace {
  const steps: AlgorithmStep[] = [];

  // Step 1: Initial Partition P = {F, Q \ F}
  const acceptSet = new Set(dfa.acceptStates);
  const nonAcceptStates = dfa.states.filter((s) => !acceptSet.has(s));

  steps.push({
    stepNumber: 1,
    title: 'Step 1: Initial Partition P0 = { Accepting, Non-Accepting }',
    description: `Split states into 2 equivalence classes: Accepting F = {${dfa.acceptStates.join(', ')}} and Non-Accepting Q \\ F = {${nonAcceptStates.join(', ')}}.`,
    explanation: 'States in F and Q \\ F are distinguishably non-equivalent because one set accepts the empty string ε while the other rejects it.',
    formula: 'P0 = { F, Q \\ F }',
    rule: 'Group accepting states in block 1, non-accepting states in block 2.',
    complexity: 'O(|Q|)',
    highlightStateIds: dfa.acceptStates,
    highlightTransitionIds: [],
    generatedGraph: dfaToGraph(dfa, 'Initial Partition'),
    partitionGroups: [dfa.acceptStates, nonAcceptStates],
    acceptStateRule: 'Initial 2-block partition established.',
  });

  // Execute Hopcroft Minimization Algorithm
  const minDFA = DFAOperations.minimize(dfa);
  const minGraph = dfaToGraph(minDFA, 'DFA (Minimized)');

  const statesReduced = dfa.states.length - minDFA.states.length;
  const reductionPercent = Math.round((statesReduced / dfa.states.length) * 100);

  // Step 2: Partition Refinement Iteration
  steps.push({
    stepNumber: 2,
    title: 'Step 2: Hopcroft Partition Refinement Iteration',
    description: `Refined partitions by checking transition behaviors δ(q, a) across all symbols a ∈ Σ.`,
    explanation: 'If two states in the same partition block transition to different partition blocks on input symbol a, they are distinguishable and must be split.',
    formula: 'q1 ≡ q2 ⟺ ∀ w ∈ Σ*: δ*(q1, w) ∈ F ⟺ δ*(q2, w) ∈ F',
    rule: 'Split partition blocks containing distinguishable state pairs until no further splits are possible.',
    complexity: 'O(|Σ| |Q| log |Q|)',
    highlightStateIds: minDFA.states,
    highlightTransitionIds: [],
    generatedGraph: minGraph,
    acceptStateRule: 'Partitions refined to minimal equivalence classes.',
  });

  // Step 3: Merge Equivalent States & Render Minimal DFA
  steps.push({
    stepNumber: 3,
    title: 'Step 3: Construct Minimal Canonical DFA',
    description: `Collapsed equivalent state partitions into single macro-states. State count reduced by ${statesReduced} states (${reductionPercent}% reduction).`,
    explanation: 'The resulting DFA is proven to be the unique minimum-state DFA recognizing the exact same language (Myhill-Nerode Theorem).',
    formula: '|Q_min| ≤ |Q_orig|',
    rule: 'Each equivalence class becomes a single state in the minimal DFA.',
    complexity: 'O(|Q_min|)',
    highlightStateIds: minDFA.acceptStates,
    highlightTransitionIds: [],
    generatedGraph: minGraph,
    acceptStateRule: `Final minimal accept states = {${minDFA.acceptStates.join(', ')}}`,
  });

  return {
    algorithmType: 'MINIMIZATION',
    algorithmName: 'Hopcroft DFA Minimization Algorithm',
    algorithmDescription: 'Computes the unique minimum-state canonical DFA using Hopcroft partition refinement algorithm.',
    inputDFA1: dfa,
    resultDFA: minDFA,
    resultGraph: minGraph,
    steps,
    theoryMarkdown: `### Hopcroft DFA Minimization Theory\n\nBy the **Myhill-Nerode Theorem**, every regular language $L$ has a unique (up to isomorphism) minimal DFA.\n\nHopcroft's algorithm finds the coarsest partition of states such that no state pair in any block can be distinguished by any string $w \\in \\Sigma^*$.`,
    proofMarkdown: `### Hopcroft Complexity & Correctness\n\n1. Time Complexity: $O(|\\Sigma| \\cdot |Q| \\log |Q|)$.\n2. Space Complexity: $O(|Q| + |E|)$.\n3. Correctness: The algorithm maintains the invariant that all states in any block are $k$-equivalent. Termination occurs when $k$-equivalence equals $\\infty$-equivalence.`,
    examples: ['Combines redundant dead/trap states', 'Collapses equivalent prefix/suffix branches'],
    complexityInfo: {
      time: `O(|Σ| · |Q| log |Q|)`,
      space: `O(|Q|)`,
    },
  };
}
