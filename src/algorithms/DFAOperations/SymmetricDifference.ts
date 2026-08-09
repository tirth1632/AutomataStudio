import type { DFA } from '../../types/dfa';
import { productConstruction } from './ProductConstruction';

/**
 * Computes Symmetric Difference (L(M1) Δ L(M2)) / XOR of two DFAs.
 * Accepts strings accepted by EXACTLY ONE DFA.
 */
export function symmetricDifference(dfa1: DFA, dfa2: DFA): DFA {
  return productConstruction(dfa1, dfa2, 'XOR');
}
