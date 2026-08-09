import type { ASTNode } from './RegexAST';
import type { Token } from './RegexTokenizer';
import { tokenizeRegex } from './RegexTokenizer';

export function parseRegex(pattern: string): ASTNode {
  const tokens = tokenizeRegex(pattern);
  let index = 0;

  function peek(): Token | null {
    return index < tokens.length ? tokens[index] : null;
  }

  function consume(): Token {
    return tokens[index++];
  }

  function parseExpression(): ASTNode {
    let node = parseTerm();

    while (peek() && peek()!.type === 'UNION') {
      consume();
      const right = parseTerm();
      node = {
        type: 'UNION',
        left: node,
        right,
      };
    }

    return node;
  }

  function parseTerm(): ASTNode {
    let node = parseFactor();

    while (peek() && peek()!.type === 'CONCAT') {
      consume();
      const right = parseFactor();
      node = {
        type: 'CONCAT',
        left: node,
        right,
      };
    }

    return node;
  }

  function parseFactor(): ASTNode {
    let node = parseAtom();

    while (peek() && (peek()!.type === 'STAR' || peek()!.type === 'PLUS' || peek()!.type === 'OPTIONAL')) {
      const op = consume();
      if (op.type === 'STAR') {
        node = { type: 'STAR', child: node };
      } else if (op.type === 'PLUS') {
        node = { type: 'PLUS', child: node };
      } else if (op.type === 'OPTIONAL') {
        node = { type: 'OPTIONAL', child: node };
      }
    }

    return node;
  }

  function parseAtom(): ASTNode {
    const tok = peek();

    if (!tok) {
      return { type: 'EPSILON' };
    }

    if (tok.type === 'SYMBOL') {
      consume();
      return { type: 'LITERAL', value: tok.value };
    }

    if (tok.type === 'EPSILON') {
      consume();
      return { type: 'EPSILON' };
    }

    if (tok.type === 'LPAREN') {
      consume();
      const expr = parseExpression();
      if (peek() && peek()!.type === 'RPAREN') {
        consume();
      }
      return expr;
    }

    consume();
    return { type: 'LITERAL', value: tok.value };
  }

  return parseExpression();
}
