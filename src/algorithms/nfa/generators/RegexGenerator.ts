import type { Generator } from './Generator';
import type { Intent } from '../parser/Intent';
import type { NFA } from '../NFA';
import { compileRegexToNFA } from '../../regex/ThompsonConstruction';

export class RegexGenerator implements Generator {
  canHandle(intent: Intent): boolean {
    return intent.type === 'REGEX';
  }

  generate(intent: Intent): NFA {
    const pattern = intent.regexStr || intent.pattern || '(0+1)*101';
    const raw = compileRegexToNFA(pattern);

    return {
      alphabet: raw.alphabet,
      states: raw.states,
      startState: raw.startState,
      acceptStates: raw.acceptStates,
      transitions: raw.transitions,
    };
  }
}
