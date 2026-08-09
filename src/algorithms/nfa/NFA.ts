export interface NFA {
  alphabet: string[];
  states: string[];
  startState: string;
  acceptStates: string[];
  transitions: {
    [state: string]: {
      [symbol: string]: string[];
    };
  };
}

export function createEmptyNFA(alphabet: string[] = ['0', '1']): NFA {
  return {
    alphabet,
    states: ['q0'],
    startState: 'q0',
    acceptStates: [],
    transitions: {
      q0: {},
    },
  };
}
