import type { DFA } from '../../types/dfa';
import type { EngineIntent } from '../../types/intent';
import { AutomataEngine } from '../AutomataEngine/AutomataEngine';
import { complement } from './Complement';
import { intersection } from './Intersection';
import { union } from './Union';
import { difference } from './Difference';
import { symmetricDifference } from './SymmetricDifference';

export interface ExpressionAST {
  type: 'AND' | 'OR' | 'NOT' | 'DIFF' | 'XOR' | 'ATOMIC';
  left?: ExpressionAST;
  right?: ExpressionAST;
  atomicIntent?: EngineIntent;
}

/**
 * Recursive evaluator that takes an ExpressionAST and constructs the combined DFA
 * using Product Construction, Complement, Difference, and Union/Intersection.
 */
export function evaluateExpressionAST(ast: ExpressionAST, engine: AutomataEngine): DFA {
  if (ast.type === 'ATOMIC' && ast.atomicIntent) {
    return engine.generate(ast.atomicIntent);
  }

  if (ast.type === 'NOT' && ast.left) {
    const subDfa = evaluateExpressionAST(ast.left, engine);
    return complement(subDfa);
  }

  if (ast.left && ast.right) {
    const dfaA = evaluateExpressionAST(ast.left, engine);
    const dfaB = evaluateExpressionAST(ast.right, engine);

    switch (ast.type) {
      case 'AND':
        return intersection(dfaA, dfaB);
      case 'OR':
        return union(dfaA, dfaB);
      case 'DIFF':
        return difference(dfaA, dfaB);
      case 'XOR':
        return symmetricDifference(dfaA, dfaB);
    }
  }

  // Default fallback
  return engine.generate({ type: 'DIVISIBLE_LENGTH', n: 2 });
}

/**
 * Natural language expression parser that builds a nested ExpressionAST.
 * Handles AND, OR, NOT, parenthesized expressions, etc.
 */
export class ExpressionParser {
  public static parsePromptToAST(promptStr: string, engine: AutomataEngine): ExpressionAST {
    const p = promptStr.trim();

    // Check parenthesized whole expression: e.g. "(Contains 101 OR Starts with 10) AND NOT Ends with 111"
    // Split by top-level AND / OR
    const topAndSplit = this.splitTopLevelOperator(p, ' AND ');
    if (topAndSplit) {
      return {
        type: 'AND',
        left: this.parsePromptToAST(topAndSplit.left, engine),
        right: this.parsePromptToAST(topAndSplit.right, engine),
      };
    }

    const topOrSplit = this.splitTopLevelOperator(p, ' OR ');
    if (topOrSplit) {
      return {
        type: 'OR',
        left: this.parsePromptToAST(topOrSplit.left, engine),
        right: this.parsePromptToAST(topOrSplit.right, engine),
      };
    }

    if (p.startsWith('NOT ') || p.startsWith('not ') || p.startsWith('all except ') || p.startsWith('ALL EXCEPT ')) {
      const rest = p.replace(/^(NOT|not|all except|ALL EXCEPT)\s+/, '').trim();
      return {
        type: 'NOT',
        left: this.parsePromptToAST(rest, engine),
      };
    }

    // Strip outer parentheses if enclosed: e.g. "(Ends with 01 AND Even 0s)"
    if (p.startsWith('(') && p.endsWith(')')) {
      const inner = p.slice(1, -1).trim();
      return this.parsePromptToAST(inner, engine);
    }

    // Parse atomic intent
    const atomicIntent = engine.parseIntentFromPrompt(p) || { type: 'DIVISIBLE_LENGTH', n: 2 };
    return {
      type: 'ATOMIC',
      atomicIntent,
    };
  }

  private static splitTopLevelOperator(str: string, op: string): { left: string; right: string } | null {
    let depth = 0;
    const lowerOp = op.toLowerCase();

    for (let i = 0; i <= str.length - op.length; i++) {
      const char = str[i];
      if (char === '(') depth++;
      else if (char === ')') depth--;
      else if (depth === 0) {
        const sub = str.slice(i, i + op.length);
        if (sub.toLowerCase() === lowerOp) {
          const left = str.slice(0, i).trim();
          const right = str.slice(i + op.length).trim();
          if (left && right) {
            return { left, right };
          }
        }
      }
    }

    return null;
  }
}
