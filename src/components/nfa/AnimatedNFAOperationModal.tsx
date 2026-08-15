import React, { useState, useMemo, useEffect } from 'react';
import {
  X,
  Play,
  Pause,
  RotateCcw,
  SkipBack,
  SkipForward,
  Zap,
  ArrowRight,
  Layers,
  Check,
  Table as TableIcon,
  Sparkles,
} from 'lucide-react';
import type { NFA } from '../../algorithms/nfa/NFA';
import { NFAOperations } from '../../algorithms/nfa/operations/NFAOperations';
import { nfaToAutomatonGraph } from '../../algorithms/nfa/renderer/NFARenderer';
import { MiniAutomataGraph } from '../dfa/MiniAutomataGraph';
import type { AutomatonGraph } from '../../types/automata';

export type NFAOperationType = 'UNION' | 'CONCAT' | 'STAR' | 'PLUS' | 'OPTIONAL' | 'REV_A' | 'REV_B';

interface AnimatedNFAOperationModalProps {
  nfaA: NFA;
  nfaB?: NFA;
  operation: NFAOperationType;
  onClose: () => void;
  onApplyResult: (resultGraph: AutomatonGraph, resultNFA: NFA) => void;
}

// Sub-component for rendering live interactive NFA transition tables
const LiveNFATransitionTable: React.FC<{
  nfa: NFA;
  title: string;
  accentColor: string;
  highlightStates?: string[];
  isEmptyStep?: boolean;
}> = ({ nfa, title, accentColor, highlightStates = [], isEmptyStep = false }) => {
  const allSymbols = Array.from(
    new Set([
      ...nfa.alphabet,
      ...Object.values(nfa.transitions).flatMap((sMap) => Object.keys(sMap || {})),
    ])
  ).filter(Boolean);

  const hasEps = allSymbols.includes('ε');
  const sortedSyms = allSymbols.filter((s) => s !== 'ε').sort();
  if (hasEps) sortedSyms.push('ε');

  return (
    <div className="bg-slate-950 border border-slate-800 rounded-2xl p-3 space-y-2 shadow-xl flex-1 min-w-[240px] font-mono text-xs">
      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
        <span className="font-bold font-sans flex items-center gap-1.5 text-xs" style={{ color: accentColor }}>
          <TableIcon className="w-3.5 h-3.5" /> {title}
        </span>
        <span className="text-[10px] text-slate-400 font-mono font-bold">
          {isEmptyStep ? '0 states' : `${nfa.states.length} states`}
        </span>
      </div>

      {isEmptyStep || nfa.states.length === 0 ? (
        <div className="py-8 text-center text-slate-500 font-sans text-xs italic">
          Result transition table empty. Waiting for construction steps...
        </div>
      ) : (
        <div className="overflow-x-auto max-h-48 custom-scrollbar">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 text-[11px]">
                <th className="py-1.5 px-2">State</th>
                {sortedSyms.map((sym) => (
                  <th key={sym} className="py-1.5 px-2 font-bold text-sky-400">
                    {sym}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {nfa.states.map((st) => {
                const isStart = st === nfa.startState;
                const isAccept = nfa.acceptStates.includes(st);
                const isHighlighted = highlightStates.includes(st);

                return (
                  <tr
                    key={st}
                    className={`transition-colors ${
                      isHighlighted ? 'bg-purple-950/80 text-purple-200 font-bold border-l-2 border-purple-400' : 'hover:bg-slate-900/60'
                    }`}
                  >
                    <td className="py-1.5 px-2 flex items-center gap-1">
                      {isStart && <span className="text-sky-400 font-bold text-[10px]" title="Start State">➔</span>}
                      {isAccept && <span className="text-emerald-400 font-bold text-[10px]" title="Accept State">★</span>}
                      <span className={isAccept ? 'text-emerald-300 font-bold' : isStart ? 'text-sky-300 font-bold' : 'text-slate-200'}>
                        {st}
                      </span>
                    </td>
                    {sortedSyms.map((sym) => {
                      const targets = nfa.transitions[st]?.[sym] || [];
                      const targetStr = targets.length > 0 ? `{ ${targets.join(', ')} }` : '∅';
                      return (
                        <td
                          key={sym}
                          className={`py-1.5 px-2 text-[11px] ${
                            targets.length > 0 ? 'text-indigo-300 font-semibold' : 'text-slate-600'
                          }`}
                        >
                          {targetStr}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export const AnimatedNFAOperationModal: React.FC<AnimatedNFAOperationModalProps> = ({
  nfaA,
  nfaB,
  operation,
  onClose,
  onApplyResult,
}) => {
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);

  // Compute resultant NFA based on selected operation
  const { resultNFA, operationTitle, formulaStr, isBinaryOp } = useMemo(() => {
    let res: NFA;
    let title = '';
    let formula = '';
    let isBinary = true;

    switch (operation) {
      case 'UNION':
        res = NFAOperations.union(nfaA, nfaB || nfaA);
        title = 'Union (A ∪ B)';
        formula = 'L(Result) = L(A) ∪ L(B)';
        isBinary = true;
        break;
      case 'CONCAT':
        res = NFAOperations.concat(nfaA, nfaB || nfaA);
        title = 'Concatenation (A · B)';
        formula = 'L(Result) = { uv ∣ u ∈ L(A), v ∈ L(B) }';
        isBinary = true;
        break;
      case 'STAR':
        res = NFAOperations.star(nfaA);
        title = 'Kleene Star (A*)';
        formula = 'L(Result) = L(A)* = ⋃_{i≥0} L(A)^i';
        isBinary = false;
        break;
      case 'PLUS':
        res = NFAOperations.plus(nfaA);
        title = 'Kleene Plus (A+)';
        formula = 'L(Result) = L(A)+ = ⋃_{i≥1} L(A)^i';
        isBinary = false;
        break;
      case 'OPTIONAL':
        res = NFAOperations.optional(nfaA);
        title = 'Optional (A?)';
        formula = 'L(Result) = L(A) ∪ {ε}';
        isBinary = false;
        break;
      case 'REV_A':
        res = NFAOperations.reverse(nfaA);
        title = 'Reverse A (A^R)';
        formula = 'L(Result) = { w^R ∣ w ∈ L(A) }';
        isBinary = false;
        break;
      case 'REV_B':
        res = NFAOperations.reverse(nfaB || nfaA);
        title = 'Reverse B (B^R)';
        formula = 'L(Result) = { w^R ∣ w ∈ L(B) }';
        isBinary = false;
        break;
      default:
        res = NFAOperations.union(nfaA, nfaB || nfaA);
        title = 'NFA Operation';
        formula = 'NFA Structural Construction';
        isBinary = true;
    }

    return { resultNFA: res, operationTitle: title, formulaStr: formula, isBinaryOp: isBinary };
  }, [nfaA, nfaB, operation]);

  // Static Graph objects for NFA A and NFA B
  const graphA = useMemo(() => nfaToAutomatonGraph(nfaA, 'NFA A'), [nfaA]);
  const graphB = useMemo(() => (nfaB ? nfaToAutomatonGraph(nfaB, 'NFA B') : null), [nfaB]);

  // Progressive 8-Step Granular Result Graph & NFA construction
  const { partialResultNFA, stepResultGraph, activeHighlightedStates, isEmptyResultStep } = useMemo(() => {
    const remainingStates = resultNFA.states.filter((s) => s !== resultNFA.startState);
    const midPoint = Math.max(1, Math.ceil(remainingStates.length / 2));
    const groupA = remainingStates.slice(0, midPoint);
    const groupB = remainingStates.slice(midPoint);

    // Step 1: Empty Canvas
    if (currentStepIndex === 0) {
      const emptyNFA: NFA = {
        alphabet: resultNFA.alphabet,
        states: [],
        startState: '',
        acceptStates: [],
        transitions: {},
      };
      return {
        partialResultNFA: emptyNFA,
        stepResultGraph: {
          id: 'step_1_empty',
          name: 'Result NFA (Step 1: Empty)',
          type: 'NFA' as const,
          alphabet: resultNFA.alphabet,
          states: [],
          transitions: [],
        },
        activeHighlightedStates: [],
        isEmptyResultStep: true,
      };
    }

    // Step 2: Create Start State Node (q0) Only
    if (currentStepIndex === 1) {
      const pNFA: NFA = {
        alphabet: resultNFA.alphabet,
        states: [resultNFA.startState],
        startState: resultNFA.startState,
        acceptStates: resultNFA.acceptStates.filter((s) => s === resultNFA.startState),
        transitions: {},
      };
      return {
        partialResultNFA: pNFA,
        stepResultGraph: nfaToAutomatonGraph(pNFA, 'Result NFA (Step 2: Start State)'),
        activeHighlightedStates: [resultNFA.startState],
        isEmptyResultStep: false,
      };
    }

    // Step 3: Add NFA A Sub-Automaton States
    if (currentStepIndex === 2) {
      const statesStep3 = Array.from(new Set([resultNFA.startState, ...groupA]));
      const pNFA: NFA = {
        alphabet: resultNFA.alphabet,
        states: statesStep3,
        startState: resultNFA.startState,
        acceptStates: [],
        transitions: {},
      };
      return {
        partialResultNFA: pNFA,
        stepResultGraph: nfaToAutomatonGraph(pNFA, 'Result NFA (Step 3: NFA A States)'),
        activeHighlightedStates: groupA,
        isEmptyResultStep: false,
      };
    }

    // Step 4: Add NFA A Internal Symbol Transitions
    if (currentStepIndex === 3) {
      const statesStep4 = Array.from(new Set([resultNFA.startState, ...groupA]));
      const transStep4: Record<string, Record<string, string[]>> = {};
      for (const st of statesStep4) {
        transStep4[st] = {};
        const sMap = resultNFA.transitions[st] || {};
        for (const sym of Object.keys(sMap)) {
          if (st === resultNFA.startState && sym === 'ε') continue;
          const targets = (sMap[sym] || []).filter((t) => statesStep4.includes(t));
          if (targets.length > 0) transStep4[st][sym] = targets;
        }
      }
      const pNFA: NFA = {
        alphabet: resultNFA.alphabet,
        states: statesStep4,
        startState: resultNFA.startState,
        acceptStates: [],
        transitions: transStep4,
      };
      return {
        partialResultNFA: pNFA,
        stepResultGraph: nfaToAutomatonGraph(pNFA, 'Result NFA (Step 4: NFA A Edges)'),
        activeHighlightedStates: groupA,
        isEmptyResultStep: false,
      };
    }

    // Step 5: Add NFA B States (or remaining state nodes)
    if (currentStepIndex === 4) {
      const statesStep5 = [...resultNFA.states];
      const transStep5: Record<string, Record<string, string[]>> = {};
      for (const st of groupA) {
        transStep5[st] = {};
        const sMap = resultNFA.transitions[st] || {};
        for (const sym of Object.keys(sMap)) {
          if (st === resultNFA.startState && sym === 'ε') continue;
          const targets = (sMap[sym] || []).filter((t) => groupA.includes(t));
          if (targets.length > 0) transStep5[st][sym] = targets;
        }
      }
      const pNFA: NFA = {
        alphabet: resultNFA.alphabet,
        states: statesStep5,
        startState: resultNFA.startState,
        acceptStates: [],
        transitions: transStep5,
      };
      return {
        partialResultNFA: pNFA,
        stepResultGraph: nfaToAutomatonGraph(pNFA, 'Result NFA (Step 5: NFA B States)'),
        activeHighlightedStates: groupB,
        isEmptyResultStep: false,
      };
    }

    // Step 6: Add NFA B Symbol Transitions (All internal symbol transitions)
    if (currentStepIndex === 5) {
      const transStep6: Record<string, Record<string, string[]>> = {};
      for (const st of resultNFA.states) {
        transStep6[st] = {};
        const sMap = resultNFA.transitions[st] || {};
        for (const sym of Object.keys(sMap)) {
          if (sym === 'ε' && (st === resultNFA.startState || resultNFA.acceptStates.includes(st))) {
            continue; // omit linking ε edges until step 7
          }
          transStep6[st][sym] = [...(sMap[sym] || [])];
        }
      }
      const pNFA: NFA = {
        alphabet: resultNFA.alphabet,
        states: [...resultNFA.states],
        startState: resultNFA.startState,
        acceptStates: [],
        transitions: transStep6,
      };
      return {
        partialResultNFA: pNFA,
        stepResultGraph: nfaToAutomatonGraph(pNFA, 'Result NFA (Step 6: Symbol Edges)'),
        activeHighlightedStates: groupB,
        isEmptyResultStep: false,
      };
    }

    // Step 7: Add Connecting ε-Transitions (Start branches & accept loops)
    if (currentStepIndex === 6) {
      const pNFA: NFA = {
        alphabet: resultNFA.alphabet,
        states: [...resultNFA.states],
        startState: resultNFA.startState,
        acceptStates: [...resultNFA.acceptStates],
        transitions: { ...resultNFA.transitions },
      };
      return {
        partialResultNFA: pNFA,
        stepResultGraph: nfaToAutomatonGraph(pNFA, 'Result NFA (Step 7: ε-Edges)'),
        activeHighlightedStates: resultNFA.acceptStates,
        isEmptyResultStep: false,
      };
    }

    // Step 8 (Index 7): Complete Final Result NFA
    const finalGraph = nfaToAutomatonGraph(resultNFA, 'Result NFA (Final)');
    return {
      partialResultNFA: resultNFA,
      stepResultGraph: finalGraph,
      activeHighlightedStates: resultNFA.acceptStates,
      isEmptyResultStep: false,
    };
  }, [currentStepIndex, resultNFA]);

  // Full final result graph for applying to main workspace
  const finalResultGraph = useMemo(() => nfaToAutomatonGraph(resultNFA, 'Result NFA'), [resultNFA]);

  // Granular 8-Step Operation Construction Metadata
  const steps = useMemo(() => {
    if (operation === 'UNION') {
      return [
        {
          stepIndex: 1,
          phaseName: '1. Isolate Inputs',
          explanation: 'Isolated NFA A and NFA B state namespaces to prevent state ID collisions.',
          detail: `NFA A has ${nfaA.states.length} states. NFA B has ${nfaB?.states.length || 0} states.`,
        },
        {
          stepIndex: 2,
          phaseName: `2. Create Start State (${resultNFA.startState})`,
          explanation: `Created new global initial start state node '${resultNFA.startState}'.`,
          detail: `Placed initial start state node '${resultNFA.startState}'.`,
        },
        {
          stepIndex: 3,
          phaseName: '3. Place NFA A State Nodes',
          explanation: 'Added internal state nodes of NFA A to result workspace.',
          detail: `Placed NFA A state nodes.`,
        },
        {
          stepIndex: 4,
          phaseName: '4. Add NFA A Symbol Transitions',
          explanation: 'Added internal symbol transition edges of NFA A.',
          detail: `Preserved δ_A internal transition function.`,
        },
        {
          stepIndex: 5,
          phaseName: '5. Place NFA B State Nodes',
          explanation: 'Added internal state nodes of NFA B to result workspace.',
          detail: `Placed NFA B state nodes.`,
        },
        {
          stepIndex: 6,
          phaseName: '6. Add NFA B Symbol Transitions',
          explanation: 'Added internal symbol transition edges of NFA B.',
          detail: `Preserved δ_B internal transition function.`,
        },
        {
          stepIndex: 7,
          phaseName: '7. Attach Spontaneous ε-Branches',
          explanation: `Added ε-transitions branching from '${resultNFA.startState}' to NFA A and NFA B start states.`,
          detail: `Created branches ${resultNFA.startState} ➔ ε ➔ ${nfaA.startState} and ${nfaB?.startState || ''}.`,
        },
        {
          stepIndex: 8,
          phaseName: '8. Finalize Accept States (A ∪ B)',
          explanation: 'Marked all accept states of NFA A and NFA B as final accept states.',
          detail: `Accept states: {${resultNFA.acceptStates.join(', ')}}.`,
        },
      ];
    }

    if (operation === 'CONCAT') {
      return [
        {
          stepIndex: 1,
          phaseName: '1. Isolate Inputs',
          explanation: 'Prepared state namespaces for NFA A and NFA B in serial chain order.',
          detail: `NFA A has ${nfaA.states.length} states. NFA B has ${nfaB?.states.length || 0} states.`,
        },
        {
          stepIndex: 2,
          phaseName: `2. Set Start State (${resultNFA.startState})`,
          explanation: `Set initial start state to NFA A's start state '${resultNFA.startState}'.`,
          detail: `Start state is ${resultNFA.startState}.`,
        },
        {
          stepIndex: 3,
          phaseName: '3. Place NFA A State Nodes',
          explanation: 'Added internal state nodes of NFA A.',
          detail: `Placed NFA A state nodes.`,
        },
        {
          stepIndex: 4,
          phaseName: '4. Add NFA A Symbol Transitions',
          explanation: 'Added internal symbol transitions of NFA A.',
          detail: `Preserved δ_A internal transition function.`,
        },
        {
          stepIndex: 5,
          phaseName: '5. Place NFA B State Nodes',
          explanation: 'Added internal state nodes of NFA B.',
          detail: `Placed NFA B state nodes.`,
        },
        {
          stepIndex: 6,
          phaseName: '6. Add NFA B Symbol Transitions',
          explanation: 'Added internal symbol transitions of NFA B.',
          detail: `Preserved δ_B internal transition function.`,
        },
        {
          stepIndex: 7,
          phaseName: '7. Connect A Accept to B Start via ε',
          explanation: 'Added spontaneous ε-transitions from NFA A accept states to NFA B start state.',
          detail: `Connected NFA A accept states to ${nfaB?.startState || ''} via ε.`,
        },
        {
          stepIndex: 8,
          phaseName: '8. Concatenation Finished (A · B)',
          explanation: 'Successfully constructed Concatenation NFA accepting L(A) · L(B).',
          detail: `Result has ${resultNFA.states.length} states and accept states {${resultNFA.acceptStates.join(', ')}}.`,
        },
      ];
    }

    if (operation === 'STAR') {
      return [
        {
          stepIndex: 1,
          phaseName: '1. Isolate Input Automaton',
          explanation: 'Isolated input NFA A state namespace.',
          detail: `NFA A has ${nfaA.states.length} states.`,
        },
        {
          stepIndex: 2,
          phaseName: `2. Create Start State (${resultNFA.startState})`,
          explanation: `Created new global start state node '${resultNFA.startState}'.`,
          detail: `Placed start state node '${resultNFA.startState}'.`,
        },
        {
          stepIndex: 3,
          phaseName: '3. Mark Start State as Accepting',
          explanation: `Marked '${resultNFA.startState}' as an accept state to allow empty string ε.`,
          detail: `Added '${resultNFA.startState}' to accept states.`,
        },
        {
          stepIndex: 4,
          phaseName: '4. Place NFA A State Nodes',
          explanation: 'Added internal state nodes of NFA A.',
          detail: `Placed NFA A state nodes.`,
        },
        {
          stepIndex: 5,
          phaseName: '5. Add NFA A Symbol Transitions',
          explanation: 'Added internal symbol transition edges of NFA A.',
          detail: `Preserved δ_A internal transition function.`,
        },
        {
          stepIndex: 6,
          phaseName: '6. Connect Start ε-Branch to A',
          explanation: `Added ε-transition from '${resultNFA.startState}' to original start state '${nfaA.startState}'.`,
          detail: `Created branch ${resultNFA.startState} ➔ ε ➔ ${nfaA.startState}.`,
        },
        {
          stepIndex: 7,
          phaseName: '7. Add Repeat Loop ε-Edges',
          explanation: 'Added ε-loop transitions from accept states back to original start state.',
          detail: `Loop ε-edges added for iteration repeat.`,
        },
        {
          stepIndex: 8,
          phaseName: '8. Kleene Star Complete (A*)',
          explanation: 'Successfully constructed Kleene Star NFA accepting L(A)*.',
          detail: `Result has ${resultNFA.states.length} states and accept states {${resultNFA.acceptStates.join(', ')}}.`,
        },
      ];
    }

    if (operation === 'PLUS') {
      return [
        {
          stepIndex: 1,
          phaseName: '1. Isolate Input Automaton',
          explanation: 'Isolated input NFA A state namespace.',
          detail: `NFA A has ${nfaA.states.length} states.`,
        },
        {
          stepIndex: 2,
          phaseName: `2. Set Start State (${resultNFA.startState})`,
          explanation: `Set initial start state to '${nfaA.startState}' (requires at least 1 match).`,
          detail: `Start state is ${resultNFA.startState}.`,
        },
        {
          stepIndex: 3,
          phaseName: '3. Place NFA A State Nodes',
          explanation: 'Added internal state nodes of NFA A.',
          detail: `Placed NFA A state nodes.`,
        },
        {
          stepIndex: 4,
          phaseName: '4. Add NFA A Symbol Transitions',
          explanation: 'Added internal symbol transition edges of NFA A.',
          detail: `Preserved δ_A internal transition function.`,
        },
        {
          stepIndex: 5,
          phaseName: '5. Mark Original Accept States',
          explanation: 'Highlighted accept states of NFA A.',
          detail: `Accept states: {${resultNFA.acceptStates.join(', ')}}.`,
        },
        {
          stepIndex: 6,
          phaseName: '6. Add Repeat Loop ε-Edges',
          explanation: 'Added ε-loop transitions from accept states back to start state.',
          detail: `Loop ε-edges enabled for 1 or more repetitions.`,
        },
        {
          stepIndex: 7,
          phaseName: '7. Enforce Non-Empty Requirement',
          explanation: 'Verified requiring at least 1 matching iteration.',
          detail: 'Non-empty language requirement enforced.',
        },
        {
          stepIndex: 8,
          phaseName: '8. Kleene Plus Complete (A+)',
          explanation: 'Successfully constructed Kleene Plus NFA accepting L(A)+.',
          detail: `Result has ${resultNFA.states.length} states.`,
        },
      ];
    }

    if (operation === 'OPTIONAL') {
      return [
        {
          stepIndex: 1,
          phaseName: '1. Isolate Input Automaton',
          explanation: 'Isolated input NFA A state namespace.',
          detail: `NFA A has ${nfaA.states.length} states.`,
        },
        {
          stepIndex: 2,
          phaseName: `2. Set Start State (${resultNFA.startState})`,
          explanation: `Set initial start state to '${resultNFA.startState}'.`,
          detail: `Start state is ${resultNFA.startState}.`,
        },
        {
          stepIndex: 3,
          phaseName: '3. Place NFA A State Nodes',
          explanation: 'Added internal state nodes of NFA A.',
          detail: `Placed NFA A state nodes.`,
        },
        {
          stepIndex: 4,
          phaseName: '4. Add NFA A Symbol Transitions',
          explanation: 'Added internal symbol transition edges of NFA A.',
          detail: `Preserved δ_A internal transition function.`,
        },
        {
          stepIndex: 5,
          phaseName: '5. Mark Original Accept States',
          explanation: 'Highlighted accept states of NFA A.',
          detail: `Accept states: {${resultNFA.acceptStates.join(', ')}}.`,
        },
        {
          stepIndex: 6,
          phaseName: '6. Mark Start State as Accepting',
          explanation: 'Marked start state as accepting (or added ε-edge) to allow empty string ε.',
          detail: `Accept states: {${resultNFA.acceptStates.join(', ')}}.`,
        },
        {
          stepIndex: 7,
          phaseName: '7. Verify Optional Bypass Path',
          explanation: 'Verified 0 or 1 match paths.',
          detail: 'Optional language requirement enforced.',
        },
        {
          stepIndex: 8,
          phaseName: '8. Optional Complete (A?)',
          explanation: 'Successfully constructed Optional NFA accepting L(A) ∪ {ε}.',
          detail: `Result has ${resultNFA.states.length} states.`,
        },
      ];
    }

    // REVERSE_A / REVERSE_B
    return [
      {
        stepIndex: 1,
        phaseName: '1. Isolate Input Automaton',
        explanation: 'Prepared input state namespace for inversion.',
        detail: `Input automaton has ${resultNFA.states.length} states.`,
      },
      {
        stepIndex: 2,
        phaseName: '2. Place Automaton State Nodes',
        explanation: 'Placed state nodes for inverted automaton.',
        detail: `State nodes placed.`,
      },
      {
        stepIndex: 3,
        phaseName: '3. Invert Symbol Transitions',
        explanation: 'Reversed direction of every transition arrow: u ➔ a ➔ v becomes v ➔ a ➔ u.',
        detail: 'Flipped transition mapping directions.',
      },
      {
        stepIndex: 4,
        phaseName: `4. Create Inverted Start State (${resultNFA.startState})`,
        explanation: `Created start state '${resultNFA.startState}'.`,
        detail: `Placed initial start state node '${resultNFA.startState}'.`,
      },
      {
        stepIndex: 5,
        phaseName: '5. Connect Start ε-Branches to Original Accepts',
        explanation: 'Attached spontaneous ε-branches from new start state to original accept states.',
        detail: 'Constructed single unified start state branches.',
      },
      {
        stepIndex: 6,
        phaseName: '6. Set Original Start State as Accept',
        explanation: 'Marked original start state as the single final accept state.',
        detail: `Accept states: {${resultNFA.acceptStates.join(', ')}}.`,
      },
      {
        stepIndex: 7,
        phaseName: '7. Prune Unreachable Nodes',
        explanation: 'Pruned any dead/unreachable inverted states.',
        detail: 'Cleaned state space.',
      },
      {
        stepIndex: 8,
        phaseName: '8. Reverse Complete (A^R)',
        explanation: `Successfully constructed Reverse NFA accepting language reversal.`,
        detail: `Result NFA has ${resultNFA.states.length} states.`,
      },
    ];
  }, [nfaA, nfaB, resultNFA, operation]);

  const activeStep = steps[currentStepIndex] || steps[0];

  // Auto-play timer
  useEffect(() => {
    let timer: ReturnType<typeof setInterval>;
    if (isPlaying) {
      const intervalMs = Math.round(1200 / playbackSpeed);
      timer = setInterval(() => {
        setCurrentStepIndex((prev) => {
          if (prev >= steps.length - 1) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, intervalMs);
    }
    return () => clearInterval(timer);
  }, [isPlaying, playbackSpeed, steps.length]);

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto font-sans">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-6xl max-h-[92vh] flex flex-col overflow-hidden shadow-2xl">
        {/* ── HEADER BANNER ── */}
        <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-purple-600/20 border border-purple-500/40 text-purple-400 rounded-2xl">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-white flex items-center gap-2">
                ⚡ Interactive NFA Operation Visualizer
              </h2>
              <p className="text-xs text-purple-300 font-mono font-bold">
                {operationTitle} — Thompson Structural Construction (8-Step Granular Pipeline)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Speed Selector */}
            <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs font-mono">
              <span className="text-[11px] text-slate-400 font-sans px-1">Speed:</span>
              {[0.5, 1, 2, 4].map((spd) => (
                <button
                  key={spd}
                  onClick={() => setPlaybackSpeed(spd)}
                  className={`px-2 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                    playbackSpeed === spd ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {spd}x
                </button>
              ))}
            </div>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-xl transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ── STEPPER TIMELINE (8-Step Granular Pipeline) ── */}
        <div className="bg-slate-950/60 border-b border-slate-800/80 p-3">
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
            {steps.map((st, idx) => {
              const isActive = currentStepIndex === idx;
              return (
                <React.Fragment key={st.stepIndex}>
                  <button
                    onClick={() => setCurrentStepIndex(idx)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 cursor-pointer ${
                      isActive
                        ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30 border border-purple-400/40 ring-1 ring-purple-400'
                        : 'text-slate-400 bg-slate-900 border border-slate-800 hover:text-white'
                    }`}
                  >
                    <span>{st.phaseName}</span>
                  </button>
                  {idx < steps.length - 1 && <ArrowRight className="w-3.5 h-3.5 text-slate-700 shrink-0" />}
                </React.Fragment>
              );
            })}
          </div>
        </div>

        {/* ── MAIN CONTENT (3 GRAPH CANVASES & LIVE TRANSITION TABLES) ── */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Top Row: 3 Graph Canvases Side-by-Side */}
          <div className={`grid grid-cols-1 ${isBinaryOp && graphB ? 'lg:grid-cols-3' : 'lg:grid-cols-2'} gap-4`}>
            {/* Card 1: NFA A */}
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-3 flex flex-col min-h-[280px] shadow-xl">
              <MiniAutomataGraph graph={graphA} title="NFA A Canvas" accentColor="#3b82f6" svgH={240} />
            </div>

            {/* Card 2: NFA B (if binary op) */}
            {isBinaryOp && graphB && (
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-3 flex flex-col min-h-[280px] shadow-xl">
                <MiniAutomataGraph graph={graphB} title="NFA B Canvas" accentColor="#a855f7" svgH={240} />
              </div>
            )}

            {/* Card 3: Result NFA (Progressive Construction Canvas) */}
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-3 flex flex-col min-h-[280px] shadow-xl relative">
              <MiniAutomataGraph
                graph={stepResultGraph}
                title={`Result NFA (${currentStepIndex === steps.length - 1 ? 'Final' : currentStepIndex === 0 ? 'Empty' : `Step ${currentStepIndex + 1}/8`})`}
                accentColor="#10b981"
                svgH={240}
              />
              {isEmptyResultStep && (
                <div className="absolute inset-0 flex items-center justify-center bg-slate-950/80 rounded-2xl p-4 text-center">
                  <div className="space-y-1">
                    <Sparkles className="w-6 h-6 text-purple-400 mx-auto animate-pulse" />
                    <p className="text-xs font-bold text-slate-300">Step 1: Input Automata Isolated</p>
                    <p className="text-[11px] text-slate-500 font-mono">Result canvas is empty. Advance to Step 2 to start building.</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Bottom Section: Step Explanation Banner + LIVE TRANSITION TABLES */}
          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-3.5 space-y-3 shadow-2xl">
            {/* Active Step Explanation Banner */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-900/90 border border-slate-800 p-3 rounded-xl">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-purple-600/20 text-purple-400 rounded-xl border border-purple-500/30 shrink-0">
                  <Layers className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white flex items-center gap-2">
                    {activeStep.phaseName}
                    <span className="text-[10px] font-mono bg-purple-950 text-purple-300 px-2 py-0.5 rounded border border-purple-500/30">
                      Step {currentStepIndex + 1} of {steps.length}
                    </span>
                  </h4>
                  <p className="text-[11px] text-slate-300 mt-0.5">{activeStep.explanation} <span className="text-emerald-400 font-mono font-bold">({activeStep.detail})</span></p>
                </div>
              </div>

              <div className="px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-amber-300 font-mono font-bold text-xs shrink-0 self-start md:self-auto">
                {formulaStr}
              </div>
            </div>

            {/* LIVE TRANSITION TABLES GRID */}
            <div className="flex flex-col md:flex-row gap-3">
              {/* NFA A Transition Table */}
              <LiveNFATransitionTable
                nfa={nfaA}
                title="Input NFA A Transition Table (δ_A)"
                accentColor="#3b82f6"
              />

              {/* NFA B Transition Table (if binary op) */}
              {isBinaryOp && nfaB && (
                <LiveNFATransitionTable
                  nfa={nfaB}
                  title="Input NFA B Transition Table (δ_B)"
                  accentColor="#a855f7"
                />
              )}

              {/* Live Result NFA Transition Table */}
              <LiveNFATransitionTable
                nfa={partialResultNFA}
                title={`Live Result NFA Transition Table (δ_Result)`}
                accentColor="#10b981"
                highlightStates={activeHighlightedStates}
                isEmptyStep={isEmptyResultStep}
              />
            </div>
          </div>
        </div>

        {/* ── FOOTER PLAYBACK CONTROLS & APPLY BUTTON ── */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setCurrentStepIndex(0)}
              className="p-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 rounded-xl cursor-pointer"
              title="Restart animation"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <button
              onClick={() => setCurrentStepIndex((prev) => Math.max(0, prev - 1))}
              disabled={currentStepIndex === 0}
              className="p-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-40 border border-slate-800 text-slate-300 rounded-xl cursor-pointer"
              title="Previous step"
            >
              <SkipBack className="w-4 h-4" />
            </button>
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className={`px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-2 transition border cursor-pointer ${
                isPlaying ? 'bg-amber-600 border-amber-400 text-white' : 'bg-purple-600 border-purple-400 text-white'
              }`}
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-current" />}
              <span>{isPlaying ? 'Pause' : 'Play Step'}</span>
            </button>
            <button
              onClick={() => setCurrentStepIndex((prev) => Math.min(steps.length - 1, prev + 1))}
              disabled={currentStepIndex >= steps.length - 1}
              className="p-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-40 border border-slate-800 text-slate-300 rounded-xl cursor-pointer"
              title="Next step"
            >
              <SkipForward className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => onApplyResult(finalResultGraph, resultNFA)}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 border border-emerald-400 text-white rounded-xl font-bold text-xs transition flex items-center gap-2 cursor-pointer shadow-lg shadow-emerald-600/30"
            >
              <Check className="w-4 h-4" />
              <span>Apply Resulting NFA to Workspace</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
