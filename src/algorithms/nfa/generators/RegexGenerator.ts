import type { Generator } from './Generator';
import type { Intent } from '../parser/Intent';
import type { NFA } from '../NFA';
import { compileRegexToNFA } from '../../regex/ThompsonConstruction';

export class RegexGenerator implements Generator {
  canHandle(intent: Intent): boolean {
    return intent.type === 'REGEX';
  }

  generate(intent: Intent): NFA {
    let pattern = (intent.regexStr || intent.pattern || '(0+1)*101').trim();
    pattern = pattern.replace(/^regex\s*:\s*/i, '').replace(/^regex\s+/i, '').trim();
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
