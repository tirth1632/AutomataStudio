import type { DFA } from '../../types/dfa';

/**
 * Generates a complete DFA that accepts strings containing EXPACTLY `count` occurrences of `targetSymbol`.
 */
export function generateExactCount(targetSymbol: string, count: number, alphabet = ['0', '1']): DFA {
  const states: string[] = [];
  for (let i = 0; i <= count; i++) {
    states.push(`q${i}`);
  }
  states.push('q_trap');

  const transitions: DFA['transitions'] = {};

  // States q0 .. q{count-1}
  for (let i = 0; i < count; i++) {
    const state = `q${i}`;
    transitions[state] = {};
    for (const char of alphabet) {
      if (char === targetSymbol) {
        transitions[state][char] = `q${i + 1}`;
      } else {
        transitions[state][char] = state;
      }
    }
  }

  // Exact count reached state q{count}
  const acceptState = `q${count}`;
  transitions[acceptState] = {};
  for (const char of alphabet) {
    if (char === targetSymbol) {
      transitions[acceptState][char] = 'q_trap'; // Exceeds exact count
    } else {
      transitions[acceptState][char] = acceptState;
    }
  }

  // Trap state q_trap
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
