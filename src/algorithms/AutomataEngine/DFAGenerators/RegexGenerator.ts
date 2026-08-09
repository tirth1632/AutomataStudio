import type { DFA } from '../../../types/dfa';
import type { EngineIntent, Generator } from '../../../types/intent';
import { regexToNFA } from '../../thompsonConstruction';
import { convertNfaToDfa } from '../../subsetConstruction';

export class RegexGenerator implements Generator {
  canHandle(intent: EngineIntent): boolean {
    return intent.type === 'REGEX' && typeof intent.regex === 'string';
  }

  generate(intent: EngineIntent): DFA {
    const regexPattern = intent.regex || '(0|1)*101';
    const { graph: nfaGraph } = regexToNFA(regexPattern);
    const { dfaGraph } = convertNfaToDfa(nfaGraph);

    const dfaStates = dfaGraph.states.map((s) => s.id);
    const dfaStartState = dfaGraph.states.find((s) => s.isStart)?.id || dfaStates[0] || 'q0';
    const dfaAcceptStates = dfaGraph.states.filter((s) => s.isAccept).map((s) => s.id);
    const alphabet = dfaGraph.alphabet && dfaGraph.alphabet.length > 0 ? dfaGraph.alphabet : ['0', '1'];

    const dfaTransitions: DFA['transitions'] = {};
    dfaStates.forEach((st) => {
      dfaTransitions[st] = {};
    });

    dfaGraph.transitions.forEach((t) => {
      if (!dfaTransitions[t.source]) {
        dfaTransitions[t.source] = {};
      }
      const sym = t.symbols[0] || '0';
      dfaTransitions[t.source][sym] = t.target;
    });

    return {
      alphabet,
      states: dfaStates,
      startState: dfaStartState,
      acceptStates: dfaAcceptStates,
      transitions: dfaTransitions,
    };
  }
}
