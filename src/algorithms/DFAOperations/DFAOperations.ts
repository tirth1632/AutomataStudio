import type { DFA } from '../../types/dfa';
import { complement } from './Complement';
import { productConstruction } from './ProductConstruction';
import { intersection } from './Intersection';
import { union } from './Union';
import { difference } from './Difference';
import { symmetricDifference } from './SymmetricDifference';
import { minimize } from './Minimizer';
import { TrapStateGenerator } from '../AutomataEngine/DFAGenerators/TrapStateGenerator';
import { DFAToRegex } from '../conversion/DFAToRegex';

/**
 * Generic DFA Operations Library
 * Exposes reusable operations that work on ANY valid DFA.
 */
export class DFAOperations {
  public static complement(dfa: DFA): DFA {
    return complement(dfa);
  }

  public static intersection(dfa1: DFA, dfa2: DFA): DFA {
    return intersection(dfa1, dfa2);
  }

  public static union(dfa1: DFA, dfa2: DFA): DFA {
    return union(dfa1, dfa2);
  }

  public static difference(dfa1: DFA, dfa2: DFA): DFA {
    return difference(dfa1, dfa2);
  }

  public static symmetricDifference(dfa1: DFA, dfa2: DFA): DFA {
    return symmetricDifference(dfa1, dfa2);
  }

  public static minimize(dfa: DFA): DFA {
    return minimize(dfa);
  }

  public static validateAndComplete(dfa: DFA): DFA {
    return TrapStateGenerator.completeDFA(dfa);
  }

  public static product(
    dfa1: DFA,
    dfa2: DFA,
    operation: 'AND' | 'OR' | 'DIFF' | 'XOR'
  ): DFA {
    return productConstruction(dfa1, dfa2, operation);
  }

  public static areEquivalent(dfa1: DFA, dfa2: DFA): boolean {
    const diff = symmetricDifference(dfa1, dfa2);
    const minDiff = minimize(diff);
    return minDiff.acceptStates.length === 0;
  }

  public static toRegex(dfa: DFA): string {
    return DFAToRegex.convert(dfa);
  }
}

export {
  complement,
  productConstruction,
  intersection,
  union,
  difference,
  symmetricDifference,
  minimize,
};
