/**
 * Mealy Machine Deterministic Automata Engine
 * Handles simulation, state transitions, output generation, machine validation,
 * Mealy to Moore conversion, state expansion analysis, and preset machines.
 */

import type { AutomatonGraph, AutomatonState, AutomatonTransition } from '../types/automata';

export interface MealyTransition {
  id: string;
  from: string;
  to: string;
  inputSymbol: string;
  outputSymbol: string;
}

export interface MealyMachine {
  id: string;
  name: string;
  description: string;
  states: string[];           // Q
  inputAlphabet: string[];   // Σ
  outputAlphabet: string[];  // Δ
  startState: string;        // q0
  transitions: MealyTransition[];
}

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
  states: string[];
  stateOutputs: Record<string, string>; // λ(q)
  inputAlphabet: string[];
  outputAlphabet: string[];
  startState: string;
  transitions: MooreTransition[];
}

export interface MealySimulationStep {
  cycle: number;
  fromState: string;
  toState: string;
  inputSymbol: string;
  outputSymbol: string;
  accumulatedOutput: string;
  consumedInput: string;
  remainingInput: string;
  activeTransitionId: string;
}

export interface MealySimulationResult {
  machineId: string;
  inputTape: string;
  outputTape: string;
  steps: MealySimulationStep[];
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

export interface MealyToMooreStateMapping {
  mooreStateId: string;
  originalMealyStateId: string;
  assignedOutput: string;
}

export interface MealyToMooreConversionResult {
  originalMealy: MealyMachine;
  equivalentMoore: MooreMachine;
  stateMappings: MealyToMooreStateMapping[];
  expandedStateCount: number;
  explanationSteps: {
    title: string;
    description: string;
    mealyState: string;
    outputsFound: string[];
    createdMooreStates: string[];
  }[];
}

// ── 1. DETERMINISTIC SIMULATION ENGINE ──────────────────────────────────────────

export function simulateMealyMachine(machine: MealyMachine, inputTape: string): MealySimulationResult {
  const steps: MealySimulationStep[] = [];
  const visitedStates = new Set<string>();
  const visitedTransitions = new Set<string>();

  let currentState = machine.startState || machine.states[0] || 'q0';
  visitedStates.add(currentState);

  let accumulatedOutput = '';
  const symbols = inputTape.split('');

  for (let i = 0; i < symbols.length; i++) {
    const inputSym = symbols[i];
    
    // Find matching transition
    const trans = machine.transitions.find(
      (t) => t.from === currentState && t.inputSymbol === inputSym
    );

    if (!trans) {
      // Machine halts or invalid input
      break;
    }

    visitedTransitions.add(trans.id);
    const nextState = trans.to;
    visitedStates.add(nextState);
    accumulatedOutput += trans.outputSymbol;

    const consumed = inputTape.slice(0, i + 1);
    const remaining = inputTape.slice(i + 1);

    steps.push({
      cycle: i + 1,
      fromState: currentState,
      toState: nextState,
      inputSymbol: inputSym,
      outputSymbol: trans.outputSymbol,
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

export function validateMealyMachine(machine: MealyMachine): MachineValidationReport {
  const issues: ValidationIssue[] = [];

  if (!machine.states || machine.states.length === 0) {
    issues.push({ type: 'error', category: 'Incomplete', message: 'Machine has no states defined.' });
    return { isValid: false, issues, completenessPercentage: 0, reachableStates: [], unreachableStates: [], deadStates: [] };
  }

  if (!machine.startState || !machine.states.includes(machine.startState)) {
    issues.push({ type: 'error', category: 'Incomplete', message: 'Invalid or missing start state.' });
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

  // Check state transitions for completeness & duplicates
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
        const t = matches[0];
        if (!t.outputSymbol || t.outputSymbol.trim() === '') {
          issues.push({
            type: 'error',
            category: 'Missing Output',
            message: `Transition from '${s}' on '${inputSym}' is missing an output symbol.`,
            transitionId: t.id,
          });
        }
      }
    }
  }

  // Dead state check (states with no outgoing transitions or only self loops)
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

// ── 3. MEALY TO MOORE CONVERSION ALGORITHM ──────────────────────────────────────

export function convertMealyToMoore(mealy: MealyMachine): MealyToMooreConversionResult {
  const explanationSteps: MealyToMooreConversionResult['explanationSteps'] = [];
  const stateMappings: MealyToMooreStateMapping[] = [];

  const mooreStates: string[] = [];
  const mooreStateOutputs: Record<string, string> = {};
  const mooreTransitions: MooreTransition[] = [];

  // For each Mealy state, discover all output symbols produced on incoming transitions
  for (const stateId of mealy.states) {
    const incomingOutputs = new Set<string>();

    for (const t of mealy.transitions) {
      if (t.to === stateId) {
        incomingOutputs.add(t.outputSymbol);
      }
    }

    // If start state or no incoming transitions, assign a default output (e.g. '0')
    if (incomingOutputs.size === 0 || stateId === mealy.startState) {
      if (incomingOutputs.size === 0) {
        incomingOutputs.add('0');
      }
    }

    const outputsArray = Array.from(incomingOutputs);
    const createdMooreForThisState: string[] = [];

    for (const outSym of outputsArray) {
      // Moore state name format: q0_0, q1_1, etc.
      const mooreId = `${stateId}_${outSym}`;
      mooreStates.push(mooreId);
      mooreStateOutputs[mooreId] = outSym;
      createdMooreForThisState.push(mooreId);

      stateMappings.push({
        mooreStateId: mooreId,
        originalMealyStateId: stateId,
        assignedOutput: outSym,
      });
    }

    explanationSteps.push({
      title: `State Expansion for '${stateId}'`,
      description: outputsArray.length > 1
        ? `State '${stateId}' produces ${outputsArray.length} distinct outputs (${outputsArray.join(', ')}) on incoming transitions. It must be split into ${outputsArray.length} Moore states.`
        : `State '${stateId}' produces a single output '${outputsArray[0]}'. It maps to 1 Moore state.`,
      mealyState: stateId,
      outputsFound: outputsArray,
      createdMooreStates: createdMooreForThisState,
    });
  }

  // Construct Moore transitions
  let transCounter = 0;
  for (const mState of stateMappings) {
    const origFrom = mState.originalMealyStateId;

    for (const inputSym of mealy.inputAlphabet) {
      const mealyTrans = mealy.transitions.find(
        (t) => t.from === origFrom && t.inputSymbol === inputSym
      );

      if (mealyTrans) {
        const targetOutput = mealyTrans.outputSymbol;
        const targetMooreId = `${mealyTrans.to}_${targetOutput}`;

        // Ensure target state exists, fallback to first available mapping for target
        const actualTarget = mooreStates.includes(targetMooreId)
          ? targetMooreId
          : stateMappings.find((m) => m.originalMealyStateId === mealyTrans.to)?.mooreStateId || targetMooreId;

        transCounter++;
        mooreTransitions.push({
          id: `m_trans_${transCounter}`,
          from: mState.mooreStateId,
          to: actualTarget,
          inputSymbol: inputSym,
        });
      }
    }
  }

  // Determine Moore start state (the mapping for Mealy startState with default output)
  const defaultStartMapping = stateMappings.find((m) => m.originalMealyStateId === mealy.startState);
  const mooreStartState = defaultStartMapping ? defaultStartMapping.mooreStateId : mooreStates[0] || 'q0_0';

  const equivalentMoore: MooreMachine = {
    id: `${mealy.id}_moore`,
    name: `${mealy.name} (Equivalent Moore)`,
    description: `Moore machine converted from Mealy machine '${mealy.name}' via state expansion.`,
    states: mooreStates,
    stateOutputs: mooreStateOutputs,
    inputAlphabet: [...mealy.inputAlphabet],
    outputAlphabet: [...mealy.outputAlphabet],
    startState: mooreStartState,
    transitions: mooreTransitions,
  };

  return {
    originalMealy: mealy,
    equivalentMoore,
    stateMappings,
    expandedStateCount: mooreStates.length,
    explanationSteps,
  };
}

// ── 4. PRESET MEALY MACHINES LIBRARY ────────────────────────────────────────────

export const PRESET_MEALY_MACHINES: MealyMachine[] = [
  {
    id: 'seq_101',
    name: '101 Sequence Detector',
    description: 'Outputs 1 whenever the overlapping sequence "101" is detected in the input binary stream.',
    states: ['q0', 'q1', 'q2'],
    inputAlphabet: ['0', '1'],
    outputAlphabet: ['0', '1'],
    startState: 'q0',
    transitions: [
      { id: 't1', from: 'q0', to: 'q0', inputSymbol: '0', outputSymbol: '0' },
      { id: 't2', from: 'q0', to: 'q1', inputSymbol: '1', outputSymbol: '0' },
      { id: 't3', from: 'q1', to: 'q2', inputSymbol: '0', outputSymbol: '0' },
      { id: 't4', from: 'q1', to: 'q1', inputSymbol: '1', outputSymbol: '0' },
      { id: 't5', from: 'q2', to: 'q0', inputSymbol: '0', outputSymbol: '0' },
      { id: 't6', from: 'q2', to: 'q1', inputSymbol: '1', outputSymbol: '1' },
    ],
  },
  {
    id: 'seq_110',
    name: '110 Sequence Detector',
    description: 'Outputs 1 whenever the sequence "110" is detected in the binary stream.',
    states: ['q0', 'q1', 'q2'],
    inputAlphabet: ['0', '1'],
    outputAlphabet: ['0', '1'],
    startState: 'q0',
    transitions: [
      { id: 't1', from: 'q0', to: 'q0', inputSymbol: '0', outputSymbol: '0' },
      { id: 't2', from: 'q0', to: 'q1', inputSymbol: '1', outputSymbol: '0' },
      { id: 't3', from: 'q1', to: 'q0', inputSymbol: '0', outputSymbol: '0' },
      { id: 't4', from: 'q1', to: 'q2', inputSymbol: '1', outputSymbol: '0' },
      { id: 't5', from: 'q2', to: 'q0', inputSymbol: '0', outputSymbol: '1' },
      { id: 't6', from: 'q2', to: 'q2', inputSymbol: '1', outputSymbol: '0' },
    ],
  },
  {
    id: 'even_parity',
    name: 'Even Parity Generator',
    description: 'Outputs 1 if the number of 1s seen so far is even, 0 if odd.',
    states: ['qEven', 'qOdd'],
    inputAlphabet: ['0', '1'],
    outputAlphabet: ['0', '1'],
    startState: 'qEven',
    transitions: [
      { id: 't1', from: 'qEven', to: 'qEven', inputSymbol: '0', outputSymbol: '1' },
      { id: 't2', from: 'qEven', to: 'qOdd',  inputSymbol: '1', outputSymbol: '0' },
      { id: 't3', from: 'qOdd',  to: 'qOdd',  inputSymbol: '0', outputSymbol: '0' },
      { id: 't4', from: 'qOdd',  to: 'qEven', inputSymbol: '1', outputSymbol: '1' },
    ],
  },
  {
    id: 'odd_parity',
    name: 'Odd Parity Generator',
    description: 'Outputs 1 if the number of 1s seen so far is odd, 0 if even.',
    states: ['qEven', 'qOdd'],
    inputAlphabet: ['0', '1'],
    outputAlphabet: ['0', '1'],
    startState: 'qEven',
    transitions: [
      { id: 't1', from: 'qEven', to: 'qEven', inputSymbol: '0', outputSymbol: '0' },
      { id: 't2', from: 'qEven', to: 'qOdd',  inputSymbol: '1', outputSymbol: '1' },
      { id: 't3', from: 'qOdd',  to: 'qOdd',  inputSymbol: '0', outputSymbol: '1' },
      { id: 't4', from: 'qOdd',  to: 'qEven', inputSymbol: '1', outputSymbol: '0' },
    ],
  },
  {
    id: 'seq_1001',
    name: '1001 Sequence Detector',
    description: 'Outputs 1 whenever the binary sequence "1001" is detected in the input stream.',
    states: ['q0', 'q1', 'q2', 'q3'],
    inputAlphabet: ['0', '1'],
    outputAlphabet: ['0', '1'],
    startState: 'q0',
    transitions: [
      { id: 't1', from: 'q0', to: 'q0', inputSymbol: '0', outputSymbol: '0' },
      { id: 't2', from: 'q0', to: 'q1', inputSymbol: '1', outputSymbol: '0' },
      { id: 't3', from: 'q1', to: 'q2', inputSymbol: '0', outputSymbol: '0' },
      { id: 't4', from: 'q1', to: 'q1', inputSymbol: '1', outputSymbol: '0' },
      { id: 't5', from: 'q2', to: 'q3', inputSymbol: '0', outputSymbol: '0' },
      { id: 't6', from: 'q2', to: 'q1', inputSymbol: '1', outputSymbol: '0' },
      { id: 't7', from: 'q3', to: 'q0', inputSymbol: '0', outputSymbol: '0' },
      { id: 't8', from: 'q3', to: 'q1', inputSymbol: '1', outputSymbol: '1' },
    ],
  },
  {
    id: 'seq_1011',
    name: '1011 Sequence Detector',
    description: 'Outputs 1 whenever the sequence "1011" is detected in the binary stream.',
    states: ['q0', 'q1', 'q2', 'q3'],
    inputAlphabet: ['0', '1'],
    outputAlphabet: ['0', '1'],
    startState: 'q0',
    transitions: [
      { id: 't1', from: 'q0', to: 'q0', inputSymbol: '0', outputSymbol: '0' },
      { id: 't2', from: 'q0', to: 'q1', inputSymbol: '1', outputSymbol: '0' },
      { id: 't3', from: 'q1', to: 'q2', inputSymbol: '0', outputSymbol: '0' },
      { id: 't4', from: 'q1', to: 'q1', inputSymbol: '1', outputSymbol: '0' },
      { id: 't5', from: 'q2', to: 'q0', inputSymbol: '0', outputSymbol: '0' },
      { id: 't6', from: 'q2', to: 'q3', inputSymbol: '1', outputSymbol: '0' },
      { id: 't7', from: 'q3', to: 'q2', inputSymbol: '0', outputSymbol: '0' },
      { id: 't8', from: 'q3', to: 'q1', inputSymbol: '1', outputSymbol: '1' },
    ],
  },
  {
    id: 'seq_101_non_overlap',
    name: 'Non-Overlapping 101 Detector',
    description: 'Outputs 1 on "101" and resets state machine to start (non-overlapping detection).',
    states: ['q0', 'q1', 'q2'],
    inputAlphabet: ['0', '1'],
    outputAlphabet: ['0', '1'],
    startState: 'q0',
    transitions: [
      { id: 't1', from: 'q0', to: 'q0', inputSymbol: '0', outputSymbol: '0' },
      { id: 't2', from: 'q0', to: 'q1', inputSymbol: '1', outputSymbol: '0' },
      { id: 't3', from: 'q1', to: 'q2', inputSymbol: '0', outputSymbol: '0' },
      { id: 't4', from: 'q1', to: 'q1', inputSymbol: '1', outputSymbol: '0' },
      { id: 't5', from: 'q2', to: 'q0', inputSymbol: '0', outputSymbol: '0' },
      { id: 't6', from: 'q2', to: 'q0', inputSymbol: '1', outputSymbol: '1' },
    ],
  },
  {
    id: 'bit_complementer',
    name: 'Bit Complementer (Inverter)',
    description: 'Inverts each input bit (0 -> 1, 1 -> 0) instantaneously on transitions.',
    states: ['q0'],
    inputAlphabet: ['0', '1'],
    outputAlphabet: ['0', '1'],
    startState: 'q0',
    transitions: [
      { id: 't1', from: 'q0', to: 'q0', inputSymbol: '0', outputSymbol: '1' },
      { id: 't2', from: 'q0', to: 'q0', inputSymbol: '1', outputSymbol: '0' },
    ],
  },
  {
    id: 'binary_incrementer',
    name: 'Binary Incrementer (LSB First)',
    description: 'Increments a binary number fed LSB first. Adds 1 and outputs result bits with carry propagation.',
    states: ['qCarry', 'qNoCarry'],
    inputAlphabet: ['0', '1'],
    outputAlphabet: ['0', '1'],
    startState: 'qCarry',
    transitions: [
      { id: 't1', from: 'qCarry',   to: 'qNoCarry', inputSymbol: '0', outputSymbol: '1' },
      { id: 't2', from: 'qCarry',   to: 'qCarry',   inputSymbol: '1', outputSymbol: '0' },
      { id: 't3', from: 'qNoCarry', to: 'qNoCarry', inputSymbol: '0', outputSymbol: '0' },
      { id: 't4', from: 'qNoCarry', to: 'qNoCarry', inputSymbol: '1', outputSymbol: '1' },
    ],
  },
  {
    id: 'binary_decrementer',
    name: 'Binary Decrementer (LSB First)',
    description: 'Decrements a binary number fed LSB first with borrow propagation.',
    states: ['qBorrow', 'qNoBorrow'],
    inputAlphabet: ['0', '1'],
    outputAlphabet: ['0', '1'],
    startState: 'qBorrow',
    transitions: [
      { id: 't1', from: 'qBorrow',   to: 'qBorrow',   inputSymbol: '0', outputSymbol: '1' },
      { id: 't2', from: 'qBorrow',   to: 'qNoBorrow', inputSymbol: '1', outputSymbol: '0' },
      { id: 't3', from: 'qNoBorrow', to: 'qNoBorrow', inputSymbol: '0', outputSymbol: '0' },
      { id: 't4', from: 'qNoBorrow', to: 'qNoBorrow', inputSymbol: '1', outputSymbol: '1' },
    ],
  },
  {
    id: 'serial_adder',
    name: 'Serial Adder FSM',
    description: 'Computes sum of two binary bits encoded as 00 (0), 01 (1), 10 (1), 11 (2) with internal carry state.',
    states: ['qCarry0', 'qCarry1'],
    inputAlphabet: ['0', '1', '2', '3'],
    outputAlphabet: ['0', '1'],
    startState: 'qCarry0',
    transitions: [
      { id: 't1', from: 'qCarry0', to: 'qCarry0', inputSymbol: '0', outputSymbol: '0' },
      { id: 't2', from: 'qCarry0', to: 'qCarry0', inputSymbol: '1', outputSymbol: '1' },
      { id: 't3', from: 'qCarry0', to: 'qCarry0', inputSymbol: '2', outputSymbol: '1' },
      { id: 't4', from: 'qCarry0', to: 'qCarry1', inputSymbol: '3', outputSymbol: '0' },
      { id: 't5', from: 'qCarry1', to: 'qCarry0', inputSymbol: '0', outputSymbol: '1' },
      { id: 't6', from: 'qCarry1', to: 'qCarry1', inputSymbol: '1', outputSymbol: '0' },
      { id: 't7', from: 'qCarry1', to: 'qCarry1', inputSymbol: '2', outputSymbol: '0' },
      { id: 't8', from: 'qCarry1', to: 'qCarry1', inputSymbol: '3', outputSymbol: '1' },
    ],
  },
  {
    id: 'serial_subtractor',
    name: 'Serial Subtractor FSM',
    description: 'Computes difference of two binary bits with internal borrow state.',
    states: ['qBorrow0', 'qBorrow1'],
    inputAlphabet: ['0', '1'],
    outputAlphabet: ['0', '1'],
    startState: 'qBorrow0',
    transitions: [
      { id: 't1', from: 'qBorrow0', to: 'qBorrow0', inputSymbol: '0', outputSymbol: '0' },
      { id: 't2', from: 'qBorrow0', to: 'qBorrow1', inputSymbol: '1', outputSymbol: '1' },
      { id: 't3', from: 'qBorrow1', to: 'qBorrow1', inputSymbol: '0', outputSymbol: '1' },
      { id: 't4', from: 'qBorrow1', to: 'qBorrow0', inputSymbol: '1', outputSymbol: '0' },
    ],
  },
  {
    id: 'parity_checker',
    name: 'Parity Checker FSM',
    description: 'Checks stream parity and outputs 1 on error (odd parity violation).',
    states: ['qEven', 'qOdd'],
    inputAlphabet: ['0', '1'],
    outputAlphabet: ['0', '1'],
    startState: 'qEven',
    transitions: [
      { id: 't1', from: 'qEven', to: 'qEven', inputSymbol: '0', outputSymbol: '0' },
      { id: 't2', from: 'qEven', to: 'qOdd',  inputSymbol: '1', outputSymbol: '1' },
      { id: 't3', from: 'qOdd',  to: 'qOdd',  inputSymbol: '0', outputSymbol: '1' },
      { id: 't4', from: 'qOdd',  to: 'qEven', inputSymbol: '1', outputSymbol: '0' },
    ],
  },
  {
    id: 'magnitude_comparator',
    name: '2-Bit Magnitude Comparator',
    description: 'Compares two binary bits A,B (input 0=00, 1=01, 2=10, 3=11) outputting E(=), L(<), G(>).',
    states: ['qEqual', 'qLess', 'qGreater'],
    inputAlphabet: ['0', '1', '2', '3'],
    outputAlphabet: ['E', 'L', 'G'],
    startState: 'qEqual',
    transitions: [
      { id: 't1', from: 'qEqual', to: 'qEqual',   inputSymbol: '0', outputSymbol: 'E' },
      { id: 't2', from: 'qEqual', to: 'qLess',    inputSymbol: '1', outputSymbol: 'L' },
      { id: 't3', from: 'qEqual', to: 'qGreater', inputSymbol: '2', outputSymbol: 'G' },
      { id: 't4', from: 'qEqual', to: 'qEqual',   inputSymbol: '3', outputSymbol: 'E' },
    ],
  },
  {
    id: 'pedestrian_crossing',
    name: 'Pedestrian Crossing Controller',
    description: 'Controls pedestrian walk signal (0=wait, 1=walk) based on push-button input.',
    states: ['qDonotWalk', 'qWalkRequested', 'qWalkNow'],
    inputAlphabet: ['0', '1'],
    outputAlphabet: ['W', 'K', 'S'], // Wait, WalK, Stop
    startState: 'qDonotWalk',
    transitions: [
      { id: 't1', from: 'qDonotWalk',    to: 'qDonotWalk',    inputSymbol: '0', outputSymbol: 'W' },
      { id: 't2', from: 'qDonotWalk',    to: 'qWalkRequested',inputSymbol: '1', outputSymbol: 'W' },
      { id: 't3', from: 'qWalkRequested', to: 'qWalkNow',      inputSymbol: '0', outputSymbol: 'K' },
      { id: 't4', from: 'qWalkRequested', to: 'qWalkNow',      inputSymbol: '1', outputSymbol: 'K' },
      { id: 't5', from: 'qWalkNow',       to: 'qDonotWalk',    inputSymbol: '0', outputSymbol: 'S' },
      { id: 't6', from: 'qWalkNow',       to: 'qDonotWalk',    inputSymbol: '1', outputSymbol: 'S' },
    ],
  },
  {
    id: 'traffic_light',
    name: 'Traffic Light FSM Controller',
    description: 'Mealy traffic controller responding to pedestrian sensor (0=none, 1=wait).',
    states: ['qGreen', 'qYellow', 'qRed'],
    inputAlphabet: ['0', '1'],
    outputAlphabet: ['G', 'Y', 'R'],
    startState: 'qGreen',
    transitions: [
      { id: 't1', from: 'qGreen',  to: 'qGreen',  inputSymbol: '0', outputSymbol: 'G' },
      { id: 't2', from: 'qGreen',  to: 'qYellow', inputSymbol: '1', outputSymbol: 'Y' },
      { id: 't3', from: 'qYellow', to: 'qRed',    inputSymbol: '0', outputSymbol: 'R' },
      { id: 't4', from: 'qYellow', to: 'qRed',    inputSymbol: '1', outputSymbol: 'R' },
      { id: 't5', from: 'qRed',    to: 'qGreen',  inputSymbol: '0', outputSymbol: 'G' },
      { id: 't6', from: 'qRed',    to: 'qGreen',  inputSymbol: '1', outputSymbol: 'G' },
    ],
  },
  {
    id: 'elevator_controller',
    name: 'Elevator FSM Controller',
    description: 'Elevator controller responding to floor call requests (0=hold, 1=move).',
    states: ['qGround', 'qFloor1', 'qFloor2'],
    inputAlphabet: ['0', '1'],
    outputAlphabet: ['S', 'U', 'D'], // S=Stationary, U=Up, D=Down
    startState: 'qGround',
    transitions: [
      { id: 't1', from: 'qGround', to: 'qGround', inputSymbol: '0', outputSymbol: 'S' },
      { id: 't2', from: 'qGround', to: 'qFloor1', inputSymbol: '1', outputSymbol: 'U' },
      { id: 't3', from: 'qFloor1', to: 'qFloor1', inputSymbol: '0', outputSymbol: 'S' },
      { id: 't4', from: 'qFloor1', to: 'qFloor2', inputSymbol: '1', outputSymbol: 'U' },
      { id: 't5', from: 'qFloor2', to: 'qFloor1', inputSymbol: '0', outputSymbol: 'D' },
      { id: 't6', from: 'qFloor2', to: 'qGround', inputSymbol: '1', outputSymbol: 'D' },
    ],
  },
  {
    id: 'vending_machine',
    name: 'Vending Machine Controller',
    description: 'Accepts 5c (0) and 10c (1) coins to dispense item (D) or output change (C).',
    states: ['q0c', 'q5c', 'q10c'],
    inputAlphabet: ['0', '1'],
    outputAlphabet: ['N', 'D', 'C'],
    startState: 'q0c',
    transitions: [
      { id: 't1', from: 'q0c',  to: 'q5c',  inputSymbol: '0', outputSymbol: 'N' },
      { id: 't2', from: 'q0c',  to: 'q10c', inputSymbol: '1', outputSymbol: 'N' },
      { id: 't3', from: 'q5c',  to: 'q10c', inputSymbol: '0', outputSymbol: 'N' },
      { id: 't4', from: 'q5c',  to: 'q0c',  inputSymbol: '1', outputSymbol: 'D' },
      { id: 't5', from: 'q10c', to: 'q0c',  inputSymbol: '0', outputSymbol: 'D' },
      { id: 't6', from: 'q10c', to: 'q0c',  inputSymbol: '1', outputSymbol: 'C' },
    ],
  },
  {
    id: 'door_lock',
    name: 'Door Lock Security FSM',
    description: 'Requires code combination "10" to unlock security door (U=Unlocked, L=Locked).',
    states: ['qLocked', 'qCode1'],
    inputAlphabet: ['0', '1'],
    outputAlphabet: ['L', 'U'],
    startState: 'qLocked',
    transitions: [
      { id: 't1', from: 'qLocked', to: 'qLocked', inputSymbol: '0', outputSymbol: 'L' },
      { id: 't2', from: 'qLocked', to: 'qCode1',  inputSymbol: '1', outputSymbol: 'L' },
      { id: 't3', from: 'qCode1',  to: 'qLocked', inputSymbol: '0', outputSymbol: 'U' },
      { id: 't4', from: 'qCode1',  to: 'qCode1',  inputSymbol: '1', outputSymbol: 'L' },
    ],
  },
  {
    id: 'atm_pin_verifier',
    name: 'ATM PIN Verifier FSM',
    description: 'Verifies 2-bit security PIN sequence (1->0 unlocks ATM, invalid input locks out).',
    states: ['qIdle', 'qDigit1', 'qGranted', 'qLockedOut'],
    inputAlphabet: ['0', '1'],
    outputAlphabet: ['W', 'O', 'E'], // W=Wait, O=OK/Granted, E=Error
    startState: 'qIdle',
    transitions: [
      { id: 't1', from: 'qIdle',      to: 'qIdle',      inputSymbol: '0', outputSymbol: 'W' },
      { id: 't2', from: 'qIdle',      to: 'qDigit1',    inputSymbol: '1', outputSymbol: 'W' },
      { id: 't3', from: 'qDigit1',    to: 'qGranted',   inputSymbol: '0', outputSymbol: 'O' },
      { id: 't4', from: 'qDigit1',    to: 'qLockedOut', inputSymbol: '1', outputSymbol: 'E' },
      { id: 't5', from: 'qGranted',   to: 'qIdle',      inputSymbol: '0', outputSymbol: 'W' },
      { id: 't6', from: 'qGranted',   to: 'qIdle',      inputSymbol: '1', outputSymbol: 'W' },
      { id: 't7', from: 'qLockedOut', to: 'qIdle',      inputSymbol: '0', outputSymbol: 'E' },
      { id: 't8', from: 'qLockedOut', to: 'qIdle',      inputSymbol: '1', outputSymbol: 'E' },
    ],
  },
  {
    id: 'washing_machine',
    name: 'Washing Machine Controller',
    description: 'Controls washing cycle steps (Wash -> Rinse -> Spin) triggered by sensors.',
    states: ['qSoak', 'qWash', 'qRinse', 'qSpin'],
    inputAlphabet: ['0', '1'],
    outputAlphabet: ['W', 'R', 'S', 'D'], // Wash, Rinse, Spin, Done
    startState: 'qSoak',
    transitions: [
      { id: 't1', from: 'qSoak',  to: 'qWash',  inputSymbol: '1', outputSymbol: 'W' },
      { id: 't2', from: 'qSoak',  to: 'qSoak',  inputSymbol: '0', outputSymbol: 'W' },
      { id: 't3', from: 'qWash',  to: 'qRinse', inputSymbol: '1', outputSymbol: 'R' },
      { id: 't4', from: 'qWash',  to: 'qWash',  inputSymbol: '0', outputSymbol: 'W' },
      { id: 't5', from: 'qRinse', to: 'qSpin',  inputSymbol: '1', outputSymbol: 'S' },
      { id: 't6', from: 'qRinse', to: 'qRinse', inputSymbol: '0', outputSymbol: 'R' },
      { id: 't7', from: 'qSpin',  to: 'qSoak',  inputSymbol: '1', outputSymbol: 'D' },
      { id: 't8', from: 'qSpin',  to: 'qSpin',  inputSymbol: '0', outputSymbol: 'S' },
    ],
  },
  {
    id: 'railway_crossing',
    name: 'Railway Crossing Gate Controller',
    description: 'Controls gate lowering and signal lights when train sensor activates (0=clear, 1=train).',
    states: ['qGateUp', 'qLowering', 'qGateDown'],
    inputAlphabet: ['0', '1'],
    outputAlphabet: ['O', 'C', 'L'], // Open, Caution, Locked Down
    startState: 'qGateUp',
    transitions: [
      { id: 't1', from: 'qGateUp',   to: 'qGateUp',   inputSymbol: '0', outputSymbol: 'O' },
      { id: 't2', from: 'qGateUp',   to: 'qLowering', inputSymbol: '1', outputSymbol: 'C' },
      { id: 't3', from: 'qLowering', to: 'qGateDown', inputSymbol: '0', outputSymbol: 'L' },
      { id: 't4', from: 'qLowering', to: 'qGateDown', inputSymbol: '1', outputSymbol: 'L' },
      { id: 't5', from: 'qGateDown', to: 'qGateUp',   inputSymbol: '0', outputSymbol: 'O' },
      { id: 't6', from: 'qGateDown', to: 'qGateDown', inputSymbol: '1', outputSymbol: 'L' },
    ],
  },
];

export function convertMooreToAutomatonGraph(
  moore: MooreMachine,
  conversionStep?: number,
  explanationSteps?: { mealyState: string; createdMooreStates: string[] }[]
): AutomatonGraph {
  // Step 0: Moore graph is completely empty at start
  if (conversionStep === 0) {
    return {
      id: `moore_empty`,
      name: `${moore.name} (Moore)`,
      type: 'DFA',
      alphabet: moore.inputAlphabet,
      states: [],
      transitions: [],
      description: 'Moore graph builds dynamically as conversion steps advance.',
    };
  }

  // Determine revealed states up to the current conversion step
  let revealedStates: Set<string>;
  if (typeof conversionStep === 'number' && explanationSteps && explanationSteps.length > 0) {
    revealedStates = new Set<string>();
    const totalSteps = explanationSteps.length;
    const isFinalStep = conversionStep >= totalSteps + 1;

    if (isFinalStep) {
      moore.states.forEach((s) => revealedStates.add(s));
    } else {
      for (let i = 0; i < Math.min(conversionStep, totalSteps); i++) {
        (explanationSteps[i]?.createdMooreStates || []).forEach((s) => revealedStates.add(s));
      }
    }
  } else {
    revealedStates = new Set(moore.states);
  }

  const revealedStatesArray = Array.from(revealedStates);
  const total = Math.max(1, revealedStatesArray.length);
  const radius = 150;
  const centerX = 220;
  const centerY = 160;

  const states: AutomatonState[] = revealedStatesArray.map((s, idx) => {
    const angle = (2 * Math.PI * idx) / total - Math.PI / 2;
    const outVal = moore.stateOutputs[s] || '0';
    return {
      id: s,
      label: `out: ${outVal}`,
      isStart: s === moore.startState || s.startsWith(`${moore.startState}_`),
      isAccept: false,
      x: centerX + radius * Math.cos(angle),
      y: centerY + radius * Math.sin(angle),
      colorScheme: 'emerald',
    };
  });

  const transMap = new Map<string, string[]>();
  for (const t of moore.transitions) {
    if (revealedStates.has(t.from) && revealedStates.has(t.to)) {
      const key = `${t.from}->${t.to}`;
      if (!transMap.has(key)) {
        transMap.set(key, []);
      }
      transMap.get(key)!.push(t.inputSymbol);
    }
  }

  const transitions: AutomatonTransition[] = [];
  let idCounter = 1;
  transMap.forEach((symbols, key) => {
    const [source, target] = key.split('->');
    transitions.push({
      id: `moore_t_${idCounter++}`,
      source,
      target,
      symbols,
    });
  });

  return {
    id: `moore_${moore.id}_step_${conversionStep ?? 'full'}`,
    name: `${moore.name} (Moore)`,
    type: 'DFA',
    alphabet: moore.inputAlphabet,
    states,
    transitions,
    description: moore.description,
  };
}
