import type { Generator } from './Generator';
import type { Intent } from '../parser/Intent';
import type { NFA } from '../NFA';

/**
 * LastPositionGenerator:
 * Algorithmically generates NFAs checking symbols relative to the end of the input string:
 * - Last symbol is 0 or 1 (posFromEnd = 1)
 * - Second last symbol is 0 or 1 (posFromEnd = 2)
 * - Third symbol from end is 0 or 1 (posFromEnd = 3)
 */
export class LastPositionGenerator implements Generator {
  public canHandle(intent: Intent): boolean {
    return intent.type === 'LAST_POSITION';
  }

  public generate(intent: Intent): NFA {
    const k = intent.lastPositionIndex || 1; // 1 = last, 2 = second last, 3 = third from end
    const targetSym = intent.lastPositionSymbol || '1';

    // Classic NFA non-deterministic structure for k-th symbol from end:
    // q0 loops on '0' and '1'
    // q0 on targetSym non-deterministically transitions to q1
    // q1 -> q2 -> ... -> qk (where qk is accepting)
    const states: string[] = [];
    for (let i = 0; i <= k; i++) states.push(`q${i}`);
    const startState = 'q0';
    const acceptStates = [`q${k}`];
    const transitions: Record<string, Record<string, string[]>> = {};

    for (const s of states) transitions[s] = {};

    // q0 loops on any symbol
    transitions['q0']['0'] = ['q0'];
    transitions['q0']['1'] = ['q0'];

    // q0 non-deterministically branches on targetSym to q1
    transitions['q0'][targetSym] = ['q0', 'q1'];

    // Shift from q1 to qk on any symbol
    for (let i = 1; i < k; i++) {
      transitions[`q${i}`]['0'] = [`q${i + 1}`];
      transitions[`q${i}`]['1'] = [`q${i + 1}`];
    }

    return {
      states,
      alphabet: ['0', '1'],
      startState,
      acceptStates,
      transitions,
    };
  }
}
