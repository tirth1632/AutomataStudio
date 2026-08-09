import type { Generator } from './Generator';
import type { Intent } from '../parser/Intent';
import type { NFA } from '../NFA';

export class ParityGenerator implements Generator {
  canHandle(intent: Intent): boolean {
    return intent.type === 'PARITY';
  }

  generate(intent: Intent): NFA {
    const targetSymbol = intent.paritySymbol || '1';
    const isEven = (intent.parityTarget || 'EVEN') === 'EVEN';
    const alphabet = intent.alphabet || ['0', '1'];

    const states = ['q0', 'q1'];
    const startState = 'q0';
    const acceptStates = isEven ? ['q0'] : ['q1'];

    const transitions: { [state: string]: { [symbol: string]: string[] } } = {
      q0: {},
      q1: {},
    };

    for (const sym of alphabet) {
      if (sym === targetSymbol) {
        transitions['q0'][sym] = ['q1'];
        transitions['q1'][sym] = ['q0'];
      } else {
        transitions['q0'][sym] = ['q0'];
        transitions['q1'][sym] = ['q1'];
      }
    }

    return {
      alphabet,
      states,
      startState,
      acceptStates,
      transitions,
    };
  }
}
