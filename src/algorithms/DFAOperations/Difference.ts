import type { DFA } from '../../types/dfa';
import { productConstruction } from './ProductConstruction';

/**
 * Computes Difference (L(M1) \ L(M2)) of two DFAs.
 * Accepts strings accepted by dfa1 BUT rejected by dfa2.
 */
export function difference(dfa1: DFA, dfa2: DFA): DFA {
  return productConstruction(dfa1, dfa2, 'DIFF');
}
