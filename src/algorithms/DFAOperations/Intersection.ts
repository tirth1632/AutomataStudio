import type { DFA } from '../../types/dfa';
import { productConstruction } from './ProductConstruction';

/**
 * Computes the Intersection (L(M1) ∩ L(M2)) of two DFAs.
 * Accepts strings accepted by BOTH dfa1 AND dfa2.
 */
export function intersection(dfa1: DFA, dfa2: DFA): DFA {
  return productConstruction(dfa1, dfa2, 'AND');
}
