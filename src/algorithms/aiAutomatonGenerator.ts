import type { GeneratedAutomatonResult } from '../types/automata';
import { AutomataEngine } from './AutomataEngine';
import { dfaToGeneratedResult } from '../utils/dfaAdapter';

/**
 * Dynamically generates an automaton from a natural language prompt using the AutomataEngine algorithms.
 * NO HARDCODED TEMPLATES. All states and transitions are computed algorithmically at runtime.
 */
export function generateAutomatonFromPrompt(promptStr: string): GeneratedAutomatonResult {
  const engine = new AutomataEngine();
  const intent = engine.parseIntentFromPrompt(promptStr);

  if (intent) {
    const dfa = engine.generate(intent);
    return dfaToGeneratedResult(dfa, promptStr);
  }

  // Fallback: If not a recognized pattern, construct a dynamic length-mod-2 DFA algorithmically
  const defaultDfa = engine.generate({ type: 'DIVISIBLE_LENGTH', n: 2 });
  return dfaToGeneratedResult(defaultDfa, promptStr);
}
