/**
 * Formal Mathematical Definition of a Deterministic Finite Automaton (DFA)
 * M = (Q, Σ, δ, q0, F)
 */
export interface DFA {
  /** Alphabet Σ (e.g. ["0", "1"]) */
  alphabet: string[];
  /** Set of States Q (e.g. ["q0", "q1", "q2"]) */
  states: string[];
  /** Initial State q0 ∈ Q */
  startState: string;
  /** Set of Accept States F ⊆ Q */
  acceptStates: string[];
  /** Transition Function δ: Q × Σ → Q */
  transitions: {
    [state: string]: {
      [symbol: string]: string;
    };
  };
}

/**
 * Formal Mathematical Definition of a Nondeterministic Finite Automaton (NFA)
 * M = (Q, Σ, δ, q0, F)
 */
export interface NFA {
  alphabet: string[];
  states: string[];
  startState: string;
  acceptStates: string[];
  transitions: {
    [state: string]: {
      [symbol: string]: string[];
    };
  };
}
