import type { DFA } from '../../../types/dfa';
import type { EngineIntent, Generator } from '../../../types/intent';

/**
 * Builds the canonical minimal $2^k$-state DFA for $k$-th last symbol recognition.
 * Every state represents the sliding memory window of the last $k$ symbols seen.
 */
export function buildKthLastSymbolDFA(
  k: number,
  targetSymbol: string,
  alphabet: string[] = ['0', '1']
): DFA {
  const nonTargetSymbol = alphabet.find((s) => s !== targetSymbol) || '0';
  const states: string[] = [];
  const transitions: DFA['transitions'] = {};
  const acceptStates: string[] = [];

  // Generate all |alphabet|^k combinations
  function generateCombinations(prefix: string, length: number) {
    if (length === 0) {
      states.push(prefix);
      return;
    }
    for (const sym of alphabet) {
      generateCombinations(prefix + sym, length - 1);
    }
  }

  generateCombinations('', k);

  const startState = nonTargetSymbol.repeat(k);

  for (const w of states) {
    const stateId = `q${w}`;
    transitions[stateId] = {};

    if (w[0] === targetSymbol) {
      acceptStates.push(stateId);
    }

    for (const char of alphabet) {
      const nextWindow = (w + char).slice(1);
      transitions[stateId][char] = `q${nextWindow}`;
    }
  }

  return {
    alphabet,
    states: states.map((w) => `q${w}`),
    startState: `q${startState}`,
    acceptStates,
    transitions,
  };
}

export class SecondLastGenerator implements Generator {
  canHandle(intent: EngineIntent): boolean {
    return intent.type === 'SECOND_LAST';
  }

  generate(intent: EngineIntent): DFA {
    const targetSymbol = intent.symbol || '1';
    const alphabet = intent.alphabet || ['0', '1'];
    return buildKthLastSymbolDFA(2, targetSymbol, alphabet);
  }
}
