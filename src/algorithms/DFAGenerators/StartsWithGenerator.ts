import type { DFA } from '../../types/dfa';

/**
 * Generates a complete DFA for strings starting with any binary pattern.
 * Uses prefix match states + dead trap state.
 * Works for any binary pattern (e.g., "0", "1", "001", "1010").
 */
export function generateStartsWith(pattern: string, alphabet = ['0', '1']): DFA {
  const k = pattern.length;
  const states: string[] = [];
  for (let i = 0; i <= k; i++) {
    states.push(`q${i}`);
  }
  states.push('q_trap');

  const transitions: DFA['transitions'] = {};

  // Intermediate prefix states q0 .. q{k-1}
  for (let i = 0; i < k; i++) {
    const state = `q${i}`;
    transitions[state] = {};
    const expectedChar = pattern[i];

    for (const char of alphabet) {
      if (char === expectedChar) {
        transitions[state][char] = `q${i + 1}`;
      } else {
        transitions[state][char] = 'q_trap';
      }
    }
  }

  // Accept state q{k} (already matched pattern) -> stays in q{k} on any input
  const acceptState = `q${k}`;
  transitions[acceptState] = {};
  for (const char of alphabet) {
    transitions[acceptState][char] = acceptState;
  }

  // Dead state q_trap -> stays in q_trap on any input
  transitions['q_trap'] = {};
  for (const char of alphabet) {
    transitions['q_trap'][char] = 'q_trap';
  }

  return {
    alphabet,
    states,
    startState: 'q0',
    acceptStates: [acceptState],
    transitions,
  };
}
