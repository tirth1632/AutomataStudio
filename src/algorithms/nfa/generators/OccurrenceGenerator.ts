import type { Generator } from './Generator';
import type { Intent } from '../parser/Intent';
import type { NFA } from '../NFA';

/**
 * OccurrenceGenerator:
 * Supports occurrence counting for single symbols or multi-character patterns:
 * - Exactly 1 / 2 / n occurrences of pattern (e.g., 101, 11)
 * - At least n occurrences of pattern / symbol
 */
export class OccurrenceGenerator implements Generator {
  canHandle(intent: Intent): boolean {
    return intent.type === 'OCCURRENCE';
  }

  generate(intent: Intent): NFA {
    const pattern = intent.pattern || intent.symbol || '1';
    const n = intent.count ?? 1;
    const cond = intent.countCondition || 'EXACT';
    const alphabet = intent.alphabet || ['0', '1'];

    // If single symbol, build count NFA
    if (pattern.length === 1) {
      const targetSymbol = pattern;
      const states: string[] = [];
      for (let i = 0; i <= n; i++) states.push(`q${i}`);

      const startState = 'q0';
      const acceptStates = [`q${n}`];
      const transitions: Record<string, Record<string, string[]>> = {};

      for (const s of states) transitions[s] = {};

      for (let i = 0; i < n; i++) {
        for (const sym of alphabet) {
          if (sym === targetSymbol) {
            transitions[`q${i}`][sym] = [`q${i + 1}`];
          } else {
            transitions[`q${i}`][sym] = [`q${i}`];
          }
        }
      }

      for (const sym of alphabet) {
        if (cond === 'AT_LEAST') {
          transitions[`q${n}`][sym] = [`q${n}`];
        } else {
          if (sym !== targetSymbol) {
            transitions[`q${n}`][sym] = [`q${n}`];
          }
        }
      }

      return { alphabet, states, startState, acceptStates, transitions };
    }

    // Pattern length > 1 (e.g. 101 or 11)
    // Non-deterministic NFA tracking n occurrences of pattern
    const m = pattern.length;
    const totalStates = n * m + 1;
    const states: string[] = [];
    for (let i = 0; i < totalStates; i++) states.push(`q${i}`);

    const startState = 'q0';
    const acceptStates = [states[totalStates - 1]];
    const transitions: Record<string, Record<string, string[]>> = {};
    for (const s of states) transitions[s] = {};

    for (let occ = 0; occ < n; occ++) {
      const base = occ * m;
      // Loop at base state for unmatching symbols
      for (const sym of alphabet) {
        transitions[`q${base}`][sym] = [`q${base}`];
      }
      // Step through pattern characters
      for (let j = 0; j < m; j++) {
        const currChar = pattern[j];
        const src = `q${base + j}`;
        const tgt = `q${base + j + 1}`;
        if (!transitions[src][currChar]) transitions[src][currChar] = [];
        transitions[src][currChar].push(tgt);
      }
    }

    const lastState = states[totalStates - 1];
    if (cond === 'AT_LEAST') {
      for (const sym of alphabet) {
        transitions[lastState][sym] = [lastState];
      }
    }

    return {
      alphabet,
      states,
      startState,
      acceptStates,
      transitions,
    };
  }
}
