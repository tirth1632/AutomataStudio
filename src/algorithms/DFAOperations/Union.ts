import type { DFA } from '../../types/dfa';
import { productConstruction } from './ProductConstruction';

/**
 * Computes the Union (L(M1) ∪ L(M2)) of two DFAs.
 * Accepts strings accepted by dfa1 OR dfa2.
 */
export function union(dfa1: DFA, dfa2: DFA): DFA {
  return productConstruction(dfa1, dfa2, 'OR');
}
