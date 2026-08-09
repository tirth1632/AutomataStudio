import type {
  AutomatonGraph,
  AutomatonState,
  AutomatonTransition,
  SubsetConstructionStep,
} from '../types/automata';
import { getEpsilonClosureSet } from './epsilonClosure';

export interface SubsetConstructionResult {
  steps: SubsetConstructionStep[];
  dfaGraph: AutomatonGraph;
}

/**
 * Converts an NFA or ε-NFA to a DFA using Subset Construction algorithm.
 */
export function convertNfaToDfa(nfaGraph: AutomatonGraph): SubsetConstructionResult {
  const alphabet = nfaGraph.alphabet.filter((sym) => sym !== 'ε' && sym !== 'e');
  const startStates = nfaGraph.states.filter((s) => s.isStart).map((s) => s.id);
  const initialClosure = Array.from(
    getEpsilonClosureSet(startStates, nfaGraph.transitions)
  ).sort();

  // Helper to map array of NFA state IDs to a unique string key
  const getKey = (ids: string[]) => ids.sort().join(',');

  const dfaStateMap: { [dfaName: string]: string[] } = {};
  const keyToDfaName: { [key: string]: string } = {};

  let stateCounter = 0;
  const getNextStateName = () => {
    // Generate state names: A, B, C... Z, A1, B1...
    const charCode = 65 + (stateCounter % 26);
    const suffix = Math.floor(stateCounter / 26);
    stateCounter++;
    return String.fromCharCode(charCode) + (suffix > 0 ? suffix : '');
  };

  const initialKey = getKey(initialClosure);
  const startDfaName = getNextStateName();
  dfaStateMap[startDfaName] = initialClosure;
  keyToDfaName[initialKey] = startDfaName;

  const unmarkedDfaStates: string[] = [startDfaName];
  const steps: SubsetConstructionStep[] = [];
  const dfaTransitions: AutomatonTransition[] = [];

  let stepIndex = 0;

  while (unmarkedDfaStates.length > 0) {
    const currentDfaName = unmarkedDfaStates.shift()!;
    const currentNfaSet = dfaStateMap[currentDfaName];

    for (const symbol of alphabet) {
      // Find all target NFA states reachable on 'symbol' from any state in currentNfaSet
      const reachableDirect = new Set<string>();
      for (const nfaId of currentNfaSet) {
        const outgoing = nfaGraph.transitions.filter(
          (t) => t.source === nfaId && t.symbols.includes(symbol)
        );
        for (const edge of outgoing) {
          reachableDirect.add(edge.target);
        }
      }

      // Compute ε-closure of reached NFA states
      const targetClosure = Array.from(
        getEpsilonClosureSet(reachableDirect, nfaGraph.transitions)
      ).sort();

      const targetKey = getKey(targetClosure);

      let targetDfaName: string;
      let isNew = false;

      if (targetClosure.length === 0) {
        // Trap / Dead State if desired, or skip
        targetDfaName = 'Trap';
        if (!keyToDfaName['Trap']) {
          keyToDfaName['Trap'] = 'Trap';
          dfaStateMap['Trap'] = [];
          unmarkedDfaStates.push('Trap');
          isNew = true;
        }
      } else if (keyToDfaName[targetKey]) {
        targetDfaName = keyToDfaName[targetKey];
      } else {
        targetDfaName = getNextStateName();
        keyToDfaName[targetKey] = targetDfaName;
        dfaStateMap[targetDfaName] = targetClosure;
        unmarkedDfaStates.push(targetDfaName);
        isNew = true;
      }

      // Check existing transition to combine symbols if needed
      const existingEdge = dfaTransitions.find(
        (t) => t.source === currentDfaName && t.target === targetDfaName
      );
      if (existingEdge) {
        if (!existingEdge.symbols.includes(symbol)) {
          existingEdge.symbols.push(symbol);
        }
      } else {
        dfaTransitions.push({
          id: `t_${currentDfaName}_${targetDfaName}_${symbol}`,
          source: currentDfaName,
          target: targetDfaName,
          symbols: [symbol],
        });
      }

      const getNfaLabels = (ids: string[]) => {
        if (ids.length === 0) return '∅';
        const labels = nfaGraph.states
          .filter((s) => ids.includes(s.id))
          .map((s) => s.label);
        return `{${labels.join(', ')}}`;
      };

      const isAccepting = currentNfaSet.some((nfaId) =>
        nfaGraph.states.some((s) => s.id === nfaId && s.isAccept)
      );

      stepIndex++;
      steps.push({
        stepIndex,
        fromDfaState: currentDfaName,
        dfaStateMap: { ...dfaStateMap },
        symbol,
        nfaTargetSet: targetClosure,
        toDfaState: targetDfaName,
        description: `State ${currentDfaName} ${getNfaLabels(
          currentNfaSet
        )} on symbol '${symbol}' moves to ${targetDfaName} ${getNfaLabels(
          targetClosure
        )}${isNew ? ' [New DFA State Discovered!]' : ''}`,
        isNewStateDiscovered: isNew,
        tableRow: {
          dfaState: currentDfaName,
          nfaStatesStr: getNfaLabels(currentNfaSet),
          transitions: { [symbol]: targetDfaName },
          isAccepting,
        },
      });
    }
  }

  // Construct resulting DFA graph with circular or grid layout positions
  const dfaStateNames = Object.keys(dfaStateMap);
  const radius = Math.max(150, dfaStateNames.length * 40);
  const center = { x: 300, y: 300 };

  const dfaStates: AutomatonState[] = dfaStateNames.map((dfaName, index) => {
    const angle = (2 * Math.PI * index) / dfaStateNames.length;
    const nfaSet = dfaStateMap[dfaName];
    const isStart = dfaName === startDfaName;
    const isAccept = nfaSet.some((nfaId) =>
      nfaGraph.states.some((s) => s.id === nfaId && s.isAccept)
    );

    const getNfaLabelsShort = (ids: string[]) => {
      if (ids.length === 0) return '∅';
      return nfaGraph.states
        .filter((s) => ids.includes(s.id))
        .map((s) => s.label)
        .join(',');
    };

    return {
      id: dfaName,
      label: `${dfaName} {${getNfaLabelsShort(nfaSet)}}`,
      isStart,
      isAccept,
      x: Math.round(center.x + radius * Math.cos(angle)),
      y: Math.round(center.y + radius * Math.sin(angle)),
    };
  });

  const dfaGraph: AutomatonGraph = {
    id: `dfa_converted_${Date.now()}`,
    name: `${nfaGraph.name} (Converted DFA)`,
    type: 'DFA',
    alphabet,
    states: dfaStates,
    transitions: dfaTransitions,
  };

  return { steps, dfaGraph };
}
