import type { DFA } from '../../types/dfa';

/**
 * Generates a complete DFA for strings ending with any binary pattern.
 * Uses suffix construction (KMP-style prefix matching).
 * Works for any binary string pattern (e.g., "0", "1", "101", "010", "11011").
 */
export function generateEndsWith(pattern: string, alphabet = ['0', '1']): DFA {
  const k = pattern.length;
  const states: string[] = [];
  for (let i = 0; i <= k; i++) {
    states.push(`q${i}`);
  }

  const transitions: DFA['transitions'] = {};

  for (let i = 0; i <= k; i++) {
    const state = `q${i}`;
    transitions[state] = {};
    const prefix = pattern.slice(0, i);

    for (const char of alphabet) {
      const candidate = prefix + char;

      // Find the longest suffix of candidate that is a prefix of pattern
      let nextLen = 0;
      for (let len = Math.min(candidate.length, k); len > 0; len--) {
        if (candidate.endsWith(pattern.slice(0, len))) {
          nextLen = len;
          break;
        }
      }

      transitions[state][char] = `q${nextLen}`;
    }
  }

  return {
    alphabet,
    states,
    startState: 'q0',
    acceptStates: [`q${k}`],
    transitions,
  };
}
