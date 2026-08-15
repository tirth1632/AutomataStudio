import type { Intent } from './Intent';

export class NFAIntentParser {
  public static parse(promptStr: string): Intent {
    const raw = promptStr.trim().toLowerCase();

    // 1. Compound Query Parsing (AND / OR)
    if (raw.includes(' and ') || raw.includes(' or ')) {
      const isAnd = raw.includes(' and ');
      const parts = isAnd ? raw.split(' and ') : raw.split(' or ');
      if (parts.length >= 2) {
        const leftIntent = NFAIntentParser.parseSingle(parts[0]);
        const rightIntent = NFAIntentParser.parseSingle(parts.slice(1).join(isAnd ? ' and ' : ' or '));
        return {
          type: 'COMPOUND',
          operator: isAnd ? 'AND' : 'OR',
          leftIntent,
          rightIntent,
          rawPrompt: promptStr,
        };
      }
    }

    return NFAIntentParser.parseSingle(promptStr);
  }

  private static parseSingle(promptStr: string): Intent {
    const rawTrimmed = promptStr.trim();
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
        return {
          type: 'REGEX',
          regexStr: cleanRegex,
          pattern: cleanRegex,
          rawPrompt: promptStr,
        };
      }
    }

    const raw = promptStr.trim().toLowerCase();

    // Negative Language Prompts
    if (raw.includes('does not contain') || raw.includes("doesn't contain") || raw.includes('no substring')) {
      const match = raw.match(/(?:does not contain|doesn't contain|no substring)\s*["']?([01a-z]+)["']?/);
      return {
        type: 'DOES_NOT_CONTAIN',
        pattern: match ? match[1] : '101',
        rawPrompt: promptStr,
      };
    }

    if (raw.includes('accept all except') || raw.includes('except')) {
      const match = raw.match(/(?:accept all except|except)\s*["']?([01a-z]+)["']?/);
      return {
        type: 'ACCEPT_ALL_EXCEPT',
        pattern: match ? match[1] : '101',
        rawPrompt: promptStr,
      };
    }

    // Last Position Prompts
    if (raw.includes('last symbol') || raw.includes('from the end') || raw.includes('from end')) {
      const isZero = raw.includes('0');
      let index = 1;
      if (raw.includes('second last') || raw.includes('2nd last')) index = 2;
      if (raw.includes('third') || raw.includes('3rd')) index = 3;
      return {
        type: 'LAST_POSITION',
        lastPositionIndex: index,
        lastPositionSymbol: isZero ? '0' : '1',
        rawPrompt: promptStr,
      };
    }

    // Position Prompts
    if (raw.includes('first symbol') || raw.includes('1st symbol')) {
      return { type: 'POSITION', positionIndex: 1, positionSymbol: raw.includes('0') ? '0' : '1', rawPrompt: promptStr };
    }
    if (raw.includes('second symbol') || raw.includes('2nd symbol')) {
      return { type: 'POSITION', positionIndex: 2, positionSymbol: raw.includes('0') ? '0' : '1', rawPrompt: promptStr };
    }
    if (raw.includes('third symbol') || raw.includes('3rd symbol')) {
      return { type: 'POSITION', positionIndex: 3, positionSymbol: raw.includes('0') ? '0' : '1', rawPrompt: promptStr };
    }
    if (raw.includes('fourth symbol') || raw.includes('4th symbol')) {
      return { type: 'POSITION', positionIndex: 4, positionSymbol: raw.includes('0') ? '0' : '1', rawPrompt: promptStr };
    }

    // Consecutive Prompts
    if (raw.includes('consecutive')) {
      let symbol = raw.includes('0') ? '0' : '1';
      let len = 2;

      const digitBeforeMatch = raw.match(/(\d+)\s+consecutive\s+([01a-z])/i);
      const digitAfterMatch = raw.match(/consecutive\s+(\d+)\s+([01a-z])/i);
      const symMatch = raw.match(/consecutive\s+([01a-z]+)/i);

      if (digitBeforeMatch) {
        len = parseInt(digitBeforeMatch[1], 10);
        symbol = digitBeforeMatch[2];
      } else if (digitAfterMatch) {
        len = parseInt(digitAfterMatch[1], 10);
        symbol = digitAfterMatch[2];
      } else if (symMatch && symMatch[1]) {
        const cleaned = symMatch[1].replace(/(?:'s|s)$/i, '');
        if (cleaned.length > 1) {
          len = cleaned.length;
          symbol = cleaned[0];
        } else if (cleaned.length === 1) {
          symbol = cleaned;
          len = 2;
        }
      }

      let mode: 'CONTAINS' | 'EXACT' | 'NO_CONSECUTIVE' = 'CONTAINS';
      if (raw.includes('no consecutive') || raw.includes('without consecutive')) mode = 'NO_CONSECUTIVE';
      if (raw.includes('exactly')) mode = 'EXACT';

      return {
        type: 'CONSECUTIVE',
        consecutiveSymbol: symbol,
        consecutiveLength: len,
        consecutiveMode: mode,
        rawPrompt: promptStr,
      };
    }

    // Alternate Pattern Prompts
    if (raw.includes('alternat') || raw.includes('no consecutive equal')) {
      let mode: '01' | '10' | 'ANY_ALTERNATE' = 'ANY_ALTERNATE';
      if (raw.includes('0101')) mode = '01';
      if (raw.includes('1010')) mode = '10';
      return {
        type: 'ALTERNATE',
        alternateMode: mode,
        rawPrompt: promptStr,
      };
    }

    // Count Prompts (e.g. Exactly two 0s, Exactly three 1s)
    if (raw.includes('exactly') && (raw.includes('0') || raw.includes('1')) && !raw.includes('occurrence')) {
      const isZero = raw.includes('0');
      let count = 1;
      if (raw.includes('two') || raw.includes('2')) count = 2;
      if (raw.includes('three') || raw.includes('3')) count = 3;
      return {
        type: 'COUNT',
        symbol: isZero ? '0' : '1',
        count,
        countCondition: 'EXACT',
        rawPrompt: promptStr,
      };
    }

    // Occurrence Prompts (e.g. Exactly one occurrence of 101, At least three occurrences)
    if (raw.includes('occurrence')) {
      const match = raw.match(/["']?([01]+)["']?/);
      let count = 1;
      if (raw.includes('two') || raw.includes('2')) count = 2;
      if (raw.includes('three') || raw.includes('3')) count = 3;
      return {
        type: 'OCCURRENCE',
        pattern: match ? match[1] : '101',
        count,
        countCondition: raw.includes('at least') ? 'AT_LEAST' : 'EXACT',
        rawPrompt: promptStr,
      };
    }

    // Regex Prompts
    if (raw.includes('*') || raw.includes('|') || raw.includes('+') || raw.includes('regex')) {
      const explicitRegex = raw.match(/(?:^|\s)regex\s*[:=]?\s*(.+)$/i);
      const match = explicitRegex || raw.match(/([01a-z\(\)\|\+\*\?]+)/);
      const regexStr = match ? match[1].trim() : promptStr.trim();
      return {
        type: 'REGEX',
        regexStr,
        rawPrompt: promptStr,
      };
    }

    // Substring / Contains Prompts
    if (raw.includes('contain') || raw.includes('has substring') || raw.includes('substring')) {
      const match = raw.match(/(?:contains?|containing|substring)\s*["']?([01a-z]+)["']?/);
      const pattern = match ? match[1] : '101';
      return {
        type: 'CONTAINS',
        pattern,
        rawPrompt: promptStr,
      };
    }

    // Starts With / Prefix Prompts
    if (raw.includes('starts with') || raw.includes('starting with') || raw.includes('prefix')) {
      const match = raw.match(/(?:starts with|prefix)\s*["']?([01a-z]+)["']?/);
      const pattern = match ? match[1] : '101';
      return {
        type: 'STARTS_WITH',
        pattern,
        rawPrompt: promptStr,
      };
    }

    // Ends With / Suffix Prompts
    if (raw.includes('ends with') || raw.includes('ending with') || raw.includes('suffix')) {
      const match = raw.match(/(?:ends with|suffix)\s*["']?([01a-z]+)["']?/);
      const pattern = match ? match[1] : '101';
      return {
        type: 'ENDS_WITH',
        pattern,
        rawPrompt: promptStr,
      };
    }

    // Exact String Prompts
    if (raw.includes('exact') || raw.includes('only string')) {
      const match = raw.match(/["']?([01a-z]+)["']?/);
      return {
        type: 'EXACT_STRING',
        pattern: match ? match[1] : '101',
        rawPrompt: promptStr,
      };
    }

    // Parity Prompts
    if (raw.includes('even number of') || raw.includes('odd number of')) {
      const isEven = raw.includes('even');
      const isZero = raw.includes('0');
      return {
        type: 'PARITY',
        paritySymbol: isZero ? '0' : '1',
        parityTarget: isEven ? 'EVEN' : 'ODD',
        rawPrompt: promptStr,
      };
    }

    // Length Prompts
    if (raw.includes('length')) {
      if (raw.includes('even')) {
        return { type: 'LENGTH', lengthCondition: 'EVEN', rawPrompt: promptStr };
      }
      if (raw.includes('odd')) {
        return { type: 'LENGTH', lengthCondition: 'ODD', rawPrompt: promptStr };
      }
      if (raw.includes('divisible') || raw.includes('mod')) {
        const match = raw.match(/\d+/);
        const m = match ? parseInt(match[0], 10) : 3;
        return { type: 'LENGTH', lengthCondition: 'MOD', modVal: m, rawPrompt: promptStr };
      }
      const match = raw.match(/\d+/);
      const val = match ? parseInt(match[0], 10) : 3;
      if (raw.includes('at least')) {
        return { type: 'LENGTH', lengthCondition: 'AT_LEAST', lengthVal: val, rawPrompt: promptStr };
      }
      if (raw.includes('at most')) {
        return { type: 'LENGTH', lengthCondition: 'AT_MOST', lengthVal: val, rawPrompt: promptStr };
      }
      return { type: 'LENGTH', lengthCondition: 'EXACT', lengthVal: val, rawPrompt: promptStr };
    }

    return {
      type: 'CONTAINS',
      pattern: '101',
      rawPrompt: promptStr,
    };
  }
}
