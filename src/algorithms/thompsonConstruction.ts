import type {
  AutomatonGraph,
  AutomatonState,
  AutomatonTransition,
} from '../types/automata';

/**
 * Inserts explicit concatenation operator '.' into regex string.
 * Example: "a(b|c)*d" -> "a.(b|c)*.d"
 */
export function preprocessRegex(pattern: string): string {
  let result = '';
  const operators = new Set(['|', '*', '+', '?', '(', ')']);

  for (let i = 0; i < pattern.length; i++) {
    const char = pattern[i];
    result += char;

    if (i < pattern.length - 1) {
      const nextChar = pattern[i + 1];

      const isCurrentOperand = !operators.has(char) || char === ')' || char === '*' || char === '+' || char === '?';
      const isNextOperand = !operators.has(nextChar) || nextChar === '(';

      if (isCurrentOperand && isNextOperand) {
        result += '.';
      }
    }
  }

  return result;
}

/**
 * Converts regex in postfix notation (Shunting-yard algorithm).
 */
export function regexToPostfix(pattern: string): string {
  const formatted = preprocessRegex(pattern);
  let postfix = '';
  const operatorStack: string[] = [];

  const precedence: { [op: string]: number } = {
    '*': 3,
    '+': 3,
    '?': 3,
    '.': 2,
    '|': 1,
  };

  for (let i = 0; i < formatted.length; i++) {
    const char = formatted[i];

    if (char === '(') {
      operatorStack.push(char);
    } else if (char === ')') {
      while (
        operatorStack.length > 0 &&
        operatorStack[operatorStack.length - 1] !== '('
      ) {
        postfix += operatorStack.pop();
      }
      operatorStack.pop(); // Pop '('
    } else if (precedence[char] !== undefined) {
      while (
        operatorStack.length > 0 &&
        precedence[operatorStack[operatorStack.length - 1]] >= precedence[char]
      ) {
        postfix += operatorStack.pop();
      }
      operatorStack.push(char);
    } else {
      postfix += char;
    }
  }

  while (operatorStack.length > 0) {
    postfix += operatorStack.pop();
  }

  return postfix;
}

export interface ASTNode {
  id: string;
  type: 'LITERAL' | 'UNION' | 'CONCAT' | 'STAR' | 'PLUS' | 'OPTION';
  value: string;
  left?: ASTNode;
  right?: ASTNode;
  parentValue?: string;
  associativity?: string;
  fragmentId?: string;
  subTreeDepth: number;
  priority: number;
}

export interface ThompsonConstructionStep {
  stepIndex: number;
  operator: string;
  ruleName: string;
  ruleDescription: string;
  fragmentId: string;
  statesAdded: number;
  epsilonEdgesAdded: number;
  totalStates: number;
  totalEpsilonEdges: number;
  startStateId: string;
  acceptStateId: string;
}

export interface ThompsonNFAFragment {
  id: string;
  label: string;
  rule: string;
  startState: AutomatonState;
  acceptState: AutomatonState;
  states: AutomatonState[];
  transitions: AutomatonTransition[];
  explanation?: string;
}

export interface RegexValidationResult {
  isValid: boolean;
  errors: string[];
}

export interface ThompsonNFAData {
  graph: AutomatonGraph;
  stepsCount: number;
  cleanRegex: string;
  formattedRegex: string;
  postfix: string;
  tokens: string[];
  alphabet: string[];
  ast: ASTNode | null;
  astTraversals: { preorder: string[]; inorder: string[]; postorder: string[] };
  constructionSteps: ThompsonConstructionStep[];
  fragmentsHistory: ThompsonNFAFragment[];
  validation: RegexValidationResult;
  operatorCounts: { union: number; concat: number; star: number; plus: number; option: number; total: number };
}

/**
 * Validates regular expression syntax.
 */
export function validateRegex(pattern: string): RegexValidationResult {
  const errors: string[] = [];
  if (!pattern || pattern.trim() === '') {
    return { isValid: true, errors: [] };
  }

  let parenDepth = 0;
  for (let i = 0; i < pattern.length; i++) {
    const char = pattern[i];
    if (char === '(') parenDepth++;
    if (char === ')') parenDepth--;
    if (parenDepth < 0) {
      errors.push(`Unmatched closing parenthesis ')' at index ${i}`);
      break;
    }
  }
  if (parenDepth > 0) {
    errors.push(`Unclosed parenthesis '(' (${parenDepth} missing ')')`);
  }

  const invalidSeq = [/\|\|/, /\*\*|\+\+|\?\?/, /^\*/, /^\|/, /\|\)/];
  for (const regex of invalidSeq) {
    if (regex.test(pattern)) {
      errors.push(`Invalid operator sequence matching pattern: ${regex.source}`);
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Computes Preorder AST Traversal
 */
export function getPreorderTraversal(node: ASTNode | null): string[] {
  if (!node) return [];
  return [node.value, ...getPreorderTraversal(node.left || null), ...getPreorderTraversal(node.right || null)];
}

/**
 * Computes Inorder AST Traversal
 */
export function getInorderTraversal(node: ASTNode | null): string[] {
  if (!node) return [];
  return [...getInorderTraversal(node.left || null), node.value, ...getInorderTraversal(node.right || null)];
}

/**
 * Computes Postorder AST Traversal
 */
export function getPostorderTraversal(node: ASTNode | null): string[] {
  if (!node) return [];
  return [...getPostorderTraversal(node.left || null), ...getPostorderTraversal(node.right || null), node.value];
}

/**
 * Builds Abstract Syntax Tree (AST) from postfix regex string.
 */
export function buildASTFromPostfix(postfix: string): ASTNode | null {
  if (!postfix) return null;
  const stack: ASTNode[] = [];
  let astId = 0;

  for (let i = 0; i < postfix.length; i++) {
    const token = postfix[i];
    const id = `ast_${++astId}`;

    if (token === '*') {
      const child = stack.pop();
      if (child) {
        const node: ASTNode = {
          id,
          type: 'STAR',
          value: '*',
          left: child,
          associativity: 'Left-to-Right',
          subTreeDepth: child.subTreeDepth + 1,
          priority: 3,
        };
        child.parentValue = '*';
        stack.push(node);
      }
    } else if (token === '+') {
      const child = stack.pop();
      if (child) {
        const node: ASTNode = {
          id,
          type: 'PLUS',
          value: '+',
          left: child,
          associativity: 'Left-to-Right',
          subTreeDepth: child.subTreeDepth + 1,
          priority: 3,
        };
        child.parentValue = '+';
        stack.push(node);
      }
    } else if (token === '?') {
      const child = stack.pop();
      if (child) {
        const node: ASTNode = {
          id,
          type: 'OPTION',
          value: '?',
          left: child,
          associativity: 'Left-to-Right',
          subTreeDepth: child.subTreeDepth + 1,
          priority: 3,
        };
        child.parentValue = '?';
        stack.push(node);
      }
    } else if (token === '|') {
      const right = stack.pop();
      const left = stack.pop();
      if (left && right) {
        const node: ASTNode = {
          id,
          type: 'UNION',
          value: '|',
          left,
          right,
          associativity: 'Left-to-Right',
          subTreeDepth: Math.max(left.subTreeDepth, right.subTreeDepth) + 1,
          priority: 1,
        };
        left.parentValue = '|';
        right.parentValue = '|';
        stack.push(node);
      }
    } else if (token === '.') {
      const right = stack.pop();
      const left = stack.pop();
      if (left && right) {
        const node: ASTNode = {
          id,
          type: 'CONCAT',
          value: '·',
          left,
          right,
          associativity: 'Left-to-Right',
          subTreeDepth: Math.max(left.subTreeDepth, right.subTreeDepth) + 1,
          priority: 2,
        };
        left.parentValue = '·';
        right.parentValue = '·';
        stack.push(node);
      }
    } else {
      // Leaf literal node
      stack.push({
        id,
        type: 'LITERAL',
        value: token,
        associativity: 'N/A',
        subTreeDepth: 1,
        priority: 4,
      });
    }
  }

  return stack.pop() || null;
}

/**
 * Builds Thompson ε-NFA graph from a regular expression pattern.
 */
export function buildThompsonNFA(regexPattern: string): ThompsonNFAData {
  const cleanRegex = regexPattern.trim() || 'a';
  const validation = validateRegex(cleanRegex);
  const formattedRegex = preprocessRegex(cleanRegex);
  const postfix = regexToPostfix(cleanRegex);
  const tokens = Array.from(cleanRegex);
  const ast = buildASTFromPostfix(postfix);

  const astTraversals = {
    preorder: getPreorderTraversal(ast),
    inorder: getInorderTraversal(ast),
    postorder: getPostorderTraversal(ast),
  };

  const stack: ThompsonNFAFragment[] = [];
  const constructionSteps: ThompsonConstructionStep[] = [];
  const fragmentsHistory: ThompsonNFAFragment[] = [];

  let stateIdCounter = 0;
  const newId = () => `q${stateIdCounter++}`;

  const alphabetSet = new Set<string>();
  const operatorCounts = { union: 0, concat: 0, star: 0, plus: 0, option: 0, total: 0 };

  let fragCounter = 0;

  for (let i = 0; i < postfix.length; i++) {
    const token = postfix[i];

    if (token === '*') {
      operatorCounts.star++;
      operatorCounts.total++;
      const frag = stack.pop();
      if (!frag) continue;

      const s = { id: newId(), label: `q${stateIdCounter - 1}`, isStart: false, isAccept: false, x: 0, y: 0 };
      const f = { id: newId(), label: `q${stateIdCounter - 1}`, isStart: false, isAccept: false, x: 0, y: 0 };

      frag.startState.isStart = false;
      frag.acceptState.isAccept = false;

      const newTransitions: AutomatonTransition[] = [
        ...frag.transitions,
        { id: `t_${s.id}_${frag.startState.id}`, source: s.id, target: frag.startState.id, symbols: ['ε'] },
        { id: `t_${s.id}_${f.id}`, source: s.id, target: f.id, symbols: ['ε'] },
        { id: `t_${frag.acceptState.id}_${frag.startState.id}`, source: frag.acceptState.id, target: frag.startState.id, symbols: ['ε'] },
        { id: `t_${frag.acceptState.id}_${f.id}`, source: frag.acceptState.id, target: f.id, symbols: ['ε'] },
      ];

      const newFrag: ThompsonNFAFragment = {
        id: `frag_${++fragCounter}`,
        label: `Star (*) Fragment`,
        rule: 'Kleene Star (*)',
        startState: s,
        acceptState: f,
        states: [s, f, ...frag.states],
        transitions: newTransitions,
        explanation: 'Encloses sub-fragment with start and accept states; adds ε-loopback and ε-bypass transitions for 0 or more repetitions.',
      };

      stack.push(newFrag);
      fragmentsHistory.push(newFrag);

      const totalEps = newTransitions.filter((t) => t.symbols.includes('ε')).length;
      constructionSteps.push({
        stepIndex: i + 1,
        operator: '*',
        ruleName: 'Kleene Star (*)',
        ruleDescription: 'Creates start & accept states with ε-loopback and ε-bypass transitions.',
        fragmentId: newFrag.id,
        statesAdded: 2,
        epsilonEdgesAdded: 4,
        totalStates: newFrag.states.length,
        totalEpsilonEdges: totalEps,
        startStateId: s.id,
        acceptStateId: f.id,
      });

    } else if (token === '+') {
      operatorCounts.plus++;
      operatorCounts.total++;
      const frag = stack.pop();
      if (!frag) continue;

      const s = { id: newId(), label: `q${stateIdCounter - 1}`, isStart: false, isAccept: false, x: 0, y: 0 };
      const f = { id: newId(), label: `q${stateIdCounter - 1}`, isStart: false, isAccept: false, x: 0, y: 0 };

      const newTransitions: AutomatonTransition[] = [
        ...frag.transitions,
        { id: `t_${s.id}_${frag.startState.id}`, source: s.id, target: frag.startState.id, symbols: ['ε'] },
        { id: `t_${frag.acceptState.id}_${frag.startState.id}`, source: frag.acceptState.id, target: frag.startState.id, symbols: ['ε'] },
        { id: `t_${frag.acceptState.id}_${f.id}`, source: frag.acceptState.id, target: f.id, symbols: ['ε'] },
      ];

      const newFrag: ThompsonNFAFragment = {
        id: `frag_${++fragCounter}`,
        label: `Plus (+) Fragment`,
        rule: 'Positive Closure (+)',
        startState: s,
        acceptState: f,
        states: [s, f, ...frag.states],
        transitions: newTransitions,
        explanation: 'Requires at least 1 iteration through sub-fragment with ε-loopback.',
      };

      stack.push(newFrag);
      fragmentsHistory.push(newFrag);

      const totalEps = newTransitions.filter((t) => t.symbols.includes('ε')).length;
      constructionSteps.push({
        stepIndex: i + 1,
        operator: '+',
        ruleName: 'Positive Closure (+)',
        ruleDescription: 'Requires at least 1 iteration with ε-loopback transition.',
        fragmentId: newFrag.id,
        statesAdded: 2,
        epsilonEdgesAdded: 3,
        totalStates: newFrag.states.length,
        totalEpsilonEdges: totalEps,
        startStateId: s.id,
        acceptStateId: f.id,
      });

    } else if (token === '?') {
      operatorCounts.option++;
      operatorCounts.total++;
      const frag = stack.pop();
      if (!frag) continue;

      const s = { id: newId(), label: `q${stateIdCounter - 1}`, isStart: false, isAccept: false, x: 0, y: 0 };
      const f = { id: newId(), label: `q${stateIdCounter - 1}`, isStart: false, isAccept: false, x: 0, y: 0 };

      const newTransitions: AutomatonTransition[] = [
        ...frag.transitions,
        { id: `t_${s.id}_${frag.startState.id}`, source: s.id, target: frag.startState.id, symbols: ['ε'] },
        { id: `t_${s.id}_${f.id}`, source: s.id, target: f.id, symbols: ['ε'] },
        { id: `t_${frag.acceptState.id}_${f.id}`, source: frag.acceptState.id, target: f.id, symbols: ['ε'] },
      ];

      const newFrag: ThompsonNFAFragment = {
        id: `frag_${++fragCounter}`,
        label: `Optional (?) Fragment`,
        rule: 'Optional (?)',
        startState: s,
        acceptState: f,
        states: [s, f, ...frag.states],
        transitions: newTransitions,
        explanation: 'Allows 0 or 1 occurrence of sub-fragment via ε-bypass.',
      };

      stack.push(newFrag);
      fragmentsHistory.push(newFrag);

      const totalEps = newTransitions.filter((t) => t.symbols.includes('ε')).length;
      constructionSteps.push({
        stepIndex: i + 1,
        operator: '?',
        ruleName: 'Optional (?)',
        ruleDescription: 'Allows 0 or 1 occurrence with ε-bypass transition.',
        fragmentId: newFrag.id,
        statesAdded: 2,
        epsilonEdgesAdded: 3,
        totalStates: newFrag.states.length,
        totalEpsilonEdges: totalEps,
        startStateId: s.id,
        acceptStateId: f.id,
      });

    } else if (token === '|') {
      operatorCounts.union++;
      operatorCounts.total++;
      const frag2 = stack.pop();
      const frag1 = stack.pop();
      if (!frag1 || !frag2) continue;

      const s = { id: newId(), label: `q${stateIdCounter - 1}`, isStart: false, isAccept: false, x: 0, y: 0 };
      const f = { id: newId(), label: `q${stateIdCounter - 1}`, isStart: false, isAccept: false, x: 0, y: 0 };

      const newTransitions: AutomatonTransition[] = [
        ...frag1.transitions,
        ...frag2.transitions,
        { id: `t_${s.id}_${frag1.startState.id}`, source: s.id, target: frag1.startState.id, symbols: ['ε'] },
        { id: `t_${s.id}_${frag2.startState.id}`, source: s.id, target: frag2.startState.id, symbols: ['ε'] },
        { id: `t_${frag1.acceptState.id}_${f.id}`, source: frag1.acceptState.id, target: f.id, symbols: ['ε'] },
        { id: `t_${frag2.acceptState.id}_${f.id}`, source: frag2.acceptState.id, target: f.id, symbols: ['ε'] },
      ];

      const newFrag: ThompsonNFAFragment = {
        id: `frag_${++fragCounter}`,
        label: `Union (|) Fragment`,
        rule: 'Union (|)',
        startState: s,
        acceptState: f,
        states: [s, f, ...frag1.states, ...frag2.states],
        transitions: newTransitions,
        explanation: 'Forks start state via ε to both sub-fragments in parallel and merges into final accept state.',
      };

      stack.push(newFrag);
      fragmentsHistory.push(newFrag);

      const totalEps = newTransitions.filter((t) => t.symbols.includes('ε')).length;
      constructionSteps.push({
        stepIndex: i + 1,
        operator: '|',
        ruleName: 'Union (|)',
        ruleDescription: 'Forks start state via ε to both sub-fragments and merges into final accept state.',
        fragmentId: newFrag.id,
        statesAdded: 2,
        epsilonEdgesAdded: 4,
        totalStates: newFrag.states.length,
        totalEpsilonEdges: totalEps,
        startStateId: s.id,
        acceptStateId: f.id,
      });

    } else if (token === '.') {
      operatorCounts.concat++;
      operatorCounts.total++;
      const frag2 = stack.pop();
      const frag1 = stack.pop();
      if (!frag1 || !frag2) continue;

      const concatTransition: AutomatonTransition = {
        id: `t_${frag1.acceptState.id}_${frag2.startState.id}`,
        source: frag1.acceptState.id,
        target: frag2.startState.id,
        symbols: ['ε'],
      };

      const newTransitions = [...frag1.transitions, ...frag2.transitions, concatTransition];
      const newFrag: ThompsonNFAFragment = {
        id: `frag_${++fragCounter}`,
        label: `Concat (·) Fragment`,
        rule: 'Concatenation (·)',
        startState: frag1.startState,
        acceptState: frag2.acceptState,
        states: [...frag1.states, ...frag2.states],
        transitions: newTransitions,
        explanation: 'Connects accept state of first sub-fragment to start state of second sub-fragment via ε-transition.',
      };

      stack.push(newFrag);
      fragmentsHistory.push(newFrag);

      const totalEps = newTransitions.filter((t) => t.symbols.includes('ε')).length;
      constructionSteps.push({
        stepIndex: i + 1,
        operator: '·',
        ruleName: 'Concatenation (·)',
        ruleDescription: 'Connects accept state of first fragment to start state of second fragment via ε.',
        fragmentId: newFrag.id,
        statesAdded: 0,
        epsilonEdgesAdded: 1,
        totalStates: newFrag.states.length,
        totalEpsilonEdges: totalEps,
        startStateId: frag1.startState.id,
        acceptStateId: frag2.acceptState.id,
      });

    } else {
      // Literal Token
      alphabetSet.add(token);
      const s = { id: newId(), label: `q${stateIdCounter - 1}`, isStart: false, isAccept: false, x: 0, y: 0 };
      const f = { id: newId(), label: `q${stateIdCounter - 1}`, isStart: false, isAccept: false, x: 0, y: 0 };

      const symbolTransition: AutomatonTransition = {
        id: `t_${s.id}_${f.id}_${token}`,
        source: s.id,
        target: f.id,
        symbols: [token],
      };

      const newFrag: ThompsonNFAFragment = {
        id: `frag_${++fragCounter}`,
        label: `Literal '${token}' Fragment`,
        rule: 'Literal Symbol',
        startState: s,
        acceptState: f,
        states: [s, f],
        transitions: [symbolTransition],
        explanation: `Base 2-state sub-gadget connected by single symbol transition '${token}'.`,
      };

      stack.push(newFrag);
      fragmentsHistory.push(newFrag);

      constructionSteps.push({
        stepIndex: i + 1,
        operator: token,
        ruleName: `Literal '${token}'`,
        ruleDescription: `Base 2-state gadget connected by symbol transition '${token}'.`,
        fragmentId: newFrag.id,
        statesAdded: 2,
        epsilonEdgesAdded: 0,
        totalStates: 2,
        totalEpsilonEdges: 0,
        startStateId: s.id,
        acceptStateId: f.id,
      });
    }
  }

  const finalFrag = stack.pop() || {
    id: 'frag_final',
    label: 'Default Base Fragment',
    rule: 'Base',
    startState: { id: 'q0', label: 'q0', isStart: true, isAccept: false, x: 100, y: 200 },
    acceptState: { id: 'q1', label: 'q1', isStart: false, isAccept: true, x: 300, y: 200 },
    states: [],
    transitions: [],
    explanation: 'Base fragment',
  };

  finalFrag.startState.isStart = true;
  finalFrag.acceptState.isAccept = true;

  // Layout nodes
  const states = finalFrag.states;
  const startX = 100;
  const startY = 200;

  states.forEach((st, idx) => {
    st.x = startX + (idx % 6) * 160;
    st.y = startY + Math.floor(idx / 6) * 140;
  });

  const graph: AutomatonGraph = {
    id: `thompson_${Date.now()}`,
    name: `Regex: /${cleanRegex}/`,
    type: 'ENFA',
    alphabet: Array.from(alphabetSet),
    states,
    transitions: finalFrag.transitions,
  };

  return {
    graph,
    stepsCount: postfix.length,
    cleanRegex,
    formattedRegex,
    postfix,
    tokens,
    alphabet: Array.from(alphabetSet),
    ast,
    astTraversals,
    constructionSteps,
    fragmentsHistory,
    validation,
    operatorCounts,
  };
}

export const regexToNFA = buildThompsonNFA;
