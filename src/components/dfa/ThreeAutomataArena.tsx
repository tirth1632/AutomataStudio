import React, { useState, useMemo, useEffect } from 'react';
import { Layers, Play, Pause, CheckCircle2, Sparkles, RefreshCw, Maximize2, X, RotateCcw, ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from 'lucide-react';
import type { ReactFlowInstance } from '@xyflow/react';
import type { AutomatonGraph } from '../../types/automata';
import { graphToDFA, dfaToGraph } from '../../utils/dfaAdapter';
import { DFAOperations } from '../../algorithms/DFAOperations/DFAOperations';
import { simulateNFA } from '../../algorithms/nfaSimulator';
import { applyDagreLayout } from '../../services/layoutEngine';
import { MiniAutomataGraph, computeMiniGraphHeight } from './MiniAutomataGraph';

import { getRelevantTestString } from '../../utils/testStringHelper';
import { DecisionAnalysisPanel } from './DecisionAnalysisPanel';

export type SetOpType =
  | 'OR'
  | 'AND'
  | 'DIFF'
  | 'XOR'
  | 'COMP_A'
  | 'COMP_B'
  | 'MIN_A'
  | 'MIN_B';

interface ThreeAutomataArenaProps {
  graphA: AutomatonGraph;
  graphB: AutomatonGraph;
  selectedOp?: SetOpType;
  onApplyResultGraph: (resultGraph: AutomatonGraph, opName: string) => void;
  onResultGraphChange?: (resultGraph: AutomatonGraph) => void;
  onSelectState?: (stateId: string | null) => void;
}

export const ThreeAutomataArena: React.FC<ThreeAutomataArenaProps> = ({
  graphA,
  graphB,
  selectedOp = 'OR',
  onApplyResultGraph,
  onResultGraphChange,
  onSelectState,
}) => {
  const [opType, setOpType] = useState<SetOpType>(selectedOp);
  const [autoMinimize] = useState<boolean>(true);
  const [testString, setTestString] = useState<string>(() => getRelevantTestString(graphA));

  useEffect(() => {
    if (graphA && graphA.states.length > 0) {
      setTestString(getRelevantTestString(graphA));
    }
  }, [graphA]);

  useEffect(() => {
    if (selectedOp) {
      setOpType(selectedOp);
    }
  }, [selectedOp]);

  // Convert graphs to pure DFAs
  const dfaA = useMemo(() => graphToDFA(graphA), [graphA]);
  const dfaB = useMemo(() => graphToDFA(graphB), [graphB]);

  // Compute Result DFA based on chosen operation
  const rawResultDFA = useMemo(() => {
    try {
      const isBEmpty = !graphB || !graphB.states || graphB.states.length === 0;

      if (isBEmpty) {
        if (opType === 'OR' || opType === 'DIFF' || opType === 'XOR' || opType === 'MIN_A') {
          return dfaA;
        }
        if (opType === 'COMP_A') {
          return DFAOperations.complement(dfaA);
        }
        return dfaA;
      }

      if (opType === 'OR') return DFAOperations.union(dfaA, dfaB);
      if (opType === 'AND') return DFAOperations.intersection(dfaA, dfaB);
      if (opType === 'DIFF') return DFAOperations.difference(dfaA, dfaB);
      if (opType === 'XOR') return DFAOperations.symmetricDifference(dfaA, dfaB);
      if (opType === 'COMP_A') return DFAOperations.complement(dfaA);
      if (opType === 'COMP_B') return DFAOperations.complement(dfaB);
      if (opType === 'MIN_A') return DFAOperations.minimize(dfaA);
      if (opType === 'MIN_B') return DFAOperations.minimize(dfaB);
      return dfaA;
    } catch {
      return dfaA;
    }
  }, [dfaA, dfaB, graphB, opType]);

  // Automatically minimize Result DFA via Hopcroft Algorithm
  const resultDFA = useMemo(() => {
    if (!autoMinimize || opType === 'MIN_A' || opType === 'MIN_B') return rawResultDFA;
    try {
      return DFAOperations.minimize(rawResultDFA);
    } catch {
      return rawResultDFA;
    }
  }, [rawResultDFA, autoMinimize, opType]);

  // Convert Result DFA to AutomatonGraph
  const resultGraph = useMemo(() => {
    const titleMap: Record<SetOpType, string> = {
      OR: `${graphA.name || 'DFA A'} ∪ ${graphB.name || 'DFA B'}`,
      AND: `${graphA.name || 'DFA A'} ∩ ${graphB.name || 'DFA B'}`,
      DIFF: `${graphA.name || 'DFA A'} \\ ${graphB.name || 'DFA B'}`,
      XOR: `${graphA.name || 'DFA A'} ⊕ ${graphB.name || 'DFA B'}`,
      COMP_A: `${graphA.name || 'DFA A'}^c (Complement A)`,
      COMP_B: `${graphB.name || 'DFA B'}^c (Complement B)`,
      MIN_A: `Minimized (${graphA.name || 'DFA A'})`,
      MIN_B: `Minimized (${graphB.name || 'DFA B'})`,
    };
    return dfaToGraph(resultDFA, titleMap[opType] || 'Result DFA');
  }, [resultDFA, graphA.name, graphB.name, opType]);

  useEffect(() => {
    onResultGraphChange?.(resultGraph);
  }, [resultGraph, onResultGraphChange]);

  // Equivalence & Containment Checks
  const isEquivalent = useMemo(() => DFAOperations.areEquivalent(dfaA, dfaB), [dfaA, dfaB]);

  // Run Test String Concurrently across all 3 automata
  const stepsA = useMemo(() => simulateNFA(graphA, testString), [graphA, testString]);
  const stepsB = useMemo(() => simulateNFA(graphB, testString), [graphB, testString]);
  const stepsRes = useMemo(() => simulateNFA(resultGraph, testString), [resultGraph, testString]);

  const accA = stepsA[stepsA.length - 1]?.isAccepting || false;
  const accB = stepsB[stepsB.length - 1]?.isAccepting || false;
  const accRes = stepsRes[stepsRes.length - 1]?.isAccepting || false;

  const hasDfaB = useMemo(() => {
    if (!graphB || !graphB.states || graphB.states.length === 0) return false;
    if (graphB.name && (graphB.name.includes('(Empty)') || graphB.name.toLowerCase().includes('empty'))) return false;
    return true;
  }, [graphB]);

  return (
    <div className="p-4 md:p-6 space-y-5 bg-slate-950 text-slate-100 min-h-full flex flex-col font-sans select-none">
      {/* Top Controls Header */}
      <div className="relative flex flex-col gap-3.5 p-4 md:p-5 bg-gradient-to-r from-slate-900/95 via-slate-900/90 to-indigo-950/40 border border-slate-800/80 rounded-2xl shadow-2xl backdrop-blur-xl shrink-0 overflow-hidden">
        {/* Top ambient glow line */}
        <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-indigo-500/50 to-transparent" />

        {/* Row 1: Title & Info */}
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="p-2.5 bg-gradient-to-br from-indigo-950 to-slate-900 border border-indigo-500/30 text-indigo-400 rounded-xl shadow-lg shadow-indigo-500/10 shrink-0 ring-1 ring-indigo-500/20">
            <Layers className="w-5 h-5 text-indigo-400" />
          </div>
          <div className="min-w-0">
            <h2 className="font-extrabold text-base md:text-lg bg-gradient-to-r from-white via-slate-100 to-indigo-200 bg-clip-text text-transparent tracking-tight flex items-center gap-2">
              Automata Operations Arena
            </h2>
            <p className="text-xs text-slate-400 font-sans truncate">
              Simulating input strings concurrently across input DFAs and generated set operation DFA.
            </p>
          </div>
        </div>

        {/* Row 2: Premium 8-Operation Grid Control */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2 w-full p-2 bg-slate-950/90 rounded-2xl border border-slate-800/80 shadow-inner">
          {(
            [
              { key: 'OR', title: 'Union', math: 'A ∪ B' },
              { key: 'AND', title: 'Intersect', math: 'A ∩ B' },
              { key: 'DIFF', title: 'Diff', math: 'A \\ B' },
              { key: 'XOR', title: 'SymDiff', math: 'A ⊕ B' },
              { key: 'COMP_A', title: 'Comp A', math: 'Aᶜ' },
              { key: 'COMP_B', title: 'Comp B', math: 'Bᶜ' },
              { key: 'MIN_A', title: 'Min A', math: 'Min A' },
              { key: 'MIN_B', title: 'Min B', math: 'Min B' },
            ] as const
          ).map((op) => {
            const isAct = opType === op.key;
            return (
              <button
                key={op.key}
                onClick={() => setOpType(op.key)}
                className={`relative px-3 py-2.5 rounded-xl text-xs font-mono font-bold transition-all duration-200 cursor-pointer flex flex-col items-center justify-center gap-0.5 border text-center ${
                  isAct
                    ? 'bg-gradient-to-br from-indigo-600 via-indigo-500 to-purple-600 text-white border-indigo-400/80 shadow-lg shadow-indigo-500/25 ring-2 ring-indigo-400/20 scale-[1.02]'
                    : 'bg-slate-900/70 border-slate-800/80 text-slate-300 hover:text-white hover:bg-slate-800 hover:border-slate-700 shadow-sm'
                }`}
              >
                <span className={`text-xs tracking-tight ${isAct ? 'text-white font-extrabold' : 'text-slate-200'}`}>
                  {op.math}
                </span>
                <span className={`text-[10px] font-sans font-medium ${isAct ? 'text-indigo-100' : 'text-slate-400'}`}>
                  ({op.title})
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Equivalence Summary Header Badge */}
      <div className="flex items-center justify-between p-3.5 bg-slate-900/80 border border-slate-800/80 rounded-2xl text-xs font-mono shrink-0 shadow-lg backdrop-blur-md">
        <div className="flex items-center gap-2">
          <span className="font-bold text-slate-400 uppercase tracking-wider text-[11px] font-sans">Active Operation:</span>
          <span className="px-3 py-1 rounded-lg bg-indigo-950/80 border border-indigo-500/40 text-indigo-300 font-bold font-mono shadow-sm flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
            {opType}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <span
            className={`px-3 py-1 rounded-xl text-xs font-bold border flex items-center gap-2 shadow-sm transition-all ${
              isEquivalent
                ? 'bg-emerald-950/80 border-emerald-500/40 text-emerald-300 shadow-emerald-500/10'
                : 'bg-amber-950/80 border-amber-500/40 text-amber-300 shadow-amber-500/10'
            }`}
          >
            {isEquivalent ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <RefreshCw className="w-3.5 h-3.5 text-amber-400" />}
            {isEquivalent ? 'L(A) = L(B) Equivalent' : 'L(A) ≠ L(B) Distinct Languages'}
          </span>
        </div>
      </div>

      {/* ── CANVAS GRID ────────────────────────────────────────── */}
      <div className={`grid grid-cols-1 ${hasDfaB ? 'lg:grid-cols-3' : 'lg:grid-cols-2'} gap-4 shrink-0 w-full`}>
        {/* Card 1: DFA A */}
        <ArenaCanvasCard
          title="DFA A"
          badge="M₁ (DFA A)"
          graph={graphA}
          accepted={accA}
          testString={testString}
          colorScheme="indigo"
          onSelectState={onSelectState}
        />

        {/* Card 2: DFA B */}
        {hasDfaB && (
          <ArenaCanvasCard
            title="DFA B"
            badge="M₂ (DFA B)"
            graph={graphB}
            accepted={accB}
            testString={testString}
            colorScheme="emerald"
            onSelectState={onSelectState}
          />
        )}

        {/* Card 3: Result DFA */}
        <ArenaCanvasCard
          title={`Result DFA (${opType})`}
          badge="M₃ (Result)"
          graph={resultGraph}
          accepted={accRes}
          testString={testString}
          colorScheme="purple"
          onLoadToCanvas={() => onApplyResultGraph(resultGraph, opType)}
          onSelectState={onSelectState}
        />
      </div>

      {/* ── SYNCHRONIZED STRING TESTING EVALUATOR BAR ──────────────────────── */}
      <div className="p-3.5 bg-slate-900 border border-slate-800 rounded-2xl shadow-lg shrink-0">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="text-xs font-bold text-slate-300 flex items-center gap-2">
            <Play className="w-4 h-4 text-emerald-400 fill-current" />
            Synchronized 3-Way Input Evaluator:
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-slate-400 font-mono">Test String:</span>
            <input
              type="text"
              value={testString}
              onChange={(e) => setTestString(e.target.value)}
              placeholder="e.g. 001"
              className="px-3 py-1 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white font-mono focus:outline-none focus:border-indigo-500 w-32"
            />
          </div>
        </div>
      </div>

      {/* ── DECISION ANALYSIS PANEL (WHY DID THIS RESULT OCCUR?) ─────────────── */}
      <DecisionAnalysisPanel
        graphA={graphA}
        graphB={graphB}
        resultGraph={resultGraph}
        opType={opType}
        testString={testString}
        accA={accA}
        accB={accB}
        accRes={accRes}
      />
    </div>
  );
};

// SVG Automata Graph Renderer Card Component
interface ArenaCanvasCardProps {
  title: string;
  badge: string;
  graph: AutomatonGraph;
  accepted: boolean;
  testString: string;
  colorScheme?: 'indigo' | 'emerald' | 'purple';
  onLoadToCanvas?: () => void;
  onSelectState?: (stateId: string | null) => void;
}

const ArenaCanvasCard: React.FC<ArenaCanvasCardProps> = ({
  title,
  badge,
  graph: rawGraph,
  accepted,
  testString,
  colorScheme = 'indigo',
  onLoadToCanvas,
  onSelectState,
}) => {
  const [isEnlarged, setIsEnlarged] = useState(false);
  const [modalTestString, setModalTestString] = useState<string>(testString);
  const [currentStepIdx, setCurrentStepIdx] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [rfInstance, setRfInstance] = useState<ReactFlowInstance | null>(null);

  const isEmerald = colorScheme === 'emerald';
  const isPurple = colorScheme === 'purple';

  const accentColor = isEmerald ? '#10b981' : isPurple ? '#a855f7' : '#6366f1';
  const badgeClass = isEmerald
    ? 'bg-emerald-950/90 border-emerald-500/50 text-emerald-300'
    : isPurple
      ? 'bg-purple-950/90 border-purple-500/50 text-purple-300'
      : 'bg-indigo-950/90 border-indigo-500/50 text-indigo-300';

  const graph = useMemo(() => {
    try {
      return applyDagreLayout(rawGraph);
    } catch {
      return rawGraph;
    }
  }, [rawGraph]);

  const _graphHeight = computeMiniGraphHeight(graph.states.length, 240);

  // Sync modalTestString when parent testString changes
  useEffect(() => {
    setModalTestString(testString);
    setCurrentStepIdx(0);
    setIsPlaying(false);
  }, [testString]);

  // Compute simulation steps for current modal input string
  const simSteps = useMemo(() => {
    return simulateNFA(graph, modalTestString);
  }, [graph, modalTestString]);

  // Reset step index when input string changes
  useEffect(() => {
    setCurrentStepIdx(0);
    setIsPlaying(false);
  }, [modalTestString]);

  // Auto-play timer loop
  useEffect(() => {
    if (!isPlaying) return;
    const timer = setInterval(() => {
      setCurrentStepIdx((prev) => {
        if (prev >= simSteps.length - 1) {
          setIsPlaying(false);
          return prev;
        }
        return prev + 1;
      });
    }, 900);
    return () => clearInterval(timer);
  }, [isPlaying, simSteps.length]);

  const currentStep = simSteps[currentStepIdx] || simSteps[0];
  const activeStateId = currentStep?.currentStateIds?.[0];

  useEffect(() => {
    if (!isEnlarged) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsEnlarged(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isEnlarged]);

  return (
    <>
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3 flex flex-col h-[340px] shrink-0 shadow-xl relative overflow-hidden">
        {/* Card Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-2 shrink-0 gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className={`px-2 py-0.5 border rounded text-[10px] font-mono font-bold shrink-0 ${badgeClass}`}>
              {badge}
            </span>
            <span className="font-bold text-xs text-slate-100 truncate">{title}</span>
            <span className="text-[10px] font-mono text-slate-400 shrink-0">({graph.states.length} states)</span>
          </div>

          {/* Header Controls Toolbar (Zoom In, Zoom Out, Reset, Maximize) */}
          <div className="flex items-center gap-1 bg-slate-950/80 border border-slate-800 p-1 rounded-xl shrink-0">
            <button
              onClick={() => rfInstance?.zoomIn()}
              title="Zoom In"
              className="p-1 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition cursor-pointer"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => rfInstance?.zoomOut()}
              title="Zoom Out"
              className="p-1 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition cursor-pointer"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => rfInstance?.fitView({ padding: 0.3, duration: 300 })}
              title="Reset / Fit View"
              className="p-1 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setIsEnlarged(true)}
              title="Enlarge Canvas in Mini Window"
              className="p-1 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition cursor-pointer"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <div className="flex-1 min-h-0 relative">
          {!graph || !graph.states || graph.states.length === 0 ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-500 gap-2 p-4 text-center bg-slate-950/80 rounded-xl border border-dashed border-slate-800">
              <span className="px-3 py-1 rounded bg-slate-900 border border-slate-800 text-xs font-mono font-bold text-slate-400">
                Empty (No States)
              </span>
              <p className="text-[11px] text-slate-500 font-mono">Select or type custom prompt for DFA B</p>
            </div>
          ) : (
            <MiniAutomataGraph
              graph={graph}
              title=""
              accentColor={accentColor}
              hideTitle
              hideControls
              onNodeClick={(id) => onSelectState?.(id)}
              onInitReactFlow={setRfInstance}
            />
          )}
        </div>

        {/* Footer controls */}
        <div className="mt-2.5 flex items-center justify-between gap-2 font-sans shrink-0">
          <span className="text-[10px] text-slate-400 font-mono flex items-center gap-1">
            Result for "{testString}":
            {!graph || !graph.states || graph.states.length === 0 ? (
              <span className="font-bold text-slate-500">Empty (N/A)</span>
            ) : (
              <span className={`font-bold ${accepted ? 'text-emerald-400' : 'text-rose-400'}`}>
                {accepted ? 'ACCEPT' : 'REJECT'}
              </span>
            )}
          </span>

          {onLoadToCanvas && (
            <button
              onClick={onLoadToCanvas}
              className="py-1.5 px-3 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-md"
            >
              <Sparkles className="w-3.5 h-3.5" /> Load onto Canvas
            </button>
          )}
        </div>
      </div>

      {/* Enlarged Mini Window Modal */}
      {isEnlarged && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 md:p-8 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-5xl h-[88vh] flex flex-col shadow-2xl overflow-hidden relative font-sans">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-950/80 shrink-0">
              <div className="flex items-center gap-3">
                <span className={`px-2.5 py-1 border rounded-lg text-xs font-mono font-bold ${badgeClass}`}>
                  {badge}
                </span>
                <div>
                  <h3 className="font-bold text-base text-slate-100 flex items-center gap-2">
                    {title}
                  </h3>
                  <p className="text-xs text-slate-400 font-mono">
                    {graph.states.length} States • Alphabet: {'{'}{(graph.alphabet || ['0', '1']).join(', ')}{'}'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-xs text-slate-400 font-mono flex items-center gap-1.5 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800">
                  Result for "{modalTestString}":
                  <span className={`font-bold ${simSteps[simSteps.length - 1]?.isAccepting ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {simSteps[simSteps.length - 1]?.isAccepting ? 'ACCEPT' : 'REJECT'}
                  </span>
                </span>
              </div>
            </div>

            {/* Modal Body - Enlarged Canvas with Simulation Highlighting */}
            <div className="flex-1 relative bg-slate-950 overflow-hidden">
              <MiniAutomataGraph
                graph={graph}
                title=""
                accentColor={accentColor}
                hideTitle
                highlightState={activeStateId}
                onNodeClick={(id) => onSelectState?.(id)}
              />
            </div>

            {/* Modal Footer / Simulation Controls Bar */}
            <div className="p-4 border-t border-slate-800 bg-slate-950/90 flex flex-col gap-3 shrink-0">
              {/* Step Description & Tape Display Header */}
              <div className="flex items-center justify-between gap-3 text-xs font-mono">
                <div className="flex items-center gap-2 text-slate-300 overflow-hidden text-ellipsis whitespace-nowrap">
                  <span className="px-2.5 py-0.5 rounded-md bg-indigo-950 border border-indigo-500/40 text-indigo-300 font-bold shrink-0">
                    Step {currentStepIdx} / {Math.max(0, simSteps.length - 1)}
                  </span>
                  <span className="text-slate-200 font-sans font-semibold truncate">
                    {currentStep?.description || 'Simulation ready'}
                  </span>
                </div>

                {/* Tape Character Visualization */}
                <div className="flex items-center gap-1 font-mono text-xs bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-800 shrink-0 max-w-xs sm:max-w-sm md:max-w-md overflow-x-auto">
                  <span className="text-slate-500 text-[10px] uppercase font-sans mr-1 shrink-0">Tape:</span>
                  {modalTestString.length === 0 ? (
                    <span className="text-slate-500 italic font-sans text-[11px] shrink-0">ε (empty string)</span>
                  ) : (
                    modalTestString.split('').map((char, idx) => {
                      const isConsumed = idx < (currentStep?.consumedInput?.length || 0);
                      const isCurrent = idx === (currentStep?.consumedInput?.length || 0) && currentStepIdx < simSteps.length - 1;
                      return (
                        <span
                          key={idx}
                          className={`px-1.5 py-0.5 rounded font-bold transition-all shrink-0 ${
                            isCurrent
                              ? 'bg-amber-500 text-slate-950 ring-2 ring-amber-400/50 scale-105 shadow-lg'
                              : isConsumed
                              ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/40'
                              : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          {char}
                        </span>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Interactive Control Row */}
              <div className="flex items-center justify-between gap-4 flex-wrap">
                {/* Left: Input String & Quick Symbol Chips */}
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-700/80 rounded-xl px-2.5 py-1">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider font-sans">Input:</span>
                    <input
                      type="text"
                      value={modalTestString}
                      onChange={(e) => setModalTestString(e.target.value)}
                      placeholder="e.g. 010"
                      className="bg-transparent text-xs font-mono font-bold text-white focus:outline-none w-28 md:w-36"
                    />
                    {modalTestString && (
                      <button
                        onClick={() => setModalTestString('')}
                        className="text-slate-500 hover:text-slate-300 text-xs px-1 cursor-pointer"
                        title="Clear string"
                      >
                        ×
                      </button>
                    )}
                  </div>

                  {/* Quick symbol buttons */}
                  <div className="hidden sm:flex items-center gap-1">
                    {(graph.alphabet && graph.alphabet.length > 0 ? graph.alphabet : ['0', '1']).map((sym) => (
                      <button
                        key={sym}
                        onClick={() => setModalTestString((prev) => prev + sym)}
                        className="px-2 py-1 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white rounded-lg text-xs font-mono font-bold transition cursor-pointer"
                        title={`Append '${sym}'`}
                      >
                        +{sym}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Center: Playback Controls (Reset, Step Prev, Play/Pause, Step Next) */}
                <div className="flex items-center gap-2 bg-slate-900/90 border border-slate-800 rounded-2xl p-1 shadow-inner">
                  <button
                    onClick={() => {
                      setIsPlaying(false);
                      setCurrentStepIdx(0);
                    }}
                    disabled={currentStepIdx === 0}
                    className="p-2 hover:bg-slate-800 disabled:opacity-40 text-slate-300 rounded-xl transition cursor-pointer disabled:cursor-not-allowed"
                    title="Reset to Start (Step 0)"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => {
                      setIsPlaying(false);
                      setCurrentStepIdx((prev) => Math.max(0, prev - 1));
                    }}
                    disabled={currentStepIdx === 0}
                    className="p-2 hover:bg-slate-800 disabled:opacity-40 text-slate-300 rounded-xl transition cursor-pointer disabled:cursor-not-allowed"
                    title="Previous Step"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => {
                      if (currentStepIdx >= simSteps.length - 1) {
                        setCurrentStepIdx(0);
                      }
                      setIsPlaying((prev) => !prev);
                    }}
                    className={`px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-1.5 transition shadow-md cursor-pointer ${
                      isPlaying
                        ? 'bg-amber-600 hover:bg-amber-500 text-white shadow-amber-600/30'
                        : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/30'
                    }`}
                    title={isPlaying ? 'Pause Simulation' : 'Play Simulation'}
                  >
                    {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
                    <span>{isPlaying ? 'Pause' : 'Play'}</span>
                  </button>

                  <button
                    onClick={() => {
                      setIsPlaying(false);
                      setCurrentStepIdx((prev) => Math.min(simSteps.length - 1, prev + 1));
                    }}
                    disabled={currentStepIdx >= simSteps.length - 1}
                    className="p-2 hover:bg-slate-800 disabled:opacity-40 text-slate-300 rounded-xl transition cursor-pointer disabled:cursor-not-allowed"
                    title="Next Step"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>

                {/* Right: Load to Canvas & Close Window Buttons */}
                <div className="flex items-center gap-2">
                  {onLoadToCanvas && (
                    <button
                      onClick={() => {
                        onLoadToCanvas();
                        setIsEnlarged(false);
                      }}
                      className="py-2 px-4 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-md"
                    >
                      <Sparkles className="w-3.5 h-3.5" /> Load onto Main Canvas
                    </button>
                  )}
                  <button
                    onClick={() => setIsEnlarged(false)}
                    className="py-2 px-5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold transition cursor-pointer shadow"
                  >
                    Close Window
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
