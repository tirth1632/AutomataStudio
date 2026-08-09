import type { Generator } from './Generator';
import type { Intent } from '../parser/Intent';
import type { NFA } from '../NFA';
import { ContainsGenerator } from './ContainsGenerator';
import { ExactStringGenerator } from './ExactStringGenerator';
import { buildNegativeLanguageNFA } from '../operations/NegativeLanguagePipeline';

/**
 * NegativeGenerator:
 * Supports negative language prompts:
 * - "Does NOT Contain 101"
 * - "Does NOT Contain 111"
 * - "Accept all except 101"
 * - "Accept all except 111"
 * - "Accept all except 00"
 *
 * Algorithm:
 * Positive Pattern NFA -> Convert to DFA -> Complement DFA -> Return Result
 */
export class NegativeGenerator implements Generator {
  canHandle(intent: Intent): boolean {
    return intent.type === 'DOES_NOT_CONTAIN' || intent.type === 'ACCEPT_ALL_EXCEPT';
  }

  generate(intent: Intent): NFA {
    const pattern = intent.pattern || intent.negativePattern || '101';

    if (intent.type === 'ACCEPT_ALL_EXCEPT') {
      const positiveNFA = new ExactStringGenerator().generate({
        type: 'EXACT_STRING',
        pattern,
        rawPrompt: intent.rawPrompt,
      });
      return buildNegativeLanguageNFA(positiveNFA);
    }

    // Default: DOES_NOT_CONTAIN
    const positiveNFA = new ContainsGenerator().generate({
      type: 'CONTAINS',
      pattern,
      rawPrompt: intent.rawPrompt,
    });

    return buildNegativeLanguageNFA(positiveNFA);
  }
}
