import type { Generator } from './Generator';
import type { Intent } from '../parser/Intent';
import type { NFA } from '../NFA';

import { ContainsGenerator } from './ContainsGenerator';
import { StartsWithGenerator } from './StartsWithGenerator';
import { EndsWithGenerator } from './EndsWithGenerator';
import { PrefixGenerator } from './PrefixGenerator';
import { SuffixGenerator } from './SuffixGenerator';
import { ExactStringGenerator } from './ExactStringGenerator';
import { FiniteLanguageGenerator } from './FiniteLanguageGenerator';
import { LengthGenerator } from './LengthGenerator';
import { ParityGenerator } from './ParityGenerator';
import { OccurrenceGenerator } from './OccurrenceGenerator';
import { RegexGenerator } from './RegexGenerator';
import { ConsecutiveGenerator } from './ConsecutiveGenerator';
import { PositionGenerator } from './PositionGenerator';
import { LastPositionGenerator } from './LastPositionGenerator';
import { AlternatePatternGenerator } from './AlternatePatternGenerator';
import { CountGenerator } from './CountGenerator';
import { NegativeGenerator } from './NegativeGenerator';
import { CompoundGenerator } from './CompoundGenerator';

export class NFAGeneratorRegistry {
  private generators: Generator[] = [
    new CompoundGenerator(),
    new NegativeGenerator(),
    new ConsecutiveGenerator(),
    new PositionGenerator(),
    new LastPositionGenerator(),
    new AlternatePatternGenerator(),
    new CountGenerator(),
    new ContainsGenerator(),
    new StartsWithGenerator(),
    new EndsWithGenerator(),
    new PrefixGenerator(),
    new SuffixGenerator(),
    new ExactStringGenerator(),
    new FiniteLanguageGenerator(),
    new LengthGenerator(),
    new ParityGenerator(),
    new OccurrenceGenerator(),
    new RegexGenerator(),
  ];

  public generate(intent: Intent): NFA {
    for (const gen of this.generators) {
      if (gen.canHandle(intent)) {
        return gen.generate(intent);
      }
    }

    return new ContainsGenerator().generate(intent);
  }
}
