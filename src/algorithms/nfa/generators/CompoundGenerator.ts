import type { Generator } from './Generator';
import type { Intent } from '../parser/Intent';
import type { NFA } from '../NFA';

import { unionNFA } from '../operations/Union';
import { intersectNFA } from '../operations/NFAAdvancedOperations';
import { NFAGeneratorRegistry } from './NFAGeneratorRegistry';

/**
 * CompoundGenerator:
 * Algorithmically combines sub-intents for compound queries:
 * - "Contains 101 AND Ends with 11"
 * - "Starts with 10 OR Ends with 001"
 * - "Contains 111 AND Even Length"
 */
export class CompoundGenerator implements Generator {
  public canHandle(intent: Intent): boolean {
    return intent.type === 'COMPOUND' && !!intent.leftIntent && !!intent.rightIntent;
  }

  public generate(intent: Intent): NFA {
    const registry = new NFAGeneratorRegistry();
    const leftNFA = registry.generate(intent.leftIntent!);
    const rightNFA = registry.generate(intent.rightIntent!);

    if (intent.operator === 'OR') {
      return unionNFA(leftNFA, rightNFA);
    }

    // Default: AND operator
    return intersectNFA(leftNFA, rightNFA);
  }
}
