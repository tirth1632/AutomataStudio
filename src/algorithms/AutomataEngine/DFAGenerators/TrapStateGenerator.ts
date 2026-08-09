import type { DFA } from '../../../types/dfa';
import type { EngineIntent, Generator } from '../../../types/intent';

export class TrapStateGenerator implements Generator {
  canHandle(intent: EngineIntent): boolean {
    return intent.type === 'TRAP_STATE';
  }

  generate(_intent: EngineIntent): DFA {
    const alphabet = ['0', '1'];
    return {
      alphabet,
      states: ['q0', 'q_trap'],
      startState: 'q0',
      acceptStates: [],
      transitions: {
        q0: { '0': 'q_trap', '1': 'q_trap' },
        q_trap: { '0': 'q_trap', '1': 'q_trap' },
      },
    };
  }

  /**
   * Completes any incomplete DFA by adding a trap state for missing transitions.
   */
  public static completeDFA(dfa: DFA): DFA {
    const alphabet = dfa.alphabet || ['0', '1'];
    const states = [...(dfa.states || [])];
    const transitions: DFA['transitions'] = JSON.parse(JSON.stringify(dfa.transitions || {}));
    
    let trapNeeded = false;

    for (const s of states) {
      if (!transitions[s]) transitions[s] = {};
      for (const char of alphabet) {
        if (!transitions[s][char]) {
          trapNeeded = true;
          break;
        }
      }
      if (trapNeeded) break;
    }

    if (!trapNeeded) {
      return dfa;
    }

    let trapStateName = 'q_trap';
    let counter = 1;
    while (states.includes(trapStateName)) {
      trapStateName = `q_trap_${counter++}`;
    }

    states.push(trapStateName);
    transitions[trapStateName] = {};
    for (const char of alphabet) {
      transitions[trapStateName][char] = trapStateName;
    }

    for (const s of states) {
      if (!transitions[s]) transitions[s] = {};
      for (const char of alphabet) {
        if (!transitions[s][char]) {
          transitions[s][char] = trapStateName;
        }
      }
    }

    return {
      ...dfa,
      states,
      transitions,
    };
  }
}
