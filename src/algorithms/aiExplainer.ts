import type { AutomatonGraph, SimulationStep } from '../types/automata';

export function generateAIExplanation(
  graph: AutomatonGraph,
  inputString: string,
  steps: SimulationStep[]
): {
  summary: string;
  keyTakeaways: string[];
  detailedSteps: string[];
} {
  if (steps.length === 0) {
    return {
      summary: 'No simulation steps executed yet.',
      keyTakeaways: ['Enter an input string and click Play or Step Forward.'],
      detailedSteps: [],
    };
  }

  const lastStep = steps[steps.length - 1];
  const isAccepted = lastStep.isAccepting;
  const isRejected = lastStep.isRejected;

  const startState = graph.states.find((s) => s.isStart);
  const endStates = graph.states.filter((s) => lastStep.currentStateIds.includes(s.id));
  const endStateLabels = endStates.map((s) => s.label).join(', ');

  let summary = '';
  const keyTakeaways: string[] = [];
  const detailedSteps: string[] = [];

  if (isAccepted) {
    summary = `The string "${inputString}" is ACCEPTED by the ${graph.type}. The machine successfully processed all ${inputString.length} symbol(s) and halted at accepting state(s): {${endStateLabels}}.`;
    keyTakeaways.push(`Final state(s) {${endStateLabels}} contain a double concentric accept ring.`);
    keyTakeaways.push(`Every character in "${inputString}" had a valid transition path.`);
  } else if (isRejected) {
    if (lastStep.currentStateIds.length === 0) {
      summary = `The string "${inputString}" is REJECTED (Dead State). The automaton encountered a symbol with no outgoing transition from the active state, leading to an empty state set.`;
      keyTakeaways.push('A missing transition caused the computation branch to crash into a dead state.');
    } else {
      summary = `The string "${inputString}" is REJECTED. The machine processed the full input string "${inputString}", but halted at non-accepting state(s): {${endStateLabels}}.`;
      keyTakeaways.push(`State {${endStateLabels}} is not marked as an accept state.`);
    }
  } else {
    summary = `Simulation in progress. Currently at step ${lastStep.stepIndex} of ${inputString.length} with active state set {${endStateLabels}}.`;
  }

  steps.forEach((step, idx) => {
    if (idx === 0) {
      detailedSteps.push(
        `Step 0: Initialized execution at start state ${startState ? `"${startState.label}"` : 'q0'}.`
      );
    } else {
      detailedSteps.push(
        `Step ${step.stepIndex}: Read '${step.consumedInput[step.consumedInput.length - 1]}' -> Moved to {${step.currentStateIds.join(', ')}}.`
      );
    }
  });

  return { summary, keyTakeaways, detailedSteps };
}
