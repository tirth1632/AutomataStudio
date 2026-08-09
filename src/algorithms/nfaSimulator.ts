import type {
  AutomatonGraph,
  SimulationStep,
  ValidationError,
} from '../types/automata';
import { getEpsilonClosureSet } from './epsilonClosure';

export function validateNFA(graph: AutomatonGraph): ValidationError[] {
  const errors: ValidationError[] = [];

  if (graph.states.length === 0) {
    errors.push({
      id: 'empty_graph',
      type: 'EMPTY_GRAPH',
      message: 'Automaton canvas is empty.',
      severity: 'warning',
    });
    return errors;
  }

  const startStates = graph.states.filter((s) => s.isStart);
  if (startStates.length === 0) {
    errors.push({
      id: 'missing_start',
      type: 'MISSING_START',
      message: 'No start state defined.',
      severity: 'error',
    });
  }

  return errors;
}

export function simulateNFA(
  graph: AutomatonGraph,
  inputString: string
): SimulationStep[] {
  const steps: SimulationStep[] = [];
  const startStates = graph.states.filter((s) => s.isStart);

  if (startStates.length === 0) {
    return [
      {
        stepIndex: 0,
        currentStateIds: [],
        consumedInput: '',
        remainingInput: inputString,
        currentSymbol: null,
        activeEdgeIds: [],
        description: 'Error: Cannot simulate without a start state.',
        isAccepting: false,
        isRejected: true,
      },
    ];
  }

  // Initial state set include start states and their ε-closure
  const initialStartSet = new Set<string>(startStates.map((s) => s.id));
  const currentStatesSet = getEpsilonClosureSet(initialStartSet, graph.transitions);

  const getStateLabels = (ids: Set<string>) => {
    const labels = graph.states
      .filter((s) => ids.has(s.id))
      .map((s) => s.label);
    return `{${labels.join(', ')}}`;
  };

  const isAnyAccepting = (ids: Set<string>) => {
    return graph.states.some((s) => ids.has(s.id) && s.isAccept);
  };

  let activeStates = new Set<string>(currentStatesSet);
  let consumed = '';
  let remaining = inputString;

  // Step 0
  steps.push({
    stepIndex: 0,
    currentStateIds: Array.from(activeStates),
    consumedInput: '',
    remainingInput: inputString,
    currentSymbol: inputString.length > 0 ? inputString[0] : null,
    activeEdgeIds: [],
    description: `Start at initial state set ${getStateLabels(activeStates)} (including ε-closure).`,
    isAccepting: inputString.length === 0 && isAnyAccepting(activeStates),
    isRejected: inputString.length === 0 && !isAnyAccepting(activeStates),
    epsilonClosureVisited: Array.from(activeStates),
  });

  for (let i = 0; i < inputString.length; i++) {
    const symbol = inputString[i];
    consumed += symbol;
    remaining = inputString.slice(i + 1);

    const nextStatesDirect = new Set<string>();
    const activeEdges = new Set<string>();

    // For each active state, check outgoing transitions on `symbol`
    for (const stateId of activeStates) {
      const outgoing = graph.transitions.filter(
        (t) => t.source === stateId && t.symbols.includes(symbol)
      );
      for (const edge of outgoing) {
        nextStatesDirect.add(edge.target);
        activeEdges.add(edge.id);
      }
    }

    // Apply ε-closure to the reached states
    const nextStatesWithEpsilon = getEpsilonClosureSet(
      nextStatesDirect,
      graph.transitions
    );

    activeStates = nextStatesWithEpsilon;

    const isLast = i === inputString.length - 1;
    const hasStates = activeStates.size > 0;
    const isAccepting = isLast && hasStates && isAnyAccepting(activeStates);
    const isRejected = isLast && (!hasStates || !isAnyAccepting(activeStates));

    steps.push({
      stepIndex: i + 1,
      currentStateIds: Array.from(activeStates),
      consumedInput: consumed,
      remainingInput: remaining,
      currentSymbol: isLast ? null : remaining[0],
      activeEdgeIds: Array.from(activeEdges),
      description: hasStates
        ? `Read '${symbol}': Active state set expanded to ${getStateLabels(activeStates)}.`
        : `Read '${symbol}': Dead state encountered! No valid transitions available.`,
      isAccepting,
      isRejected,
      epsilonClosureVisited: Array.from(nextStatesWithEpsilon),
    });

    if (!hasStates) {
      break;
    }
  }

  return steps;
}
