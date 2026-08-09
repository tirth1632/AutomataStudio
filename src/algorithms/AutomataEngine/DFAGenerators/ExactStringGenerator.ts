import type { DFA } from '../../../types/dfa';
import type { EngineIntent, Generator } from '../../../types/intent';

export class ExactStringGenerator implements Generator {
  canHandle(intent: EngineIntent): boolean {
    return intent.type === 'EXACT_STRING' && typeof intent.pattern === 'string';
  }

  generate(intent: EngineIntent): DFA {
    const pattern = intent.pattern ?? '';
    const alphabet = intent.alphabet?.length ? intent.alphabet : Array.from(new Set(['0', '1', ...pattern])).sort();
    const k = pattern.length;

    const states: string[] = [];
    for (let i = 0; i <= k; i++) {
      states.push(`q${i}`);
    }
    states.push('q_trap');

    const transitions: DFA['transitions'] = {};

    for (let i = 0; i < k; i++) {
      const state = `q${i}`;
      transitions[state] = {};
      const expected = pattern[i];

      for (const char of alphabet) {
        if (char === expected) {
          transitions[state][char] = `q${i + 1}`;
        } else {
          transitions[state][char] = 'q_trap';
        }
      }
    }

    // Accept state q_k goes to q_trap on any extra symbol
    const acceptState = `q${k}`;
    transitions[acceptState] = {};
    for (const char of alphabet) {
      transitions[acceptState][char] = 'q_trap';
    }

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
}
