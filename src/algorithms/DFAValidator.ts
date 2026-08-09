import type { DFA } from '../types/dfa';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export function validateDFA(dfa: DFA): ValidationResult {
  const errors: string[] = [];

  // 1. Validate start state
  if (!dfa.startState) {
    errors.push('DFA must have a start state.');
  } else if (!dfa.states.includes(dfa.startState)) {
    errors.push(`Start state '${dfa.startState}' is not included in the states list.`);
  }

  // 2. Validate accept states
  if (!dfa.acceptStates || dfa.acceptStates.length === 0) {
    errors.push('DFA must have at least one accept state.');
  } else {
    for (const acc of dfa.acceptStates) {
      if (!dfa.states.includes(acc)) {
        errors.push(`Accept state '${acc}' is not included in the states list.`);
      }
    }
  }

  // 3. Validate alphabet
  if (!dfa.alphabet || dfa.alphabet.length === 0) {
    errors.push('DFA alphabet cannot be empty.');
  }

  // 4. Validate transitions completeness (states × alphabet size)
  const expectedTotal = dfa.states.length * dfa.alphabet.length;
  let transitionCount = 0;

  for (const state of dfa.states) {
    const stateTransitions = dfa.transitions[state];
    if (!stateTransitions) {
      errors.push(`State '${state}' has no transitions defined.`);
      continue;
    }

    for (const symbol of dfa.alphabet) {
      const nextState = stateTransitions[symbol];
      if (nextState === undefined || nextState === null || nextState === '') {
        errors.push(`State '${state}' is missing outgoing transition for symbol '${symbol}'.`);
      } else if (!dfa.states.includes(nextState)) {
        errors.push(`State '${state}' on symbol '${symbol}' transitions to unknown state '${nextState}'.`);
      } else {
        transitionCount++;
      }
    }

    // Check for extraneous symbols in transition table
    for (const sym of Object.keys(stateTransitions)) {
      if (!dfa.alphabet.includes(sym)) {
        errors.push(`State '${state}' has transition on symbol '${sym}' which is not in the alphabet.`);
      }
    }
  }

  if (transitionCount !== expectedTotal && errors.length === 0) {
    errors.push(`DFA total valid transitions (${transitionCount}) does not match expected (${expectedTotal} = ${dfa.states.length} states × ${dfa.alphabet.length} symbols).`);
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}
