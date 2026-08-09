import type { PromptItem } from '../components/common/ScrollablePromptRow';

/**
 * Theory of Computation DFA & NFA Concept Prompts.
 * Includes representative question prompts for all core and advanced automata concepts.
 */
export const ALL_AUTOMATA_PROMPTS: PromptItem[] = [
  // Basic Substring & Fixed Position
  { category: 'Suffix', label: 'Ends with 0', prompt: 'ends with 0' },
  { category: 'Prefix', label: 'Starts with 001', prompt: 'starts with 001' },
  { category: 'Substring', label: 'Contains 110', prompt: 'contains 110' },

  // Consecutive & Avoidance
  { category: 'Consecutive', label: 'Contains 111', prompt: 'contains 111' },
  { category: 'Avoidance', label: 'Does NOT Contain 101', prompt: 'does not contain 101' },
  { category: 'Avoidance', label: 'No consecutive 1s', prompt: 'no consecutive 1s' },
  { category: 'Avoidance', label: 'No consecutive 0s', prompt: 'no consecutive 0s' },

  // Positional & Relative Indexing
  { category: 'Position', label: 'First symbol is 1', prompt: 'first symbol is 1' },
  { category: 'Position', label: 'Second symbol is 0', prompt: 'second symbol is 0' },
  { category: 'Last Position', label: '2nd last is 1', prompt: 'second last symbol is 1' },
  { category: 'Last Position', label: '3rd from end is 1', prompt: 'third symbol from the end is 1' },

  // Alternating & Patterns
  { category: 'Alternating', label: 'Alternating 0s & 1s', prompt: 'alternating 0s and 1s' },

  // Counting & Occurrences
  { category: 'Count', label: 'Exactly two 1s', prompt: 'exactly two 1s' },
  { category: 'Count', label: 'Exactly three 1s', prompt: 'exactly three 1s' },
  { category: 'Occurrence', label: 'Exactly 2 of 101', prompt: 'exactly two occurrences of 101' },
  { category: 'Occurrence', label: 'At least 3 0s', prompt: 'at least three occurrences of 0' },

  // Negative Languages
  { category: 'Except', label: 'Except 101', prompt: 'accept all except 101' },
  { category: 'Except', label: 'Except 111', prompt: 'accept all except 111' },

  // Compound Boolean Expressions
  { category: 'Compound', label: 'Contains 101 AND Ends 11', prompt: 'contains 101 and ends with 11' },
  { category: 'Compound', label: 'Starts 10 OR Ends 001', prompt: 'starts with 10 or ends with 001' },

  // Formal Formal Language Properties
  { category: 'Parity', label: 'Even number of 1s', prompt: 'even number of 1s' },
  { category: 'Divisibility', label: 'Binary div by 3', prompt: 'binary divisible by 3' },
  { category: 'Length', label: 'Even length', prompt: 'even length' },

  // Regex & Special Automata
  { category: 'Exact', label: 'Only 101', prompt: 'accept only 101' },
  { category: 'Epsilon', label: 'Only Epsilon (ε)', prompt: 'accept only epsilon' },
  { category: 'Regex', label: 'Regex (0|1)*101', prompt: '(0|1)*101' },
  { category: 'Regex', label: 'Regex (a|b)*abb', prompt: '(a|b)*abb' },
];
