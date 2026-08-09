import type { DFA } from '../../types/dfa';

/**
 * Generates a complete DFA for strings containing any binary substring pattern.
 * Uses KMP-style prefix matching with an absorbing accept state.
 * Works for any binary pattern (e.g., "00", "101", "0110").
 */
export function generateContains(pattern: string, alphabet = ['0', '1']): DFA {
  const k = pattern.length;
  const states: string[] = [];
  for (let i = 0; i <= k; i++) {
    states.push(`q${i}`);
  }

  const transitions: DFA['transitions'] = {};

  for (let i = 0; i < k; i++) {
    const state = `q${i}`;
    transitions[state] = {};
    const prefix = pattern.slice(0, i);

    for (const char of alphabet) {
      const candidate = prefix + char;

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

  // Accept state q{k} -> absorbing state (once contained, always contained)
  const acceptState = `q${k}`;
  transitions[acceptState] = {};
  for (const char of alphabet) {
    transitions[acceptState][char] = acceptState;
  }

  return {
    alphabet,
    states,
    startState: 'q0',
    acceptStates: [acceptState],
    transitions,
  };
}
