/**
 * Moore Machine Deterministic Automata Engine
 * Handles simulation, state transitions, state output generation, machine validation,
 * Moore to Mealy conversion, and preset Moore machines.
 */

import type { AutomatonGraph, AutomatonState, AutomatonTransition } from '../types/automata';
import type { MealyMachine } from './mealyEngine';

export interface MooreTransition {
  id: string;
  from: string;
  to: string;
  inputSymbol: string;
}

export interface MooreMachine {
  id: string;
  name: string;
  description: string;
  states: string[];                  // Q
  stateOutputs: Record<string, string>; // λ: Q -> Δ (State output function)
  inputAlphabet: string[];          // Σ
  outputAlphabet: string[];         // Δ
  startState: string;               // q0
  transitions: MooreTransition[];   // δ: Q × Σ -> Q
}

export interface MooreSimulationStep {
  cycle: number;
  fromState: string;
  toState: string;
  inputSymbol: string;
  stateOutput: string;
  accumulatedOutput: string;
  consumedInput: string;
  remainingInput: string;
  activeTransitionId: string;
}

export interface MooreSimulationResult {
  machineId: string;
  inputTape: string;
  outputTape: string;
  initialOutput: string;
  steps: MooreSimulationStep[];
  visitedStates: Set<string>;
  visitedTransitions: Set<string>;
  totalCycles: number;
  isFullyConsumed: boolean;
  isAccepted: boolean;
  haltReason?: string;
  sequenceMatchCount: number;
}

export interface ValidationIssue {
  type: 'error' | 'warning' | 'info';
  category: 'Duplicate' | 'Missing Output' | 'Missing Transition' | 'Invalid Symbol' | 'Unreachable' | 'Dead State' | 'Incomplete';
  message: string;
  stateId?: string;
  transitionId?: string;
}

export interface MachineValidationReport {
  isValid: boolean;
  issues: ValidationIssue[];
  completenessPercentage: number;
  reachableStates: string[];
  unreachableStates: string[];
  deadStates: string[];
}

export interface MooreToMealyConversionResult {
  originalMoore: MooreMachine;
  rawEquivalentMealy: MealyMachine;
  equivalentMealy: MealyMachine;
  explanationSteps: {
    title: string;
    description: string;
    mooreTransition: string;
    targetState: string;
    assignedMealyOutput: string;
  }[];
}

// ── 1. DETERMINISTIC MOORE SIMULATION ENGINE ─────────────────────────────────

export function simulateMooreMachine(machine: MooreMachine, inputTape: string): MooreSimulationResult {
  const steps: MooreSimulationStep[] = [];
  const visitedStates = new Set<string>();
  const visitedTransitions = new Set<string>();

  let currentState = machine.startState || machine.states[0] || 'q0';
  visitedStates.add(currentState);

  const initialOutput = machine.stateOutputs[currentState] || '0';
  let accumulatedOutput = initialOutput;
  const symbols = inputTape.split('');

  for (let i = 0; i < symbols.length; i++) {
    const inputSym = symbols[i];

    const trans = machine.transitions.find(
      (t) => t.from === currentState && t.inputSymbol === inputSym
    );

    if (!trans) {
      break;
    }

    visitedTransitions.add(trans.id);
    const nextState = trans.to;
    visitedStates.add(nextState);

    const outSym = machine.stateOutputs[nextState] || '0';
    accumulatedOutput += outSym;

    const consumed = inputTape.slice(0, i + 1);
    const remaining = inputTape.slice(i + 1);

    steps.push({
      cycle: i + 1,
      fromState: currentState,
      toState: nextState,
      inputSymbol: inputSym,
      stateOutput: outSym,
      accumulatedOutput,
      consumedInput: consumed,
      remainingInput: remaining,
      activeTransitionId: trans.id,
    });

    currentState = nextState;
  }

  const isFullyConsumed = steps.length === symbols.length;
  const isAccepted = isFullyConsumed && symbols.length > 0;
  let haltReason: string | undefined;

  if (!isFullyConsumed && symbols.length > 0) {
    const haltedAtSym = symbols[steps.length];
    const haltedAtState = steps.length > 0 ? steps[steps.length - 1].toState : (machine.startState || machine.states[0]);
    haltReason = `Machine halted at state '${haltedAtState}' — no transition defined for input symbol '${haltedAtSym}'.`;
  }

  const sequenceMatchCount = accumulatedOutput.split('').filter((c) => c === '1').length;

  return {
    machineId: machine.id,
    inputTape,
    outputTape: accumulatedOutput,
    initialOutput,
    steps,
    visitedStates,
    visitedTransitions,
    totalCycles: steps.length,
    isFullyConsumed,
    isAccepted,
    haltReason,
    sequenceMatchCount,
  };
}

// ── 2. MACHINE VALIDATOR & DIAGNOSTICS ──────────────────────────────────────────

export function validateMooreMachine(machine: MooreMachine): MachineValidationReport {
  const issues: ValidationIssue[] = [];

  if (!machine.states || machine.states.length === 0) {
    issues.push({ type: 'error', category: 'Incomplete', message: 'Machine has no states defined.' });
    return { isValid: false, issues, completenessPercentage: 0, reachableStates: [], unreachableStates: [], deadStates: [] };
  }

  if (!machine.startState || !machine.states.includes(machine.startState)) {
    issues.push({ type: 'error', category: 'Incomplete', message: 'Invalid or missing start state.' });
  }

  // Check state output completeness
  for (const s of machine.states) {
    if (machine.stateOutputs[s] === undefined || machine.stateOutputs[s] === null || machine.stateOutputs[s].trim() === '') {
      issues.push({
        type: 'error',
        category: 'Missing Output',
        message: `State '${s}' has no output symbol λ(${s}) defined.`,
        stateId: s,
      });
    }
  }

  // Reachability via BFS
  const reachable = new Set<string>();
  const queue = [machine.startState || machine.states[0]];
  reachable.add(queue[0]);

  while (queue.length > 0) {
    const curr = queue.shift()!;
    const outgoing = machine.transitions.filter((t) => t.from === curr);
    for (const t of outgoing) {
      if (!reachable.has(t.to)) {
        reachable.add(t.to);
        queue.push(t.to);
      }
    }
  }

  const unreachableStates = machine.states.filter((s) => !reachable.has(s));
  for (const u of unreachableStates) {
    issues.push({
      type: 'warning',
      category: 'Unreachable',
      message: `State '${u}' is unreachable from start state '${machine.startState}'.`,
      stateId: u,
    });
  }

  let totalRequiredTransitions = machine.states.length * machine.inputAlphabet.length;
  let validTransitionCount = 0;

  for (const s of machine.states) {
    for (const inputSym of machine.inputAlphabet) {
      const matches = machine.transitions.filter((t) => t.from === s && t.inputSymbol === inputSym);
      if (matches.length === 0) {
        issues.push({
          type: 'warning',
          category: 'Missing Transition',
          message: `State '${s}' has no outgoing transition for symbol '${inputSym}'.`,
          stateId: s,
        });
      } else if (matches.length > 1) {
        issues.push({
          type: 'error',
          category: 'Duplicate',
          message: `State '${s}' has ${matches.length} non-deterministic transitions for symbol '${inputSym}'.`,
          stateId: s,
        });
      } else {
        validTransitionCount++;
      }
    }
  }

  const deadStates: string[] = [];
  for (const s of machine.states) {
    const outgoing = machine.transitions.filter((t) => t.from === s);
    if (outgoing.length === 0) {
      deadStates.push(s);
      issues.push({
        type: 'info',
        category: 'Dead State',
        message: `State '${s}' is a dead-end state with no outgoing transitions.`,
        stateId: s,
      });
    }
  }

  const completenessPercentage = totalRequiredTransitions > 0
    ? Math.round((validTransitionCount / totalRequiredTransitions) * 100)
    : 100;

  const hasErrors = issues.some((i) => i.type === 'error');

  return {
    isValid: !hasErrors,
    issues,
    completenessPercentage,
    reachableStates: Array.from(reachable),
    unreachableStates,
    deadStates,
  };
}

// ── 3. MOORE TO MEALY CONVERSION & MEALY MINIMIZATION ALGORITHMS ──────────────

export function minimizeMealyMachine(mealy: MealyMachine): MealyMachine {
  if (mealy.states.length <= 1) return mealy;

  // Initial partitioning based on 1-step output signature for all input symbols
  const partitionMap = new Map<string, string[]>();

  for (const s of mealy.states) {
    const signature = mealy.inputAlphabet
      .map((sym) => {
        const trans = mealy.transitions.find((t) => t.from === s && t.inputSymbol === sym);
        return `${sym}:${trans ? trans.outputSymbol : '?'}`;
      })
      .join('|');

    if (!partitionMap.has(signature)) {
      partitionMap.set(signature, []);
    }
    partitionMap.get(signature)!.push(s);
  }

  let blocks: string[][] = Array.from(partitionMap.values());

  const getBlockIndex = (stateId: string, currentBlocks: string[][]) => {
    return currentBlocks.findIndex((b) => b.includes(stateId));
  };

  let changed = true;
  while (changed) {
    changed = false;
    const newBlocks: string[][] = [];

    for (const block of blocks) {
      if (block.length <= 1) {
        newBlocks.push(block);
        continue;
      }

      const subGroups = new Map<string, string[]>();
      for (const stateId of block) {
        const targetBlocksSignature = mealy.inputAlphabet
          .map((sym) => {
            const trans = mealy.transitions.find((t) => t.from === stateId && t.inputSymbol === sym);
            const targetBlockIdx = trans ? getBlockIndex(trans.to, blocks) : -1;
            return `${sym}->${targetBlockIdx}`;
          })
          .join('|');

        if (!subGroups.has(targetBlocksSignature)) {
          subGroups.set(targetBlocksSignature, []);
        }
        subGroups.get(targetBlocksSignature)!.push(stateId);
      }

      const split = Array.from(subGroups.values());
      if (split.length > 1) {
        changed = true;
      }
      newBlocks.push(...split);
    }

    blocks = newBlocks;
  }

  const stateToRepMap = new Map<string, string>();
  const newStates: string[] = [];

  for (const block of blocks) {
    let rep = block.find((s) => s === mealy.startState) || [...block].sort()[0];
    newStates.push(rep);
    for (const s of block) {
      stateToRepMap.set(s, rep);
    }
  }

  const newStartState = stateToRepMap.get(mealy.startState) || newStates[0];

  const newTransitions: { id: string; from: string; to: string; inputSymbol: string; outputSymbol: string }[] = [];
  let transCounter = 1;
  const addedTransKeys = new Set<string>();

  for (const repState of newStates) {
    for (const inputSym of mealy.inputAlphabet) {
      const origTrans = mealy.transitions.find((t) => t.from === repState && t.inputSymbol === inputSym);
      if (origTrans) {
        const targetRep = stateToRepMap.get(origTrans.to) || origTrans.to;
        const key = `${repState}->${inputSym}->${targetRep}/${origTrans.outputSymbol}`;
        if (!addedTransKeys.has(key)) {
          addedTransKeys.add(key);
          newTransitions.push({
            id: `min_t_${transCounter++}`,
            from: repState,
            to: targetRep,
            inputSymbol: inputSym,
            outputSymbol: origTrans.outputSymbol,
          });
        }
      }
    }
  }

  return {
    id: `${mealy.id}_minimized`,
    name: `${mealy.name} (Minimized)`,
    description: `Minimized Mealy machine with ${newStates.length} optimal states.`,
    states: newStates,
    inputAlphabet: [...mealy.inputAlphabet],
    outputAlphabet: [...mealy.outputAlphabet],
    startState: newStartState,
    transitions: newTransitions,
  };
}

export function convertMooreToMealy(moore: MooreMachine): MooreToMealyConversionResult {
  const explanationSteps: MooreToMealyConversionResult['explanationSteps'] = [];

  const mealyTransitions = moore.transitions.map((t) => {
    const mealyOutput = moore.stateOutputs[t.to] || '0';

    explanationSteps.push({
      title: `Transition '${t.from}' --${t.inputSymbol}--> '${t.to}'`,
      description: `Target state '${t.to}' has Moore output λ(${t.to}) = '${mealyOutput}'. Assigning Mealy transition output λ'(${t.from}, ${t.inputSymbol}) = '${mealyOutput}'.`,
      mooreTransition: `${t.from} --${t.inputSymbol}--> ${t.to}`,
      targetState: t.to,
      assignedMealyOutput: mealyOutput,
    });

    return {
      id: t.id,
      from: t.from,
      to: t.to,
      inputSymbol: t.inputSymbol,
      outputSymbol: mealyOutput,
    };
  });

  const rawEquivalentMealy: MealyMachine = {
    id: `${moore.id}_mealy_raw`,
    name: `${moore.name} (Equivalent Mealy)`,
    description: `Mealy machine converted from Moore machine '${moore.name}' by mapping target state outputs to edge outputs.`,
    states: [...moore.states],
    inputAlphabet: [...moore.inputAlphabet],
    outputAlphabet: [...moore.outputAlphabet],
    startState: moore.startState,
    transitions: mealyTransitions,
  };

  const equivalentMealy = minimizeMealyMachine(rawEquivalentMealy);

  return {
    originalMoore: moore,
    rawEquivalentMealy,
    equivalentMealy,
    explanationSteps,
  };
}

// ── 4. CONVERT MOORE MACHINE TO AUTOMATON GRAPH FOR CANVAS ────────────────────

export function convertMooreMachineToAutomatonGraph(
  moore: MooreMachine,
  nodePositions?: Record<string, { x: number; y: number }>
): AutomatonGraph {
  const total = moore.states.length;
  const radius = 160;
  const centerX = 240;
  const centerY = 150;

  const states: AutomatonState[] = moore.states.map((s, idx) => {
    const customPos = nodePositions ? nodePositions[s] : undefined;
    const angle = (idx / total) * 2 * Math.PI - Math.PI / 2;
    const defaultX = centerX + radius * Math.cos(angle);
    const defaultY = centerY + radius * Math.sin(angle);
    const outVal = moore.stateOutputs[s] || '0';

    return {
      id: s,
      label: `${s} / ${outVal}`,
      isStart: s === moore.startState,
      isAccept: false,
      x: customPos ? customPos.x : defaultX,
      y: customPos ? customPos.y : defaultY,
    };
  });

  const transMap = new Map<string, string[]>();
  for (const t of moore.transitions) {
    const key = `${t.from}->${t.to}`;
    if (!transMap.has(key)) {
      transMap.set(key, []);
    }
    transMap.get(key)!.push(t.inputSymbol);
  }

  const transitions: AutomatonTransition[] = [];
  let idCounter = 1;
  transMap.forEach((symbols, key) => {
    const [source, target] = key.split('->');
    transitions.push({
      id: `t_${idCounter++}`,
      source,
      target,
      symbols: [symbols.join(', ')],
    });
  });

  return {
    id: moore.id,
    name: moore.name,
    type: 'DFA',
    alphabet: moore.inputAlphabet,
    states,
    transitions,
    description: moore.description,
  };
}

export function convertEquivalentMealyToAutomatonGraph(
  mealy: MealyMachine,
  nodePositions?: Record<string, { x: number; y: number }>,
  conversionStep?: number,
  totalSteps?: number
): AutomatonGraph {
  // Step 0: Initial state of conversion stepper -> Graph is completely empty at start
  if (conversionStep === 0) {
    return {
      id: `mealy_empty`,
      name: `${mealy.name} (Mealy)`,
      type: 'DFA',
      alphabet: mealy.inputAlphabet,
      states: [],
      transitions: [],
      description: 'Equivalent Mealy graph builds dynamically as conversion steps advance.',
    };
  }

  // Reveal transitions up to current conversion step
  let revealedTransitions = mealy.transitions;
  if (typeof conversionStep === 'number' && typeof totalSteps === 'number' && conversionStep < totalSteps) {
    revealedTransitions = mealy.transitions.slice(0, conversionStep);
  }

  // Find all states involved in revealed transitions (or all states if finished)
  const revealedStatesSet = new Set<string>();
  if (typeof conversionStep === 'number' && typeof totalSteps === 'number' && conversionStep < totalSteps) {
    revealedStatesSet.add(mealy.startState);
    revealedTransitions.forEach((t) => {
      revealedStatesSet.add(t.from);
      revealedStatesSet.add(t.to);
    });
  } else {
    mealy.states.forEach((s) => revealedStatesSet.add(s));
  }

  const revealedStatesArray = mealy.states.filter((s) => revealedStatesSet.has(s));
  const total = Math.max(1, revealedStatesArray.length);
  const radius = 160;
  const centerX = 240;
  const centerY = 150;

  const states: AutomatonState[] = revealedStatesArray.map((s, idx) => {
    const customPos = nodePositions ? nodePositions[s] : undefined;
    const angle = (idx / total) * 2 * Math.PI - Math.PI / 2;
    const defaultX = centerX + radius * Math.cos(angle);
    const defaultY = centerY + radius * Math.sin(angle);

    return {
      id: s,
      label: s,
      isStart: s === mealy.startState,
      isAccept: false,
      x: customPos ? customPos.x : defaultX,
      y: customPos ? customPos.y : defaultY,
    };
  });

  const transitions: AutomatonTransition[] = revealedTransitions
    .filter((t) => revealedStatesSet.has(t.from) && revealedStatesSet.has(t.to))
    .map((t) => ({
      id: t.id,
      source: t.from,
      target: t.to,
      symbols: [`${t.inputSymbol} / ${t.outputSymbol}`],
    }));

  return {
    id: mealy.id,
    name: mealy.name,
    type: 'DFA',
    alphabet: mealy.inputAlphabet,
    states,
    transitions,
    description: mealy.description,
  };
}

// ── 5. PRESET MOORE MACHINES LIBRARY ────────────────────────────────────────────

export const PRESET_MOORE_MACHINES: MooreMachine[] = [
  {
    id: 'moore_seq_101',
    name: '101 Sequence Detector (Moore)',
    description: 'Moore FSM outputting 1 in state q3 whenever "101" is detected.',
    states: ['q0', 'q1', 'q2', 'q3'],
    stateOutputs: { q0: '0', q1: '0', q2: '0', q3: '1' },
    inputAlphabet: ['0', '1'],
    outputAlphabet: ['0', '1'],
    startState: 'q0',
    transitions: [
      { id: 't1', from: 'q0', to: 'q0', inputSymbol: '0' },
      { id: 't2', from: 'q0', to: 'q1', inputSymbol: '1' },
      { id: 't3', from: 'q1', to: 'q2', inputSymbol: '0' },
      { id: 't4', from: 'q1', to: 'q1', inputSymbol: '1' },
      { id: 't5', from: 'q2', to: 'q0', inputSymbol: '0' },
      { id: 't6', from: 'q2', to: 'q3', inputSymbol: '1' },
      { id: 't7', from: 'q3', to: 'q2', inputSymbol: '0' },
      { id: 't8', from: 'q3', to: 'q1', inputSymbol: '1' },
    ],
  },
  {
    id: 'moore_seq_110',
    name: '110 Sequence Detector (Moore)',
    description: 'Moore FSM outputting 1 in state q3 whenever sequence "110" is detected.',
    states: ['q0', 'q1', 'q2', 'q3'],
    stateOutputs: { q0: '0', q1: '0', q2: '0', q3: '1' },
    inputAlphabet: ['0', '1'],
    outputAlphabet: ['0', '1'],
    startState: 'q0',
    transitions: [
      { id: 't1', from: 'q0', to: 'q0', inputSymbol: '0' },
      { id: 't2', from: 'q0', to: 'q1', inputSymbol: '1' },
      { id: 't3', from: 'q1', to: 'q0', inputSymbol: '0' },
      { id: 't4', from: 'q1', to: 'q2', inputSymbol: '1' },
      { id: 't5', from: 'q2', to: 'q3', inputSymbol: '0' },
      { id: 't6', from: 'q2', to: 'q2', inputSymbol: '1' },
      { id: 't7', from: 'q3', to: 'q0', inputSymbol: '0' },
      { id: 't8', from: 'q3', to: 'q1', inputSymbol: '1' },
    ],
  },
  {
    id: 'moore_even_parity',
    name: 'Even Parity Detector (Moore)',
    description: 'State qEven outputs 1 (even number of 1s), qOdd outputs 0 (odd number of 1s).',
    states: ['qEven', 'qOdd'],
    stateOutputs: { qEven: '1', qOdd: '0' },
    inputAlphabet: ['0', '1'],
    outputAlphabet: ['0', '1'],
    startState: 'qEven',
    transitions: [
      { id: 't1', from: 'qEven', to: 'qEven', inputSymbol: '0' },
      { id: 't2', from: 'qEven', to: 'qOdd',  inputSymbol: '1' },
      { id: 't3', from: 'qOdd',  to: 'qOdd',  inputSymbol: '0' },
      { id: 't4', from: 'qOdd',  to: 'qEven', inputSymbol: '1' },
    ],
  },
  {
    id: 'moore_odd_parity',
    name: 'Odd Parity Detector (Moore)',
    description: 'State qOdd outputs 1 (odd number of 1s), qEven outputs 0 (even number of 1s).',
    states: ['qEven', 'qOdd'],
    stateOutputs: { qEven: '0', qOdd: '1' },
    inputAlphabet: ['0', '1'],
    outputAlphabet: ['0', '1'],
    startState: 'qEven',
    transitions: [
      { id: 't1', from: 'qEven', to: 'qEven', inputSymbol: '0' },
      { id: 't2', from: 'qEven', to: 'qOdd',  inputSymbol: '1' },
      { id: 't3', from: 'qOdd',  to: 'qOdd',  inputSymbol: '0' },
      { id: 't4', from: 'qOdd',  to: 'qEven', inputSymbol: '1' },
    ],
  },
  {
    id: 'moore_traffic_controller',
    name: 'Traffic Signal Controller (Moore)',
    description: 'State outputs indicate signal color (qGreen -> G, qYellow -> Y, qRed -> R).',
    states: ['qGreen', 'qYellow', 'qRed'],
    stateOutputs: { qGreen: 'G', qYellow: 'Y', qRed: 'R' },
    inputAlphabet: ['0', '1'],
    outputAlphabet: ['G', 'Y', 'R'],
    startState: 'qGreen',
    transitions: [
      { id: 't1', from: 'qGreen',  to: 'qGreen',  inputSymbol: '0' },
      { id: 't2', from: 'qGreen',  to: 'qYellow', inputSymbol: '1' },
      { id: 't3', from: 'qYellow', to: 'qRed',    inputSymbol: '0' },
      { id: 't4', from: 'qYellow', to: 'qRed',    inputSymbol: '1' },
      { id: 't5', from: 'qRed',    to: 'qGreen',  inputSymbol: '0' },
      { id: 't6', from: 'qRed',    to: 'qGreen',  inputSymbol: '1' },
    ],
  },
];
