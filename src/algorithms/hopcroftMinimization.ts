import type {
  AutomatonGraph,
  AutomatonState,
  AutomatonTransition,
  PartitionStep,
  TransitionTableRow,
  SplitDetail,
} from '../types/automata';
import { applyDagreLayout } from '../services/layoutEngine';

export interface MinimizationResult {
  steps: PartitionStep[];
  minimizedGraph: AutomatonGraph;
  workingGraphHistory: AutomatonGraph[];
  stateMapping: Record<string, string[]>;
  mergedPairs: Array<{ newId: string; oldIds: string[]; isAccept: boolean }>;
  rejectedMerges: Array<{ stateA: string; stateB: string; splitReason: string }>;
  executionTimeMs: number;
  testStrings: Array<{ input: string; originalAccepted: boolean; minimalAccepted: boolean }>;
}

/**
 * Minimizes a DFA using Hopcroft's partition refinement algorithm.
 * Generates structured educational step trajectories, transition comparison tables,
 * intermediate working graphs, and equivalence mappings.
 */
export function minimizeDFA(dfaGraph: AutomatonGraph): MinimizationResult {
  const startTime = typeof performance !== 'undefined' ? performance.now() : Date.now();

  // 1. Extract true alphabet
  const symbolSet = new Set<string>();
  (dfaGraph.alphabet || []).forEach((s) => {
    if (s && s !== 'ε' && s !== 'e') symbolSet.add(s.trim());
  });
  dfaGraph.transitions.forEach((t) => {
    t.symbols.forEach((s) => {
      if (s && s !== 'ε' && s !== 'e') symbolSet.add(s.trim());
    });
  });
  const alphabet = symbolSet.size > 0 ? Array.from(symbolSet).sort() : ['0', '1'];

  // Helper to find target state for a given source & symbol
  const getRawTargetState = (sourceId: string, symbol: string): string => {
    const edge = dfaGraph.transitions.find(
      (t) => t.source === sourceId && t.symbols.includes(symbol)
    );
    return edge ? edge.target : '__TRAP__';
  };

  // 2. Filter out unreachable states via BFS
  const startState = dfaGraph.states.find((s) => s.isStart) || dfaGraph.states[0];
  const reachable = new Set<string>();

  if (startState) {
    const queue: string[] = [startState.id];
    reachable.add(startState.id);
    while (queue.length > 0) {
      const curr = queue.shift()!;
      for (const symbol of alphabet) {
        const target = getRawTargetState(curr, symbol);
        if (target !== '__TRAP__' && !reachable.has(target)) {
          reachable.add(target);
          queue.push(target);
        }
      }
    }
  }

  const reachableStates = reachable.size > 0
    ? dfaGraph.states.filter((s) => reachable.has(s.id))
    : dfaGraph.states;

  let hasImplicitTrap = false;
  for (const s of reachableStates) {
    for (const sym of alphabet) {
      if (getRawTargetState(s.id, sym) === '__TRAP__') {
        hasImplicitTrap = true;
        break;
      }
    }
    if (hasImplicitTrap) break;
  }

  const workingStateIds = reachableStates.map((s) => s.id);
  if (hasImplicitTrap) {
    workingStateIds.push('__TRAP__');
  }

  const acceptSet = new Set(reachableStates.filter((s) => s.isAccept).map((s) => s.id));

  // Helper formatting
  const formatStateGroup = (group: string[]): string => {
    const labels = group.map((id) => {
      if (id === '__TRAP__') return 'Ø';
      const st = dfaGraph.states.find((s) => s.id === id);
      return st?.label && st.label !== id ? `${id}(${st.label})` : id;
    });
    return `{${labels.join(', ')}}`;
  };

  const getGroupIndex = (stateId: string, partitions: string[][]): number => {
    return partitions.findIndex((group) => group.includes(stateId));
  };

  // Build transition comparison table for a given set of partitions
  const buildTransitionTable = (
    relevantStateIds: string[],
    partitions: string[][]
  ): TransitionTableRow[] => {
    return relevantStateIds.map((id) => {
      const st = dfaGraph.states.find((s) => s.id === id);
      const isAccept = acceptSet.has(id);
      const transitions: Record<string, { targetId: string; targetGroupIdx: number; targetGroupLabel: string }> = {};

      for (const sym of alphabet) {
        const targetId = id === '__TRAP__' ? '__TRAP__' : getRawTargetState(id, sym);
        const targetGroupIdx = getGroupIndex(targetId, partitions);
        const targetGroup = partitions[targetGroupIdx] || [targetId];
        transitions[sym] = {
          targetId,
          targetGroupIdx,
          targetGroupLabel: formatStateGroup(targetGroup),
        };
      }

      return {
        stateId: id,
        stateLabel: id === '__TRAP__' ? 'Ø (Dead Trap)' : st?.label || id,
        isAccept,
        transitions,
      };
    });
  };

  // Build intermediate working graph snapshot from partition set
  const buildWorkingGraph = (partitions: string[][], nameSuffix: string): AutomatonGraph => {
    const filteredPartitions = partitions.filter((g) => g.some((id) => id !== '__TRAP__'));
    const nodes: AutomatonState[] = filteredPartitions.map((group, idx) => {
      const realIds = group.filter((id) => id !== '__TRAP__');
      const memberStates = dfaGraph.states.filter((s) => realIds.includes(s.id));
      const labels = memberStates.map((s) => s.label || s.id).join(', ');
      const isStart = memberStates.some((s) => s.isStart);
      const isAccept = memberStates.some((s) => s.isAccept);

      return {
        id: `P${idx}`,
        label: realIds.length === 1 ? memberStates[0]?.label || memberStates[0]?.id : `{${labels}}`,
        isStart,
        isAccept,
        x: 0,
        y: 0,
      };
    });

    const edges: AutomatonTransition[] = [];
    filteredPartitions.forEach((group, sourceIdx) => {
      const repId = group.find((id) => id !== '__TRAP__') || group[0];
      for (const sym of alphabet) {
        const targetId = getRawTargetState(repId, sym);
        if (targetId && targetId !== '__TRAP__') {
          const targetIdx = filteredPartitions.findIndex((g) => g.includes(targetId));
          if (targetIdx !== -1) {
            const sourceId = `P${sourceIdx}`;
            const targetNodeId = `P${targetIdx}`;
            const existing = edges.find((e) => e.source === sourceId && e.target === targetNodeId);
            if (existing) {
              if (!existing.symbols.includes(sym)) existing.symbols.push(sym);
            } else {
              edges.push({
                id: `e_${sourceId}_${targetNodeId}`,
                source: sourceId,
                target: targetNodeId,
                symbols: [sym],
              });
            }
          }
        }
      }
    });

    const raw: AutomatonGraph = {
      id: `working_${Date.now()}_${nameSuffix}`,
      name: `Working DFA (${nameSuffix})`,
      type: 'DFA',
      alphabet,
      states: nodes,
      transitions: edges,
    };

    return applyDagreLayout(raw);
  };

  const steps: PartitionStep[] = [];
  const rejectedMerges: Array<{ stateA: string; stateB: string; splitReason: string }> = [];

  // Step 0: Initialize
  steps.push({
    stepIndex: 0,
    phase: 'Initialize',
    partitions: [workingStateIds],
    description: `Step 0 — Initialization: Loaded ${dfaGraph.states.length} total state(s), ${reachableStates.length} reachable state(s). Alphabet Σ = {${alphabet.join(', ')}}.`,
    educationalExplanation: `Hopcroft's algorithm begins with all states in a single set, preparing to separate them based on observable output and transition properties.`,
    isRefined: false,
    transitionTable: buildTransitionTable(workingStateIds, [workingStateIds]),
    workingGraph: buildWorkingGraph([workingStateIds], 'P0_Init'),
  });

  // Step 1: Initial Partition P0 (Accepting vs Non-Accepting)
  const acceptGroup = workingStateIds.filter((id) => acceptSet.has(id));
  const nonAcceptGroup = workingStateIds.filter((id) => !acceptSet.has(id));

  let currentPartitions: string[][] = [];
  if (acceptGroup.length > 0) currentPartitions.push(acceptGroup);
  if (nonAcceptGroup.length > 0) currentPartitions.push(nonAcceptGroup);

  const initialAcceptStr = acceptGroup.length > 0 ? `Accepting: ${formatStateGroup(acceptGroup)}` : '';
  const initialNonAcceptStr = nonAcceptGroup.length > 0 ? `Non-Accepting: ${formatStateGroup(nonAcceptGroup)}` : '';

  steps.push({
    stepIndex: 1,
    phase: 'Initial Partition',
    partitions: currentPartitions.map((p) => [...p]),
    description: `Step 1 — Initial Partition (P₀): Separated accepting states from non-accepting states → ${[initialAcceptStr, initialNonAcceptStr].filter(Boolean).join(' and ')}.`,
    educationalExplanation: `States in F (accepting) and Q \\ F (non-accepting) can NEVER be equivalent because they produce different string acceptance outcomes on the empty string ε.`,
    isRefined: false,
    transitionTable: buildTransitionTable(workingStateIds, currentPartitions),
    workingGraph: buildWorkingGraph(currentPartitions, 'P0_Split'),
  });

  // 4. Partition Refinement Loop
  let stepCounter = 1;
  let changed = true;

  while (changed) {
    changed = false;
    const nextPartitions: string[][] = [];

    for (let gIdx = 0; gIdx < currentPartitions.length; gIdx++) {
      const group = currentPartitions[gIdx];
      if (group.length <= 1) {
        nextPartitions.push(group);
        continue;
      }

      let splitDone = false;

      for (const symbol of alphabet) {
        const subGroups: { [targetGroupIdx: number]: string[] } = {};

        for (const stateId of group) {
          const targetId = stateId === '__TRAP__' ? '__TRAP__' : getRawTargetState(stateId, symbol);
          const targetGroupIdx = getGroupIndex(targetId, currentPartitions);

          if (!subGroups[targetGroupIdx]) {
            subGroups[targetGroupIdx] = [];
          }
          subGroups[targetGroupIdx].push(stateId);
        }

        const keys = Object.keys(subGroups);
        if (keys.length > 1) {
          const groupStr = formatStateGroup(group);
          const subGroupItems: SplitDetail['subGroups'] = [];

          for (const k of keys) {
            const targetGroupIdx = parseInt(k, 10);
            const subMembers = subGroups[targetGroupIdx];
            const targetGroup = currentPartitions[targetGroupIdx] || [];
            subGroupItems.push({
              subGroupMembers: subMembers,
              targetGroupIdx,
              targetGroupLabel: formatStateGroup(targetGroup),
              sampleState: subMembers[0],
              sampleTarget: subMembers[0] === '__TRAP__' ? '__TRAP__' : getRawTargetState(subMembers[0], symbol),
            });
            nextPartitions.push(subMembers);
          }

          changed = true;
          splitDone = true;
          stepCounter++;

          // Record rejected merge pairs
          for (let i = 0; i < group.length; i++) {
            for (let j = i + 1; j < group.length; j++) {
              const sA = group[i];
              const sB = group[j];
              const tA = getGroupIndex(getRawTargetState(sA, symbol), currentPartitions);
              const tB = getGroupIndex(getRawTargetState(sB, symbol), currentPartitions);
              if (tA !== tB && sA !== '__TRAP__' && sB !== '__TRAP__') {
                rejectedMerges.push({
                  stateA: sA,
                  stateB: sB,
                  splitReason: `On symbol '${symbol}', ${sA} → ${getRawTargetState(sA, symbol)} (P${tA + 1}) while ${sB} → ${getRawTargetState(sB, symbol)} (P${tB + 1}).`,
                });
              }
            }
          }

          const splitDetail: SplitDetail = {
            splitGroupIdx: gIdx,
            splitGroupMembers: group,
            splitSymbol: symbol,
            subGroups: subGroupItems,
            explanation: `Group ${groupStr} split on input symbol '${symbol}' because member states transition into different target partitions.`,
          };

          const remainingUnchecked = currentPartitions.slice(gIdx + 1);
          const activePartitions = [...nextPartitions, ...remainingUnchecked].map((p) => [...p]);

          steps.push({
            stepIndex: stepCounter,
            phase: 'Split Groups',
            partitions: activePartitions,
            description: `P${stepCounter} — Group Split: ${groupStr} split by symbol '${symbol}' into ${subGroupItems.map((sg) => formatStateGroup(sg.subGroupMembers)).join(' and ')}.`,
            educationalExplanation: `States inside ${groupStr} are distinguishable on symbol '${symbol}'. Because their 1-step transitions land in non-equivalent partitions, they cannot be merged into a single minimal state.`,
            isRefined: true,
            splitBySymbol: symbol,
            splitGroupIdx: gIdx,
            splitDetail,
            transitionTable: buildTransitionTable(workingStateIds, currentPartitions),
            workingGraph: buildWorkingGraph(activePartitions, `P${stepCounter}_Split`),
          });

          break;
        }
      }

      if (!splitDone) {
        nextPartitions.push(group);
      }
    }

    currentPartitions = nextPartitions;
  }

  // Final Step: Convergence
  stepCounter++;
  const filteredFinalPartitions = currentPartitions.filter((g) => g.some((id) => id !== '__TRAP__'));

  steps.push({
    stepIndex: stepCounter,
    phase: 'Convergence',
    partitions: currentPartitions.map((p) => [...p]),
    description: `P${stepCounter} — Convergence Reached: No further partition splits occur on any symbol in {${alphabet.join(', ')}}. Algorithm converged into ${filteredFinalPartitions.length} equivalence classes.`,
    educationalExplanation: `All states remaining inside each partition group are pair-wise equivalent for all possible input strings. By the Myhill-Nerode theorem, combining each partition into a single state yields the unique minimal DFA.`,
    isRefined: false,
    transitionTable: buildTransitionTable(workingStateIds, currentPartitions),
    workingGraph: buildWorkingGraph(currentPartitions, 'P_Convergence'),
  });

  // Re-order partitions so start state is m0
  if (startState) {
    const startGroupIdx = currentPartitions.findIndex((group) =>
      group.includes(startState.id)
    );
    if (startGroupIdx > 0) {
      const [startGroup] = currentPartitions.splice(startGroupIdx, 1);
      currentPartitions.unshift(startGroup);
    }
  }

  const filteredPartitions = currentPartitions.filter((group) => {
    return group.some((id) => id !== '__TRAP__');
  });

  // Construct minimal DFA
  const groupToNewStateId: { [groupIdx: number]: string } = {};
  const stateMapping: Record<string, string[]> = {};
  const mergedPairs: Array<{ newId: string; oldIds: string[]; isAccept: boolean }> = [];

  const newStates: AutomatonState[] = filteredPartitions.map((group, idx) => {
    const newStateId = `m${idx}`;
    groupToNewStateId[idx] = newStateId;

    const realMemberIds = group.filter((id) => id !== '__TRAP__');
    stateMapping[newStateId] = realMemberIds;

    const memberStates = dfaGraph.states.filter((s) => realMemberIds.includes(s.id));
    const labels = memberStates.map((s) => s.label || s.id).join(', ');

    const isStart = memberStates.some((s) => s.isStart);
    const isAccept = memberStates.some((s) => s.isAccept);

    mergedPairs.push({
      newId: newStateId,
      oldIds: realMemberIds,
      isAccept,
    });

    return {
      id: newStateId,
      label: realMemberIds.length === 1 ? memberStates[0]?.label || memberStates[0]?.id : `{${labels}}`,
      isStart,
      isAccept,
      x: 0,
      y: 0,
    };
  });

  const newTransitions: AutomatonTransition[] = [];
  filteredPartitions.forEach((group, sourceGroupIdx) => {
    const representativeId = group.find((id) => id !== '__TRAP__') || group[0];
    const sourceNewId = groupToNewStateId[sourceGroupIdx];

    for (const symbol of alphabet) {
      const targetId = getRawTargetState(representativeId, symbol);
      if (targetId && targetId !== '__TRAP__') {
        const targetGroupIdx = filteredPartitions.findIndex((g) => g.includes(targetId));
        if (targetGroupIdx !== -1) {
          const targetNewId = groupToNewStateId[targetGroupIdx];

          const existing = newTransitions.find(
            (t) => t.source === sourceNewId && t.target === targetNewId
          );
          if (existing) {
            if (!existing.symbols.includes(symbol)) {
              existing.symbols.push(symbol);
              existing.symbols.sort();
            }
          } else {
            newTransitions.push({
              id: `t_${sourceNewId}_${targetNewId}`,
              source: sourceNewId,
              target: targetNewId,
              symbols: [symbol],
            });
          }
        }
      }
    }
  });

  const rawMinimizedGraph: AutomatonGraph = {
    id: `minimized_${Date.now()}`,
    name: `${dfaGraph.name || 'Automaton'} (Minimal)`,
    type: 'DFA',
    alphabet,
    states: newStates,
    transitions: newTransitions,
  };

  const minimizedGraph = applyDagreLayout(rawMinimizedGraph);

  // Build Minimal DFA Step
  stepCounter++;
  steps.push({
    stepIndex: stepCounter,
    phase: 'Build Minimal DFA',
    partitions: currentPartitions.map((p) => [...p]),
    description: `Step ${stepCounter} — Build Minimal DFA: Mapped ${filteredPartitions.length} equivalence classes into minimal states {${newStates.map((s) => s.id).join(', ')}}.`,
    educationalExplanation: `The minimal DFA construction is complete. ${dfaGraph.states.length - newStates.length} redundant state(s) eliminated.`,
    isRefined: false,
    transitionTable: buildTransitionTable(workingStateIds, currentPartitions),
    workingGraph: minimizedGraph,
  });

  // Verify test strings on both DFAs to prove equivalence
  const testCandidateStrings = ['', '0', '1', '00', '01', '10', '11', '000', '010', '101', '111', '0101'];
  const testStrings = testCandidateStrings.map((input) => {
    const originalAccepted = simulateDFAString(dfaGraph, input);
    const minimalAccepted = simulateDFAString(minimizedGraph, input);
    return { input, originalAccepted, minimalAccepted };
  });

  const endTime = typeof performance !== 'undefined' ? performance.now() : Date.now();
  const executionTimeMs = Math.round((endTime - startTime) * 100) / 100;

  const workingGraphHistory = steps.map((s) => s.workingGraph!).filter(Boolean);

  return {
    steps,
    minimizedGraph,
    workingGraphHistory,
    stateMapping,
    mergedPairs,
    rejectedMerges,
    executionTimeMs,
    testStrings,
  };
}

/**
 * Simulates a input string on a DFA graph.
 */
function simulateDFAString(graph: AutomatonGraph, input: string): boolean {
  let curr = graph.states.find((s) => s.isStart) || graph.states[0];
  if (!curr) return false;

  for (const char of input) {
    const edge = graph.transitions.find((t) => t.source === curr.id && t.symbols.includes(char));
    if (!edge) return false;
    const next = graph.states.find((s) => s.id === edge.target);
    if (!next) return false;
    curr = next;
  }

  return curr.isAccept;
}
