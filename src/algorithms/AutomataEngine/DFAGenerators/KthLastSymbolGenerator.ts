import type { DFA } from '../../../types/dfa';
import type { EngineIntent, Generator } from '../../../types/intent';
import { buildKthLastSymbolDFA } from './SecondLastGenerator';

export class KthLastSymbolGenerator implements Generator {
  canHandle(intent: EngineIntent): boolean {
    return (
      intent.type === 'KTH_LAST_SYMBOL' ||
      intent.type === 'LAST_SYMBOL' ||
      intent.type === 'SECOND_LAST' ||
      intent.type === 'THIRD_LAST'
    );
  }

  generate(intent: EngineIntent): DFA {
    let k = intent.k || 1;
    if (intent.type === 'LAST_SYMBOL') k = 1;
    if (intent.type === 'SECOND_LAST') k = 2;
    if (intent.type === 'THIRD_LAST') k = 3;

    const targetSymbol = intent.symbol || '1';
    const alphabet = intent.alphabet || ['0', '1'];

    return buildKthLastSymbolDFA(k, targetSymbol, alphabet);
  }
}
