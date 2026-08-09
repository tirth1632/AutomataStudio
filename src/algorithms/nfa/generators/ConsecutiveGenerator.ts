import type { Generator } from './Generator';
import type { Intent } from '../parser/Intent';
import type { NFA } from '../NFA';

/**
 * ConsecutiveGenerator:
 * Generates NFAs for consecutive symbol constraints dynamically:
 * - Contains consecutive sequence (e.g., 11, 00, 111, 000)
 * - Contains EXACTLY k consecutive symbols (and no run of k+1 or more)
 * - Contains NO consecutive symbols (e.g., no 11 or no 00)
 */
export class ConsecutiveGenerator implements Generator {
  public canHandle(intent: Intent): boolean {
    return intent.type === 'CONSECUTIVE';
  }

  public generate(intent: Intent): NFA {
    const symbol = intent.consecutiveSymbol || '1';
    const otherSymbol = symbol === '1' ? '0' : '1';
    const len = intent.consecutiveLength || 2;
    const mode = intent.consecutiveMode || 'CONTAINS';

    if (mode === 'NO_CONSECUTIVE') {
      const states: string[] = [];
      for (let i = 0; i < len; i++) states.push(`q${i}`);
      const startState = 'q0';
      const acceptStates = [...states];
      const transitions: Record<string, Record<string, string[]>> = {};

      for (let i = 0; i < len; i++) {
        transitions[`q${i}`] = {};
        transitions[`q${i}`][otherSymbol] = ['q0'];
        if (i < len - 1) {
          transitions[`q${i}`][symbol] = [`q${i + 1}`];
        }
      }

      return {
        states,
        alphabet: ['0', '1'],
        startState,
        acceptStates,
        transitions,
      };
    }

    if (mode === 'EXACT') {
      const states: string[] = [];
      for (let i = 0; i <= len + 2; i++) states.push(`q${i}`);
      const startState = 'q0';
      const acceptStates = [`q${len}`, `q${len + 2}`];
      const transitions: Record<string, Record<string, string[]>> = {};

      for (const s of states) transitions[s] = {};

      transitions['q0'][otherSymbol] = ['q0'];
      transitions['q0'][symbol] = ['q0', 'q1'];

      for (let i = 1; i < len; i++) {
        transitions[`q${i}`][symbol] = [`q${i + 1}`];
      }

      transitions[`q${len}`][otherSymbol] = [`q${len + 2}`];
      transitions[`q${len}`][symbol] = [`q${len + 1}`];

      transitions[`q${len + 1}`][symbol] = [`q${len + 1}`];
      transitions[`q${len + 1}`][otherSymbol] = ['q0'];

      transitions[`q${len + 2}`][symbol] = [`q${len + 2}`];
      transitions[`q${len + 2}`][otherSymbol] = [`q${len + 2}`];

      return {
        states,
        alphabet: ['0', '1'],
        startState,
        acceptStates,
        transitions,
      };
    }

    // Default: CONTAINS
    const states: string[] = [];
    for (let i = 0; i <= len; i++) states.push(`q${i}`);
    const startState = 'q0';
    const acceptStates = [`q${len}`];
    const transitions: Record<string, Record<string, string[]>> = {};

    for (const s of states) transitions[s] = {};

    transitions['q0'][otherSymbol] = ['q0'];
    transitions['q0'][symbol] = ['q0', 'q1'];

    for (let i = 1; i < len; i++) {
      transitions[`q${i}`][symbol] = [`q${i + 1}`];
    }

    transitions[`q${len}`]['0'] = [`q${len}`];
    transitions[`q${len}`]['1'] = [`q${len}`];

    return {
      states,
      alphabet: ['0', '1'],
      startState,
      acceptStates,
      transitions,
    };
  }
}
