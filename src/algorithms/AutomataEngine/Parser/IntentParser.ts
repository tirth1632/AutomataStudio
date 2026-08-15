import type { EngineIntent } from '../../../types/intent';

/**
 * Comprehensive Natural Language to EngineIntent Parser.
 * Converts prompts into EngineIntent objects algorithmically with strict precedence.
 */
export class IntentParser {
  public static parse(promptStr: string): EngineIntent {
    const rawTrimmed = promptStr.trim();

    // 0. REGEX PATTERN DETECTOR (Handles "Regex (a|b)*abb", "Regex: (a|b)*abb", "(a|b)*abb", "(0|1)*101", "a|b", etc.)
    const regexPrefixMatch = rawTrimmed.match(/^(?:regex\s*:\s*|regex\s+)?(.+)/i);
    const candidatePattern = regexPrefixMatch ? regexPrefixMatch[1].trim() : rawTrimmed;

    const isExplicitRegexPrefix = /^(?:regex\s*:\s*|regex\s+)/i.test(rawTrimmed);
    const containsRegexOps =
      /[\(\|\*\+\?]/i.test(candidatePattern) &&
      !/^(?:length|binary|number|contains|starts|ends|even|odd|exactly|at least|all|accept|reject|not|first|second|third|fourth|fifth|last)/i.test(
        rawTrimmed
      );

    if (isExplicitRegexPrefix || containsRegexOps) {
      const cleanRegex = candidatePattern.replace(/^(?:regex\s*:\s*|regex\s+)/i, '').trim();
      if (cleanRegex.length > 0) {
        const rawSyms = Array.from(new Set(cleanRegex.replace(/[\(\)\|\*\+\?\.\s\\]/g, '').split(''))).sort();
        return {
          type: 'REGEX',
          regex: cleanRegex,
          alphabet: rawSyms.length > 0 ? rawSyms : undefined,
        };
      }
    }

    let p = promptStr.trim().toLowerCase();
    const numberWords: Record<string, string> = { one: '1', two: '2', three: '3', four: '4', five: '5' };
    p = p.replace(/\b(one|two|three|four|five)\b/g, (word) => numberWords[word]);

    // Extract custom alphabet if explicitly mentioned: e.g. "over alphabet {a,b,c}" or "alphabet {0,1}"
    let alphabet: string[] | undefined = undefined;
    const alphabetMatch = p.match(/(?:over\s+)?(?:alphabet\s*)?\{\s*([a-z0-9,\s]+)\s*\}/i);
    if (alphabetMatch) {
      alphabet = alphabetMatch[1]
        .split(/[,;\s]+/)
        .map((s) => s.trim())
        .filter(Boolean);
      if (alphabet.length === 0) alphabet = undefined;
    }

    if (/^(?:accept\s+)?all\s+strings?$|^universal\s+language$/.test(p)) return { type: 'UNIVERSAL', alphabet };
    if (/^(?:reject\s+)?all\s+strings?$|^empty\s+language$/.test(p)) return { type: 'EMPTY_LANGUAGE', alphabet };

    // 1. ALTERNATING PATTERNS (Check BEFORE compound AND/OR split to avoid splitting 'alternating 0s and 1s')
    const altBlocksMatch = p.match(/alternat(?:ing|e)?\s+(?:blocks?\s+of\s+)?([01a-z]+?)(?:'s|s)?\s*(?:and|,)\s*([01a-z]+?)(?:'s|s)?/i);
    if (altBlocksMatch) {
      const bA = altBlocksMatch[1].replace(/(?:'s|s)$/i, '');
      const bB = altBlocksMatch[2].replace(/(?:'s|s)$/i, '');
      return { type: 'ALTERNATE', blockA: bA, blockB: bB, alphabet };
    }
    if (p.includes('alternat') || p.includes('no repeated') || /^(?:01|10)(?:01|10|\.\.)*$/.test(p)) {
      return { type: 'ALTERNATE', alphabet };
    }

    // 2. EPSILON MATCHES
    if (p === 'epsilon' || p === 'only epsilon' || p.includes('only ε') || p.includes('accept only epsilon')) {
      return { type: 'EPSILON_ONLY', alphabet };
    }
    if (p.includes('except epsilon') || p.includes('except ε') || p.includes('all except epsilon')) {
      return { type: 'EVERYTHING_EXCEPT_EPSILON', alphabet };
    }

    // 3. COMPOUND INTENTS (AND / OR) - do NOT break up "not containing" or "alternating" into compound AND/OR
    if (p.includes(' and ') && !p.includes('between') && !p.includes('alternat')) {
      const parts = p.split(/\sand\s/);
      if (parts.length === 2) {
        const left = this.parse(parts[0]);
        const right = this.parse(parts[1]);
        return {
          type: 'COMPOUND',
          operator: 'AND',
          leftIntent: left,
          rightIntent: right,
          alphabet,
        };
      }
    }

    if (p.includes(' or ') && !p.includes('alternat')) {
      const parts = p.split(/\sor\s/);
      if (parts.length === 2) {
        const left = this.parse(parts[0]);
        const right = this.parse(parts[1]);
        return {
          type: 'COMPOUND',
          operator: 'OR',
          leftIntent: left,
          rightIntent: right,
          alphabet,
        };
      }
    }

    // 4. CONSECUTIVE SYMBOLS
    if (p.includes('no consecutive') || p.includes('without consecutive')) {
      let sym = '1';
      let count = 2;

      const digitBeforeMatch = p.match(/(\d+)\s+consecutive\s+([01a-z])/i);
      const digitAfterMatch = p.match(/consecutive\s+(\d+)\s+([01a-z])/i);
      const symMatch = p.match(/consecutive\s+([01a-z]+)/i);

      if (digitBeforeMatch) {
        count = parseInt(digitBeforeMatch[1], 10);
        sym = digitBeforeMatch[2];
      } else if (digitAfterMatch) {
        count = parseInt(digitAfterMatch[1], 10);
        sym = digitAfterMatch[2];
      } else if (symMatch && symMatch[1]) {
        const rawTarget = symMatch[1];
        const cleanedTarget = rawTarget.replace(/(?:'s|s)$/i, '');
        if (cleanedTarget.length > 1) {
          count = cleanedTarget.length;
          sym = cleanedTarget[0];
        } else if (cleanedTarget.length === 1) {
          sym = cleanedTarget;
          count = 2;
        }
      } else if (p.includes('0')) {
        sym = '0';
      }

      return { type: 'CONSECUTIVE', mode: 'NO', symbol: sym, count, alphabet };
    }

    if (p.includes('exactly two consecutive 1') || p.includes('exactly 2 consecutive 1')) {
      return { type: 'CONSECUTIVE', mode: 'EXACTLY', symbol: '1', count: 2, alphabet };
    }
    if (p.includes('exactly three consecutive 0') || p.includes('exactly 3 consecutive 0')) {
      return { type: 'CONSECUTIVE', mode: 'EXACTLY', symbol: '0', count: 3, alphabet };
    }

    const consecExactMatch = p.match(/exactly\s+(\d+)\s+consecutive\s+([01a-z])/i);
    if (consecExactMatch) {
      return {
        type: 'CONSECUTIVE',
        mode: 'EXACTLY',
        count: parseInt(consecExactMatch[1], 10),
        symbol: consecExactMatch[2],
        alphabet,
      };
    }

    const consecMatch = p.match(/(?:at least\s+)?(\d+)\s+consecutive\s+([01a-z])/i);
    if (consecMatch) {
      return {
        type: 'CONSECUTIVE',
        mode: 'AT_LEAST',
        count: parseInt(consecMatch[1], 10),
        symbol: consecMatch[2],
        alphabet,
      };
    }

    const consecutivePatternMatch = p.match(/(?:contains?\s+)?consecutive\s+([01a-z]+)/i);
    if (consecutivePatternMatch) {
      const rawTarget = consecutivePatternMatch[1];
      const pattern = rawTarget.replace(/(?:'s|s)$/i, '');
      const count = pattern.length === 1 ? 2 : pattern.length;
      const symbol = pattern[0];
      return {
        type: 'CONSECUTIVE',
        mode: 'AT_LEAST',
        symbol,
        count,
        alphabet,
      };
    }

    // 5. NUMBER OF OCCURRENCES (EXACT_COUNT vs AT_LEAST_COUNT)
    const exactCountMatch =
      p.match(/contains?\s+exactly\s+(\d+)\s+([01a-z])(?:'s|s)?/i) ||
      p.match(/exactly\s+(\d+)\s+([01a-z])(?:'s|s)?/i) ||
      p.match(/number\s+of\s+([01a-z])(?:'s|s)?\s+(?:is\s+)?exactly\s+(\d+)/i) ||
      p.match(/number\s+of\s+([01a-z])(?:'s|s)?\s+is\s+(\d+)/i) ||
      p.match(/^(\d+)\s+([01a-z])(?:'s|s)?$/i);
    if (exactCountMatch) {
      let count = 1;
      let symbol = '1';
      if (!isNaN(parseInt(exactCountMatch[1], 10))) {
        count = parseInt(exactCountMatch[1], 10);
        symbol = exactCountMatch[2] || '1';
      } else {
        symbol = exactCountMatch[1] || '1';
        count = parseInt(exactCountMatch[2], 10);
      }
      return { type: 'EXACT_COUNT', count, symbol, alphabet };
    }

    const atLeastCountMatch =
      p.match(/contains?\s+at\s+least\s+(\d+)\s+([01a-z])(?:'s|s)?/i) ||
      p.match(/at\s+least\s+(\d+)\s+([01a-z])(?:'s|s)?/i) ||
      p.match(/number\s+of\s+([01a-z])(?:'s|s)?\s+is\s+at\s+least\s+(\d+)/i);
    if (atLeastCountMatch) {
      let count = 1;
      let symbol = '1';
      if (!isNaN(parseInt(atLeastCountMatch[1], 10))) {
        count = parseInt(atLeastCountMatch[1], 10);
        symbol = atLeastCountMatch[2] || '1';
      } else {
        symbol = atLeastCountMatch[1] || '1';
        count = parseInt(atLeastCountMatch[2], 10);
      }
      return { type: 'AT_LEAST_COUNT', count, symbol, alphabet };
    }

    // 6. LENGTH & MODULO COUNTING
    const lenDivMatch = p.match(/length\s+(?:is\s+)?divisible\s+by\s+(\d+)/i);
    if (lenDivMatch) return { type: 'DIVISIBLE_LENGTH', n: parseInt(lenDivMatch[1], 10), alphabet };

    const modLenMatch = p.match(/length\s+mod\s+(\d+)\s*==?\s*(\d+)/i) ||
      p.match(/length\s+modulo\s+(\d+)\s+(?:is\s+)?(\d+)/i);
    if (modLenMatch) {
      return {
        type: 'MODULO_LENGTH',
        n: parseInt(modLenMatch[1], 10),
        remainder: parseInt(modLenMatch[2], 10),
        alphabet,
      };
    }

    if (p.includes('even length')) return { type: 'DIVISIBLE_LENGTH', n: 2, alphabet };
    if (p.includes('odd length')) return { type: 'MODULO_LENGTH', n: 2, remainder: 1, alphabet };

    const lenExactMatch = p.match(/length\s+(?:is\s+)?(?:exactly\s+)?(\d+)/i);
    if (lenExactMatch) return { type: 'LENGTH_EXACT', n: parseInt(lenExactMatch[1], 10), alphabet };

    const lenAtMostMatch = p.match(/length\s+(?:is\s+)?at\s+most\s+(\d+)/i);
    if (lenAtMostMatch) return { type: 'LENGTH_AT_MOST', n: parseInt(lenAtMostMatch[1], 10), alphabet };

    const countModuloMatch = p.match(/(?:number|count)\s+of\s+([01a-z])(?:'s|s)?\s+(?:is\s+)?divisible\s+by\s+(\d+)/i);
    if (countModuloMatch) {
      return { type: 'MODULO_COUNT', symbol: countModuloMatch[1], n: parseInt(countModuloMatch[2], 10), alphabet };
    }

    // 7. DIVISIBILITY (BINARY NUMBERS & MODULO BINARY)
    const binaryModMatch = p.match(/(?:binary|number)\s+mod\s+(\d+)\s*==?\s*(\d+)/i);
    if (binaryModMatch) {
      return {
        type: 'MODULO_BINARY',
        n: parseInt(binaryModMatch[1], 10),
        remainder: parseInt(binaryModMatch[2], 10),
        alphabet,
      };
    }

    const binaryDivMatch = p.match(/(?:binary|number)\s+divisible\s+by\s+(\d+)/i);
    if (binaryDivMatch) return { type: 'DIVISIBLE_BINARY', n: parseInt(binaryDivMatch[1], 10), alphabet };

    // 8. GENERAL K-TH LAST SYMBOL (first, second, third, fourth, fifth, sixth, seventh, eighth, ninth, tenth... N-th last symbol is 0/1)
    const ordinalMap: Record<string, number> = {
      first: 1, '1st': 1,
      second: 2, '2nd': 2,
      third: 3, '3rd': 3,
      fourth: 4, '4th': 4,
      fifth: 5, '5th': 5,
      sixth: 6, '6th': 6,
      seventh: 7, '7th': 7,
      eighth: 8, '8th': 8,
      ninth: 9, '9th': 9,
      tenth: 10, '10th': 10,
    };

    const kthLastMatch =
      p.match(/(first|second|third|fourth|fifth|sixth|seventh|eighth|ninth|tenth|\d+(?:st|nd|rd|th)?)\s+(?:last\s+symbol|symbol\s+from\s+the\s+end)\s+(?:is\s+)?([01a-z])/i) ||
      p.match(/([01a-z])\s+(?:is\s+the\s+)?(first|second|third|fourth|fifth|sixth|seventh|eighth|ninth|tenth|\d+(?:st|nd|rd|th)?)\s+last\s+symbol/i);

    if (kthLastMatch) {
      let rankStr = '';
      let sym = '1';

      if (/^[01a-z]$/i.test(kthLastMatch[1])) {
        sym = kthLastMatch[1];
        rankStr = kthLastMatch[2];
      } else {
        rankStr = kthLastMatch[1];
        sym = kthLastMatch[2] || (p.includes('0') ? '0' : '1');
      }

      rankStr = rankStr.toLowerCase();
      let k = 1;

      const numMatch = rankStr.match(/\d+/);
      if (numMatch) {
        k = parseInt(numMatch[0], 10);
      } else {
        for (const [key, val] of Object.entries(ordinalMap)) {
          if (rankStr.includes(key)) {
            k = val;
            break;
          }
        }
      }

      return { type: 'KTH_LAST_SYMBOL', k, symbol: sym, alphabet };
    }

    if (p.includes('last symbol') || p.includes('ends in single') || p.match(/last\s+(?:symbol|char)\s+(?:is\s+)?([01a-z])/i)) {
      const match = p.match(/last\s+(?:symbol|char)\s+(?:is\s+)?([01a-z])/i);
      const sym = match ? match[1] : (p.includes('0') ? '0' : '1');
      return { type: 'KTH_LAST_SYMBOL', k: 1, symbol: sym, alphabet };
    }

    // 9. DOES NOT CONTAIN / NOT CONTAINING (Before generic CONTAINS)
    const notContainsMatch = p.match(/(?:does?\s+not\s+contain|not\s+contain(?:ing)?|no)\s+([01a-z]+)/i);
    if (notContainsMatch) {
      const pattern = notContainsMatch[1].replace(/(?:'s|s)$/i, '');
      return { type: 'NOT_CONTAINS', pattern, alphabet };
    }

    // 10. EXACT PATTERN / EXCEPT PATTERN
    const exactMatch = p.match(/(?:exact|only)\s+(?:string|pattern)?\s*([01a-z]+)/i);
    if (exactMatch) {
      const pattern = exactMatch[1].replace(/(?:'s|s)$/i, '');
      return { type: 'EXACT_STRING', pattern, alphabet };
    }

    const exceptMatch = p.match(/(?:except|all except)\s+(?:string|pattern)?\s*([01a-z]+)/i);
    if (exceptMatch) {
      const pattern = exceptMatch[1].replace(/(?:'s|s)$/i, '');
      return { type: 'EXCEPT_STRING', pattern, alphabet };
    }

    // 11. PREFIX / SUFFIX
    const endsMatch = p.match(/(?:ends?|ending)\s+(?:with|in)\s+([01a-z]+)/i);
    if (endsMatch) {
      const pattern = endsMatch[1].replace(/(?:'s|s)$/i, '');
      return { type: 'ENDS_WITH', pattern, alphabet };
    }

    const startsMatch = p.match(/(?:starts?|starting)\s+with\s+([01a-z]+)/i);
    if (startsMatch) {
      const pattern = startsMatch[1].replace(/(?:'s|s)$/i, '');
      return { type: 'STARTS_WITH', pattern, alphabet };
    }

    // 12. CONTAINS (Strict pattern match AFTER exact count / not contains)
    const containsMatch = p.match(/contains?\s+([01a-z]+)/i);
    if (containsMatch && containsMatch[1] !== 'exactly' && containsMatch[1] !== 'at') {
      const pattern = containsMatch[1].replace(/(?:'s|s)$/i, '');
      return { type: 'CONTAINS', pattern, alphabet };
    }

    // Fallback NOT compound for general prompts like "not starts with 0"
    if (p.startsWith('not ') || p.startsWith('all except ')) {
      const rest = p.replace(/^(not|all except)\s+/, '').trim();
      const sub = this.parse(rest);
      return {
        type: 'COMPOUND',
        operator: 'NOT',
        leftIntent: sub,
        alphabet,
      };
    }

    // 13. PARITY COUNTS (EVEN / ODD)
    if (p.includes('even 0s') && p.includes('even 1s')) return { type: 'EVEN_EVEN', alphabet };
    if (p.includes('even 0s') && p.includes('odd 1s')) return { type: 'EVEN_ODD', alphabet };
    if (p.includes('odd 0s') && p.includes('even 1s')) return { type: 'ODD_EVEN', alphabet };
    if (p.includes('odd 0s') && p.includes('odd 1s')) return { type: 'ODD_ODD', alphabet };

    if (p.includes('even') && p.includes('0')) return { type: 'EVEN', symbol: '0', alphabet };
    if (p.includes('even') && p.includes('1')) return { type: 'EVEN', symbol: '1', alphabet };
    if (p.includes('odd') && p.includes('0')) return { type: 'ODD', symbol: '0', alphabet };
    if (p.includes('odd') && p.includes('1')) return { type: 'ODD', symbol: '1', alphabet };

    // Position matches
    const posMatch = p.match(/(?:(\d+)(?:st|nd|rd|th)?|first|second|third|fourth|fifth)\s+symbol\s+(?:is\s+)?([01a-z])/i);
    if (posMatch) {
      let posNum = 1;
      if (posMatch[1]) {
        posNum = parseInt(posMatch[1], 10);
      } else if (p.includes('first')) posNum = 1;
      else if (p.includes('second')) posNum = 2;
      else if (p.includes('third')) posNum = 3;
      else if (p.includes('fourth')) posNum = 4;
      else if (p.includes('fifth')) posNum = 5;

      return { type: 'POSITION', position: posNum, symbol: posMatch[2], alphabet };
    }

    // Regex pattern
    const regexMatch = p.match(/regex\s+(.+)/i);
    if (regexMatch) return { type: 'REGEX', regex: regexMatch[1].trim(), alphabet };

    // Let the caller surface an unsupported prompt instead of silently generating a wrong DFA.
    return { type: 'UNSUPPORTED', alphabet };
  }
}
