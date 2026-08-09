export type TokenType =
  | 'SYMBOL'
  | 'UNION'      // | or +
  | 'STAR'       // *
  | 'PLUS'       // +
  | 'OPTIONAL'   // ?
  | 'LPAREN'     // (
  | 'RPAREN'     // )
  | 'CONCAT'     // implicit concatenation dot
  | 'EPSILON';

export interface Token {
  type: TokenType;
  value: string;
}

export function tokenizeRegex(pattern: string): Token[] {
  const rawTokens: Token[] = [];
  let i = 0;

  while (i < pattern.length) {
    const char = pattern[i];

    if (char === '\\' && i + 1 < pattern.length) {
      rawTokens.push({ type: 'SYMBOL', value: pattern[i + 1] });
      i += 2;
    } else if (char === '|') {
      rawTokens.push({ type: 'UNION', value: '|' });
      i++;
    } else if (char === '+') {
      rawTokens.push({ type: 'PLUS', value: '+' }); // temporary tag
      i++;
    } else if (char === '*') {
      rawTokens.push({ type: 'STAR', value: '*' });
      i++;
    } else if (char === '?') {
      rawTokens.push({ type: 'OPTIONAL', value: '?' });
      i++;
    } else if (char === '(') {
      rawTokens.push({ type: 'LPAREN', value: '(' });
      i++;
    } else if (char === ')') {
      rawTokens.push({ type: 'RPAREN', value: ')' });
      i++;
    } else if (char === 'ε' || char === 'e' || char === 'E') {
      rawTokens.push({ type: 'EPSILON', value: 'ε' });
      i++;
    } else {
      rawTokens.push({ type: 'SYMBOL', value: char });
      i++;
    }
  }

  // Disambiguate '+' into UNION vs postfix PLUS
  const refinedTokens: Token[] = [];
  for (let j = 0; j < rawTokens.length; j++) {
    const tok = rawTokens[j];
    if (tok.value === '+') {
      const next = j < rawTokens.length - 1 ? rawTokens[j + 1] : null;
      // If + is followed by a symbol or ( e.g. 0+1 or a+(b), it is binary UNION
      if (next && (next.type === 'SYMBOL' || next.type === 'LPAREN' || next.type === 'EPSILON')) {
        refinedTokens.push({ type: 'UNION', value: '+' });
      } else {
        refinedTokens.push({ type: 'PLUS', value: '+' });
      }
    } else {
      refinedTokens.push(tok);
    }
  }

  // Insert explicit CONCAT tokens
  const withConcat: Token[] = [];
  for (let j = 0; j < refinedTokens.length; j++) {
    const current = refinedTokens[j];
    withConcat.push(current);

    if (j < refinedTokens.length - 1) {
      const next = refinedTokens[j + 1];

      const currentCanEndAtom =
        current.type === 'SYMBOL' ||
        current.type === 'EPSILON' ||
        current.type === 'RPAREN' ||
        current.type === 'STAR' ||
        current.type === 'PLUS' ||
        current.type === 'OPTIONAL';

      const nextCanStartAtom =
        next.type === 'SYMBOL' ||
        next.type === 'EPSILON' ||
        next.type === 'LPAREN';

      if (currentCanEndAtom && nextCanStartAtom) {
        withConcat.push({ type: 'CONCAT', value: '.' });
      }
    }
  }

  return withConcat;
}
