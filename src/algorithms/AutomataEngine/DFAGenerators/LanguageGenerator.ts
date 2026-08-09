import type { DFA } from '../../../types/dfa';
import type { EngineIntent, Generator } from '../../../types/intent';

/** Generates the two canonical one-state DFAs: Sigma* and the empty language. */
export class LanguageGenerator implements Generator {
  canHandle(intent: EngineIntent): boolean {
    return intent.type === 'UNIVERSAL' || intent.type === 'EMPTY_LANGUAGE';
  }

  generate(intent: EngineIntent): DFA {
    const alphabet = intent.alphabet?.length ? intent.alphabet : ['0', '1'];
    return {
      alphabet,
      states: ['q0'],
      startState: 'q0',
      acceptStates: intent.type === 'UNIVERSAL' ? ['q0'] : [],
      transitions: { q0: Object.fromEntries(alphabet.map((symbol) => [symbol, 'q0'])) },
    };
  }
}
