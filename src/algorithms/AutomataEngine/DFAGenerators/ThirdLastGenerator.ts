import type { DFA } from '../../../types/dfa';
import type { EngineIntent, Generator } from '../../../types/intent';
import { buildKthLastSymbolDFA } from './SecondLastGenerator';

export class ThirdLastGenerator implements Generator {
  canHandle(intent: EngineIntent): boolean {
    return intent.type === 'THIRD_LAST';
  }

  generate(intent: EngineIntent): DFA {
    const targetSymbol = intent.symbol || '0';
    const alphabet = intent.alphabet || ['0', '1'];
    return buildKthLastSymbolDFA(3, targetSymbol, alphabet);
  }
}
