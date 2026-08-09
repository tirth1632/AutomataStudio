import type { NFA } from '../NFA';
import { computeEpsilonClosure, EPSILON } from '../../shared/EpsilonClosure';

export interface EpsilonRemovalResult {
  equivalentNFA: NFA;
  epsilonClosureTable: Record<string, string[]>;
  removedEpsilonTransitions: { source: string; target: string }[];
  equivalentTransitions: Record<string, Record<string, string[]>>;
}

/**
 * removeEpsilonTransitions:
 * Algorithmically converts an ε-NFA to an equivalent NFA without ε-transitions.
 *
 * Algorithm:
 * 1. Compute ε-closure for each state q in Q.
 * 2. New accept states F' = { q in Q | ε-closure(q) ∩ F != ∅ }.
 * 3. New transition δ'(q, a) = ε-closure( ⋃_{p ∈ ε-closure(q)} δ(p, a) ) for a ∈ Σ.
 * 4. Record removed ε-transitions.
 */
export function removeEpsilonTransitions(nfa: NFA): EpsilonRemovalResult {
  const epsilonClosureTable: Record<string, string[]> = {};
  const removedEpsilonTransitions: { source: string; target: string }[] = [];

  // 1. Compute ε-closure for each state
  for (const state of nfa.states) {
    const closureSet = computeEpsilonClosure([state], nfa.transitions);
    epsilonClosureTable[state] = Array.from(closureSet).sort();

    // Record removed ε-transitions
    const epsTargets = nfa.transitions[state]?.[EPSILON] || [];
    for (const tgt of epsTargets) {
      removedEpsilonTransitions.push({ source: state, target: tgt });
    }
  }

  // 2. New accept states: state q is accepting if its ε-closure contains any original accept state
  const origAcceptSet = new Set(nfa.acceptStates);
  const newAcceptStates = nfa.states.filter((state) => {
    const closure = epsilonClosureTable[state] || [];
    return closure.some((s) => origAcceptSet.has(s));
  });

  // Non-epsilon alphabet
  const nonEpsAlphabet = nfa.alphabet.filter((sym) => sym !== EPSILON);

  // 3. New transitions δ'(q, a)
  const equivalentTransitions: Record<string, Record<string, string[]>> = {};

  for (const q of nfa.states) {
    equivalentTransitions[q] = {};
    const qClosure = epsilonClosureTable[q] || [];

    for (const a of nonEpsAlphabet) {
      const movedTargets = new Set<string>();
      for (const p of qClosure) {
        const targets = nfa.transitions[p]?.[a] || [];
        for (const t of targets) {
          movedTargets.add(t);
        }
      }

      // Compute ε-closure of movedTargets
      const finalClosure = computeEpsilonClosure(Array.from(movedTargets), nfa.transitions);
      const sortedResult = Array.from(finalClosure).sort();

      if (sortedResult.length > 0) {
        equivalentTransitions[q][a] = sortedResult;
      }
    }
  }

  const equivalentNFA: NFA = {
    states: [...nfa.states],
    alphabet: nonEpsAlphabet,
    startState: nfa.startState,
    acceptStates: newAcceptStates,
    transitions: equivalentTransitions,
  };

  return {
    equivalentNFA,
    epsilonClosureTable,
    removedEpsilonTransitions,
    equivalentTransitions,
  };
}
