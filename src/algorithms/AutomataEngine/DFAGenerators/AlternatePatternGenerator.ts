import type { DFA } from '../../../types/dfa';
import type { EngineIntent, Generator } from '../../../types/intent';

export class AlternatePatternGenerator implements Generator {
  canHandle(intent: EngineIntent): boolean {
    return intent.type === 'ALTERNATE';
  }

  generate(intent: EngineIntent): DFA {
    const blockA = intent.blockA || '0';
    const blockB = intent.blockB || '1';

    // Single-symbol alternating (0 and 1)
    if (blockA.length === 1 && blockB.length === 1) {
      const alphabet = Array.from(
        new Set([...(intent.alphabet || ['0', '1']), blockA, blockB])
      ).sort();
      const s0 = blockA;
      const s1 = blockB;

      const states = ['q0', 'q_last0', 'q_last1', 'q_trap'];
      const transitions: DFA['transitions'] = {
        q0:      { [s0]: 'q_last0', [s1]: 'q_last1' },
        q_last0: { [s0]: 'q_trap',  [s1]: 'q_last1' },
        q_last1: { [s0]: 'q_last0', [s1]: 'q_trap'  },
        q_trap:  { [s0]: 'q_trap',  [s1]: 'q_trap'  },
      };

      // Fill unmapped alphabet characters to q_trap
      for (const st of states) {
        for (const c of alphabet) {
          if (!transitions[st][c]) {
            transitions[st][c] = 'q_trap';
          }
        }
      }

      return {
        alphabet,
        states,
        startState: 'q0',
        acceptStates: ['q0', 'q_last0', 'q_last1'],
        transitions,
      };
    }

    // Multi-symbol block alternating (e.g., "00" and "11")
    return this.generateBlockAlternating(blockA, blockB, intent.alphabet);
  }

  private generateBlockAlternating(blockA: string, blockB: string, inputAlphabet?: string[]): DFA {
    const charsInBlocks = Array.from(new Set([...blockA, ...blockB]));
    const alphabet = Array.from(new Set([...(inputAlphabet || ['0', '1']), ...charsInBlocks])).sort();

    const states: string[] = ['q0', 'q_trap'];
    const acceptStates: string[] = ['q0'];
    const transitions: DFA['transitions'] = {};

    const ensureState = (s: string) => {
      if (!states.includes(s)) states.push(s);
      if (!transitions[s]) transitions[s] = {};
    };

    ensureState('q0');
    ensureState('q_trap');

    for (const c of alphabet) {
      transitions['q_trap'][c] = 'q_trap';
    }

    // 1. Initial Block A path from q0
    let currA = 'q0';
    for (let i = 0; i < blockA.length; i++) {
      const char = blockA[i];
      const nextState = i === blockA.length - 1 ? 'q_A_done' : `q_A_${i + 1}`;
      ensureState(nextState);
      transitions[currA][char] = nextState;
      currA = nextState;
    }
    acceptStates.push('q_A_done');

    // 2. Initial Block B path from q0
    let currB = 'q0';
    for (let i = 0; i < blockB.length; i++) {
      const char = blockB[i];
      const nextState = i === blockB.length - 1 ? 'q_B_done' : `q_B_${i + 1}`;
      ensureState(nextState);
      transitions[currB][char] = nextState;
      currB = nextState;
    }
    acceptStates.push('q_B_done');

    // 3. Transitions from q_A_done (completed Block A):
    // 3a. Read another Block A starting with blockA[0]
    let currAtoA = 'q_A_done';
    for (let i = 0; i < blockA.length; i++) {
      const char = blockA[i];
      const nextState =
        i === blockA.length - 1
          ? 'q_A_done'
          : i === 0
          ? blockA.length === 1
            ? 'q_A_done'
            : 'q_A_1'
          : `q_AtoA_${i + 1}`;
      if (i > 0 && i < blockA.length - 1) ensureState(nextState);
      transitions[currAtoA][char] = nextState;
      currAtoA = nextState;
    }

    // 3b. Read Block B starting with blockB[0]
    let currAtoB = 'q_A_done';
    for (let i = 0; i < blockB.length; i++) {
      const char = blockB[i];
      const nextState = i === blockB.length - 1 ? 'q_B_done' : `q_AtoB_${i + 1}`;
      ensureState(nextState);
      transitions[currAtoB][char] = nextState;
      currAtoB = nextState;
    }

    // 4. Transitions from q_B_done (completed Block B):
    // 4a. Read another Block B starting with blockB[0]
    let currBtoB = 'q_B_done';
    for (let i = 0; i < blockB.length; i++) {
      const char = blockB[i];
      const nextState =
        i === blockB.length - 1
          ? 'q_B_done'
          : i === 0
          ? blockB.length === 1
            ? 'q_B_done'
            : 'q_B_1'
          : `q_BtoB_${i + 1}`;
      if (i > 0 && i < blockB.length - 1) ensureState(nextState);
      transitions[currBtoB][char] = nextState;
      currBtoB = nextState;
    }

    // 4b. Read Block A starting with blockA[0]
    let currBtoA = 'q_B_done';
    for (let i = 0; i < blockA.length; i++) {
      const char = blockA[i];
      const nextState = i === blockA.length - 1 ? 'q_A_done' : `q_BtoA_${i + 1}`;
      ensureState(nextState);
      transitions[currBtoA][char] = nextState;
      currBtoA = nextState;
    }

    // 5. Fill all unmapped transitions with q_trap
    for (const s of states) {
      if (!transitions[s]) transitions[s] = {};
      for (const c of alphabet) {
        if (!transitions[s][c]) {
          transitions[s][c] = 'q_trap';
        }
      }
    }

    return {
      alphabet,
      states,
      startState: 'q0',
      acceptStates: Array.from(new Set(acceptStates)),
      transitions,
    };
  }
}
