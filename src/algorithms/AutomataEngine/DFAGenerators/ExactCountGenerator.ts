import type { DFA } from '../../../types/dfa';
import type { EngineIntent, Generator } from '../../../types/intent';

export class ExactCountGenerator implements Generator {
  canHandle(intent: EngineIntent): boolean {
    return intent.type === 'EXACT_COUNT' && typeof intent.count === 'number';
  }

  generate(intent: EngineIntent): DFA {
    const targetSymbol = intent.symbol || '0';
    const count = intent.count ?? 1;
    const alphabet = intent.alphabet || Array.from(new Set([...['0', '1'], targetSymbol])).sort();

    const states: string[] = [];
    for (let i = 0; i <= count; i++) {
      states.push(`q${i}`);
    }
    states.push('q_trap');

    const transitions: DFA['transitions'] = {};

    for (let i = 0; i < count; i++) {
      const state = `q${i}`;
      transitions[state] = {};
      for (const char of alphabet) {
        if (char === targetSymbol) {
          transitions[state][char] = `q${i + 1}`;
        } else {
          transitions[state][char] = state;
        }
      }
    }

    const acceptState = `q${count}`;
    transitions[acceptState] = {};
    for (const char of alphabet) {
      if (char === targetSymbol) {
        transitions[acceptState][char] = 'q_trap';
      } else {
        transitions[acceptState][char] = acceptState;
      }
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
