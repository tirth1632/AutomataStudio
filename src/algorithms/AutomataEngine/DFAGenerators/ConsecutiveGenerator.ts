import type { DFA } from '../../../types/dfa';
import type { EngineIntent, Generator } from '../../../types/intent';
import { ContainsGenerator } from './ContainsGenerator';

export class ConsecutiveGenerator implements Generator {
  canHandle(intent: EngineIntent): boolean {
    return intent.type === 'CONSECUTIVE';
  }

  generate(intent: EngineIntent): DFA {
    const symbol = intent.symbol || '1';
    const count = intent.count ?? 2;
    const alphabet = intent.alphabet || Array.from(new Set([...['0', '1'], symbol])).sort();
    const mode = intent.mode || (intent.pattern?.includes('no') ? 'NO' : 'AT_LEAST');

    // 1. NO CONSECUTIVE N SYMBOLS (e.g. "no consecutive 1s", "no 00")
    if (mode === 'NO') {
      const states: string[] = [];
      for (let i = 0; i < count; i++) {
        states.push(`q${i}`);
      }
      states.push('q_trap');

      const transitions: DFA['transitions'] = {};
      for (let i = 0; i < count; i++) {
        const state = `q${i}`;
        transitions[state] = {};
        for (const char of alphabet) {
          if (char === symbol) {
            transitions[state][char] = i + 1 === count ? 'q_trap' : `q${i + 1}`;
          } else {
            transitions[state][char] = 'q0';
          }
        }
      }

      transitions['q_trap'] = {};
      for (const char of alphabet) {
        transitions['q_trap'][char] = 'q_trap';
      }

      const acceptStates = states.filter((s) => s !== 'q_trap');

      return {
        alphabet,
        states,
        startState: 'q0',
        acceptStates,
        transitions,
      };
    }

    // 2. EXACTLY N CONSECUTIVE SYMBOLS (e.g. "exactly two consecutive 1s")
    if (mode === 'EXACTLY') {
      const statesMap = new Map<string, { run: number; exact: boolean; exceeded: boolean }>();
      const states: string[] = [];
      const transitions: DFA['transitions'] = {};
      const acceptStates: string[] = [];

      const getStateId = (run: number, exact: boolean, exceeded: boolean) => {
        return `q_r${run}_ex${exact ? 1 : 0}_ov${exceeded ? 1 : 0}`;
      };

      const queue: { run: number; exact: boolean; exceeded: boolean }[] = [];
      const startObj = { run: 0, exact: false, exceeded: false };
      const startId = getStateId(0, false, false);
      statesMap.set(startId, startObj);
      queue.push(startObj);
      states.push(startId);

      while (queue.length > 0) {
        const curr = queue.shift()!;
        const currId = getStateId(curr.run, curr.exact, curr.exceeded);
        transitions[currId] = {};

        if (curr.exact && !curr.exceeded) {
          if (!acceptStates.includes(currId)) acceptStates.push(currId);
        }

        for (const char of alphabet) {
          let nextRun = 0;
          let nextExact = curr.exact;
          let nextExceeded = curr.exceeded;

          if (char === symbol) {
            nextRun = Math.min(curr.run + 1, count + 1);
            if (nextRun === count) nextExact = true;
            if (nextRun > count) nextExceeded = true;
          } else {
            nextRun = 0;
          }

          const nextId = getStateId(nextRun, nextExact, nextExceeded);
          transitions[currId][char] = nextId;

          if (!statesMap.has(nextId)) {
            const nextObj = { run: nextRun, exact: nextExact, exceeded: nextExceeded };
            statesMap.set(nextId, nextObj);
            states.push(nextId);
            queue.push(nextObj);
          }
        }
      }

      return {
        alphabet,
        states,
        startState: startId,
        acceptStates,
        transitions,
      };
    }

    // 3. AT LEAST N CONSECUTIVE SYMBOLS (Default: "Contains 00", "Contains 111", etc.)
    const pattern = symbol.repeat(count);
    const containsGen = new ContainsGenerator();
    return containsGen.generate({ type: 'CONTAINS', pattern, alphabet });
  }
}
