import type { DFA } from '../../../types/dfa';
import type { EngineIntent, Generator } from '../../../types/intent';

export class EndsWithGenerator implements Generator {
  canHandle(intent: EngineIntent): boolean {
    return intent.type === 'ENDS_WITH' && typeof intent.pattern === 'string';
  }

  generate(intent: EngineIntent): DFA {
    const pattern = intent.pattern || '0';
    const alphabet = intent.alphabet || Array.from(new Set([...['0', '1'], ...pattern])).sort();
    const k = pattern.length;

    const states: string[] = [];
    for (let i = 0; i <= k; i++) {
      states.push(`q${i}`);
    }

    const transitions: DFA['transitions'] = {};

    for (let i = 0; i <= k; i++) {
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

    return {
      alphabet,
      states,
      startState: 'q0',
      acceptStates: [`q${k}`],
      transitions,
    };
  }
}
