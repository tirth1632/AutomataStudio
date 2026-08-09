import type { Generator } from './Generator';
import type { Intent } from '../parser/Intent';
import type { NFA } from '../NFA';

export class ContainsGenerator implements Generator {
  canHandle(intent: Intent): boolean {
    return intent.type === 'CONTAINS';
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

    transitions['q0']['ε'] = [];
    for (const sym of alphabet) {
      transitions['q0'][sym] = ['q0'];
    }

    for (let i = 0; i < n; i++) {
      const sym = pattern[i];
      if (!transitions[`q${i}`][sym]) transitions[`q${i}`][sym] = [];
      transitions[`q${i}`][sym].push(`q${i + 1}`);
    }

    for (const sym of alphabet) {
      if (!transitions[`q${n}`][sym]) transitions[`q${n}`][sym] = [];
      if (!transitions[`q${n}`][sym].includes(`q${n}`)) {
        transitions[`q${n}`][sym].push(`q${n}`);
      }
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
