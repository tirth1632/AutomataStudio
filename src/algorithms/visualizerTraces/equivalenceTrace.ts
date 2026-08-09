import type { DFA } from '../../types/dfa';
import type { AlgorithmTrace, AlgorithmStep } from '../../types/algorithmVisualizer';
import { DFAOperations } from '../DFAOperations/DFAOperations';
import { dfaToGraph } from '../../utils/dfaAdapter';
import { simulateNFA } from '../nfaSimulator';

export function generateEquivalenceTrace(dfa1: DFA, dfa2: DFA): AlgorithmTrace {
  const steps: AlgorithmStep[] = [];

  // Step 1: Validate DFAs
  steps.push({
    stepNumber: 1,
    title: 'Step 1: Validate Input Automata M1 and M2',
    description: `Comparing M1 (${dfa1.states.length} states) and M2 (${dfa2.states.length} states) for language equivalence L(M1) = L(M2).`,
    explanation: 'Two DFAs M1 and M2 are language equivalent if and only if their symmetric difference L(M1 ⊕ M2) = (L(M1) \\ L(M2)) ∪ (L(M2) \\ L(M1)) is empty (∅).',
    formula: 'L(M1) = L(M2) ⟺ L(M1 ⊕ M2) = ∅',
    rule: 'Check if any string is accepted by one DFA but rejected by the other.',
    complexity: 'O(1)',
    highlightStateIds: [],
    highlightTransitionIds: [],
    generatedGraph: dfaToGraph(dfa1, 'M1 vs M2'),
  });

  // Step 2: Construct Symmetric Difference DFA M_sym = M1 ⊕ M2
  const symDFA = DFAOperations.symmetricDifference(dfa1, dfa2);
  const symGraph = dfaToGraph(symDFA, 'Symmetric Difference (M1 ⊕ M2)');

  steps.push({
    stepNumber: 2,
    title: 'Step 2: Construct Symmetric Difference DFA (M1 ⊕ M2)',
    description: `Constructed product DFA with ${symDFA.states.length} states and ${symDFA.acceptStates.length} accepting states.`,
    explanation: 'Any accepting state in (M1 ⊕ M2) represents a state pair (q, p) where exactly one of q or p is an accepting state.',
    formula: 'F_sym = { (q, p) | (q ∈ F1 ∧ p ∉ F2) ∨ (q ∉ F1 ∧ p ∈ F2) }',
    rule: 'Accepting states in M1 ⊕ M2 highlight language mismatches.',
    complexity: 'O(|Q1| × |Q2|)',
    highlightStateIds: symDFA.acceptStates,
    highlightTransitionIds: [],
    generatedGraph: symGraph,
  });

  // Step 3: Minimize Symmetric Difference & Search for Counterexample
  const isEquiv = DFAOperations.areEquivalent(dfa1, dfa2);
  let counterexampleStr = '';

  if (!isEquiv) {
    // Find shortest counterexample string
    const minSym = DFAOperations.minimize(symDFA);
    if (minSym.acceptStates.length > 0) {
      // Breadth-first search for shortest path to accept state
      const queue: { state: string; path: string }[] = [{ state: minSym.startState, path: '' }];
      const visited = new Set<string>([minSym.startState]);
      while (queue.length > 0) {
        const curr = queue.shift()!;
        if (minSym.acceptStates.includes(curr.state)) {
          counterexampleStr = curr.path;
          break;
        }
        for (const sym of minSym.alphabet) {
          const nxt = minSym.transitions[curr.state]?.[sym];
          if (nxt && !visited.has(nxt)) {
            visited.add(nxt);
            queue.push({ state: nxt, path: curr.path + sym });
          }
        }
      }
    }
  }

  // Path step for counterexample
  const graph1 = dfaToGraph(dfa1, 'DFA M1');
  const sim1 = simulateNFA(graph1, counterexampleStr);
  const path1 = sim1.map((s) => s.currentStateIds[0]);

  steps.push({
    stepNumber: 3,
    title: isEquiv ? 'Step 3: Reachability Analysis — No Accepting States Reachable' : `Step 3: Counterexample Found ("${counterexampleStr}")`,
    description: isEquiv
      ? 'No accepting states are reachable in M1 ⊕ M2. Language Equivalence L(M1) = L(M2) Verified!'
      : `Found counterexample string "${counterexampleStr}" accepted by one DFA and rejected by the other.`,
    explanation: isEquiv
      ? 'Because the symmetric difference language is completely empty, M1 and M2 accept the exact same language.'
      : `String "${counterexampleStr}" traces path [${path1.join(' → ')}] proving L(M1) ≠ L(M2).`,
    formula: isEquiv ? 'L(M1 ⊕ M2) = ∅ ⟹ L(M1) = L(M2)' : `w = "${counterexampleStr}" ∈ L(M1 ⊕ M2)`,
    rule: isEquiv ? 'Equivalence Verified!' : 'DFA Mismatch Confirmed.',
    complexity: 'O(|Q1| × |Q2|)',
    highlightStateIds: isEquiv ? [] : symDFA.acceptStates,
    highlightTransitionIds: [],
    generatedGraph: symGraph,
    counterexamplePath: path1,
  });

  return {
    algorithmType: 'EQUIVALENCE',
    algorithmName: 'DFA Equivalence Verification Algorithm',
    algorithmDescription: 'Determines whether two DFAs accept the exact same language by testing if L(M1 ⊕ M2) = ∅.',
    inputDFA1: dfa1,
    inputDFA2: dfa2,
    resultDFA: symDFA,
    resultGraph: symGraph,
    steps,
    theoryMarkdown: `### DFA Equivalence Decision Procedure\n\nTwo DFAs $M_1$ and $M_2$ are language equivalent $L(M_1) = L(M_2)$ if and only if their symmetric difference $L(M_1 \\oplus M_2) = \\emptyset$.\n\nBecause emptiness of a DFA language is decidable in linear time using BFS/DFS reachability from the start state, DFA equivalence is decidable in $O(|Q_1| \\cdot |Q_2|)$ time.`,
    proofMarkdown: `### Decidability Proof\n\n1. $L(M_1 \\oplus M_2) = (L(M_1) \\setminus L(M_2)) \\cup (L(M_2) \\setminus L(M_1))$.\n2. $L(M_1 \\oplus M_2) = \\emptyset \\iff (L(M_1) \\setminus L(M_2) = \\emptyset) \\land (L(M_2) \\setminus L(M_1) = \\emptyset)$.\n3. $L(M_1 \\setminus L(M_2) = \\emptyset) \\iff L(M_1) \\subseteq L(M_2)$.\n4. Therefore $L(M_1 \\oplus M_2) = \\emptyset \\iff L(M_1) = L(M_2)$.`,
    examples: ['Verifies whether a hand-drawn DFA matches an AI-generated reference DFA', 'Finds shortest counterexample string when DFAs differ'],
    complexityInfo: {
      time: `O(|Q1| × |Q2| × |Σ|)`,
      space: `O(|Q1| × |Q2|)`,
    },
  };
}
