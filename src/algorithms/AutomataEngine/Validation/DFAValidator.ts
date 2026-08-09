import type { DFA } from '../../../types/dfa';

export interface DFAValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export class DFAValidator {
  public static validate(dfa: DFA): DFAValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // 1. Alphabet check
    if (!dfa.alphabet || dfa.alphabet.length === 0) {
      errors.push('Alphabet Σ cannot be empty.');
    }

    // 2. State set check
    if (!dfa.states || dfa.states.length === 0) {
      errors.push('State set Q cannot be empty.');
    }

    const stateSet = new Set(dfa.states || []);

    // 3. Start state check
    if (!dfa.startState || !stateSet.has(dfa.startState)) {
      errors.push(`Start state '${dfa.startState}' must be a valid state in Q.`);
    }

    // 4. Accept states check
    if (!dfa.acceptStates) {
      errors.push('Accept states set F cannot be null or undefined.');
    } else {
      for (const acc of dfa.acceptStates) {
        if (!stateSet.has(acc)) {
          errors.push(`Accept state '${acc}' is not in state set Q.`);
        }
      }
      if (dfa.acceptStates.length === 0) {
        warnings.push('No accept states defined — automaton rejects all input strings.');
      }
    }

    // 5. Transition Function δ Completeness & Determinism Check
    if (!dfa.transitions) {
      errors.push('Transition function δ is missing.');
    } else {
      for (const state of dfa.states) {
        const stateTrans = dfa.transitions[state];
        if (!stateTrans) {
          errors.push(`State '${state}' has no defined transition dictionary.`);
          continue;
        }

        for (const symbol of dfa.alphabet) {
          const nextState = stateTrans[symbol];
          if (!nextState) {
            errors.push(`State '${state}' is missing transition for symbol '${symbol}'.`);
          } else if (!stateSet.has(nextState)) {
            errors.push(`State '${state}' transitions on '${symbol}' to invalid state '${nextState}'.`);
          }
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }
}
