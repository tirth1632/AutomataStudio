import type { DFA } from '../../types/dfa';
import type { AlgorithmTrace, AlgorithmStep } from '../../types/algorithmVisualizer';
import { TrapStateGenerator } from '../AutomataEngine/DFAGenerators/TrapStateGenerator';
import { dfaToGraph } from '../../utils/dfaAdapter';

export function generateComplementTrace(dfa: DFA): AlgorithmTrace {
  const steps: AlgorithmStep[] = [];

  // Step 1: Validate input DFA
  steps.push({
    stepNumber: 1,
    title: 'Step 1: Inspect Input Automaton M = (Q, Σ, δ, q0, F)',
    description: `Input DFA has ${dfa.states.length} states and ${dfa.acceptStates.length} accept states over Σ = {${dfa.alphabet.join(', ')}}.`,
    explanation: 'Language complementation requires that the DFA is completely specified for all input symbols in Σ.',
    formula: 'L(M̄) = Σ* \\ L(M)',
    rule: 'Language complement consists of all strings in Σ* that are NOT accepted by M.',
    complexity: 'O(1)',
    highlightStateIds: dfa.states,
    highlightTransitionIds: [],
    generatedGraph: dfaToGraph(dfa, 'Input DFA M'),
    acceptStateRule: `Current accept states F = {${dfa.acceptStates.join(', ')}}`,
  });

  // Step 2: Enforce Complete Transition Function
  const completeDFA = TrapStateGenerator.completeDFA(dfa);
  const addedTrap = completeDFA.states.length > dfa.states.length;

  steps.push({
    stepNumber: 2,
    title: addedTrap ? 'Step 2: Add Trap State (Complete δ)' : 'Step 2: Verify Transition Completeness',
    description: addedTrap
      ? `Added a dead/trap state 'trap' so every state has outgoing transitions for all symbols in Σ.`
      : 'Automaton is already completely specified for all symbols in Σ.',
    explanation: 'A DFA must have a transition defined for every state and symbol pair. Missing transitions implicitly reject, so they must route to an explicit non-accepting trap state before swapping.',
    formula: '∀ q ∈ Q, ∀ a ∈ Σ: δ(q, a) ∈ Q',
    rule: 'Ensure total transition function before swapping accept states.',
    complexity: 'O(|Q| × |Σ|)',
    highlightStateIds: addedTrap ? ['trap'] : [],
    highlightTransitionIds: [],
    generatedGraph: dfaToGraph(completeDFA, 'Complete DFA'),
    acceptStateRule: 'Completed transition table.',
  });

  // Step 3: Swap Accept and Non-Accept States
  const newAcceptStates = completeDFA.states.filter((s) => !completeDFA.acceptStates.includes(s));
  const complementDFA: DFA = {
    ...completeDFA,
    acceptStates: newAcceptStates,
  };

  steps.push({
    stepNumber: 3,
    title: 'Step 3: Swap Accept and Non-Accepting States (F̄ = Q \\ F)',
    description: `Swapped state roles: ${newAcceptStates.length} states are now accepting, and ${completeDFA.acceptStates.length} states are non-accepting.`,
    explanation: 'Every state that previously accepted now rejects, and every state that previously rejected now accepts. The language is inverted.',
    formula: 'F̄ = Q \\ F',
    rule: 'F_new = { q ∈ Q | q ∉ F_old }',
    complexity: 'O(|Q|)',
    highlightStateIds: newAcceptStates,
    highlightTransitionIds: [],
    generatedGraph: dfaToGraph(complementDFA, 'Complemented DFA M̄'),
    acceptStateRule: `New accept states F̄ = {${newAcceptStates.join(', ')}}`,
  });

  return {
    algorithmType: 'COMPLEMENT',
    algorithmName: 'DFA Complement Algorithm (M̄)',
    algorithmDescription: 'Constructs a DFA accepting the exact set of strings rejected by the original DFA M.',
    inputDFA1: dfa,
    resultDFA: complementDFA,
    resultGraph: dfaToGraph(complementDFA, 'Complement DFA M̄'),
    steps,
    theoryMarkdown: `### DFA Language Complement Theory\n\nGiven a complete DFA $M = (Q, \\Sigma, \\delta, q_0, F)$, its complement DFA is $\\overline{M} = (Q, \\Sigma, \\delta, q_0, Q \\setminus F)$.\n\nBecause $M$ is deterministic and complete, $w \\in L(\\overline{M}) \\iff \\delta^*(q_0, w) \\notin F \\iff w \\notin L(M)$.`,
    proofMarkdown: `### Correctness Proof\n\n1. Let $w \\in \\Sigma^*$.\n2. Since $M$ is deterministic and complete, $w$ traces a unique path to a state $q_f = \\delta^*(q_0, w)$.\n3. $w \\in L(M) \\iff q_f \\in F$.\n4. In $\\overline{M}$, the accepting states are $Q \\setminus F$.\n5. Therefore $w \\in L(\\overline{M}) \\iff q_f \\in Q \\setminus F \\iff w \\notin L(M)$.`,
    examples: ['Original: Contains 110 → Complement: Does NOT contain 110', 'Original: Ends with 0 → Complement: Ends with 1'],
    complexityInfo: {
      time: `O(|Q| × |Σ|)`,
      space: `O(|Q|)`,
    },
  };
}
