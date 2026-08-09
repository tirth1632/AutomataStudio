import type { DFA } from '../../types/dfa';

/**
 * Generates a complete DFA that accepts binary strings representing numbers divisible by `n`.
 * Uses the remainder state machine (state q_r = value mod n).
 */
export function generateBinaryDivisible(n: number): DFA {
  if (n <= 0) throw new Error('Divisor n must be a positive integer.');

  const alphabet = ['0', '1'];
  const states: string[] = [];
  for (let r = 0; r < n; r++) {
    states.push(`q${r}`);
  }

  const transitions: DFA['transitions'] = {};

  for (let r = 0; r < n; r++) {
    const state = `q${r}`;
    transitions[state] = {};

    // Reading '0' shifts binary value left (val * 2) mod n
    const nextRem0 = (2 * r + 0) % n;
    transitions[state]['0'] = `q${nextRem0}`;

    // Reading '1' shifts binary value left and adds 1 (val * 2 + 1) mod n
    const nextRem1 = (2 * r + 1) % n;
    transitions[state]['1'] = `q${nextRem1}`;
  }

  return {
    alphabet,
    states,
    startState: 'q0',
    acceptStates: ['q0'],
    transitions,
  };
}
