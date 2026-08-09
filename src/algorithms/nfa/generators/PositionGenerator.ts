import type { Generator } from './Generator';
import type { Intent } from '../parser/Intent';
import type { NFA } from '../NFA';

/**
 * PositionGenerator:
 * Algorithmically generates NFAs checking specific 1-based position symbols:
 * - 1st symbol is 0 or 1
 * - 2nd symbol is 0 or 1
 * - 3rd symbol is 0 or 1
 * - 4th symbol is 0 or 1
 */
export class PositionGenerator implements Generator {
  public canHandle(intent: Intent): boolean {
    return intent.type === 'POSITION';
  }

  public generate(intent: Intent): NFA {
    const pos = intent.positionIndex || 1;
    const targetSym = intent.positionSymbol || '0';

    const states: string[] = [];
    for (let i = 0; i <= pos; i++) states.push(`q${i}`);
    const startState = 'q0';
    const acceptStates = [`q${pos}`];
    const transitions: Record<string, Record<string, string[]>> = {};

    for (const s of states) transitions[s] = {};

    for (let i = 0; i < pos - 1; i++) {
      transitions[`q${i}`]['0'] = [`q${i + 1}`];
      transitions[`q${i}`]['1'] = [`q${i + 1}`];
    }

    const checkState = `q${pos - 1}`;
    transitions[checkState][targetSym] = [`q${pos}`];

    transitions[`q${pos}`]['0'] = [`q${pos}`];
    transitions[`q${pos}`]['1'] = [`q${pos}`];

    return {
      states,
      alphabet: ['0', '1'],
      startState,
      acceptStates,
      transitions,
    };
  }
}
