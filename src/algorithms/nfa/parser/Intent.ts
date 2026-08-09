export type IntentType =
  | 'CONTAINS'
  | 'STARTS_WITH'
  | 'ENDS_WITH'
  | 'PREFIX'
  | 'SUFFIX'
  | 'EXACT_STRING'
  | 'FINITE_LANGUAGE'
  | 'LENGTH'
  | 'PARITY'
  | 'OCCURRENCE'
  | 'REGEX'
  | 'EPSILON_ONLY'
  | 'ALL_EXCEPT_EPSILON'
  | 'CONSECUTIVE'
  | 'POSITION'
  | 'LAST_POSITION'
  | 'ALTERNATE'
  | 'COUNT'
  | 'DOES_NOT_CONTAIN'
  | 'ACCEPT_ALL_EXCEPT'
  | 'COMPOUND'
  | 'CUSTOM';

export interface Intent {
  type: IntentType;
  pattern?: string;
  patterns?: string[];
  alphabet?: string[];
  lengthCondition?: 'EXACT' | 'AT_MOST' | 'AT_LEAST' | 'MOD' | 'EVEN' | 'ODD';
  lengthVal?: number;
  modVal?: number;
  symbol?: string;
  count?: number;
  countCondition?: 'EXACT' | 'AT_LEAST' | 'AT_MOST';
  paritySymbol?: '0' | '1';
  parityTarget?: 'EVEN' | 'ODD';
  regexStr?: string;
  rawPrompt?: string;

  // New Intent properties
  consecutiveSymbol?: string;
  consecutiveLength?: number;
  consecutiveMode?: 'CONTAINS' | 'EXACT' | 'NO_CONSECUTIVE';
  positionIndex?: number; // 1-based index
  positionSymbol?: string;
  lastPositionIndex?: number; // 1-based index from end
  lastPositionSymbol?: string;
  alternateMode?: '01' | '10' | 'ANY_ALTERNATE' | 'NO_CONSECUTIVE_EQUAL';
  negativePattern?: string;
  leftIntent?: Intent;
  rightIntent?: Intent;
  operator?: 'AND' | 'OR' | 'NOT';
}
