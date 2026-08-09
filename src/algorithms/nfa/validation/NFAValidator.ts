import type { NFA } from '../NFA';
import { findReachableStates } from '../../shared/Reachability';

export interface NFAValidationError {
  type: string;
  message: string;
  severity: 'error' | 'warning' | 'info';
  details?: any;
}

export function validateNFA(nfa: NFA): NFAValidationError[] {
  const errors: NFAValidationError[] = [];
  const stateSet = new Set(nfa.states);

  if (!nfa.states || nfa.states.length === 0) {
    errors.push({
      type: 'EMPTY_GRAPH',
      message: 'NFA has no states defined.',
      severity: 'error',
    });
    return errors;
  }

  if (!nfa.startState || !stateSet.has(nfa.startState)) {
    errors.push({
      type: 'INVALID_START',
      message: `Start state '${nfa.startState}' is invalid or not in states set.`,
      severity: 'error',
    });
  }

  if (!nfa.acceptStates || nfa.acceptStates.length === 0) {
    errors.push({
      type: 'MISSING_ACCEPT',
      message: 'NFA has no accept states defined.',
      severity: 'warning',
    });
  } else {
    for (const acc of nfa.acceptStates) {
      if (!stateSet.has(acc)) {
        errors.push({
          type: 'INVALID_ACCEPT',
          message: `Accept state '${acc}' does not exist in states list.`,
          severity: 'error',
        });
      }
    }
  }

  for (const source of Object.keys(nfa.transitions)) {
    if (!stateSet.has(source)) {
      errors.push({
        type: 'UNDEFINED_SOURCE_STATE',
        message: `Transition source state '${source}' is not in states list.`,
        severity: 'error',
      });
    }

    const symMap = nfa.transitions[source] || {};
    for (const sym of Object.keys(symMap)) {
      const targets = symMap[sym] || [];
      for (const target of targets) {
        if (!stateSet.has(target)) {
          errors.push({
            type: 'UNDEFINED_TARGET_STATE',
            message: `Transition target '${target}' from '${source}' on '${sym}' is not defined.`,
            severity: 'error',
          });
        }
      }
    }
  }

  if (nfa.startState && stateSet.has(nfa.startState)) {
    const reachable = findReachableStates(nfa.startState, nfa.transitions);
    const unreachable = nfa.states.filter((s) => !reachable.has(s));
    if (unreachable.length > 0) {
      errors.push({
        type: 'UNREACHABLE_STATES',
        message: `Unreachable states detected: {${unreachable.join(', ')}}`,
        severity: 'warning',
        details: { unreachable },
      });
    }
  }

  return errors;
}
