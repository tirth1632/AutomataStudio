import type { DFA } from '../../../types/dfa';
import type { EngineIntent, Generator } from '../../../types/intent';
import { ContainsGenerator } from './ContainsGenerator';
import { complementDFA } from './ProductConstruction';

export class NotContainsGenerator implements Generator {
  canHandle(intent: EngineIntent): boolean {
    return intent.type === 'NOT_CONTAINS' && typeof intent.pattern === 'string';
  }

  generate(intent: EngineIntent): DFA {
    const containsGen = new ContainsGenerator();
    const dfa = containsGen.generate({ ...intent, type: 'CONTAINS' });
    return complementDFA(dfa);
  }
}
