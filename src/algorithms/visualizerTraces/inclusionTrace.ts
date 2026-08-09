import type { DFA } from '../../types/dfa';
import type { AlgorithmTrace, AlgorithmStep } from '../../types/algorithmVisualizer';
import { DFAOperations } from '../DFAOperations/DFAOperations';
import { dfaToGraph } from '../../utils/dfaAdapter';

export function generateInclusionTrace(dfa1: DFA, dfa2: DFA): AlgorithmTrace {
  const steps: AlgorithmStep[] = [];

  // Step 1: Formulate Inclusion Proposition L(M1) ⊆ L(M2)
  steps.push({
    stepNumber: 1,
    title: 'Step 1: Formulate Language Inclusion Test L(M1) ⊆ L(M2)',
    description: `Testing if every string accepted by M1 (${dfa1.states.length} states) is also accepted by M2 (${dfa2.states.length} states).`,
    explanation: 'Language inclusion L(M1) ⊆ L(M2) holds if and only if the difference language L(M1) \\ L(M2) = L(M1) ∩ L(M̄2) is empty (∅).',
    formula: 'L(M1) ⊆ L(M2) ⟺ L(M1) \\ L(M2) = ∅',
    rule: 'If any string is in L(M1) but not in L(M2), inclusion fails.',
    complexity: 'O(1)',
    highlightStateIds: [],
    highlightTransitionIds: [],
    generatedGraph: dfaToGraph(dfa1, 'M1 ⊆ M2 Test'),
  });

  // Step 2: Construct Difference DFA M_diff = M1 \ M2
  const diffDFA = DFAOperations.difference(dfa1, dfa2);
  const minDiff = DFAOperations.minimize(diffDFA);
  const isIncluded = minDiff.acceptStates.length === 0;
  const diffGraph = dfaToGraph(diffDFA, 'Difference (M1 \\ M2)');

  steps.push({
    stepNumber: 2,
    title: 'Step 2: Construct Difference Automaton M1 \\ M2 = M1 ∩ M̄2',
    description: `Constructed product DFA with ${diffDFA.states.length} states and ${diffDFA.acceptStates.length} accepting states.`,
    explanation: 'An accepting state in M1 \\ M2 corresponds to a state pair (q, p) where q ∈ F1 (accepted by M1) and p ∉ F2 (rejected by M2).',
    formula: 'F_diff = { (q, p) | q ∈ F1 ∧ p ∉ F2 }',
    rule: 'Difference DFA accepts all counterexample strings violating inclusion.',
    complexity: 'O(|Q1| × |Q2|)',
    highlightStateIds: diffDFA.acceptStates,
    highlightTransitionIds: [],
    generatedGraph: diffGraph,
  });

  // Step 3: Check Reachability of Counterexample
  steps.push({
    stepNumber: 3,
    title: isIncluded ? 'Step 3: Reachability Search — L(M1 \\ M2) = ∅' : 'Step 3: Counterexample Violation Found',
    description: isIncluded
      ? 'No accepting state is reachable in M1 \\ M2. Language Inclusion L(M1) ⊆ L(M2) VERIFIED!'
      : 'Accepting state is reachable in M1 \\ M2. Language Inclusion L(M1) ⊆ L(M2) FAILS!',
    explanation: isIncluded
      ? 'Every string accepted by M1 is guaranteed to be accepted by M2.'
      : 'Found a string in L(M1) that is rejected by M2.',
    formula: isIncluded ? 'L(M1) \\ L(M2) = ∅ ⟹ L(M1) ⊆ L(M2)' : 'L(M1) \\ L(M2) ≠ ∅ ⟹ L(M1) ⊄ L(M2)',
    rule: isIncluded ? 'Inclusion Verified!' : 'Inclusion Violations Detected.',
    complexity: 'O(|Q1| × |Q2|)',
    highlightStateIds: isIncluded ? [] : diffDFA.acceptStates,
    highlightTransitionIds: [],
    generatedGraph: diffGraph,
  });

  return {
    algorithmType: 'INCLUSION',
    algorithmName: 'DFA Language Inclusion Algorithm (L(M1) ⊆ L(M2))',
    algorithmDescription: 'Verifies whether the language accepted by M1 is a subset of the language accepted by M2.',
    inputDFA1: dfa1,
    inputDFA2: dfa2,
    resultDFA: diffDFA,
    resultGraph: diffGraph,
    steps,
    theoryMarkdown: `### Language Inclusion Theory\n\nFor two regular languages $L_1$ and $L_2$, $L_1 \\subseteq L_2 \\iff L_1 \\setminus L_2 = \\emptyset$.\n\nSince regular languages are closed under complementation and intersection, $L_1 \\setminus L_2 = L_1 \\cap \\overline{L_2}$ is regular, and its emptiness is decidable via BFS/DFS reachability.`,
    proofMarkdown: `### Proof of Subset Decidability\n\n1. Let $w \\in L_1 \\setminus L_2$.\n2. $w \\in L_1 \\land w \\notin L_2$.\n3. $w \\in L(M_1 \\cap \\overline{M_2})$.\n4. Thus $L_1 \\subseteq L_2 \\iff L(M_1 \\cap \\overline{M_2}) = \\emptyset$.`,
    examples: ['Subset verification for specification compliance', 'Checks if a sub-language is fully covered by a target grammar'],
    complexityInfo: {
      time: `O(|Q1| × |Q2| × |Σ|)`,
      space: `O(|Q1| × |Q2|)`,
    },
  };
}
