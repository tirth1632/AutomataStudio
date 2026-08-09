import type { Generator } from './Generator';
import type { Intent } from '../parser/Intent';
import type { NFA } from '../NFA';
import { StartsWithGenerator } from './StartsWithGenerator';

export class PrefixGenerator implements Generator {
  private startsWithGen = new StartsWithGenerator();

  canHandle(intent: Intent): boolean {
    return intent.type === 'PREFIX';
  }

  generate(intent: Intent): NFA {
    return this.startsWithGen.generate({
      ...intent,
      type: 'STARTS_WITH',
    });
  }
}
