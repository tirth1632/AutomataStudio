import type { NFA } from '../../../types/dfa';
import { computeEpsilonClosure } from './EpsilonClosure';

export interface NFASimulationStep {
  stepIndex: number;
  consumedInput: string;
  currentSymbol: string | null;
  remainingInput: string;
  activeStates: string[];
  isAccepting: boolean;
}

export interface NFASimulationResult {
  accepted: boolean;
  finalStates: string[];
  steps: NFASimulationStep[];
}

export class NFASimulator {
  public static simulate(nfa: NFA, inputString: string): NFASimulationResult {
    const steps: NFASimulationStep[] = [];
    const acceptSet = new Set(nfa.acceptStates);

    let activeSet = computeEpsilonClosure(nfa, nfa.startState);

    steps.push({
      stepIndex: 0,
      consumedInput: '',
      currentSymbol: null,
      remainingInput: inputString,
      activeStates: [...activeSet],
      isAccepting: activeSet.some((st) => acceptSet.has(st)) && inputString.length === 0,
    });

    for (let i = 0; i < inputString.length; i++) {
      const symbol = inputString[i];
      const moveSet = new Set<string>();

      for (const state of activeSet) {
        const targets = nfa.transitions[state]?.[symbol] || [];
        targets.forEach((t) => moveSet.add(t));
      }

      activeSet = computeEpsilonClosure(nfa, Array.from(moveSet));
      const isEnd = i === inputString.length - 1;
      const isAcc = isEnd && activeSet.some((st) => acceptSet.has(st));

      steps.push({
        stepIndex: i + 1,
        consumedInput: inputString.slice(0, i + 1),
        currentSymbol: symbol,
        remainingInput: inputString.slice(i + 1),
        activeStates: [...activeSet],
        isAccepting: isAcc,
      });
    }

    const accepted = activeSet.some((st) => acceptSet.has(st));

    return {
      accepted,
      finalStates: activeSet,
      steps,
    };
  }
}
