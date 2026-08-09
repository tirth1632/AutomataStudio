import type { Generator } from './Generator';
import type { Intent } from '../parser/Intent';
import type { NFA } from '../NFA';
import { ExactStringGenerator } from './ExactStringGenerator';
import { unionNFA } from '../operations/Union';

export class FiniteLanguageGenerator implements Generator {
  private exactGen = new ExactStringGenerator();

  canHandle(intent: Intent): boolean {
    return intent.type === 'FINITE_LANGUAGE';
  }

  generate(intent: Intent): NFA {
    const patterns = intent.patterns || ['0', '10', '110'];
    if (patterns.length === 0) {
      return this.exactGen.generate({ type: 'EXACT_STRING', pattern: '' });
    }

    let resultNFA = this.exactGen.generate({ type: 'EXACT_STRING', pattern: patterns[0] });

    for (let i = 1; i < patterns.length; i++) {
      const nextNFA = this.exactGen.generate({ type: 'EXACT_STRING', pattern: patterns[i] });
      resultNFA = unionNFA(resultNFA, nextNFA);
    }

    return resultNFA;
  }
}
