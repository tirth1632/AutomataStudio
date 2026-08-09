import React, { useState, useEffect, useMemo } from 'react';
import {
  Columns,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  RotateCcw,
  FastForward,
  Check,
  X,
  CheckCircle2,
  ExternalLink,
  Table,
  Layers,
  Info,
} from 'lucide-react';
import type { AutomatonGraph } from '../../types/automata';
import { graphToDFA } from '../../utils/dfaAdapter';
import { DFAOperations } from '../../algorithms/DFAOperations/DFAOperations';
import { simulateNFA } from '../../algorithms/nfaSimulator';
import { findCounterexampleString, computeAdvancedAnalysis } from '../../utils/dfaEducationalUtils';
import { MiniAutomataGraph } from './MiniAutomataGraph';

export interface DFAComparisonViewProps {
  graphA?: AutomatonGraph;
  graphB?: AutomatonGraph;
  originalGraph?: AutomatonGraph; // Backwards-compatibility fallback
  onOpenCounterexampleWorkbench?: () => void;
}

export const DFAComparisonView: React.FC<DFAComparisonViewProps> = ({
  graphA: propGraphA,
  graphB: propGraphB,
  originalGraph: rawGraph,
  onOpenCounterexampleWorkbench,
}) => {
  // Determine effective Graph A and Graph B
  const graphA: AutomatonGraph = useMemo(() => {
    if (propGraphA && propGraphA.states.length > 0) return propGraphA;
    if (rawGraph && rawGraph.states.length > 0) return rawGraph;
    return {
      id: 'dfa_a_default',
      name: 'DFA A (Ends with 101)',
      type: 'DFA',
      alphabet: ['0', '1'],
      states: [
        { id: 'q0', label: 'q0', x: 50, y: 100, isStart: true, isAccept: false },
        { id: 'q1', label: 'q1', x: 200, y: 100, isStart: false, isAccept: false },
        { id: 'q2', label: 'q2', x: 350, y: 100, isStart: false, isAccept: false },
        { id: 'q3', label: 'q3 (101)', x: 500, y: 100, isStart: false, isAccept: true },
      ],
      transitions: [
        { id: 't00', source: 'q0', target: 'q0', symbols: ['0'] },
        { id: 't01', source: 'q0', target: 'q1', symbols: ['1'] },
        { id: 't10', source: 'q1', target: 'q2', symbols: ['0'] },
        { id: 't11', source: 'q1', target: 'q1', symbols: ['1'] },
        { id: 't20', source: 'q2', target: 'q0', symbols: ['0'] },
        { id: 't21', source: 'q2', target: 'q3', symbols: ['1'] },
        { id: 't30', source: 'q3', target: 'q2', symbols: ['0'] },
        { id: 't31', source: 'q3', target: 'q1', symbols: ['1'] },
      ],
    };
  }, [propGraphA, rawGraph]);

  const graphB: AutomatonGraph = useMemo(() => {
    if (propGraphB) return propGraphB;
    return {
      id: 'dfa_b_preset',
      name: 'contains 110',
      type: 'DFA',
      alphabet: ['0', '1'],
      states: [
        { id: 'p0', label: 'p0', isStart: true, isAccept: false, x: 80, y: 120 },
        { id: 'p1', label: 'p1', isStart: false, isAccept: false, x: 200, y: 120 },
        { id: 'p2', label: 'p2', isStart: false, isAccept: false, x: 320, y: 120 },
        { id: 'p3', label: 'p3', isStart: false, isAccept: true, x: 440, y: 120 },
      ],
      transitions: [
        { id: 'tb00', source: 'p0', target: 'p0', symbols: ['0'] },
        { id: 'tb01', source: 'p0', target: 'p1', symbols: ['1'] },
        { id: 'tb10', source: 'p1', target: 'p0', symbols: ['0'] },
        { id: 'tb11', source: 'p1', target: 'p2', symbols: ['1'] },
        { id: 'tb20', source: 'p2', target: 'p3', symbols: ['0'] },
        { id: 'tb21', source: 'p2', target: 'p2', symbols: ['1'] },
        { id: 'tb30', source: 'p3', target: 'p3', symbols: ['0', '1'] },
      ],
    };
  }, [propGraphB]);

  // Check if DFA B actually exists and has states
  const hasDfaB = useMemo(() => {
    if (!graphB || !graphB.states || graphB.states.length === 0) return false;
    if (graphB.name && (graphB.name.includes('(Empty)') || graphB.name.toLowerCase().includes('empty'))) return false;
    return true;
  }, [graphB]);

  // Synchronized simulation test string & Product Stepper playback state
  const [testString, setTestString] = useState<string>('00111');
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(800);

  // Convert graphs to pure DFAs for formal operations
  const dfaA = useMemo(() => graphToDFA(graphA), [graphA]);
  const dfaB = useMemo(() => graphToDFA(graphB), [graphB]);

  // Advanced Educational Analysis Metrics for both DFAs
  const analysisA = useMemo(() => computeAdvancedAnalysis(graphA), [graphA]);
  const analysisB = useMemo(() => computeAdvancedAnalysis(graphB), [graphB]);

  // Check completeness and minimality
  const isCompleteA = useMemo(() => {
    const symbols = dfaA.alphabet;
    return dfaA.states.every((s) => symbols.every((sym) => !!dfaA.transitions[s]?.[sym]));
  }, [dfaA]);

  const isCompleteB = useMemo(() => {
    const symbols = dfaB.alphabet;
    return dfaB.states.every((s) => symbols.every((sym) => !!dfaB.transitions[s]?.[sym]));
  }, [dfaB]);

  const isMinimalA = useMemo(() => {
    try {
      const minA = DFAOperations.minimize(dfaA);
      return minA.states.length === dfaA.states.length;
    } catch {
      return false;
    }
  }, [dfaA]);

  const isMinimalB = useMemo(() => {
    try {
      const minB = DFAOperations.minimize(dfaB);
      return minB.states.length === dfaB.states.length;
    } catch {
      return false;
    }
  }, [dfaB]);

  // Shortest distinguishing counterexample string
  const counterexampleStr = useMemo(() => findCounterexampleString(dfaA, dfaB), [dfaA, dfaB]);
  const areEquivalent = counterexampleStr === null;

  // Compute exact set theoretical language relationship
  const languageRel = useMemo(() => {
    if (!hasDfaB) {
      return { relation: 'SINGLE', label: 'DFA A Workbench', color: '#818cf8' };
    }
    if (areEquivalent) {
      return { relation: 'EQUIVALENT', label: 'Equivalent Languages L(A) = L(B)', color: '#34d399' };
    }
    try {
      const diffA_B = DFAOperations.minimize(DFAOperations.difference(dfaA, dfaB));
      const diffB_A = DFAOperations.minimize(DFAOperations.difference(dfaB, dfaA));
      const intersect = DFAOperations.minimize(DFAOperations.intersection(dfaA, dfaB));

      const isSub = diffA_B.acceptStates.length === 0;
      const isSuper = diffB_A.acceptStates.length === 0;
      const isDisj = intersect.acceptStates.length === 0;

      if (isSub) return { relation: 'SUBSET', label: 'Strict Subset L(A) ⊂ L(B)', color: '#38bdf8' };
      if (isSuper) return { relation: 'SUPERSET', label: 'Strict Superset L(A) ⊃ L(B)', color: '#a855f7' };
      if (isDisj) return { relation: 'DISJOINT', label: 'Disjoint Languages L(A) ∩ L(B) = ∅', color: '#f43f5e' };
      return { relation: 'OVERLAP', label: 'Overlapping Languages (L(A) ∩ L(B) ≠ ∅)', color: '#fb923c' };
    } catch {
      return { relation: 'DIFFERENT', label: 'Different Languages L(A) ≠ L(B)', color: '#f43f5e' };
    }
  }, [hasDfaB, areEquivalent, dfaA, dfaB]);

  // Simulate testString concurrently on both DFAs
  const stepsA = useMemo(() => simulateNFA(graphA, testString), [graphA, testString]);
  const stepsB = useMemo(() => simulateNFA(graphB, testString), [graphB, testString]);

  const totalSteps = useMemo(() => Math.max(0, stepsA.length - 1), [stepsA]);

  const activeStepIndex = useMemo(() => {
    return Math.min(Math.max(0, currentStep), totalSteps);
  }, [currentStep, totalSteps]);

  // Auto-jump to end when testString changes
  useEffect(() => {
    setCurrentStep(totalSteps);
    setIsPlaying(false);
  }, [testString, totalSteps]);

  // Playback timer effect
  useEffect(() => {
    if (!isPlaying) return;
    const timer = setInterval(() => {
      setCurrentStep((prev) => {
        if (prev >= totalSteps) {
          setIsPlaying(false);
          return prev;
        }
        return prev + 1;
      });
    }, playbackSpeed);
    return () => clearInterval(timer);
  }, [isPlaying, totalSteps, playbackSpeed]);

  const activeStepA = stepsA[activeStepIndex] || stepsA[0];
  const activeStepB = stepsB[activeStepIndex] || stepsB[0];

  const currentStA = activeStepA?.currentStateIds?.[0] || graphA.states.find((s) => s.isStart)?.id || 'q0';
  const currentStB = activeStepB?.currentStateIds?.[0] || graphB.states.find((s) => s.isStart)?.id || 'p0';

  const acceptedA = activeStepA?.isAccepting || false;
  const acceptedB = activeStepB?.isAccepting || false;

  const pathA = useMemo(
    () => stepsA.slice(0, activeStepIndex + 1).map((s) => s.currentStateIds[0]).join(' → '),
    [stepsA, activeStepIndex]
  );

  const pathB = useMemo(
    () => stepsB.slice(0, activeStepIndex + 1).map((s) => s.currentStateIds[0]).join(' → '),
    [stepsB, activeStepIndex]
  );

  const activeEdgeA = useMemo(() => {
    if (activeStepIndex <= 0) return undefined;
    const prevSt = stepsA[activeStepIndex - 1]?.currentStateIds?.[0];
    const currSt = stepsA[activeStepIndex]?.currentStateIds?.[0];
    const sym = testString[activeStepIndex - 1];
    if (prevSt && currSt) return { from: prevSt, to: currSt, sym };
    return undefined;
  }, [stepsA, activeStepIndex, testString]);

  const activeEdgeB = useMemo(() => {
    if (activeStepIndex <= 0) return undefined;
    const prevSt = stepsB[activeStepIndex - 1]?.currentStateIds?.[0];
    const currSt = stepsB[activeStepIndex]?.currentStateIds?.[0];
    const sym = testString[activeStepIndex - 1];
    if (prevSt && currSt) return { from: prevSt, to: currSt, sym };
    return undefined;
  }, [stepsB, activeStepIndex, testString]);

  return (
    <div className="p-4 sm:p-6 space-y-6 bg-slate-900/95 text-slate-100 rounded-2xl border border-slate-800 text-sm shadow-2xl font-sans">
      {/* ═══ 1. HEADER ═══ */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-4 gap-3 flex-wrap">
        <div>
          <div className="flex items-center gap-2.5 font-bold text-lg text-indigo-300">
            <Columns className="w-6 h-6 text-indigo-400 shrink-0" />
            {hasDfaB ? 'Side-by-Side DFA Comparison' : 'DFA A Workbench'}
          </div>
          <p className="text-xs text-slate-400 mt-1">
            {hasDfaB
              ? 'Compare two independent deterministic finite automata and analyze their languages, structure, and behavior.'
              : 'Interactive execution workbench, formal definition, and transition matrix for DFA A.'}
          </p>
        </div>

        <span
          className="px-3.5 py-1.5 rounded-full text-xs font-bold font-mono flex items-center gap-2 border shadow-lg"
          style={{
            backgroundColor: `${languageRel.color}15`,
            borderColor: `${languageRel.color}40`,
            color: languageRel.color,
          }}
        >
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          {languageRel.label}
        </span>
      </div>

      {/* ═══ 2. TOP BAR (SUMMARY BANNER) ═══ */}
      <div className="p-4 bg-slate-950/90 border border-slate-800 rounded-xl grid grid-cols-1 md:grid-cols-7 gap-4 items-center">
        {/* DFA A Summary Card */}
        <div className={`${hasDfaB ? 'md:col-span-3' : 'md:col-span-7'} p-3 bg-indigo-950/40 border border-indigo-500/30 rounded-xl space-y-1.5`}>
          <div className="flex items-center justify-between">
            <span className="font-extrabold text-sm text-indigo-300">DFA A</span>
            <span className="px-2 py-0.5 bg-indigo-900/60 border border-indigo-400/30 text-indigo-200 text-[11px] rounded-md font-mono">
              {graphA.states.length} States
            </span>
          </div>
          <div className="text-xs text-slate-300 font-medium truncate">{graphA.name || 'Independent Automaton A'}</div>
          <div className="flex items-center gap-3 text-[11px] text-slate-400 font-mono pt-1">
            <span>Transitions: {graphA.transitions.length}</span>
            <span>•</span>
            <span>Accept States: {graphA.states.filter((s) => s.isAccept).length}</span>
          </div>
        </div>

        {hasDfaB && (
          <>
            {/* VS Badge */}
            <div className="md:col-span-1 flex items-center justify-center">
              <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-black text-amber-400 shadow-inner">
                VS
              </div>
            </div>

            {/* DFA B Summary Card */}
            <div className="md:col-span-3 p-3 bg-emerald-950/40 border border-emerald-500/30 rounded-xl space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-sm text-emerald-300">DFA B</span>
                <span className="px-2 py-0.5 bg-emerald-900/60 border border-emerald-400/30 text-emerald-200 text-[11px] rounded-md font-mono">
                  {graphB.states.length} States
                </span>
              </div>
              <div className="text-xs text-slate-300 font-medium truncate">{graphB.name || 'Independent Automaton B'}</div>
              <div className="flex items-center gap-3 text-[11px] text-slate-400 font-mono pt-1">
                <span>Transitions: {graphB.transitions.length}</span>
                <span>•</span>
                <span>Accept States: {graphB.states.filter((s) => s.isAccept).length}</span>
              </div>
            </div>
          </>
        )}
      </div>

      {/* ═══ 3. SYNCHRONIZED INPUT TESTER ═══ */}
      <div className="p-4 bg-slate-950/90 border border-slate-800 rounded-xl space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400 shrink-0 shadow-inner">
              <Play className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-black text-sky-300 uppercase tracking-wider">
                {hasDfaB ? 'Synchronized Dual Input Tester' : 'Interactive Input Tester'}
              </h3>
              <p className="text-[11px] text-slate-400">
                {hasDfaB ? 'Lockstep execution stepper animating DFA A & DFA B' : 'Step-by-step execution stepper animating DFA A'}
              </p>
            </div>
          </div>

          {/* Stepper Toolbar Controls */}
          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Playback Controls */}
            <div className="flex items-center gap-1 bg-slate-900/90 border border-slate-800 p-1.5 rounded-xl shadow-inner backdrop-blur-sm">
              <button
                onClick={() => {
                  setIsPlaying(false);
                  setCurrentStep(0);
                }}
                title="Reset Stepper (Start)"
                className="p-1.5 hover:bg-slate-800/80 rounded-lg text-slate-400 hover:text-white transition cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={() => {
                  setIsPlaying(false);
                  setCurrentStep((p) => Math.max(0, p - 1));
                }}
                disabled={activeStepIndex <= 0}
                title="Step Backward"
                className="p-1.5 hover:bg-slate-800/80 rounded-lg text-slate-400 hover:text-white disabled:opacity-30 transition cursor-pointer"
              >
                <SkipBack className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={() => {
                  if (isPlaying) {
                    setIsPlaying(false);
                  } else {
                    if (currentStep >= totalSteps) setCurrentStep(0);
                    setIsPlaying(true);
                  }
                }}
                title={isPlaying ? 'Pause Animation' : 'Play Animation'}
                className="px-3.5 py-1.5 bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-extrabold rounded-lg flex items-center gap-1.5 text-xs transition cursor-pointer shadow-md shadow-sky-500/20 active:scale-95"
              >
                {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                <span>{isPlaying ? 'Pause' : 'Play Path'}</span>
              </button>

              <button
                onClick={() => {
                  setIsPlaying(false);
                  setCurrentStep((p) => Math.min(totalSteps, p + 1));
                }}
                disabled={activeStepIndex >= totalSteps}
                title="Step Forward"
                className="p-1.5 hover:bg-slate-800/80 rounded-lg text-slate-400 hover:text-white disabled:opacity-30 transition cursor-pointer"
              >
                <SkipForward className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={() => {
                  setIsPlaying(false);
                  setCurrentStep(totalSteps);
                }}
                title="Jump to End"
                className="p-1.5 hover:bg-slate-800/80 rounded-lg text-slate-400 hover:text-white transition cursor-pointer"
              >
                <FastForward className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Speed Selector */}
            <div className="flex items-center gap-1 bg-slate-900/90 border border-slate-800 p-1.5 rounded-xl text-xs font-mono shadow-inner backdrop-blur-sm">
              <span className="text-slate-500 text-[10px] px-1 font-sans font-bold">Speed:</span>
              {[
                { label: '0.5x', ms: 1400 },
                { label: '1x', ms: 800 },
                { label: '2x', ms: 400 },
              ].map((sp) => (
                <button
                  key={sp.label}
                  onClick={() => setPlaybackSpeed(sp.ms)}
                  className={`px-2.5 py-0.5 rounded-md text-[11px] font-bold transition cursor-pointer ${playbackSpeed === sp.ms
                      ? 'bg-sky-500/20 border border-sky-400/40 text-sky-300 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                    }`}
                >
                  {sp.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Input Field & Character Stepper Visualization */}
        <div className="space-y-2.5">
          <div className="relative">
            <input
              type="text"
              value={testString}
              onChange={(e) => setTestString(e.target.value)}
              placeholder={hasDfaB ? "Type input string to evaluate both DFAs simultaneously..." : "Type input string to evaluate DFA A..."}
              className="w-full pl-4 pr-24 py-2.5 bg-slate-900/80 border border-slate-800 rounded-xl font-mono text-sm text-white placeholder-slate-500 focus:outline-none focus:border-sky-500/60 focus:ring-1 focus:ring-sky-500/30 transition shadow-inner"
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
              <span className="text-[10px] font-mono text-slate-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800 font-bold">
                {testString.length} {testString.length === 1 ? 'char' : 'chars'}
              </span>
            </div>
          </div>
        </div>

        {/* Simultaneous Simulation Results Bar */}
        <div className={`grid grid-cols-1 ${hasDfaB ? 'sm:grid-cols-2' : ''} gap-3 pt-1`}>
          <div className="p-3 bg-slate-900/90 border border-indigo-500/30 rounded-xl flex items-center justify-between">
            <div className="space-y-0.5 overflow-hidden">
              <div className="text-[11px] text-slate-400">DFA A Current State: <span className="font-mono text-indigo-300 font-bold">{currentStA}</span></div>
              <div className="text-[11px] text-slate-400 truncate">Path: <span className="font-mono text-sky-300">{pathA}</span></div>
            </div>
            <span className={`px-2.5 py-1 rounded-lg text-xs font-bold font-mono flex items-center gap-1 shrink-0 ${acceptedA ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/40' : 'bg-rose-950 text-rose-300 border border-rose-500/40'}`}>
              {acceptedA ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
              {acceptedA ? 'ACCEPT' : 'REJECT'}
            </span>
          </div>

          {hasDfaB && (
            <div className="p-3 bg-slate-900/90 border border-emerald-500/30 rounded-xl flex items-center justify-between">
              <div className="space-y-0.5 overflow-hidden">
                <div className="text-[11px] text-slate-400">DFA B Current State: <span className="font-mono text-emerald-300 font-bold">{currentStB}</span></div>
                <div className="text-[11px] text-slate-400 truncate">Path: <span className="font-mono text-emerald-300">{pathB}</span></div>
              </div>
              <span className={`px-2.5 py-1 rounded-lg text-xs font-bold font-mono flex items-center gap-1 shrink-0 ${acceptedB ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/40' : 'bg-rose-950 text-rose-300 border border-rose-500/40'}`}>
                {acceptedB ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
                {acceptedB ? 'ACCEPT' : 'REJECT'}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ═══ 4. WORKBENCH PANELS (LEFT: DFA A | RIGHT: DFA B IF PRESENT) ═══ */}
      <div className={`grid grid-cols-1 ${hasDfaB ? 'md:grid-cols-2' : ''} gap-4`}>
        {/* Left Panel: DFA A (Spans 100% width when DFA B is empty) */}
        <div className="p-4 bg-slate-950/90 rounded-xl border border-indigo-500/30 space-y-4 flex flex-col justify-between w-full">
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="font-extrabold text-sm text-indigo-300 flex items-center gap-2">
                <Layers className="w-4 h-4 text-indigo-400" /> DFA A Workbench
              </span>
              <span className="text-xs font-mono text-slate-400 font-bold">{graphA.states.length} States</span>
            </div>

            {/* Bounded Interactive Graph */}
            <div className="w-full h-[260px] relative rounded-xl overflow-hidden shrink-0 border border-slate-800">
              <MiniAutomataGraph
                graph={graphA}
                title="DFA A Graph"
                accentColor="#818cf8"
                hideTitle={true}
                highlightState={currentStA}
                highlightEdge={activeEdgeA}
              />
            </div>

            {/* Formal Definition (Q, Σ, δ, q0, F) */}
            <div className="p-3 bg-slate-900/90 rounded-xl border border-slate-800 text-xs font-mono space-y-1 leading-relaxed">
              <div className="text-slate-400 font-sans font-bold border-b border-slate-800 pb-1 text-[11px] uppercase tracking-wider text-indigo-400">
                Formal Definition M_A = (Q, Σ, δ, q0, F)
              </div>
              <div><span className="text-slate-400">Q =</span> &#123;{graphA.states.map((s) => s.id).join(', ')}&#125;</div>
              <div><span className="text-slate-400">Σ =</span> &#123;{dfaA.alphabet.join(', ')}&#125;</div>
              <div><span className="text-slate-400">q0 =</span> {dfaA.startState}</div>
              <div><span className="text-slate-400">F =</span> &#123;{dfaA.acceptStates.join(', ') || '∅'}&#125;</div>
            </div>

            {/* Transition Table */}
            <div className="p-3 bg-slate-900/90 rounded-xl border border-slate-800 space-y-2 text-xs">
              <div className="font-sans font-bold text-[11px] text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Table className="w-3.5 h-3.5 text-indigo-400" /> Transition Matrix δ_A
              </div>
              <div className="max-h-36 overflow-y-auto">
                <table className="w-full text-left font-mono text-[11px]">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400">
                      <th className="py-1">State</th>
                      {dfaA.alphabet.map((sym) => (
                        <th key={sym} className="py-1 text-center">{sym}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {dfaA.states.map((st) => (
                      <tr key={st} className="border-b border-slate-800/40 text-slate-300">
                        <td className="py-1 font-bold">
                          {st === dfaA.startState ? '→ ' : ''}{dfaA.acceptStates.includes(st) ? '* ' : ''}{st}
                        </td>
                        {dfaA.alphabet.map((sym) => (
                          <td key={sym} className="py-1 text-center text-slate-400">
                            {dfaA.transitions[st]?.[sym] || '—'}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="space-y-1 font-mono text-xs text-slate-300 pt-2 border-t border-slate-800">
            <div className="flex items-center justify-between text-slate-400 font-sans text-xs">
              <span>Reachable: <strong className="text-slate-200">{analysisA.reachableStates.length}</strong></span>
              <span>Dead: <strong className="text-rose-400">{analysisA.deadStates.length}</strong></span>
              <span>Trap: <strong className="text-amber-400">{analysisA.trapStates.length}</strong></span>
            </div>
          </div>
        </div>

        {/* Right Panel: DFA B (rendered only when DFA B is provided) */}
        {hasDfaB && (
          <div className="p-4 bg-slate-950/90 rounded-xl border border-emerald-500/30 space-y-4 flex flex-col justify-between w-full">
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="font-extrabold text-sm text-emerald-300 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-emerald-400" /> DFA B Workbench
                </span>
                <span className="text-xs font-mono text-slate-400 font-bold">{graphB.states.length} States</span>
              </div>

              {/* Bounded Interactive Graph */}
              <div className="w-full h-[260px] relative rounded-xl overflow-hidden shrink-0 border border-slate-800">
                <MiniAutomataGraph
                  graph={graphB}
                  title="DFA B Graph"
                  accentColor="#34d399"
                  hideTitle={true}
                  highlightState={currentStB}
                  highlightEdge={activeEdgeB}
                />
              </div>

              {/* Formal Definition (Q, Σ, δ, q0, F) */}
              <div className="p-3 bg-slate-900/90 rounded-xl border border-slate-800 text-xs font-mono space-y-1 leading-relaxed">
                <div className="text-slate-400 font-sans font-bold border-b border-slate-800 pb-1 text-[11px] uppercase tracking-wider text-emerald-400">
                  Formal Definition M_B = (Q, Σ, δ, q0, F)
                </div>
                <div><span className="text-slate-400">Q =</span> &#123;{graphB.states.map((s) => s.id).join(', ')}&#125;</div>
                <div><span className="text-slate-400">Σ =</span> &#123;{dfaB.alphabet.join(', ')}&#125;</div>
                <div><span className="text-slate-400">q0 =</span> {dfaB.startState}</div>
                <div><span className="text-slate-400">F =</span> &#123;{dfaB.acceptStates.join(', ') || '∅'}&#125;</div>
              </div>

              {/* Transition Table */}
              <div className="p-3 bg-slate-900/90 rounded-xl border border-slate-800 space-y-2 text-xs">
                <div className="font-sans font-bold text-[11px] text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Table className="w-3.5 h-3.5 text-emerald-400" /> Transition Matrix δ_B
                </div>
                <div className="max-h-36 overflow-y-auto">
                  <table className="w-full text-left font-mono text-[11px]">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-400">
                        <th className="py-1">State</th>
                        {dfaB.alphabet.map((sym) => (
                          <th key={sym} className="py-1 text-center">{sym}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {dfaB.states.map((st) => (
                        <tr key={st} className="border-b border-slate-800/40 text-slate-300">
                          <td className="py-1 font-bold">
                            {st === dfaB.startState ? '→ ' : ''}{dfaB.acceptStates.includes(st) ? '* ' : ''}{st}
                          </td>
                          {dfaB.alphabet.map((sym) => (
                            <td key={sym} className="py-1 text-center text-slate-400">
                              {dfaB.transitions[st]?.[sym] || '—'}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="space-y-1 font-mono text-xs text-slate-300 pt-2 border-t border-slate-800">
              <div className="flex items-center justify-between text-slate-400 font-sans text-xs">
                <span>Reachable: <strong className="text-slate-200">{analysisB.reachableStates.length}</strong></span>
                <span>Dead: <strong className="text-rose-400">{analysisB.deadStates.length}</strong></span>
                <span>Trap: <strong className="text-amber-400">{analysisB.trapStates.length}</strong></span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ═══ 5. CENTER COMPARISON PROPERTY TABLE (ONLY SHOWN IF DFA B IS PRESENT) ═══ */}
      {hasDfaB && (
        <div className="p-4 bg-slate-950/90 border border-slate-800 rounded-xl space-y-3">
          <div className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-2">
            <Table className="w-4 h-4 text-amber-400" /> Side-by-Side Property Comparison Matrix
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left font-mono text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-900 text-slate-300 font-sans">
                  <th className="p-2.5 font-bold">Property</th>
                  <th className="p-2.5 font-bold text-indigo-300">DFA A ({graphA.name})</th>
                  <th className="p-2.5 font-bold text-emerald-300">DFA B ({graphB.name})</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                <tr>
                  <td className="p-2.5 font-sans font-medium text-slate-400">Language Description</td>
                  <td className="p-2.5 font-semibold text-indigo-200">{graphA.name || 'DFA A'}</td>
                  <td className="p-2.5 font-semibold text-emerald-200">{graphB.name || 'DFA B'}</td>
                </tr>
                <tr>
                  <td className="p-2.5 font-sans font-medium text-slate-400">Alphabet (Σ)</td>
                  <td className="p-2.5">&#123;{dfaA.alphabet.join(', ')}&#125;</td>
                  <td className="p-2.5">&#123;{dfaB.alphabet.join(', ')}&#125;</td>
                </tr>
                <tr>
                  <td className="p-2.5 font-sans font-medium text-slate-400">State Count (|Q|)</td>
                  <td className="p-2.5 font-bold">{graphA.states.length} States</td>
                  <td className="p-2.5 font-bold">{graphB.states.length} States</td>
                </tr>
                <tr>
                  <td className="p-2.5 font-sans font-medium text-slate-400">Transition Count (|δ|)</td>
                  <td className="p-2.5">{graphA.transitions.length} Transitions</td>
                  <td className="p-2.5">{graphB.transitions.length} Transitions</td>
                </tr>
                <tr>
                  <td className="p-2.5 font-sans font-medium text-slate-400">Accept States (|F|)</td>
                  <td className="p-2.5">{dfaA.acceptStates.length} ({dfaA.acceptStates.join(', ') || 'None'})</td>
                  <td className="p-2.5">{dfaB.acceptStates.length} ({dfaB.acceptStates.join(', ') || 'None'})</td>
                </tr>
                <tr>
                  <td className="p-2.5 font-sans font-medium text-slate-400">Reachable States</td>
                  <td className="p-2.5">{analysisA.reachableStates.length} / {graphA.states.length}</td>
                  <td className="p-2.5">{analysisB.reachableStates.length} / {graphB.states.length}</td>
                </tr>
                <tr>
                  <td className="p-2.5 font-sans font-medium text-slate-400">Dead States</td>
                  <td className="p-2.5 text-rose-300">{analysisA.deadStates.length > 0 ? analysisA.deadStates.join(', ') : 'None'}</td>
                  <td className="p-2.5 text-rose-300">{analysisB.deadStates.length > 0 ? analysisB.deadStates.join(', ') : 'None'}</td>
                </tr>
                <tr>
                  <td className="p-2.5 font-sans font-medium text-slate-400">Trap State</td>
                  <td className="p-2.5 text-amber-300">{analysisA.trapStates.length > 0 ? analysisA.trapStates.join(', ') : 'None'}</td>
                  <td className="p-2.5 text-amber-300">{analysisB.trapStates.length > 0 ? analysisB.trapStates.join(', ') : 'None'}</td>
                </tr>
                <tr>
                  <td className="p-2.5 font-sans font-medium text-slate-400">Is Minimal DFA?</td>
                  <td className="p-2.5">{isMinimalA ? 'YES (Hopcroft Minimal)' : 'NO (Can be reduced)'}</td>
                  <td className="p-2.5">{isMinimalB ? 'YES (Hopcroft Minimal)' : 'NO (Can be reduced)'}</td>
                </tr>
                <tr>
                  <td className="p-2.5 font-sans font-medium text-slate-400">Is Complete DFA?</td>
                  <td className="p-2.5">{isCompleteA ? 'YES (Fully specified)' : 'NO (Missing transitions)'}</td>
                  <td className="p-2.5">{isCompleteB ? 'YES (Fully specified)' : 'NO (Missing transitions)'}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ═══ 6. LANGUAGE ANALYSIS (ONLY SHOWN IF DFA B IS PRESENT) ═══ */}
      {hasDfaB && (
        <div className="p-4 bg-slate-950/90 border border-slate-800 rounded-xl space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2 flex-wrap gap-2">
            <div className="text-xs font-bold text-purple-400 uppercase tracking-wider flex items-center gap-2">
              <Info className="w-4 h-4 text-purple-400" /> Language Relationship Analysis
            </div>

            <span
              className="px-3 py-1 rounded-full text-xs font-bold font-mono flex items-center gap-1.5 border"
              style={{
                backgroundColor: `${languageRel.color}15`,
                borderColor: `${languageRel.color}40`,
                color: languageRel.color,
              }}
            >
              {languageRel.label}
            </span>
          </div>

          {!areEquivalent ? (
            <div className="p-3 bg-purple-950/30 border border-purple-500/30 rounded-xl space-y-2 text-xs">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <span className="text-slate-400 font-medium">Shortest Distinguishing Counterexample String: </span>
                  <span className="px-2.5 py-1 bg-slate-900 border border-purple-500/40 text-purple-300 font-mono font-bold rounded-md">
                    "{counterexampleStr}"
                  </span>
                </div>
              </div>
              <p className="text-slate-300 text-[11.5px] leading-relaxed">
                String <code className="text-purple-300 font-mono font-bold">"{counterexampleStr}"</code> proves non-equivalence because DFA A and DFA B produce different acceptance decisions when evaluating it.
              </p>
            </div>
          ) : (
            <div className="p-3 bg-emerald-950/30 border border-emerald-500/30 rounded-xl text-xs text-emerald-300 font-medium">
              Both DFAs recognize identical regular languages $L(M_1) = L(M_2)$. No counterexample string exists.
            </div>
          )}
        </div>
      )}
    </div>
  );
};
