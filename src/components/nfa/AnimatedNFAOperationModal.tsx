import React, { useState, useMemo, useEffect } from 'react';
import {
  X,
  Play,
  Pause,
  RotateCcw,
  SkipBack,
  SkipForward,
  CheckCircle2,
  Zap,
  ArrowRight,
  Layers,
  Check,
  Cpu,
  ShieldCheck,
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

  // Graph objects for rendering in MiniAutomataGraph
  const graphA = useMemo(() => nfaToAutomatonGraph(nfaA, 'NFA A'), [nfaA]);
  const graphB = useMemo(() => (nfaB ? nfaToAutomatonGraph(nfaB, 'NFA B') : null), [nfaB]);
  const resultGraph = useMemo(() => nfaToAutomatonGraph(resultNFA, 'Result NFA'), [resultNFA]);

  // Animated construction steps
  const steps = useMemo(() => {
    return [
      {
        stepIndex: 1,
        phaseName: '1. Isolate Input Automata',
        explanation: `Prepared input state namespace. Sanitized state labels to prevent state collisions.`,
        detail: `NFA A has ${nfaA.states.length} states. ${isBinaryOp && nfaB ? `NFA B has ${nfaB.states.length} states.` : ''}`,
      },
      {
        stepIndex: 2,
        phaseName: '2. Create Initial Start State',
        explanation: `Generated new global start state 'q_start' and attached spontaneous ε-transitions.`,
        detail: `Added ε-edges pointing to ${nfaA.startState} ${isBinaryOp && nfaB ? `and ${nfaB.startState}` : ''}.`,
      },
      {
        stepIndex: 3,
        phaseName: '3. Merge Internal Transitions',
        explanation: `Preserved all internal transition functions δ_A and δ_B without altering original language behavior.`,
        detail: `Merged ${Object.keys(resultNFA.transitions).length} transition maps into unified structure.`,
      },
      {
        stepIndex: 4,
        phaseName: '4. Connect Accept States',
        explanation: `Created new unified accept state 'q_accept' and routed ε-transitions from original accept states.`,
        detail: `Original accept states now propagate via ε to new single accept state.`,
      },
      {
        stepIndex: 5,
        phaseName: '5. Construction Finished',
        explanation: `Successfully constructed equivalent NFA for ${operationTitle}.`,
        detail: `Resulting NFA has ${resultNFA.states.length} states, ${resultNFA.acceptStates.length} accept state, and ${resultNFA.alphabet.length} symbols.`,
      },
    ];
  }, [nfaA, nfaB, resultNFA, isBinaryOp, operationTitle]);

  const activeStep = steps[currentStepIndex] || steps[0];
  const progressPercent = Math.round(((currentStepIndex + 1) / steps.length) * 100);

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

        {/* ── MAIN CONTENT (3 GRAPH CANVASES SIDE-BY-SIDE) ── */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div className={`grid grid-cols-1 ${isBinaryOp && graphB ? 'lg:grid-cols-3' : 'lg:grid-cols-2'} gap-4`}>
            {/* Card 1: NFA A */}
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-3 flex flex-col min-h-[300px] shadow-xl">
              <MiniAutomataGraph graph={graphA} title="NFA A Canvas" accentColor="#3b82f6" svgH={260} />
            </div>

            {/* Card 2: NFA B (if binary op) */}
            {isBinaryOp && graphB && (
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-3 flex flex-col min-h-[300px] shadow-xl">
                <MiniAutomataGraph graph={graphB} title="NFA B Canvas" accentColor="#a855f7" svgH={260} />
              </div>
            )}

            {/* Card 3: Result NFA (Growing / Final) */}
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-3 flex flex-col min-h-[300px] shadow-xl">
              <MiniAutomataGraph
                graph={resultGraph}
                title={`Result NFA (${currentStepIndex === steps.length - 1 ? 'Final' : 'Constructing...'})`}
                accentColor="#10b981"
                svgH={260}
              />
            </div>
          </div>

          {/* ── ANALYTICAL PANELS & EXPLANATION ── */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-mono">
            {/* Panel 1: Derivation & Explanation */}
            <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl space-y-2 shadow-xl">
              <span className="font-bold text-purple-400 font-sans block border-b border-slate-800 pb-2 flex items-center gap-2">
                <Layers className="w-4 h-4 text-purple-400" /> Step Explanation
              </span>
              <p className="text-slate-300 font-sans text-xs leading-relaxed">{activeStep.explanation}</p>
              <div className="p-2 bg-slate-900 border border-slate-800 rounded-xl text-[11px] text-emerald-400 font-bold">
                {activeStep.detail}
              </div>
            </div>

            {/* Panel 2: Operation Formula */}
            <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl space-y-2 shadow-xl">
              <span className="font-bold text-sky-400 font-sans block border-b border-slate-800 pb-2 flex items-center gap-2">
                <Cpu className="w-4 h-4 text-sky-400" /> Mathematical Definition
              </span>
              <p className="text-amber-300 font-mono font-bold text-xs p-2 bg-slate-900 border border-slate-800 rounded-xl">
                {formulaStr}
              </p>
              <p className="text-[11px] text-slate-400 font-sans">
                Thompson construction preserves exact formal language equivalence.
              </p>
            </div>

            {/* Panel 3: Result Statistics */}
            <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl space-y-2 shadow-xl">
              <span className="font-bold text-emerald-400 font-sans block border-b border-slate-800 pb-2 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" /> Result NFA Metrics
              </span>
              <div className="space-y-1 text-slate-300 font-sans">
                <div className="flex justify-between">
                  <span>Total States:</span>
                  <strong className="text-white font-mono">{resultNFA.states.length}</strong>
                </div>
                <div className="flex justify-between">
                  <span>Accept States:</span>
                  <strong className="text-emerald-400 font-mono">&#123;{resultNFA.acceptStates.join(', ')}&#125;</strong>
                </div>
                <div className="flex justify-between">
                  <span>Start State:</span>
                  <strong className="text-purple-300 font-mono">{resultNFA.startState}</strong>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── FOOTER PLAYBACK CONTROLS & APPLY BUTTON ── */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setCurrentStepIndex(0)}
              className="p-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 rounded-xl cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <button
              onClick={() => setCurrentStepIndex((prev) => Math.max(0, prev - 1))}
              disabled={currentStepIndex === 0}
              className="p-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-40 border border-slate-800 text-slate-300 rounded-xl cursor-pointer"
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
            >
              <SkipForward className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => onApplyResult(resultGraph, resultNFA)}
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
