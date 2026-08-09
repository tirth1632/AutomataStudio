import type { DFA } from '../../types/dfa';

/**
 * Generates a complete DFA that accepts strings with an EVEN count of a specific symbol.
 */
export function generateEven(targetSymbol: string, alphabet = ['0', '1']): DFA {
  const states = ['q0', 'q1'];
  const transitions: DFA['transitions'] = {
    q0: {},
    q1: {},
  };

  for (const char of alphabet) {
    if (char === targetSymbol) {
      transitions.q0[char] = 'q1';
      transitions.q1[char] = 'q0';
    } else {
      transitions.q0[char] = 'q0';
      transitions.q1[char] = 'q1';
    }
  }

  return {
    alphabet,
    states,
    startState: 'q0',
    acceptStates: ['q0'], // q0 represents even count (0, 2, 4, ...)
    transitions,
  };
}

/**
 * Generates a complete DFA that accepts strings with an ODD count of a specific symbol.
 */
export function generateOdd(targetSymbol: string, alphabet = ['0', '1']): DFA {
  const dfa = generateEven(targetSymbol, alphabet);
  return {
    ...dfa,
    acceptStates: ['q1'], // q1 represents odd count (1, 3, 5, ...)
  };
}
