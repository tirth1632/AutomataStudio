import type { Generator } from './Generator';
import type { Intent } from '../parser/Intent';
import type { NFA } from '../NFA';

/**
 * AlternatePatternGenerator:
 * Algorithmically generates NFAs accepting alternating patterns:
 * - 010101... (starts with 0, alternates)
 * - 101010... (starts with 1, alternates)
 * - Alternating symbols (starts with 0 or 1, no consecutive equal symbols)
 * - No consecutive equal symbols (same as alternating)
 */
export class AlternatePatternGenerator implements Generator {
  public canHandle(intent: Intent): boolean {
    return intent.type === 'ALTERNATE';
  }

  public generate(intent: Intent): NFA {
    const mode = intent.alternateMode || 'ANY_ALTERNATE';

    if (mode === '01') {
      // Starts with 0 and alternates: 0, 01, 010, 0101...
      // q0: start (accept ε or moves to q01 on 0)
      // q01: last symbol 0
      // q10: last symbol 1
      const states = ['q0', 'q01', 'q10'];
      const startState = 'q0';
      const acceptStates = ['q0', 'q01', 'q10'];
      const transitions: Record<string, Record<string, string[]>> = {
        q0: { '0': ['q01'] },
        q01: { '1': ['q10'] },
        q10: { '0': ['q01'] },
      };

      return { states, alphabet: ['0', '1'], startState, acceptStates, transitions };
    }

    if (mode === '10') {
      // Starts with 1 and alternates: 1, 10, 101, 1010...
      const states = ['q0', 'q10', 'q01'];
      const startState = 'q0';
      const acceptStates = ['q0', 'q10', 'q01'];
      const transitions: Record<string, Record<string, string[]>> = {
        q0: { '1': ['q10'] },
        q10: { '0': ['q01'] },
        q01: { '1': ['q10'] },
      };

      return { states, alphabet: ['0', '1'], startState, acceptStates, transitions };
    }

    // Default: ANY_ALTERNATE or NO_CONSECUTIVE_EQUAL
    // Accepts ε, 0, 1, 01, 10, 010, 101, 0101, 1010...
    const states = ['q0', 'q_last0', 'q_last1'];
    const startState = 'q0';
    const acceptStates = ['q0', 'q_last0', 'q_last1'];
    const transitions: Record<string, Record<string, string[]>> = {
      q0: { '0': ['q_last0'], '1': ['q_last1'] },
      q_last0: { '1': ['q_last1'] },
      q_last1: { '0': ['q_last0'] },
    };

    return { states, alphabet: ['0', '1'], startState, acceptStates, transitions };
  }
}
