import type { DFA } from '../../../types/dfa';
import type { EngineIntent, Generator } from '../../../types/intent';

export class EvenOddGenerator implements Generator {
  canHandle(intent: EngineIntent): boolean {
    return [
      'EVEN',
      'ODD',
      'EVEN_EVEN',
      'EVEN_ODD',
      'ODD_EVEN',
      'ODD_ODD',
    ].includes(intent.type);
  }

  generate(intent: EngineIntent): DFA {
    const alphabet = ['0', '1'];

    // Single symbol parity (2 states)
    if (intent.type === 'EVEN' || intent.type === 'ODD') {
      const targetSymbol = intent.symbol || '0';
      const states = ['q0', 'q1'];
      const transitions: DFA['transitions'] = { q0: {}, q1: {} };

      for (const char of alphabet) {
        if (char === targetSymbol) {
          transitions.q0[char] = 'q1';
          transitions.q1[char] = 'q0';
        } else {
          transitions.q0[char] = 'q0';
          transitions.q1[char] = 'q1';
        }
      }

      const acceptStates = intent.type === 'EVEN' ? ['q0'] : ['q1'];

      return { alphabet, states, startState: 'q0', acceptStates, transitions };
    }

    // Two-symbol parity product (4 states: q_EE, q_EO, q_OE, q_OO)
    // q_EE: Even 0s, Even 1s (Start State)
    // q_EO: Even 0s, Odd 1s
    // q_OE: Odd 0s, Even 1s
    // q_OO: Odd 0s, Odd 1s
    const states = ['q_EE', 'q_EO', 'q_OE', 'q_OO'];
    const transitions: DFA['transitions'] = {
      q_EE: { '0': 'q_OE', '1': 'q_EO' },
      q_EO: { '0': 'q_OO', '1': 'q_EE' },
      q_OE: { '0': 'q_EE', '1': 'q_OO' },
      q_OO: { '0': 'q_EO', '1': 'q_OE' },
    };

    let acceptStates: string[] = [];
    if (intent.type === 'EVEN_EVEN') acceptStates = ['q_EE'];
    else if (intent.type === 'EVEN_ODD') acceptStates = ['q_EO'];
    else if (intent.type === 'ODD_EVEN') acceptStates = ['q_OE'];
    else if (intent.type === 'ODD_ODD') acceptStates = ['q_OO'];

    return {
      alphabet,
      states,
      startState: 'q_EE',
      acceptStates,
      transitions,
    };
  }
}
