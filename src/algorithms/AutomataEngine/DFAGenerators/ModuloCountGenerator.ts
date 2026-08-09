import type { DFA } from '../../../types/dfa';
import type { EngineIntent, Generator } from '../../../types/intent';

/** Tracks the number of occurrences of one alphabet symbol modulo n. */
export class ModuloCountGenerator implements Generator {
  canHandle(intent: EngineIntent): boolean {
    return intent.type === 'MODULO_COUNT' && typeof intent.n === 'number';
  }

  generate(intent: EngineIntent): DFA {
    const n = Math.max(1, intent.n ?? 1);
    const remainder = Math.max(0, Math.min(n - 1, intent.remainder ?? 0));
    const symbol = intent.symbol ?? '1';
    const alphabet = intent.alphabet?.length ? intent.alphabet : Array.from(new Set(['0', '1', symbol])).sort();
    const states = Array.from({ length: n }, (_, index) => `q${index}`);
    const transitions: DFA['transitions'] = {};
    for (let index = 0; index < n; index++) {
      transitions[`q${index}`] = {};
      for (const input of alphabet) {
        transitions[`q${index}`][input] = input === symbol ? `q${(index + 1) % n}` : `q${index}`;
      }
    }
    return { alphabet, states, startState: 'q0', acceptStates: [`q${remainder}`], transitions };
  }
}
