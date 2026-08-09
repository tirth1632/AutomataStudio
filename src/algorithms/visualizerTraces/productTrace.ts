import type { DFA } from '../../types/dfa';
import type { AlgorithmTrace, AlgorithmStep, AlgorithmType } from '../../types/algorithmVisualizer';
import { TrapStateGenerator } from '../AutomataEngine/DFAGenerators/TrapStateGenerator';
import { dfaToGraph } from '../../utils/dfaAdapter';

export function generateProductTrace(
  dfa1: DFA,
  dfa2: DFA,
  operation: 'OR' | 'AND' | 'DIFF' | 'XOR'
): AlgorithmTrace {
  const typeMap: Record<string, AlgorithmType> = {
    OR: 'UNION',
    AND: 'INTERSECTION',
    DIFF: 'DIFFERENCE',
    XOR: 'SYMMETRIC_DIFFERENCE',
  };

  const nameMap: Record<string, string> = {
    OR: 'DFA Union Algorithm (A ∪ B)',
    AND: 'DFA Intersection Algorithm (A ∩ B)',
    DIFF: 'DFA Difference Algorithm (A \\ B)',
    XOR: 'DFA Symmetric Difference Algorithm (A ⊕ B)',
  };

  const descMap: Record<string, string> = {
    OR: 'Constructs a Cartesian product DFA accepting strings in L(M1) or L(M2).',
    AND: 'Constructs a Cartesian product DFA accepting strings in both L(M1) and L(M2).',
    DIFF: 'Constructs a Cartesian product DFA accepting strings in L(M1) but not L(M2).',
    XOR: 'Constructs a Cartesian product DFA accepting strings in exactly one of L(M1) or L(M2).',
  };

  const alphabet = Array.from(new Set([...dfa1.alphabet, ...dfa2.alphabet])).sort();
  const dA = TrapStateGenerator.completeDFA({ ...dfa1, alphabet });
  const dB = TrapStateGenerator.completeDFA({ ...dfa2, alphabet });

  const pairName = (q1: string, q2: string) => `(${q1},${q2})`;
  const acceptSet1 = new Set(dA.acceptStates);
  const acceptSet2 = new Set(dB.acceptStates);

  const steps: AlgorithmStep[] = [];
  let currentStepNum = 1;

  // Step 1: Validate DFAs
  steps.push({
    stepNumber: currentStepNum++,
    title: 'Step 1: Validate and Complete Input DFAs',
    description: `Complete M1 (${dA.states.length} states) and M2 (${dB.states.length} states) over combined alphabet Σ = {${alphabet.join(', ')}}.`,
    explanation: 'Cartesian product construction requires complete transition functions δ1 and δ2 for all alphabet symbols.',
    formula: 'Σ = Σ1 ∪ Σ2',
    rule: 'Enforce complete transition tables by adding trap states if necessary.',
    complexity: 'O(|Q1| + |Q2|)',
    highlightStateIds: [],
    highlightTransitionIds: [],
    generatedGraph: dfaToGraph(dA, 'DFA M1'),
    acceptStateRule: 'Initial validation complete.',
  });

  // Step 2: Form Cartesian Product States via BFS Reachability Exploration
  const startState = pairName(dA.startState, dB.startState);
  const queue: string[] = [startState];
  const reachableSet = new Set<string>([startState]);
  const transitions: DFA['transitions'] = {};
  const acceptStates: string[] = [];

  while (queue.length > 0) {
    const currentPair = queue.shift()!;
    transitions[currentPair] = {};

    // Extract q1 and q2
    const match = currentPair.match(/^\(([^,]+),([^)]+)\)$/);
    const q1 = match ? match[1] : dA.startState;
    const q2 = match ? match[2] : dB.startState;

    const isAcc1 = acceptSet1.has(q1);
    const isAcc2 = acceptSet2.has(q2);

    let isAcc = false;
    if (operation === 'OR') isAcc = isAcc1 || isAcc2;
    else if (operation === 'AND') isAcc = isAcc1 && isAcc2;
    else if (operation === 'DIFF') isAcc = isAcc1 && !isAcc2;
    else if (operation === 'XOR') isAcc = (isAcc1 && !isAcc2) || (!isAcc1 && isAcc2);

    if (isAcc) acceptStates.push(currentPair);

    // Compute transitions for all alphabet symbols
    for (const a of alphabet) {
      const nextQ1 = dA.transitions[q1]?.[a] ?? q1;
      const nextQ2 = dB.transitions[q2]?.[a] ?? q2;
      const nextPair = pairName(nextQ1, nextQ2);
      transitions[currentPair][a] = nextPair;

      if (!reachableSet.has(nextPair)) {
        reachableSet.add(nextPair);
        queue.push(nextPair);
      }
    }

    const currentReachableList = Array.from(reachableSet);
    const tempDFA: DFA = {
      states: currentReachableList,
      alphabet,
      transitions: { ...transitions },
      startState,
      acceptStates: [],
    };

    steps.push({
      stepNumber: currentStepNum++,
      title: `Explore Product State ${currentPair}`,
      description: `Constructed state pair ${currentPair} from M1 state '${q1}' and M2 state '${q2}'.`,
      explanation: `State ${currentPair} tracks M1 in state '${q1}' and M2 in state '${q2}'. (${isAcc1 ? 'q1 accepting' : 'q1 non-accepting'}, ${isAcc2 ? 'q2 accepting' : 'q2 non-accepting'}).`,
      formula: `Q_reachable = { ${currentReachableList.join(', ')} }`,
      rule: `Discovered ${reachableSet.size} reachable product states so far starting from ${startState}.`,
      complexity: 'O(|Σ|)',
      highlightStateIds: [currentPair],
      highlightTransitionIds: [],
      generatedGraph: dfaToGraph(tempDFA, 'Product State Space'),
    });
  }

  const reachableStates = Array.from(reachableSet);

  // Step 3: Construct Parallel Transitions Summary
  const highlightTransitions: string[] = [];
  for (const srcPair of reachableStates) {
    for (const a of alphabet) {
      const tgtPair = transitions[srcPair]?.[a];
      if (tgtPair) {
        highlightTransitions.push(`t_${srcPair}_${tgtPair}`);
      }
    }
  }

  const fullTransitionsDFA: DFA = {
    states: reachableStates,
    alphabet,
    transitions,
    startState,
    acceptStates: [],
  };

  steps.push({
    stepNumber: currentStepNum++,
    title: 'Construct Parallel Transition Function δ((q, p), a)',
    description: `Constructed parallel transitions δ((q, p), a) = (δ1(q, a), δ2(p, a)) for all reachable states.`,
    explanation: 'On reading symbol a, the machine transitions to the next state in M1 and the next state in M2 in lockstep.',
    formula: 'δ((q, p), a) = (δ1(q, a), δ2(p, a))',
    rule: 'Compute lockstep transitions across all symbols for reachable states.',
    complexity: 'O(|Q_reachable| × |Σ|)',
    highlightStateIds: reachableStates,
    highlightTransitionIds: highlightTransitions.slice(0, 10),
    generatedGraph: dfaToGraph(fullTransitionsDFA, 'Product Transitions'),
    acceptStateRule: 'Transitions complete. Next step applies accept state condition.',
  });

  // Step 4: Mark Accept States
  const finalResultDFA: DFA = {
    states: reachableStates,
    alphabet,
    transitions,
    startState,
    acceptStates,
  };

  const ruleExplanationMap: Record<string, string> = {
    OR: 'Accepting States Marked: (q, p) is accepting if q ∈ F1 OR p ∈ F2.',
    AND: 'Accepting States Marked: (q, p) is accepting if q ∈ F1 AND p ∈ F2.',
    DIFF: 'Accepting States Marked: (q, p) is accepting if q ∈ F1 AND p ∉ F2.',
    XOR: 'Accepting States Marked: (q, p) is accepting if (q ∈ F1 AND p ∉ F2) OR (q ∉ F1 AND p ∈ F2).',
  };

  steps.push({
    stepNumber: currentStepNum++,
    title: `Identify Accepting States for ${operation}`,
    description: `Identified ${acceptStates.length} accepting states matching the ${operation} condition.`,
    explanation: ruleExplanationMap[operation],
    formula: operation === 'OR' ? 'F = (F1 × Q2) ∪ (Q1 × F2)' : operation === 'AND' ? 'F = F1 × F2' : 'F = F1 \\ F2',
    rule: ruleExplanationMap[operation],
    complexity: 'O(|Q_reachable|)',
    highlightStateIds: acceptStates,
    highlightTransitionIds: [],
    generatedGraph: dfaToGraph(finalResultDFA, 'Final Product DFA'),
    acceptStateRule: ruleExplanationMap[operation],
  });

  return {
    algorithmType: typeMap[operation],
    algorithmName: nameMap[operation],
    algorithmDescription: descMap[operation],
    inputDFA1: dA,
    inputDFA2: dB,
    resultDFA: finalResultDFA,
    resultGraph: dfaToGraph(finalResultDFA, nameMap[operation]),
    steps,
    theoryMarkdown: `### ${nameMap[operation]} Theory\n\nCartesian product construction forms a new DFA $M = (Q, \\Sigma, \\delta, q_0, F)$ that simulates two DFAs $M_1$ and $M_2$ concurrently.`,
    proofMarkdown: `### Mathematical Proof\n\nBy induction on string length $|w|$, $\\delta^*((q_0, p_0), w) = (\\delta_1^*(q_0, w), \\delta_2^*(p_0, w))$. Therefore $M$ accepts $w$ if and only if the specified boolean set condition holds.`,
    examples: ['Accepts strings containing 110 OR ending in 01', 'Constructs minimal product automaton'],
    complexityInfo: {
      time: `O(|Q_reachable| × |Σ|)`,
      space: `O(|Q_reachable|)`,
    },
  };
}
