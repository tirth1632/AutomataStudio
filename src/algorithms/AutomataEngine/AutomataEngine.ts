import type { DFA } from '../../types/dfa';
import type { EngineIntent, Generator } from '../../types/intent';

import { EndsWithGenerator } from './DFAGenerators/EndsWithGenerator';
import { StartsWithGenerator } from './DFAGenerators/StartsWithGenerator';
import { ContainsGenerator } from './DFAGenerators/ContainsGenerator';
import { NotContainsGenerator } from './DFAGenerators/NotContainsGenerator';
import { ExactStringGenerator } from './DFAGenerators/ExactStringGenerator';
import { ExceptStringGenerator } from './DFAGenerators/ExceptStringGenerator';
import { EvenOddGenerator } from './DFAGenerators/EvenOddGenerator';
import { ExactCountGenerator } from './DFAGenerators/ExactCountGenerator';
import { AtLeastCountGenerator } from './DFAGenerators/AtLeastCountGenerator';
import { PositionGenerator } from './DFAGenerators/PositionGenerator';
import { LastSymbolGenerator } from './DFAGenerators/LastSymbolGenerator';
import { SecondLastGenerator } from './DFAGenerators/SecondLastGenerator';
import { ThirdLastGenerator } from './DFAGenerators/ThirdLastGenerator';
import { KthLastSymbolGenerator } from './DFAGenerators/KthLastSymbolGenerator';
import { LengthGenerator } from './DFAGenerators/LengthGenerator';
import { ModuloLengthGenerator } from './DFAGenerators/ModuloLengthGenerator';
import { BinaryModuloGenerator } from './DFAGenerators/BinaryModuloGenerator';
import { ConsecutiveGenerator } from './DFAGenerators/ConsecutiveGenerator';
import { AlternatePatternGenerator } from './DFAGenerators/AlternatePatternGenerator';
import { EpsilonGenerator } from './DFAGenerators/EpsilonGenerator';
import { RegexGenerator } from './DFAGenerators/RegexGenerator';
import { TrapStateGenerator } from './DFAGenerators/TrapStateGenerator';
import { LanguageGenerator } from './DFAGenerators/LanguageGenerator';
import { ModuloCountGenerator } from './DFAGenerators/ModuloCountGenerator';
import { DFAOperations } from '../DFAOperations/DFAOperations';
import { ExpressionParser, evaluateExpressionAST } from '../DFAOperations/ExpressionParser';
import { IntentParser } from './Parser/IntentParser';
import { canonicalizeDFAStates } from '../shared/StateUtilities';

/**
 * AutomataEngine Core Class
 * Pluggable registry containing all mathematical DFA construction generators.
 * Uses DFAOperations library for all combination and product construction tasks.
 */
export class AutomataEngine {
  private generators: Generator[] = [];

  constructor() {
    this.registerDefaultGenerators();
  }

  private registerDefaultGenerators() {
    this.generators.push(
      new EndsWithGenerator(),
      new StartsWithGenerator(),
      new ContainsGenerator(),
      new NotContainsGenerator(),
      new ExactStringGenerator(),
      new ExceptStringGenerator(),
      new EvenOddGenerator(),
      new ExactCountGenerator(),
      new AtLeastCountGenerator(),
      new PositionGenerator(),
      new LastSymbolGenerator(),
      new SecondLastGenerator(),
      new ThirdLastGenerator(),
      new KthLastSymbolGenerator(),
      new LengthGenerator(),
      new ModuloLengthGenerator(),
      new BinaryModuloGenerator(),
      new ConsecutiveGenerator(),
      new AlternatePatternGenerator(),
      new EpsilonGenerator(),
      new LanguageGenerator(),
      new ModuloCountGenerator(),
      new RegexGenerator(),
      new TrapStateGenerator()
    );
  }

  public registerGenerator(generator: Generator): void {
    this.generators.push(generator);
  }

  /**
   * Generates a complete mathematical DFA for any valid EngineIntent.
   * Combination intents are delegated to the generic DFAOperations library.
   */
  public generate(intent: EngineIntent): DFA {
    let rawDfa: DFA | null = null;

    // 1. Handle Compound / Boolean Product Construction Intents using DFAOperations
    if (intent.type === 'COMPOUND') {
      if (intent.operator === 'NOT' && intent.leftIntent) {
        const subDfa = this.generate(intent.leftIntent);
        rawDfa = DFAOperations.complement(subDfa);
      } else if (
        intent.leftIntent &&
        intent.rightIntent &&
        (intent.operator === 'AND' ||
          intent.operator === 'OR' ||
          intent.operator === 'DIFF' ||
          intent.operator === 'XOR')
      ) {
        const dfaA = this.generate(intent.leftIntent);
        const dfaB = this.generate(intent.rightIntent);
        rawDfa = DFAOperations.product(dfaA, dfaB, intent.operator);
      }
    }

    if (!rawDfa) {
      // 2. Delegate to matching Generator plugin
      for (const generator of this.generators) {
        if (generator.canHandle(intent)) {
          rawDfa = generator.generate(intent);
          break;
        }
      }
    }

    if (!rawDfa) throw new Error(`Unsupported DFA intent: ${intent.type}`);

    // 3. Ensure completeness, minimization, and canonical state naming (q0 as start state)
    const completed = DFAOperations.validateAndComplete(rawDfa);
    const minDfa = DFAOperations.minimize(completed);
    return canonicalizeDFAStates(minDfa);
  }

  /**
   * Generates a complete combined DFA from a natural language prompt string
   * by parsing into an ExpressionAST and evaluating with DFAOperations.
   */
  public generateFromPrompt(promptStr: string): DFA {
    const ast = ExpressionParser.parsePromptToAST(promptStr, this);
    const dfa = evaluateExpressionAST(ast, this);
    return DFAOperations.minimize(dfa);
  }

  public parseIntentFromPrompt(promptStr: string): EngineIntent | null {
    return IntentParser.parse(promptStr);
  }
}
