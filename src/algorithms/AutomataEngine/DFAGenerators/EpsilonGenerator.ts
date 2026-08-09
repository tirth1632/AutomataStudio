import type { DFA } from '../../../types/dfa';
import type { EngineIntent, Generator } from '../../../types/intent';

export class EpsilonGenerator implements Generator {
  canHandle(intent: EngineIntent): boolean {
    return intent.type === 'EPSILON_ONLY' || intent.type === 'EVERYTHING_EXCEPT_EPSILON';
  }

  generate(intent: EngineIntent): DFA {
    const alphabet = ['0', '1'];

    if (intent.type === 'EPSILON_ONLY') {
      // States: q0 (start, accept), q_trap (reject)
      return {
        alphabet,
        states: ['q0', 'q_trap'],
        startState: 'q0',
        acceptStates: ['q0'],
        transitions: {
          q0: { '0': 'q_trap', '1': 'q_trap' },
          q_trap: { '0': 'q_trap', '1': 'q_trap' },
        },
      };
    }

    // EVERYTHING_EXCEPT_EPSILON
    // States: q0 (start, non-accept), q1 (accept)
    return {
      alphabet,
      states: ['q0', 'q1'],
      startState: 'q0',
      acceptStates: ['q1'],
      transitions: {
        q0: { '0': 'q1', '1': 'q1' },
        q1: { '0': 'q1', '1': 'q1' },
      },
    };
  }
}
