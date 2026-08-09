import type { DFA } from '../../../types/dfa';

export interface DFASimulationStep {
  stepIndex: number;
  consumedInput: string;
  currentSymbol: string | null;
  remainingInput: string;
  currentState: string;
  nextState: string | null;
  isAccepting: boolean;
  isRejected: boolean;
}

export interface DFASimulationResult {
  accepted: boolean;
  finalState: string;
  steps: DFASimulationStep[];
}

/**
 * Generic DFA Simulator
 * Algorithm:
 *  current = startState
 *  for each input symbol
 *     current = transitions[current][symbol]
 *  after input
 *     if current in acceptStates accept else reject
 */
export class DFASimulator {
  public static simulate(dfa: DFA, inputString: string): DFASimulationResult {
    const steps: DFASimulationStep[] = [];
    const acceptSet = new Set(dfa.acceptStates);
    let currentState = dfa.startState;

    // Initial step 0
    steps.push({
      stepIndex: 0,
      consumedInput: '',
      currentSymbol: null,
      remainingInput: inputString,
      currentState,
      nextState: null,
      isAccepting: acceptSet.has(currentState) && inputString.length === 0,
      isRejected: false,
    });

    for (let i = 0; i < inputString.length; i++) {
      const symbol = inputString[i];
      const nextState = dfa.transitions[currentState]?.[symbol];

      if (!nextState) {
        // Invalid transition -> Rejected
        steps.push({
          stepIndex: i + 1,
          consumedInput: inputString.slice(0, i + 1),
          currentSymbol: symbol,
          remainingInput: inputString.slice(i + 1),
          currentState,
          nextState: null,
          isAccepting: false,
          isRejected: true,
        });

        return {
          accepted: false,
          finalState: currentState,
          steps,
        };
      }

      currentState = nextState;
      const consumed = inputString.slice(0, i + 1);
      const remaining = inputString.slice(i + 1);
      const isEnd = i === inputString.length - 1;
      const isAcc = isEnd && acceptSet.has(currentState);

      steps.push({
        stepIndex: i + 1,
        consumedInput: consumed,
        currentSymbol: symbol,
        remainingInput: remaining,
        currentState,
        nextState: null,
        isAccepting: isAcc,
        isRejected: isEnd && !isAcc,
      });
    }

    const finalAccepted = acceptSet.has(currentState);

    return {
      accepted: finalAccepted,
      finalState: currentState,
      steps,
    };
  }
}
