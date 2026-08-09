import type { DFA } from '../../types/dfa';

/**
 * State Elimination Algorithm for converting any DFA into an equivalent Regular Expression.
 */
export class DFAToRegex {
  public static convert(dfa: DFA): string {
    const states = dfa.states;
    if (states.length === 0) return '∅';
    if (dfa.acceptStates.length === 0) return '∅';

    const start = 'q_start_node';
    const accept = 'q_final_node';
    const allNodes = [start, ...states, accept];

    // Transitive edge matrix: R[u][v] = regex string
    const R: Map<string, Map<string, string>> = new Map();

    for (const u of allNodes) {
      R.set(u, new Map());
      for (const v of allNodes) {
        R.get(u)!.set(v, '');
      }
    }

    // 1. Initial edge assignments
    // Start -> dfa.startState (ε)
    R.get(start)!.set(dfa.startState, 'ε');

    // dfa accept states -> accept (ε)
    for (const accState of dfa.acceptStates) {
      R.get(accState)!.set(accept, 'ε');
    }

    // Direct DFA transitions
    for (const src of dfa.states) {
      const transitions = dfa.transitions[src] || {};
      const targetSymbols = new Map<string, string[]>();

      for (const [sym, tgt] of Object.entries(transitions)) {
        if (!targetSymbols.has(tgt)) targetSymbols.set(tgt, []);
        targetSymbols.get(tgt)!.push(sym);
      }

      for (const [tgt, syms] of targetSymbols.entries()) {
        const unionExpr = syms.length === 1 ? syms[0] : `(${syms.join('|')})`;
        const existing = R.get(src)!.get(tgt) || '';
        if (existing) {
          R.get(src)!.set(tgt, `(${existing}|${unionExpr})`);
        } else {
          R.get(src)!.set(tgt, unionExpr);
        }
      }
    }

    // 2. Eliminate intermediate states one by one
    for (const k of states) {
      const r_kk = R.get(k)!.get(k) || '';
      const loopStr = r_kk ? (r_kk.length === 1 ? `${r_kk}*` : `(${r_kk})*`) : '';

      for (const p of allNodes) {
        if (p === k) continue;
        const r_pk = R.get(p)!.get(k) || '';
        if (!r_pk) continue;

        for (const q of allNodes) {
          if (q === k) continue;
          const r_kq = R.get(k)!.get(q) || '';
          if (!r_kq) continue;

          // Path p -> k -> q: r_pk + loopStr + r_kq
          let pathStr = '';
          if (r_pk === 'ε') {
            pathStr = loopStr ? `${loopStr}${r_kq === 'ε' ? '' : r_kq}` : (r_kq === 'ε' ? 'ε' : r_kq);
          } else {
            pathStr = `${r_pk}${loopStr}${r_kq === 'ε' ? '' : r_kq}`;
          }

          const existing_pq = R.get(p)!.get(q) || '';
          let new_pq = '';
          if (existing_pq && pathStr) {
            new_pq = `(${existing_pq}|${pathStr})`;
          } else {
            new_pq = existing_pq || pathStr;
          }

          R.get(p)!.set(q, new_pq);
        }
      }

      // Clear edges through k
      for (const node of allNodes) {
        R.get(node)!.set(k, '');
        R.get(k)!.set(node, '');
      }
    }

    const result = R.get(start)!.get(accept) || '∅';
    return result || '∅';
  }
}
