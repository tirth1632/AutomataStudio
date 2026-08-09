import type { DFA } from '../../../types/dfa';
import type { EngineIntent, Generator } from '../../../types/intent';

export class PositionGenerator implements Generator {
  canHandle(intent: EngineIntent): boolean {
    return intent.type === 'POSITION' && typeof intent.position === 'number';
  }

  generate(intent: EngineIntent): DFA {
    const pos = intent.position ?? 1; // 1-indexed position
    const targetSymbol = intent.symbol || '1';
    const alphabet = ['0', '1'];

    const states: string[] = [];
    for (let i = 0; i <= pos; i++) {
      states.push(`q${i}`);
    }
    states.push('q_trap');

    const transitions: DFA['transitions'] = {};

    for (let i = 0; i < pos - 1; i++) {
      const state = `q${i}`;
      transitions[state] = {};
      for (const char of alphabet) {
        transitions[state][char] = `q${i + 1}`;
      }
    }

    // At position pos - 1 (the step leading into position pos):
    const checkState = `q${pos - 1}`;
    transitions[checkState] = {};
    for (const char of alphabet) {
      if (char === targetSymbol) {
        transitions[checkState][char] = `q${pos}`;
      } else {
        transitions[checkState][char] = 'q_trap';
      }
    }

    // Accept state q_pos stays in q_pos for any subsequent symbol
    const acceptState = `q${pos}`;
    transitions[acceptState] = {};
    for (const char of alphabet) {
      transitions[acceptState][char] = acceptState;
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
