import type { ASTNode } from './RegexAST';
import { parseRegex } from './RegexParser';

export interface RawNFA {
  states: string[];
  startState: string;
  acceptStates: string[];
  alphabet: string[];
  transitions: { [state: string]: { [symbol: string]: string[] } };
}

let stateCounter = 0;

function nextState(): string {
  return `q${stateCounter++}`;
}

export function resetStateCounter() {
  stateCounter = 0;
}

export function buildThompsonNFA(ast: ASTNode): RawNFA {
  const transitions: { [state: string]: { [symbol: string]: string[] } } = {};
  const alphabetSet = new Set<string>();

  function addTrans(from: string, symbol: string, to: string) {
    if (!transitions[from]) transitions[from] = {};
    if (!transitions[from][symbol]) transitions[from][symbol] = [];
    if (!transitions[from][symbol].includes(to)) {
      transitions[from][symbol].push(to);
    }
    if (!transitions[to]) transitions[to] = {};
    if (symbol !== 'ε') alphabetSet.add(symbol);
  }

  function construct(node: ASTNode): { start: string; accept: string } {
    if (node.type === 'LITERAL') {
      const start = nextState();
      const accept = nextState();
      addTrans(start, node.value || 'a', accept);
      return { start, accept };
    }

    if (node.type === 'EPSILON') {
      const start = nextState();
      const accept = nextState();
      addTrans(start, 'ε', accept);
      return { start, accept };
    }

    if (node.type === 'CONCAT') {
      const left = construct(node.left!);
      const right = construct(node.right!);
      addTrans(left.accept, 'ε', right.start);
      return { start: left.start, accept: right.accept };
    }

    if (node.type === 'UNION') {
      const start = nextState();
      const accept = nextState();
      const left = construct(node.left!);
      const right = construct(node.right!);

      addTrans(start, 'ε', left.start);
      addTrans(start, 'ε', right.start);
      addTrans(left.accept, 'ε', accept);
      addTrans(right.accept, 'ε', accept);

      return { start, accept };
    }

    if (node.type === 'STAR') {
      const start = nextState();
      const accept = nextState();
      const child = construct(node.child!);

      addTrans(start, 'ε', child.start);
      addTrans(start, 'ε', accept);
      addTrans(child.accept, 'ε', child.start);
      addTrans(child.accept, 'ε', accept);

      return { start, accept };
    }

    if (node.type === 'PLUS') {
      const start = nextState();
      const accept = nextState();
      const child = construct(node.child!);

      addTrans(start, 'ε', child.start);
      addTrans(child.accept, 'ε', child.start);
      addTrans(child.accept, 'ε', accept);

      return { start, accept };
    }

    if (node.type === 'OPTIONAL') {
      const start = nextState();
      const accept = nextState();
      const child = construct(node.child!);

      addTrans(start, 'ε', child.start);
      addTrans(start, 'ε', accept);
      addTrans(child.accept, 'ε', accept);

      return { start, accept };
    }

    const start = nextState();
    const accept = nextState();
    addTrans(start, 'ε', accept);
    return { start, accept };
  }

  resetStateCounter();
  const { start, accept } = construct(ast);

  const states = Object.keys(transitions).sort();
  const alphabet = Array.from(alphabetSet).sort();
  if (alphabet.length === 0) alphabet.push('0', '1');

  return {
    states,
    startState: start,
    acceptStates: [accept],
    alphabet,
    transitions,
  };
}

export function compileRegexToNFA(regex: string): RawNFA {
  const ast = parseRegex(regex);
  return buildThompsonNFA(ast);
}
