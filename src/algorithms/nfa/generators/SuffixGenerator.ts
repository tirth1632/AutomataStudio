import type { Generator } from './Generator';
import type { Intent } from '../parser/Intent';
import type { NFA } from '../NFA';
import { EndsWithGenerator } from './EndsWithGenerator';

export class SuffixGenerator implements Generator {
  private endsWithGen = new EndsWithGenerator();

  canHandle(intent: Intent): boolean {
    return intent.type === 'SUFFIX';
  }

  generate(intent: Intent): NFA {
    return this.endsWithGen.generate({
      ...intent,
      type: 'ENDS_WITH',
    });
  }
}
