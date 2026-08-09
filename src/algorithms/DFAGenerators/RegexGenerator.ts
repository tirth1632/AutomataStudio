import type { DFA } from '../../types/dfa';

interface NFAState {
  id: number;
  transitions: Map<string, number[]>; // symbol -> list of target state IDs (symbol '' = epsilon)
  isAccept: boolean;
}

class NFA {
  startState: number;
  acceptState: number;
  states: Map<number, NFAState>;

  constructor(startState: number, acceptState: number, states: Map<number, NFAState>) {
    this.startState = startState;
    this.acceptState = acceptState;
    this.states = states;
  }
}

/**
 * Generates a complete DFA from a Regular Expression.
 * Pipeline: Regex Infix -> Postfix -> Thompson NFA -> Subset Construction -> DFA.
 */
export function generateRegexDFA(regexStr: string, alphabet = ['0', '1']): DFA {
  const cleanRegex = regexStr.trim().replace(/\s+/g, '');
  if (!cleanRegex) throw new Error('Regex pattern cannot be empty.');

  const postfix = infixToPostfix(cleanRegex);
  const nfa = buildThompsonNFA(postfix);
  const dfa = subsetConstruction(nfa, alphabet);
  return dfa;
}

/**
 * Inserts explicit concatenation dots '.' and converts infix regex to postfix (Shunting-Yard algorithm).
 */
function infixToPostfix(infix: string): string {
  // Step 1: Format with explicit concatenation '.'
  let formatted = '';
  for (let i = 0; i < infix.length; i++) {
    const c1 = infix[i];
    formatted += c1;

    if (i + 1 < infix.length) {
      const c2 = infix[i + 1];
      const isC1Operand = /[0-9a-zA-Z]|\*|\+|\)/.test(c1);
      const isC2Operand = /[0-9a-zA-Z]|\(/.test(c2);

      if (isC1Operand && isC2Operand) {
        formatted += '.';
      }
    }
  }

  // Step 2: Shunting Yard
  const precedence: Record<string, number> = { '*': 3, '+': 3, '?': 3, '.': 2, '|': 1 };
  let output = '';
  const stack: string[] = [];

  for (const char of formatted) {
    if (/[0-9a-zA-Z]/.test(char)) {
      output += char;
    } else if (char === '(') {
      stack.push(char);
    } else if (char === ')') {
      while (stack.length > 0 && stack[stack.length - 1] !== '(') {
        output += stack.pop();
      }
      stack.pop(); // Pop '('
    } else if (precedence[char]) {
      while (
        stack.length > 0 &&
        stack[stack.length - 1] !== '(' &&
        precedence[stack[stack.length - 1]] >= precedence[char]
      ) {
        output += stack.pop();
      }
      stack.push(char);
    }
  }

  while (stack.length > 0) {
    output += stack.pop();
  }

  return output;
}

/**
 * Builds Thompson NFA from postfix regex expression.
 */
function buildThompsonNFA(postfix: string): NFA {
  let stateCounter = 0;
  const states = new Map<number, NFAState>();

  function createState(): NFAState {
    const id = stateCounter++;
    const s: NFAState = { id, transitions: new Map(), isAccept: false };
    states.set(id, s);
    return s;
  }

  function addTransition(from: number, symbol: string, to: number) {
    const state = states.get(from)!;
    if (!state.transitions.has(symbol)) {
      state.transitions.set(symbol, []);
    }
    state.transitions.get(symbol)!.push(to);
  }

  const stack: NFA[] = [];

  for (const char of postfix) {
    if (/[0-9a-zA-Z]/.test(char)) {
      const s0 = createState();
      const s1 = createState();
      addTransition(s0.id, char, s1.id);
      stack.push(new NFA(s0.id, s1.id, states));
    } else if (char === '.') {
      const n2 = stack.pop()!;
      const n1 = stack.pop()!;
      addTransition(n1.acceptState, '', n2.startState);
      stack.push(new NFA(n1.startState, n2.acceptState, states));
    } else if (char === '|') {
      const n2 = stack.pop()!;
      const n1 = stack.pop()!;
      const start = createState();
      const accept = createState();

      addTransition(start.id, '', n1.startState);
      addTransition(start.id, '', n2.startState);
      addTransition(n1.acceptState, '', accept.id);
      addTransition(n2.acceptState, '', accept.id);

      stack.push(new NFA(start.id, accept.id, states));
    } else if (char === '*') {
      const n1 = stack.pop()!;
      const start = createState();
      const accept = createState();

      addTransition(start.id, '', n1.startState);
      addTransition(start.id, '', accept.id);
      addTransition(n1.acceptState, '', n1.startState);
      addTransition(n1.acceptState, '', accept.id);

      stack.push(new NFA(start.id, accept.id, states));
    } else if (char === '+') {
      const n1 = stack.pop()!;
      const start = createState();
      const accept = createState();

      addTransition(start.id, '', n1.startState);
      addTransition(n1.acceptState, '', n1.startState);
      addTransition(n1.acceptState, '', accept.id);

      stack.push(new NFA(start.id, accept.id, states));
    }
  }

  if (stack.length !== 1) {
    throw new Error('Invalid regex expression formatting.');
  }

  const resultNFA = stack.pop()!;
  states.get(resultNFA.acceptState)!.isAccept = true;
  return resultNFA;
}

/**
 * Performs Subset Construction (Powerset construction) on NFA to produce a minimal, complete DFA.
 */
function subsetConstruction(nfa: NFA, alphabet: string[]): DFA {
  function epsilonClosure(stateIds: number[]): Set<number> {
    const closure = new Set<number>(stateIds);
    const stack = [...stateIds];

    while (stack.length > 0) {
      const curr = stack.pop()!;
      const stateObj = nfa.states.get(curr);
      if (!stateObj) continue;

      const epsTargets = stateObj.transitions.get('') || [];
      for (const target of epsTargets) {
        if (!closure.has(target)) {
          closure.add(target);
          stack.push(target);
        }
      }
    }

    return closure;
  }

  function move(stateSet: Set<number>, symbol: string): Set<number> {
    const result = new Set<number>();
    for (const id of stateSet) {
      const stateObj = nfa.states.get(id);
      if (!stateObj) continue;
      const targets = stateObj.transitions.get(symbol) || [];
      for (const t of targets) {
        result.add(t);
      }
    }
    return result;
  }

  function keyFromSet(set: Set<number>): string {
    return Array.from(set).sort((a, b) => a - b).join(',');
  }

  const dfaStateMap = new Map<string, { id: string; set: Set<number> }>();
  const dfaStates: string[] = [];
  const dfaAcceptStates: string[] = [];
  const rawTransitions: Record<string, Record<string, string>> = {};

  const initialClosure = epsilonClosure([nfa.startState]);
  const startKey = keyFromSet(initialClosure);

  const startDfaId = 'q0';
  dfaStateMap.set(startKey, { id: startDfaId, set: initialClosure });
  dfaStates.push(startDfaId);

  if (Array.from(initialClosure).some((id) => id === nfa.acceptState)) {
    dfaAcceptStates.push(startDfaId);
  }

  const queue: string[] = [startKey];
  let stateCounter = 1;

  while (queue.length > 0) {
    const currentKey = queue.shift()!;
    const currentObj = dfaStateMap.get(currentKey)!;
    const currentDfaId = currentObj.id;

    rawTransitions[currentDfaId] = {};

    for (const char of alphabet) {
      const nextMove = move(currentObj.set, char);
      const nextClosure = epsilonClosure(Array.from(nextMove));

      if (nextClosure.size === 0) {
        // Trap state needed
        if (!dfaStateMap.has('TRAP')) {
          dfaStateMap.set('TRAP', { id: 'q_trap', set: new Set() });
          dfaStates.push('q_trap');
          rawTransitions['q_trap'] = {};
          for (const sym of alphabet) {
            rawTransitions['q_trap'][sym] = 'q_trap';
          }
        }
        rawTransitions[currentDfaId][char] = 'q_trap';
        continue;
      }

      const nextKey = keyFromSet(nextClosure);
      if (!dfaStateMap.has(nextKey)) {
        const newDfaId = `q${stateCounter++}`;
        dfaStateMap.set(nextKey, { id: newDfaId, set: nextClosure });
        dfaStates.push(newDfaId);

        if (Array.from(nextClosure).some((id) => id === nfa.acceptState)) {
          dfaAcceptStates.push(newDfaId);
        }

        queue.push(nextKey);
      }

      rawTransitions[currentDfaId][char] = dfaStateMap.get(nextKey)!.id;
    }
  }

  return {
    alphabet,
    states: dfaStates,
    startState: startDfaId,
    acceptStates: dfaAcceptStates,
    transitions: rawTransitions,
  };
}
