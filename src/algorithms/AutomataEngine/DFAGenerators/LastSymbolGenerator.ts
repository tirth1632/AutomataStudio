import type { DFA } from '../../../types/dfa';
import type { EngineIntent, Generator } from '../../../types/intent';

export class LastSymbolGenerator implements Generator {
  canHandle(intent: EngineIntent): boolean {
    return intent.type === 'LAST_SYMBOL';
  }

  generate(intent: EngineIntent): DFA {
    const targetSymbol = intent.symbol || '0';
    const alphabet = ['0', '1'];

    // States: q_start plus one state for each symbol in alphabet
    const states = ['q_start', ...alphabet.map((c) => `q_${c}`)];
    const transitions: DFA['transitions'] = {};

    transitions['q_start'] = {};
    for (const char of alphabet) {
      transitions['q_start'][char] = `q_${char}`;
    }

    for (const s of alphabet) {
      const stateName = `q_${s}`;
      transitions[stateName] = {};
      for (const char of alphabet) {
        transitions[stateName][char] = `q_${char}`;
      }
    }

    const acceptState = `q_${targetSymbol}`;

    return {
      alphabet,
      states,
      startState: 'q_start',
      acceptStates: [acceptState],
      transitions,
    };
  }
}
