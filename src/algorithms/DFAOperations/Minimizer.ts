import type { DFA } from '../../types/dfa';
import { TrapStateGenerator } from '../AutomataEngine/DFAGenerators/TrapStateGenerator';

/**
 * Minimizes a DFA using Hopcroft's Partition Refinement algorithm.
 * 1. Removes unreachable states using BFS from start state.
 * 2. Partitions states into equivalence classes.
 * 3. Merges equivalent states and constructs minimal DFA.
 */
export function minimize(dfa: DFA): DFA {
  const completeDfa = TrapStateGenerator.completeDFA(dfa);
  const alphabet = completeDfa.alphabet;

  // 1. Remove unreachable states via BFS
  const reachable = new Set<string>();
  const queue: string[] = [completeDfa.startState];
  reachable.add(completeDfa.startState);

  while (queue.length > 0) {
    const curr = queue.shift()!;
    for (const char of alphabet) {
      const next = completeDfa.transitions[curr]?.[char];
      if (next && !reachable.has(next)) {
        reachable.add(next);
        queue.push(next);
      }
    }
  }

  const states = completeDfa.states.filter((s) => reachable.has(s));
  const acceptSet = new Set(completeDfa.acceptStates.filter((s) => reachable.has(s)));
  const nonAcceptSet = new Set(states.filter((s) => !acceptSet.has(s)));

  // 2. Hopcroft's Partitioning
  let P: Set<string>[] = [];
  if (acceptSet.size > 0) P.push(acceptSet);
  if (nonAcceptSet.size > 0) P.push(nonAcceptSet);

  const W: Set<string>[] = P.map((group) => new Set(group));

  while (W.length > 0) {
    const A = W.shift()!;

    for (const c of alphabet) {
      // Find all states X that transition to a state in A on symbol c
      const X = new Set<string>();
      for (const s of states) {
        const target = completeDfa.transitions[s]?.[c];
        if (target && A.has(target)) {
          X.add(s);
        }
      }

      const nextP: Set<string>[] = [];

      for (const Y of P) {
        const intersection = new Set<string>();
        const difference = new Set<string>();

        for (const s of Y) {
          if (X.has(s)) {
            intersection.add(s);
          } else {
            difference.add(s);
          }
        }

        if (intersection.size > 0 && difference.size > 0) {
          nextP.push(intersection);
          nextP.push(difference);

          // Update worklist W
          const wIdx = W.findIndex((wGroup) => setsEqual(wGroup, Y));
          if (wIdx !== -1) {
            W.splice(wIdx, 1, intersection, difference);
          } else {
            if (intersection.size <= difference.size) {
              W.push(intersection);
            } else {
              W.push(difference);
            }
          }
        } else {
          nextP.push(Y);
        }
      }

      P = nextP;
    }
  }

  // 3. Reconstruct Minimal DFA
  // Ensure start state group is first (index 0 -> q0)
  const startGroupIdx = P.findIndex((group) => group.has(completeDfa.startState));
  if (startGroupIdx > 0) {
    const [startGroup] = P.splice(startGroupIdx, 1);
    P.unshift(startGroup);
  }

  const stateToGroupMap = new Map<string, string>();
  const groupRepresentations: string[] = [];

  P.forEach((group, index) => {
    const groupName = `q${index}`;
    groupRepresentations.push(groupName);
    for (const s of group) {
      stateToGroupMap.set(s, groupName);
    }
  });

  const minStartState = stateToGroupMap.get(completeDfa.startState) || 'q0';
  const minAcceptStates: string[] = [];

  groupRepresentations.forEach((gName) => {
    const repState = Array.from(P[parseInt(gName.slice(1), 10)])[0];
    if (acceptSet.has(repState)) {
      minAcceptStates.push(gName);
    }
  });

  const minTransitions: DFA['transitions'] = {};

  groupRepresentations.forEach((gName, idx) => {
    const repState = Array.from(P[idx])[0];
    minTransitions[gName] = {};

    for (const c of alphabet) {
      const target = completeDfa.transitions[repState]?.[c];
      const targetGroup = target ? stateToGroupMap.get(target) || gName : gName;
      minTransitions[gName][c] = targetGroup;
    }
  });

  return {
    alphabet,
    states: groupRepresentations,
    startState: minStartState,
    acceptStates: minAcceptStates,
    transitions: minTransitions,
  };
}

function setsEqual<T>(a: Set<T>, b: Set<T>): boolean {
  if (a.size !== b.size) return false;
  for (const item of a) {
    if (!b.has(item)) return false;
  }
  return true;
}
