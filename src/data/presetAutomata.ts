import type { AutomatonGraph } from '../types/automata';
import { applyDagreLayout } from '../services/layoutEngine';

/**
 * Pre-built automata without coordinates.
 * Dagre layout is applied at load time — never hardcoded positions.
 */

function mkGraph(
  id: string,
  name: string,
  type: 'DFA' | 'NFA' | 'ENFA',
  alphabet: string[],
  states: { id: string; label: string; isStart?: boolean; isAccept?: boolean }[],
  transitions: { source: string; target: string; symbols: string[] }[]
): AutomatonGraph {
  return applyDagreLayout({
    id,
    name,
    type,
    alphabet,
    states: states.map((s) => ({
      id: s.id,
      label: s.label,
      isStart: !!s.isStart,
      isAccept: !!s.isAccept,
      x: 0,
      y: 0,
    })),
    transitions: transitions.map((t, i) => ({
      id: `t_${t.source}_${t.target}_${i}`,
      source: t.source,
      target: t.target,
      symbols: t.symbols,
    })),
  });
}

// ── 1. Even number of 1s ─────────────────────────────────────────────────────
export const EVEN_ONES: AutomatonGraph = mkGraph(
  'preset_even_ones',
  'Even number of 1s',
  'DFA',
  ['0', '1'],
  [
    { id: 'q0', label: 'Even 1s', isStart: true, isAccept: true },
    { id: 'q1', label: 'Odd 1s' },
  ],
  [
    { source: 'q0', target: 'q0', symbols: ['0'] },
    { source: 'q0', target: 'q1', symbols: ['1'] },
    { source: 'q1', target: 'q1', symbols: ['0'] },
    { source: 'q1', target: 'q0', symbols: ['1'] },
  ]
);

// ── 2. Even number of 0s ─────────────────────────────────────────────────────
export const EVEN_ZEROS: AutomatonGraph = mkGraph(
  'preset_even_zeros',
  'Even number of 0s',
  'DFA',
  ['0', '1'],
  [
    { id: 'q0', label: 'Even 0s', isStart: true, isAccept: true },
    { id: 'q1', label: 'Odd 0s' },
  ],
  [
    { source: 'q0', target: 'q1', symbols: ['0'] },
    { source: 'q0', target: 'q0', symbols: ['1'] },
    { source: 'q1', target: 'q0', symbols: ['0'] },
    { source: 'q1', target: 'q1', symbols: ['1'] },
  ]
);

// ── 3. Ends with 101 ─────────────────────────────────────────────────────────
export const ENDS_101: AutomatonGraph = mkGraph(
  'preset_ends_101',
  'Ends with 101',
  'DFA',
  ['0', '1'],
  [
    { id: 'q0', label: 'Start', isStart: true },
    { id: 'q1', label: 'Got 1' },
    { id: 'q2', label: 'Got 10' },
    { id: 'q3', label: 'Got 101', isAccept: true },
  ],
  [
    { source: 'q0', target: 'q0', symbols: ['0'] },
    { source: 'q0', target: 'q1', symbols: ['1'] },
    { source: 'q1', target: 'q1', symbols: ['1'] },
    { source: 'q1', target: 'q2', symbols: ['0'] },
    { source: 'q2', target: 'q0', symbols: ['0'] },
    { source: 'q2', target: 'q3', symbols: ['1'] },
    { source: 'q3', target: 'q2', symbols: ['0'] },
    { source: 'q3', target: 'q1', symbols: ['1'] },
  ]
);

// ── 4. Starts with 001 ───────────────────────────────────────────────────────
export const STARTS_001: AutomatonGraph = mkGraph(
  'preset_starts_001',
  'Starts with 001',
  'DFA',
  ['0', '1'],
  [
    { id: 'q0', label: 'Start', isStart: true },
    { id: 'q1', label: 'Got 0' },
    { id: 'q2', label: 'Got 00' },
    { id: 'q3', label: 'Got 001', isAccept: true },
    { id: 'q4', label: 'Dead' },
  ],
  [
    { source: 'q0', target: 'q1', symbols: ['0'] },
    { source: 'q0', target: 'q4', symbols: ['1'] },
    { source: 'q1', target: 'q2', symbols: ['0'] },
    { source: 'q1', target: 'q4', symbols: ['1'] },
    { source: 'q2', target: 'q4', symbols: ['0'] },
    { source: 'q2', target: 'q3', symbols: ['1'] },
    { source: 'q3', target: 'q3', symbols: ['0', '1'] },
    { source: 'q4', target: 'q4', symbols: ['0', '1'] },
  ]
);

// ── 5. Contains 110 (NFA) ────────────────────────────────────────────────────
export const CONTAINS_110: AutomatonGraph = mkGraph(
  'preset_contains_110',
  'Contains substring 110',
  'NFA',
  ['0', '1'],
  [
    { id: 'q0', label: 'Search', isStart: true },
    { id: 'q1', label: 'Got 1' },
    { id: 'q2', label: 'Got 11' },
    { id: 'q3', label: 'Got 110', isAccept: true },
  ],
  [
    { source: 'q0', target: 'q0', symbols: ['0', '1'] },
    { source: 'q0', target: 'q1', symbols: ['1'] },
    { source: 'q1', target: 'q2', symbols: ['1'] },
    { source: 'q2', target: 'q3', symbols: ['0'] },
    { source: 'q3', target: 'q3', symbols: ['0', '1'] },
  ]
);

// ── 6. Divisible by 3 ────────────────────────────────────────────────────────
export const DIVISIBLE_3: AutomatonGraph = mkGraph(
  'preset_div3',
  'Binary divisible by 3',
  'DFA',
  ['0', '1'],
  [
    { id: 'q0', label: 'Rem 0', isStart: true, isAccept: true },
    { id: 'q1', label: 'Rem 1' },
    { id: 'q2', label: 'Rem 2' },
  ],
  [
    { source: 'q0', target: 'q0', symbols: ['0'] },
    { source: 'q0', target: 'q1', symbols: ['1'] },
    { source: 'q1', target: 'q2', symbols: ['0'] },
    { source: 'q1', target: 'q0', symbols: ['1'] },
    { source: 'q2', target: 'q1', symbols: ['0'] },
    { source: 'q2', target: 'q2', symbols: ['1'] },
  ]
);

// ── 7. Palindromes of length 3 ───────────────────────────────────────────────
export const PALINDROME_3: AutomatonGraph = mkGraph(
  'preset_palindrome3',
  'Palindromes of length 3 over {a,b}',
  'DFA',
  ['a', 'b'],
  [
    { id: 'q0', label: 'Start', isStart: true },
    { id: 'q1', label: 'Read a' },
    { id: 'q2', label: 'Read b' },
    { id: 'q3', label: 'aba/bab mid', isAccept: false },
    { id: 'q4', label: 'aaa/bbb mid', isAccept: false },
    { id: 'q5', label: 'Accept aba', isAccept: true },
    { id: 'q6', label: 'Accept bab', isAccept: true },
    { id: 'q7', label: 'Accept aaa', isAccept: true },
    { id: 'q8', label: 'Accept bbb', isAccept: true },
    { id: 'q9', label: 'Dead' },
  ],
  [
    { source: 'q0', target: 'q1', symbols: ['a'] },
    { source: 'q0', target: 'q2', symbols: ['b'] },
    { source: 'q1', target: 'q3', symbols: ['b'] },
    { source: 'q1', target: 'q4', symbols: ['a'] },
    { source: 'q2', target: 'q3', symbols: ['a'] },
    { source: 'q2', target: 'q4', symbols: ['b'] },
    { source: 'q3', target: 'q5', symbols: ['a'] },
    { source: 'q3', target: 'q6', symbols: ['b'] },
    { source: 'q4', target: 'q7', symbols: ['a'] },
    { source: 'q4', target: 'q8', symbols: ['b'] },
    { source: 'q5', target: 'q9', symbols: ['a', 'b'] },
    { source: 'q6', target: 'q9', symbols: ['a', 'b'] },
    { source: 'q7', target: 'q9', symbols: ['a', 'b'] },
    { source: 'q8', target: 'q9', symbols: ['a', 'b'] },
    { source: 'q9', target: 'q9', symbols: ['a', 'b'] },
  ]
);

// ── 8. (a|b)*abb regex NFA ────────────────────────────────────────────────────
export const REGEX_ABB: AutomatonGraph = mkGraph(
  'preset_abb',
  'Strings ending in abb — regex (a|b)*abb',
  'NFA',
  ['a', 'b'],
  [
    { id: 'q0', label: 'Start', isStart: true },
    { id: 'q1', label: 'Got a' },
    { id: 'q2', label: 'Got ab' },
    { id: 'q3', label: 'Got abb', isAccept: true },
  ],
  [
    { source: 'q0', target: 'q0', symbols: ['a', 'b'] },
    { source: 'q0', target: 'q1', symbols: ['a'] },
    { source: 'q1', target: 'q2', symbols: ['b'] },
    { source: 'q2', target: 'q3', symbols: ['b'] },
  ]
);

// ── 9. Starts with 10 and ends with 01 — NFA ────────────────────────────────
//
//  TRUE NFA — uses nondeterminism, no explicit dead state needed.
//
//  States: q0(start), q1(got '1'), q2(prefix done, middle),
//          q3(saw '0' of potential suffix), q4(accept)
//
//  Nondeterminism: from q2 on '0':
//    → q2 (stay in middle — loop)        AND
//    → q3 (guess this '0' starts "01" suffix)
//
//  Missing transitions are implicit dead (NFA semantics).
//  q4 (accept) has NO outgoing transitions — string must end there.
export const STARTS10_ENDS01_NFA: AutomatonGraph = mkGraph(
  'preset_starts10ends01_nfa',
  'Starts with 10 and ends with 01 (NFA)',
  'NFA',
  ['0', '1'],
  [
    { id: 'q0', label: 'q0 – Start',         isStart: true },
    { id: 'q1', label: 'q1 – Got 1',        },
    { id: 'q2', label: 'q2 – Middle (10…)', },
    { id: 'q3', label: 'q3 – Saw 0 of sfx', },
    { id: 'q4', label: 'q4 – Accept',        isAccept: true },
  ],
  [
    // Prefix "10" — deterministic (missing = implicit dead)
    { source: 'q0', target: 'q1', symbols: ['1'] },
    { source: 'q1', target: 'q2', symbols: ['0'] },

    // Middle: loop on both symbols
    { source: 'q2', target: 'q2', symbols: ['0', '1'] },

    // NONDETERMINISM on '0': also branch into suffix tracking
    { source: 'q2', target: 'q3', symbols: ['0'] },

    // Suffix: saw '0' (q3) → need '1' to reach accept
    { source: 'q3', target: 'q4', symbols: ['1'] },
    // q4 has no outgoing transitions — string must end here
  ]
);

// ── 10. Starts with 10 and ends with 01 — minimal DFA ───────────────────────
//
//  Same state structure as the NFA above (it was already deterministic).
//  Labelled as DFA explicitly for the subset-construction demo.
//
//  State semantics after consuming prefix "10":
//    q2 → last char was '0'  (suffix '0' seen, await '1')
//    q3 → ACCEPT  (last two chars were '01')
//    q4 → last char was '1', no valid suffix end yet
//
//  Counterexample that proves 4-state version is wrong:
//    "1011001" → should ACCEPT (starts '10', ends '01')
//    4-state: q0→q1→q2→q3→DEAD on second '1'  ✗
//    This DFA: q0→q1→q2→q3→q4→q2→q2→q3  ✓
export const STARTS10_ENDS01_DFA: AutomatonGraph = mkGraph(
  'preset_starts10ends01_dfa',
  'Starts with 10 and ends with 01 (DFA – minimal)',
  'DFA',
  ['0', '1'],
  [
    { id: 'dq0', label: 'q0 – Start',    isStart: true },
    { id: 'dq1', label: 'q1 – Got 1',   },
    { id: 'dq2', label: 'q2 – Got 10',  },   // last char '0'
    { id: 'dq3', label: 'q3 – Accept',   isAccept: true },
    { id: 'dq4', label: 'q4 – Mid 1',   },   // last char '1', not accept
    { id: 'dqd', label: 'Dead',         },
  ],
  [
    // Prefix "10"
    { source: 'dq0', target: 'dq1', symbols: ['1'] },
    { source: 'dq0', target: 'dqd', symbols: ['0'] },
    { source: 'dq1', target: 'dq2', symbols: ['0'] },
    { source: 'dq1', target: 'dqd', symbols: ['1'] },

    // Suffix tracking
    { source: 'dq2', target: 'dq2', symbols: ['0'] },
    { source: 'dq2', target: 'dq3', symbols: ['1'] },   // saw '01' → accept

    { source: 'dq3', target: 'dq2', symbols: ['0'] },   // reset to last-char-'0'
    { source: 'dq3', target: 'dq4', symbols: ['1'] },   // back to middle

    { source: 'dq4', target: 'dq2', symbols: ['0'] },
    { source: 'dq4', target: 'dq4', symbols: ['1'] },

    { source: 'dqd', target: 'dqd', symbols: ['0', '1'] },
  ]
);

// ── Named lookup for examples panel ─────────────────────────────────────────

export const PRESET_EXAMPLES: {
  label: string;
  description: string;
  graph: AutomatonGraph;
  defaultInput: string;
}[] = [
  { label: 'Even 0s', description: 'Even number of 0s', graph: EVEN_ZEROS, defaultInput: '0011' },
  { label: 'Even 1s', description: 'Even number of 1s', graph: EVEN_ONES, defaultInput: '1100' },
  { label: 'Ends 101', description: 'Binary strings ending with 101', graph: ENDS_101, defaultInput: '0101' },
  { label: 'Starts 001', description: 'Binary strings starting with 001', graph: STARTS_001, defaultInput: '001011' },
  { label: 'Contains 110', description: 'Strings containing 110', graph: CONTAINS_110, defaultInput: '01101' },
  { label: 'Div by 3', description: 'Binary numbers divisible by 3', graph: DIVISIBLE_3, defaultInput: '110' },
  { label: 'Palindrome ℓ=3', description: 'Palindromes of length 3 over {a,b}', graph: PALINDROME_3, defaultInput: 'aba' },
  { label: '(a|b)*abb', description: 'Regex: strings ending in abb', graph: REGEX_ABB, defaultInput: 'aabb' },
  { label: 'Starts 10, Ends 01 (NFA)', description: 'NFA: binary strings starting with 10 and ending with 01', graph: STARTS10_ENDS01_NFA, defaultInput: '1001' },
  { label: 'Starts 10, Ends 01 (DFA)', description: 'DFA (subset construction) from NFA: strings starting with 10 and ending with 01', graph: STARTS10_ENDS01_DFA, defaultInput: '1001' },
];
