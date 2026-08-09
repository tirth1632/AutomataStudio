import type { DFA } from '../../../types/dfa';
import type { EngineIntent, Generator } from '../../../types/intent';

export class LengthGenerator implements Generator {
  canHandle(intent: EngineIntent): boolean {
    return intent.type === 'LENGTH_EXACT' || intent.type === 'LENGTH_AT_MOST';
  }

  generate(intent: EngineIntent): DFA {
    const n = intent.n ?? 2;
    const alphabet = ['0', '1'];

    const states: string[] = [];
    for (let i = 0; i <= n; i++) {
      states.push(`q${i}`);
    }
    states.push('q_trap');

    const transitions: DFA['transitions'] = {};

    for (let i = 0; i < n; i++) {
      const state = `q${i}`;
      transitions[state] = {};
      for (const char of alphabet) {
        transitions[state][char] = `q${i + 1}`;
      }
    }

    const stateN = `q${n}`;
    transitions[stateN] = {};
    for (const char of alphabet) {
      transitions[stateN][char] = 'q_trap';
    }

    transitions['q_trap'] = {};
    for (const char of alphabet) {
      transitions['q_trap'][char] = 'q_trap';
    }

    let acceptStates: string[] = [];
    if (intent.type === 'LENGTH_EXACT') {
      acceptStates = [`q${n}`];
    } else {
      // LENGTH_AT_MOST
      acceptStates = states.filter((s) => s !== 'q_trap');
    }

    return {
      alphabet,
      states,
      startState: 'q0',
      acceptStates,
      transitions,
    };
  }
}
