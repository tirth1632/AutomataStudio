import type { DFA } from '../../../types/dfa';
import type { EngineIntent, Generator } from '../../../types/intent';

export class BinaryModuloGenerator implements Generator {
  canHandle(intent: EngineIntent): boolean {
    return (
      (intent.type === 'DIVISIBLE_BINARY' || intent.type === 'MODULO_BINARY') &&
      typeof intent.n === 'number'
    );
  }

  generate(intent: EngineIntent): DFA {
    const n = Math.max(1, intent.n ?? 3);
    const targetRemainder = Math.min(n - 1, Math.max(0, intent.remainder ?? 0));
    const alphabet = ['0', '1'];

    const states: string[] = [];
    for (let r = 0; r < n; r++) {
      states.push(`q${r}`);
    }

    const transitions: DFA['transitions'] = {};

    for (let r = 0; r < n; r++) {
      const state = `q${r}`;
      transitions[state] = {};

      transitions[state]['0'] = `q${(2 * r + 0) % n}`;
      transitions[state]['1'] = `q${(2 * r + 1) % n}`;
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
