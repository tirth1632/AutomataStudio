import type { DFA } from '../../../types/dfa';
import type { EngineIntent, Generator } from '../../../types/intent';
import { ExactStringGenerator } from './ExactStringGenerator';
import { complementDFA } from './ProductConstruction';

export class ExceptStringGenerator implements Generator {
  canHandle(intent: EngineIntent): boolean {
    return intent.type === 'EXCEPT_STRING' && typeof intent.pattern === 'string';
  }

  generate(intent: EngineIntent): DFA {
    const exactGen = new ExactStringGenerator();
    const dfa = exactGen.generate({ ...intent, type: 'EXACT_STRING' });
    return complementDFA(dfa);
  }
}
