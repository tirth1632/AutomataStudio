import type { DFA } from '../../../types/dfa';
import type { EngineIntent, Generator } from '../../../types/intent';

export class ModuloLengthGenerator implements Generator {
  canHandle(intent: EngineIntent): boolean {
    return (
      (intent.type === 'DIVISIBLE_LENGTH' || intent.type === 'MODULO_LENGTH') &&
      typeof intent.n === 'number'
    );
  }

  generate(intent: EngineIntent): DFA {
    const n = Math.max(1, intent.n ?? 2);
    const targetRemainder = Math.min(n - 1, Math.max(0, intent.remainder ?? 0));
    const alphabet = ['0', '1'];

    const states: string[] = [];
    for (let i = 0; i < n; i++) {
      states.push(`q${i}`);
    }

    const transitions: DFA['transitions'] = {};

    for (let i = 0; i < n; i++) {
      const state = `q${i}`;
      transitions[state] = {};
      const nextState = `q${(i + 1) % n}`;

      for (const char of alphabet) {
        transitions[state][char] = nextState;
      }
    }

    return {
      alphabet,
      states,
      startState: 'q0',
      acceptStates: [`q${targetRemainder}`],
      transitions,
    };
  }
}
