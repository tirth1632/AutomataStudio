import type { NFA } from '../NFA';
import { computeEpsilonClosure } from '../../shared/EpsilonClosure';
import { computeMove } from '../../shared/Move';

export interface NFASimulationStep {
  stepIndex: number;
  activeStates: string[];
  consumedInput: string;
  remainingInput: string;
  currentSymbol: string | null;
  transitionHistory: { from: string; symbol: string; to: string }[];
  isAccepting: boolean;
  isRejected: boolean;
  description: string;
}

export function simulateNFA(nfa: NFA, inputString: string): NFASimulationStep[] {
  const steps: NFASimulationStep[] = [];
  const acceptSet = new Set(nfa.acceptStates);

  let activeSet = computeEpsilonClosure([nfa.startState], nfa.transitions);
  let consumed = '';
  let remaining = inputString;

  const isInitialAccepting = Array.from(activeSet).some((s) => acceptSet.has(s));

  steps.push({
    stepIndex: 0,
    activeStates: Array.from(activeSet).sort(),
    consumedInput: '',
    remainingInput: inputString,
    currentSymbol: inputString.length > 0 ? inputString[0] : null,
    transitionHistory: [],
    isAccepting: inputString.length === 0 && isInitialAccepting,
    isRejected: inputString.length === 0 && !isInitialAccepting,
    description: `Start at ε-closure({${nfa.startState}}) -> {${Array.from(activeSet).join(', ')}}`,
  });

  for (let i = 0; i < inputString.length; i++) {
    const symbol = inputString[i];
    consumed += symbol;
    remaining = inputString.slice(i + 1);

    const moved = computeMove(activeSet, symbol, nfa.transitions);
    const transitionHistory: { from: string; symbol: string; to: string }[] = [];

    for (const s of activeSet) {
      const targets = nfa.transitions[s]?.[symbol] || [];
      for (const t of targets) {
        transitionHistory.push({ from: s, symbol, to: t });
      }
    }

    const nextActiveSet = computeEpsilonClosure(moved, nfa.transitions);
    activeSet = nextActiveSet;

    const isLast = i === inputString.length - 1;
    const hasStates = activeSet.size > 0;
    const isAccepting = isLast && hasStates && Array.from(activeSet).some((s) => acceptSet.has(s));
    const isRejected = isLast && (!hasStates || !Array.from(activeSet).some((s) => acceptSet.has(s)));

    steps.push({
      stepIndex: i + 1,
      activeStates: Array.from(activeSet).sort(),
      consumedInput: consumed,
      remainingInput: remaining,
      currentSymbol: isLast ? null : remaining[0],
      transitionHistory,
      isAccepting,
      isRejected,
      description: hasStates
        ? `Read '${symbol}': Active states -> {${Array.from(activeSet).join(', ')}}`
        : `Read '${symbol}': Dead state! No active paths remaining.`,
    });

    if (!hasStates) {
      break;
    }
  }

  return steps;
}
