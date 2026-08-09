import type { Generator } from './Generator';
import type { Intent } from '../parser/Intent';
import type { NFA } from '../NFA';

export class ExactStringGenerator implements Generator {
  canHandle(intent: Intent): boolean {
    return intent.type === 'EXACT_STRING';
  }

  generate(intent: Intent): NFA {
    const pattern = intent.pattern !== undefined ? intent.pattern : '101';
    const alphabet = intent.alphabet || ['0', '1'];

    if (pattern === '' || pattern === 'ε') {
      return {
        alphabet,
        states: ['q0'],
        startState: 'q0',
        acceptStates: ['q0'],
        transitions: { q0: {} },
      };
    }

    const n = pattern.length;
    const states: string[] = [];
    for (let i = 0; i <= n; i++) {
      states.push(`q${i}`);
    }

    const transitions: { [state: string]: { [symbol: string]: string[] } } = {};
    for (const s of states) {
      transitions[s] = {};
    }

    for (let i = 0; i < n; i++) {
      const sym = pattern[i];
      transitions[`q${i}`][sym] = [`q${i + 1}`];
    }

    return {
      alphabet,
      states,
      startState: 'q0',
      acceptStates: [`q${n}`],
      transitions,
    };
  }
}
