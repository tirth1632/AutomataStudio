import type { Generator } from './Generator';
import type { Intent } from '../parser/Intent';
import type { NFA } from '../NFA';

/**
 * CountGenerator:
 * Algorithmically generates NFAs counting occurrences of a target symbol (0 or 1):
 * - Exactly one 0 / 1
 * - Exactly two 0s / 1s
 * - Exactly k 0s / 1s
 * - At least n 0s / 1s
 */
export class CountGenerator implements Generator {
  public canHandle(intent: Intent): boolean {
    return intent.type === 'COUNT';
  }

  public generate(intent: Intent): NFA {
    const sym = intent.symbol || '1';
    const otherSym = sym === '1' ? '0' : '1';
    const k = intent.count || 1;
    const cond = intent.countCondition || 'EXACT';

    if (cond === 'AT_LEAST') {
      // NFA accepting strings with at least k occurrences of sym
      const states: string[] = [];
      for (let i = 0; i <= k; i++) states.push(`q${i}`);
      const startState = 'q0';
      const acceptStates = [`q${k}`];
      const transitions: Record<string, Record<string, string[]>> = {};

      for (const s of states) transitions[s] = {};

      for (let i = 0; i < k; i++) {
        transitions[`q${i}`][otherSym] = [`q${i}`];
        transitions[`q${i}`][sym] = [`q${i + 1}`];
      }

      // qk loops on both symbols
      transitions[`q${k}`]['0'] = [`q${k}`];
      transitions[`q${k}`]['1'] = [`q${k}`];

      return { states, alphabet: ['0', '1'], startState, acceptStates, transitions };
    }

    // Default: EXACTLY k occurrences
    // States: q0, q1, ..., qk (qk is accepting)
    const states: string[] = [];
    for (let i = 0; i <= k; i++) states.push(`q${i}`);
    const startState = 'q0';
    const acceptStates = [`q${k}`];
    const transitions: Record<string, Record<string, string[]>> = {};

    for (const s of states) transitions[s] = {};

    for (let i = 0; i < k; i++) {
      transitions[`q${i}`][otherSym] = [`q${i}`];
      transitions[`q${i}`][sym] = [`q${i + 1}`];
    }

    // qk loops on otherSym only (reading sym again fails acceptance)
    transitions[`q${k}`][otherSym] = [`q${k}`];

    return { states, alphabet: ['0', '1'], startState, acceptStates, transitions };
  }
}
