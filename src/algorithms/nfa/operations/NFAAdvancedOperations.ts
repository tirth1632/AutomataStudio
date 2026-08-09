import type { NFA } from '../NFA';
import { convertNFAToDFA } from '../conversion/NFAToDFA';
import { removeUnreachableNFAStates } from './RemoveUnreachableStates';

/**
 * NFAAdvancedOperations:
 * Performs formal set operations on NFAs:
 * - Intersection (L(M1) ∩ L(M2))
 * - Difference (L(M1) \ L(M2))
 * - Complement (Σ* \ L(M))
 *
 * Pipeline: NFA -> Subset Construction DFA -> Deterministic Product / Complement -> Result
 */
export function intersectNFA(nfa1: NFA, nfa2: NFA): NFA {
  const alphabet = Array.from(new Set([...nfa1.alphabet, ...nfa2.alphabet])).sort();
  const acceptSet1 = new Set(nfa1.acceptStates);
  const acceptSet2 = new Set(nfa2.acceptStates);

  const stateMap = new Map<string, string>();
  let stateCounter = 0;

  const getOrCreateStateName = (s1: string, s2: string): string => {
    const key = `${s1}::${s2}`;
    if (!stateMap.has(key)) {
      stateMap.set(key, `q${stateCounter++}`);
    }
    return stateMap.get(key)!;
  };

  const startName = getOrCreateStateName(nfa1.startState, nfa2.startState);
  const queue: [string, string][] = [[nfa1.startState, nfa2.startState]];
  const visited = new Set<string>();
  visited.add(`${nfa1.startState}::${nfa2.startState}`);

  const states: string[] = [];
  const transitions: Record<string, Record<string, string[]>> = {};
  const acceptStates: string[] = [];

  while (queue.length > 0) {
    const [s1, s2] = queue.shift()!;
    const name = getOrCreateStateName(s1, s2);
    states.push(name);
    transitions[name] = {};

    if (acceptSet1.has(s1) && acceptSet2.has(s2)) {
      acceptStates.push(name);
    }

    // 1. Symbol transitions (Direct NFA Product)
    for (const sym of alphabet) {
      const targets1 = nfa1.transitions[s1]?.[sym] || [];
      const targets2 = nfa2.transitions[s2]?.[sym] || [];

      if (targets1.length > 0 && targets2.length > 0) {
        transitions[name][sym] = [];
        for (const t1 of targets1) {
          for (const t2 of targets2) {
            const tgtName = getOrCreateStateName(t1, t2);
            if (!transitions[name][sym].includes(tgtName)) {
              transitions[name][sym].push(tgtName);
            }
            const key = `${t1}::${t2}`;
            if (!visited.has(key)) {
              visited.add(key);
              queue.push([t1, t2]);
            }
          }
        }
      }
    }

    // 2. Epsilon transitions in nfa1
    const EPS = 'ε';
    const eps1 = nfa1.transitions[s1]?.[EPS] || nfa1.transitions[s1]?.['epsilon'] || [];
    for (const t1 of eps1) {
      if (!transitions[name][EPS]) transitions[name][EPS] = [];
      const tgtName = getOrCreateStateName(t1, s2);
      if (!transitions[name][EPS].includes(tgtName)) {
        transitions[name][EPS].push(tgtName);
      }
      const key = `${t1}::${s2}`;
      if (!visited.has(key)) {
        visited.add(key);
        queue.push([t1, s2]);
      }
    }

    // 3. Epsilon transitions in nfa2
    const eps2 = nfa2.transitions[s2]?.[EPS] || nfa2.transitions[s2]?.['epsilon'] || [];
    for (const t2 of eps2) {
      if (!transitions[name][EPS]) transitions[name][EPS] = [];
      const tgtName = getOrCreateStateName(s1, t2);
      if (!transitions[name][EPS].includes(tgtName)) {
        transitions[name][EPS].push(tgtName);
      }
      const key = `${s1}::${t2}`;
      if (!visited.has(key)) {
        visited.add(key);
        queue.push([s1, t2]);
      }
    }
  }

  const rawIntersect: NFA = {
    alphabet,
    states,
    startState: startName,
    acceptStates,
    transitions,
  };

  return removeUnreachableNFAStates(rawIntersect);
}

export function differenceNFA(nfa1: NFA, nfa2: NFA): NFA {
  const dfa1 = convertNFAToDFA(nfa1);
  const dfa2 = convertNFAToDFA(nfa2);

  const alphabet = Array.from(new Set([...dfa1.alphabet, ...dfa2.alphabet])).sort();
  const states: string[] = [];
  const transitions: Record<string, Record<string, string[]>> = {};
  const acceptStates: string[] = [];

  const acceptSet1 = new Set(dfa1.acceptStates);
  const acceptSet2 = new Set(dfa2.acceptStates);

  const queue: [string, string][] = [[dfa1.startState, dfa2.startState]];
  const visited = new Set<string>();

  const startName = `${dfa1.startState}_${dfa2.startState}`;
  visited.add(startName);

  while (queue.length > 0) {
    const [s1, s2] = queue.shift()!;
    const name = `${s1}_${s2}`;
    states.push(name);
    transitions[name] = {};

    // In L(M1) AND NOT in L(M2)
    if (acceptSet1.has(s1) && !acceptSet2.has(s2)) {
      acceptStates.push(name);
    }

    for (const sym of alphabet) {
      const tgt1 = dfa1.transitions[s1]?.[sym] || s1;
      const tgt2 = dfa2.transitions[s2]?.[sym] || s2;
      const tgtName = `${tgt1}_${tgt2}`;
      transitions[name][sym] = [tgtName];

      if (!visited.has(tgtName)) {
        visited.add(tgtName);
        queue.push([tgt1, tgt2]);
      }
    }
  }

  const rawDiff: NFA = {
    alphabet,
    states,
    startState: startName,
    acceptStates,
    transitions,
  };

  return removeUnreachableNFAStates(rawDiff);
}
