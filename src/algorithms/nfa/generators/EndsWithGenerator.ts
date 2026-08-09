import type { Generator } from './Generator';
import type { Intent } from '../parser/Intent';
import type { NFA } from '../NFA';

export class EndsWithGenerator implements Generator {
  canHandle(intent: Intent): boolean {
    return intent.type === 'ENDS_WITH';
  }

  generate(intent: Intent): NFA {
    const pattern = intent.pattern || '101';
    const alphabet = intent.alphabet || ['0', '1'];
    const n = pattern.length;

    const states: string[] = [];
    for (let i = 0; i <= n; i++) {
      states.push(`q${i}`);
    }

    const startState = 'q0';
    const acceptStates = [`q${n}`];
    const transitions: { [state: string]: { [symbol: string]: string[] } } = {};

    for (const s of states) {
      transitions[s] = {};
    }

    for (const sym of alphabet) {
      transitions['q0'][sym] = ['q0'];
    }

    for (let i = 0; i < n; i++) {
      const sym = pattern[i];
      if (!transitions[`q${i}`][sym]) transitions[`q${i}`][sym] = [];
      transitions[`q${i}`][sym].push(`q${i + 1}`);
    }

    return {
      alphabet,
      states,
      startState,
      acceptStates,
      transitions,
    };
  }
}
