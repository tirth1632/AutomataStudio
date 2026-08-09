import type { AutomatonGraph } from '../types/automata';
import { generateEndsWith } from '../algorithms/DFAGenerators/EndsWithGenerator';
import { generateEven } from '../algorithms/DFAGenerators/EvenOddGenerator';
import { generateContains } from '../algorithms/DFAGenerators/ContainsGenerator';
import { generateBinaryDivisible } from '../algorithms/DFAGenerators/BinaryDivisibleGenerator';
import { dfaToGraph } from './dfaAdapter';

// Dynamically generated sample automata using real construction algorithms
export const SAMPLE_AUTOMATA: AutomatonGraph[] = [
  {
    ...dfaToGraph(generateEven('1'), 'Even Number of 1s'),
    id: 'sample_even_ones',
    description: 'Accepts binary strings containing an even count of 1s (0, 2, 4, ...).',
  },
  {
    ...dfaToGraph(generateEndsWith('101'), 'Ends with 101'),
    id: 'sample_ends_101',
    description: 'Accepts any binary string that ends with substring 101.',
  },
  {
    ...dfaToGraph(generateContains('110'), 'Contains Substring 110'),
    id: 'sample_contains_110',
    description: 'Accepts any binary string containing substring 110.',
  },
  {
    ...dfaToGraph(generateBinaryDivisible(3), 'Binary Divisible by 3'),
    id: 'sample_div_3',
    description: 'Accepts binary strings representing numbers divisible by 3.',
  },
];
