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
  Cpu,
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

  // Progressive Step-by-Step Result Graph & NFA construction
  const { partialResultNFA, stepResultGraph, activeHighlightedStates, isEmptyResultStep } = useMemo(() => {
    // Step 1: Isolate Input Automata -> Result Canvas is EMPTY
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

    // Step 2: Create Initial Start State -> Only startState q0
    if (currentStepIndex === 1) {
      const startOnlyNFA: NFA = {
        alphabet: resultNFA.alphabet,
        states: [resultNFA.startState],
        startState: resultNFA.startState,
        acceptStates: resultNFA.acceptStates.filter((s) => s === resultNFA.startState),
        transitions: {},
      };
      const g = nfaToAutomatonGraph(startOnlyNFA, 'Result NFA (Step 2: Start State)');
      return {
        partialResultNFA: startOnlyNFA,
        stepResultGraph: g,
        activeHighlightedStates: [resultNFA.startState],
        isEmptyResultStep: false,
      };
    }

    // Step 3: Merge Internal Transitions -> Internal states & internal transitions
    if (currentStepIndex === 2) {
      const internalTrans: Record<string, Record<string, string[]>> = {};
      for (const st of resultNFA.states) {
        internalTrans[st] = {};
        const sMap = resultNFA.transitions[st] || {};
        for (const sym of Object.keys(sMap)) {
          if (st === resultNFA.startState && sym === 'ε') continue;
          internalTrans[st][sym] = [...(sMap[sym] || [])];
        }
      }

      const step3NFA: NFA = {
        alphabet: resultNFA.alphabet,
        states: [...resultNFA.states],
        startState: resultNFA.startState,
        acceptStates: resultNFA.acceptStates.filter((s) => s !== resultNFA.startState),
        transitions: internalTrans,
      };
      const g = nfaToAutomatonGraph(step3NFA, 'Result NFA (Step 3: Internal Edges)');
      return {
        partialResultNFA: step3NFA,
        stepResultGraph: g,
        activeHighlightedStates: resultNFA.states.filter((s) => s !== resultNFA.startState),
        isEmptyResultStep: false,
      };
    }

    // Step 4 & 5: Complete Result NFA
    const finalGraph = nfaToAutomatonGraph(
      resultNFA,
      `Result NFA (${currentStepIndex === 4 ? 'Final' : 'Step 4: Connecting Edges'})`
    );
    return {
      partialResultNFA: resultNFA,
      stepResultGraph: finalGraph,
      activeHighlightedStates: resultNFA.acceptStates,
      isEmptyResultStep: false,
    };
  }, [currentStepIndex, resultNFA]);

  // Full final result graph for applying to main workspace
  const finalResultGraph = useMemo(() => nfaToAutomatonGraph(resultNFA, 'Result NFA'), [resultNFA]);

  // Animated construction steps metadata
  const steps = useMemo(() => {
    return [
      {
        stepIndex: 1,
        phaseName: '1. Isolate Input Automata',
        explanation: `Isolated input state namespaces. Result canvas is initial empty state.`,
        detail: `NFA A has ${nfaA.states.length} states. ${isBinaryOp && nfaB ? `NFA B has ${nfaB.states.length} states.` : ''}`,
      },
      {
        stepIndex: 2,
        phaseName: '2. Create Initial Start State',
        explanation: `Created new global initial start state '${resultNFA.startState}'.`,
        detail: `Added start state node '${resultNFA.startState}'.`,
      },
      {
        stepIndex: 3,
        phaseName: '3. Merge Internal Transitions',
        explanation: `Preserved all internal transition functions δ_A and δ_B without altering language behavior.`,
        detail: `Merged internal state nodes and symbol transition functions.`,
      },
      {
        stepIndex: 4,
        phaseName: '4. Connect Accept States',
        explanation: `Attached spontaneous ε-transitions connecting start and accept states.`,
        detail: `Connected loop/branching ε-edges to accept states {${resultNFA.acceptStates.join(', ')}}.`,
      },
      {
        stepIndex: 5,
        phaseName: '5. Construction Finished',
        explanation: `Successfully constructed equivalent NFA for ${operationTitle}.`,
        detail: `Result NFA has ${resultNFA.states.length} states, ${resultNFA.acceptStates.length} accept states, and ${resultNFA.alphabet.length} symbols.`,
      },
    ];
  }, [nfaA, nfaB, resultNFA, isBinaryOp, operationTitle]);

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
                {operationTitle} — Thompson Structural Construction
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

        {/* ── STEPPER TIMELINE ── */}
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
                title={`Result NFA (${currentStepIndex === steps.length - 1 ? 'Final' : currentStepIndex === 0 ? 'Empty' : 'Constructing...'})`}
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
