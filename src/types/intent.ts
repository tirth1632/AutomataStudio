import type { DFA } from './dfa';

export type IntentType =
  | 'ENDS_WITH'
  | 'STARTS_WITH'
  | 'CONTAINS'
  | 'NOT_CONTAINS'
  | 'EXACT_STRING'
  | 'EXCEPT_STRING'
  | 'EVEN'
  | 'ODD'
  | 'EVEN_EVEN'
  | 'EVEN_ODD'
  | 'ODD_EVEN'
  | 'ODD_ODD'
  | 'EXACT_COUNT'
  | 'AT_LEAST_COUNT'
  | 'POSITION'
  | 'LAST_SYMBOL'
  | 'SECOND_LAST'
  | 'THIRD_LAST'
  | 'KTH_LAST_SYMBOL'
  | 'LENGTH_EXACT'
  | 'LENGTH_AT_MOST'
  | 'DIVISIBLE_LENGTH'
  | 'DIVISIBLE_BINARY'
  | 'MODULO_LENGTH'
  | 'MODULO_BINARY'
  | 'CONSECUTIVE'
  | 'ALTERNATE'
  | 'EPSILON_ONLY'
  | 'EVERYTHING_EXCEPT_EPSILON'
  | 'UNIVERSAL'
  | 'EMPTY_LANGUAGE'
  | 'MODULO_COUNT'
  | 'UNSUPPORTED'
  | 'REGEX'
  | 'TRAP_STATE'
  | 'COMPOUND';

export interface EngineIntent {
  type: IntentType;
  pattern?: string;
  symbol?: string;
  blockA?: string;
  blockB?: string;
  count?: number;
  position?: number;
  k?: number;
  n?: number;
  remainder?: number;
  mode?: 'AT_LEAST' | 'NO' | 'EXACTLY' | 'CONTAINS';
  regex?: string;
  operator?: 'AND' | 'OR' | 'NOT' | 'DIFF' | 'XOR';
  leftIntent?: EngineIntent;
  rightIntent?: EngineIntent;
  subIntents?: EngineIntent[];
  alphabet?: string[];
}

export interface Generator {
  canHandle(intent: EngineIntent): boolean;
  generate(intent: EngineIntent): DFA;
}
