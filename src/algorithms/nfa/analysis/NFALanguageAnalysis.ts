import type { NFA } from '../NFA';
import { computeEpsilonClosure, EPSILON } from '../../shared/EpsilonClosure';

export interface NFALanguageAnalysisResult {
  isEmpty: boolean;
  isFinite: boolean;
  reachableStates: string[];
  unreachableStates: string[];
  deadStates: string[];
  acceptingStates: string[];
  hasCycle: boolean;
  shortestAccepted: string | null;
  shortestRejected: string | null;
}

/**
 * analyzeNFALanguage:
 * Algorithmically evaluates structural and formal language properties of an NFA:
 * - Emptiness check (Is L(M) = ∅?)
 * - Finiteness check (Is L(M) finite or infinite?)
 * - State classification: Reachable, Unreachable, Dead (trap), Accepting
 * - Cycle detection on accepting paths
 * - Shortest accepted & shortest rejected strings via BFS
 */
export function analyzeNFALanguage(nfa: NFA): NFALanguageAnalysisResult {
  const alphabet = nfa.alphabet.filter((sym) => sym !== EPSILON);

  // 1. Reachable States via BFS/DFS from startState
  const reachable = new Set<string>();
  const queue: string[] = [nfa.startState];

  const startClosure = computeEpsilonClosure([nfa.startState], nfa.transitions);
  startClosure.forEach((s) => {
    reachable.add(s);
    queue.push(s);
  });

  while (queue.length > 0) {
    const curr = queue.shift()!;
    const trans = nfa.transitions[curr] || {};
    for (const sym of Object.keys(trans)) {
      for (const tgt of trans[sym]) {
        const tgtClosure = computeEpsilonClosure([tgt], nfa.transitions);
        for (const s of tgtClosure) {
          if (!reachable.has(s)) {
            reachable.add(s);
            queue.push(s);
          }
        }
      }
    }
  }

  const reachableStates = Array.from(reachable).sort();
  const unreachableStates = nfa.states.filter((s) => !reachable.has(s)).sort();

  // 2. States that can reach an accept state (Reverse Reachability)
  const origAcceptSet = new Set(nfa.acceptStates);
  const canReachAccept = new Set<string>();

  for (const acc of nfa.acceptStates) {
    canReachAccept.add(acc);
  }

  let changed = true;
  while (changed) {
    changed = false;
    for (const s of nfa.states) {
      if (canReachAccept.has(s)) continue;
      const trans = nfa.transitions[s] || {};
      for (const sym of Object.keys(trans)) {
        for (const tgt of trans[sym]) {
          if (canReachAccept.has(tgt)) {
            canReachAccept.add(s);
            changed = true;
            break;
          }
        }
      }
    }
  }

  // Dead (trap) states: reachable states from which NO accept state can ever be reached
  const deadStates = reachableStates.filter((s) => !canReachAccept.has(s));

  // 3. Emptiness Check: Is any accept state reachable from startState?
  const acceptingStates = nfa.acceptStates.filter((s) => reachable.has(s)).sort();
  const isEmpty = acceptingStates.length === 0;

  // 4. Cycle Detection on paths between start and accept states
  const activeReach = reachableStates.filter((s) => canReachAccept.has(s));
  let hasCycle = false;

  for (const u of activeReach) {
    // DFS from u to see if u can reach itself through non-epsilon or non-trivial transitions
    const visited = new Set<string>();
    const stack: string[] = [u];
    let isFirst = true;

    while (stack.length > 0) {
      const curr = stack.pop()!;
      if (!isFirst && curr === u) {
        hasCycle = true;
        break;
      }
      if (!isFirst && visited.has(curr)) continue;
      if (!isFirst) visited.add(curr);
      isFirst = false;

      const trans = nfa.transitions[curr] || {};
      for (const sym of alphabet) {
        for (const tgt of trans[sym] || []) {
          const closure = computeEpsilonClosure([tgt], nfa.transitions);
          for (const c of closure) {
            stack.push(c);
          }
        }
      }
    }
    if (hasCycle) break;
  }

  const isFinite = !isEmpty && !hasCycle;

  // 5. Shortest Accepted & Shortest Rejected String via BFS
  let shortestAccepted: string | null = null;
  let shortestRejected: string | null = null;

  // BFS queue: { activeSubset: Set<string>, str: string }
  const bfsQueue: { active: Set<string>; str: string }[] = [];
  const visitedSubsets = new Set<string>();

  const initSet = computeEpsilonClosure([nfa.startState], nfa.transitions);
  const initKey = Array.from(initSet).sort().join(',');
  visitedSubsets.add(initKey);
  bfsQueue.push({ active: initSet, str: '' });

  while (bfsQueue.length > 0 && (shortestAccepted === null || shortestRejected === null)) {
    const { active, str } = bfsQueue.shift()!;

    const isAccepting = Array.from(active).some((s) => origAcceptSet.has(s));

    if (isAccepting && shortestAccepted === null) {
      shortestAccepted = str === '' ? 'ε (empty string)' : str;
    }
    if (!isAccepting && shortestRejected === null) {
      shortestRejected = str === '' ? 'ε (empty string)' : str;
    }

    if (str.length >= 8) continue; // bound search depth for test string generation

    for (const sym of alphabet) {
      const nextActive = new Set<string>();
      for (const state of active) {
        const tgts = nfa.transitions[state]?.[sym] || [];
        for (const t of tgts) {
          nextActive.add(t);
        }
      }
      const nextClosure = computeEpsilonClosure(Array.from(nextActive), nfa.transitions);
      const nextKey = Array.from(nextClosure).sort().join(',');

      if (!visitedSubsets.has(nextKey)) {
        visitedSubsets.add(nextKey);
        bfsQueue.push({ active: nextClosure, str: str + sym });
      }
    }
  }

  return {
    isEmpty,
    isFinite,
    reachableStates,
    unreachableStates,
    deadStates,
    acceptingStates,
    hasCycle,
    shortestAccepted: shortestAccepted || 'None',
    shortestRejected: shortestRejected || 'None',
  };
}
