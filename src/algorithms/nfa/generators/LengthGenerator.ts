import type { Generator } from './Generator';
import type { Intent } from '../parser/Intent';
import type { NFA } from '../NFA';

export class LengthGenerator implements Generator {
  canHandle(intent: Intent): boolean {
    return intent.type === 'LENGTH';
  }

  generate(intent: Intent): NFA {
    const cond = intent.lengthCondition || 'EXACT';
    const n = intent.lengthVal ?? 3;
    const m = intent.modVal ?? 2;
    const alphabet = intent.alphabet || ['0', '1'];

    if (cond === 'EVEN' || cond === 'ODD' || cond === 'MOD') {
      const mod = cond === 'EVEN' || cond === 'ODD' ? 2 : m;
      const targetRem = cond === 'EVEN' ? 0 : cond === 'ODD' ? 1 : (n % mod);

      const states: string[] = [];
      for (let i = 0; i < mod; i++) states.push(`q${i}`);

      const transitions: { [state: string]: { [symbol: string]: string[] } } = {};
      for (const s of states) transitions[s] = {};

      for (let i = 0; i < mod; i++) {
        const nextState = `q${(i + 1) % mod}`;
        for (const sym of alphabet) {
          transitions[`q${i}`][sym] = [nextState];
        }
      }

      return {
        alphabet,
        states,
        startState: 'q0',
        acceptStates: [`q${targetRem}`],
        transitions,
      };
    }

    if (cond === 'EXACT') {
      const states: string[] = [];
      for (let i = 0; i <= n; i++) states.push(`q${i}`);
      const transitions: { [state: string]: { [symbol: string]: string[] } } = {};
      for (const s of states) transitions[s] = {};

      for (let i = 0; i < n; i++) {
        for (const sym of alphabet) {
          transitions[`q${i}`][sym] = [`q${i + 1}`];
        }
      }

      return {
        alphabet,
        states,
        startState: 'q0',
        acceptStates: [`q${n}`],
        transitions,
      };
    }

    if (cond === 'AT_MOST') {
      const states: string[] = [];
      for (let i = 0; i <= n; i++) states.push(`q${i}`);
      const transitions: { [state: string]: { [symbol: string]: string[] } } = {};
      for (const s of states) transitions[s] = {};

      for (let i = 0; i < n; i++) {
        for (const sym of alphabet) {
          transitions[`q${i}`][sym] = [`q${i + 1}`];
        }
      }

      return {
        alphabet,
        states,
        startState: 'q0',
        acceptStates: states,
        transitions,
      };
    }

    const states: string[] = [];
    for (let i = 0; i <= n; i++) states.push(`q${i}`);
    const transitions: { [state: string]: { [symbol: string]: string[] } } = {};
    for (const s of states) transitions[s] = {};

    for (let i = 0; i < n; i++) {
      for (const sym of alphabet) {
        transitions[`q${i}`][sym] = [`q${i + 1}`];
      }
    }
    for (const sym of alphabet) {
      transitions[`q${n}`][sym] = [`q${n}`];
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
