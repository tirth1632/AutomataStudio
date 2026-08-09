import type { NFA } from '../NFA';
import { convertNFAToDFA } from '../conversion/NFAToDFA';
import { nfaToAutomatonGraph } from '../renderer/NFARenderer';
import { minimizeDFA } from '../../hopcroftMinimization';

/**
 * NegativeLanguagePipeline:
 * Implements standard Theory of Computation negative language algorithm:
 * NFA (Positive Pattern) -> Convert to DFA (Subset Construction) -> Complement DFA (flip F and Q\F) -> Hopcroft Minimization.
 *
 * Used for:
 * - "Does NOT Contain X"
 * - "Accept All Except X"
 */
export function buildNegativeLanguageNFA(positiveNFA: NFA): NFA {
  // 1. Convert NFA to deterministic DFA via Subset Construction
  const dfa = convertNFAToDFA(positiveNFA);

  // 2. Complement DFA: Accept states become non-accepting, non-accept states become accepting
  const acceptSet = new Set(dfa.acceptStates);
  const complementedAcceptStates = dfa.states.filter((s) => !acceptSet.has(s));

  // 3. Format transitions as NFA transition map (Record<string, Record<string, string[]>>)
  const nfaTransitions: Record<string, Record<string, string[]>> = {};
  for (const s of dfa.states) {
    nfaTransitions[s] = {};
    for (const sym of dfa.alphabet) {
      const tgt = dfa.transitions[s]?.[sym];
      if (tgt) {
        nfaTransitions[s][sym] = [tgt];
      }
    }
  }

  const rawComplementedNFA: NFA = {
    alphabet: dfa.alphabet,
    states: dfa.states,
    startState: dfa.startState,
    acceptStates: complementedAcceptStates,
    transitions: nfaTransitions,
  };

  try {
    // 4. Minimize complemented DFA via Hopcroft's algorithm for optimal state count
    const dfaGraph = nfaToAutomatonGraph(rawComplementedNFA, 'Complemented DFA');
    const minResult = minimizeDFA(dfaGraph);
    const minGraph = minResult.minimizedGraph;

    const nfaStates = minGraph.states.map((s) => s.id);
    const nfaStartState = minGraph.states.find((s) => s.isStart)?.id || nfaStates[0] || dfa.startState;
    const nfaAcceptStates = minGraph.states.filter((s) => s.isAccept).map((s) => s.id);
    const minTransitions: Record<string, Record<string, string[]>> = {};

    nfaStates.forEach((st) => {
      minTransitions[st] = {};
    });

    minGraph.transitions.forEach((t) => {
      if (!minTransitions[t.source]) minTransitions[t.source] = {};
      t.symbols.forEach((sym) => {
        if (!minTransitions[t.source][sym]) minTransitions[t.source][sym] = [];
        if (!minTransitions[t.source][sym].includes(t.target)) {
          minTransitions[t.source][sym].push(t.target);
        }
      });
    });

    return {
      alphabet: minGraph.alphabet || dfa.alphabet,
      states: nfaStates,
      startState: nfaStartState,
      acceptStates: nfaAcceptStates,
      transitions: minTransitions,
    };
  } catch {
    // Fallback to raw complemented NFA if minimization fails
    return rawComplementedNFA;
  }
}
