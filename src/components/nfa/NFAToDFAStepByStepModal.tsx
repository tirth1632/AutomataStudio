import React, { useState, useEffect, useMemo } from 'react';
import {
  GraduationCap,
  Play,
  Pause,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Layers,
  ArrowRightLeft,
  X,
  Sparkles,
  Info,
  Check,
  Zap,
  ZoomIn,
  ZoomOut,
  Maximize2,
} from 'lucide-react';
import type { AutomatonGraph, AutomatonState, AutomatonTransition } from '../../types/automata';
import { getEpsilonClosureSet } from '../../algorithms/epsilonClosure';
import { applyDagreLayout } from '../../services/layoutEngine';

export interface NFAToDFAStepByStepModalProps {
  isOpen: boolean;
  nfaGraph: AutomatonGraph;
  onClose: () => void;
  onApplyDFA: (dfaGraph: AutomatonGraph) => void;
}

export interface StepRecord {
  stepIndex: number;
  type: 'INIT' | 'TRANSITION' | 'COMPLETE';
  fromDfaState: string;
  fromSubset: string[];
  symbol: string;
  moveSet: string[];
  targetClosure: string[];
  toDfaState: string;
  isNewState: boolean;
  isAccepting: boolean;
  toProcessQueue: Array<{ dfaState: string; subset: string[] }>;
  processedSubsets: Array<{ dfaState: string; subset: string[] }>;
  knownSubsets: Array<{
    dfaState: string;
    subset: string[];
    isProcessed: boolean;
    isAccepting: boolean;
  }>;
  partialDfaGraph: AutomatonGraph;
  explanation: string;
  moveExplanation: string;
  acceptExplanation: string;
}

/**
 * Interactive SVG Container supporting Scroll Zoom & Mouse Drag Panning
 */
interface ZoomableSVGContainerProps {
  viewBox: string;
  className?: string;
  children: React.ReactNode;
}

const ZoomableSVGContainer: React.FC<ZoomableSVGContainerProps> = ({
  viewBox,
  className = '',
  children,
}) => {
  const [zoom, setZoom] = useState<number>(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const handleWheel = (e: React.WheelEvent) => {
    const zoomFactor = e.deltaY < 0 ? 1.15 : 0.85;
    setZoom((prev) => Math.min(4, Math.max(0.2, prev * zoomFactor)));
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPan({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => setIsDragging(false);

  const handleReset = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  return (
    <div
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      className={`flex-1 w-full h-full relative overflow-hidden bg-slate-950 cursor-grab active:cursor-grabbing select-none ${className}`}
    >
      {/* Controls toolbar */}
      <div className="absolute bottom-3 right-3 z-20 flex items-center gap-1 bg-slate-900/90 border border-slate-800 rounded-xl p-1 shadow-xl text-slate-300">
        <button
          onClick={(e) => {
            e.stopPropagation();
            setZoom((prev) => Math.min(4, prev * 1.25));
          }}
          className="p-1.5 hover:bg-slate-800 hover:text-white rounded-lg transition cursor-pointer"
          title="Zoom In (Scroll Up)"
        >
          <ZoomIn className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            setZoom((prev) => Math.max(0.2, prev / 1.25));
          }}
          className="p-1.5 hover:bg-slate-800 hover:text-white rounded-lg transition cursor-pointer"
          title="Zoom Out (Scroll Down)"
        >
          <ZoomOut className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleReset();
          }}
          className="p-1.5 hover:bg-slate-800 hover:text-white rounded-lg transition cursor-pointer"
          title="Reset View"
        >
          <Maximize2 className="w-3.5 h-3.5" />
        </button>
        <span className="px-1.5 font-mono text-[10px] text-slate-400 font-bold border-l border-slate-800">
          {Math.round(zoom * 100)}%
        </span>
      </div>

      <svg viewBox={viewBox} preserveAspectRatio="xMidYMid meet" className="w-full h-full">
        <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>{children}</g>
      </svg>
    </div>
  );
};

/**
 * Formats NFA subset state IDs into user-friendly NFA labels (e.g., q0, q1, q2).
 */
export function formatNfaSubsetLabels(ids: string[], nfaGraph: AutomatonGraph): string {
  if (!ids || ids.length === 0) return '∅';
  const labels = ids.map((id) => {
    const st = nfaGraph.states.find((s) => s.id === id || s.label === id);
    return st ? st.label || st.id : id;
  });
  return `{${labels.join(', ')}}`;
}

/**
 * Computes a dynamic SVG viewBox fitting all graph states cleanly.
 */
function computeSVGViewBox(states: AutomatonState[], padding = 70): string {
  if (!states || states.length === 0) return '0 0 500 350';
  const xs = states.map((s) => s.x);
  const ys = states.map((s) => s.y);
  const minX = Math.min(...xs) - padding;
  const minY = Math.min(...ys) - padding;
  const maxX = Math.max(...xs) + padding;
  const maxY = Math.max(...ys) + padding;
  const width = Math.max(350, maxX - minX);
  const height = Math.max(250, maxY - minY);
  return `${minX} ${minY} ${width} ${height}`;
}

/**
 * Builds the full step-by-step trajectory of Subset Construction.
 */
function buildSubsetConstructionSteps(nfaGraph: AutomatonGraph): {
  steps: StepRecord[];
  finalDfaGraph: AutomatonGraph;
} {
  const alphabet = (nfaGraph.alphabet || ['0', '1']).filter(
    (sym) => sym !== 'ε' && sym !== 'e'
  );
  const startStates = nfaGraph.states.filter((s) => s.isStart).map((s) => s.id);
  const initialClosure = Array.from(
    getEpsilonClosureSet(startStates, nfaGraph.transitions)
  ).sort();

  const getKey = (ids: string[]) => ids.sort().join(',');

  const dfaStateMap: { [dfaName: string]: string[] } = {};
  const keyToDfaName: { [key: string]: string } = {};

  let stateCounter = 0;
  const getNextStateName = () => {
    const charCode = 65 + (stateCounter % 26);
    const suffix = Math.floor(stateCounter / 26);
    stateCounter++;
    return String.fromCharCode(charCode) + (suffix > 0 ? suffix : '');
  };

  const initialKey = getKey(initialClosure);
  const startDfaName = getNextStateName();
  dfaStateMap[startDfaName] = initialClosure;
  keyToDfaName[initialKey] = startDfaName;

  const toProcessQueue: Array<{ dfaState: string; subset: string[] }> = [
    { dfaState: startDfaName, subset: initialClosure },
  ];
  const processedSubsets: Array<{ dfaState: string; subset: string[] }> = [];

  const isStartAccepting = initialClosure.some((nfaId) =>
    nfaGraph.states.some((s) => s.id === nfaId && s.isAccept)
  );

  const knownSubsets: Array<{
    dfaState: string;
    subset: string[];
    isProcessed: boolean;
    isAccepting: boolean;
  }> = [
    {
      dfaState: startDfaName,
      subset: initialClosure,
      isProcessed: false,
      isAccepting: isStartAccepting,
    },
  ];

  const currentDfaTransitions: AutomatonTransition[] = [];

  const getNfaLabels = (ids: string[]) => formatNfaSubsetLabels(ids, nfaGraph);

  const buildPartialGraph = (): AutomatonGraph => {
    const rawStates: AutomatonState[] = knownSubsets.map((item, idx) => ({
      id: item.dfaState,
      label: item.dfaState,
      isStart: item.dfaState === startDfaName,
      isAccept: item.isAccepting,
      x: 100 + (idx % 4) * 180,
      y: 100 + Math.floor(idx / 4) * 160,
    }));

    return applyDagreLayout({
      id: `dfa_partial_${Date.now()}`,
      name: `${nfaGraph.name} (DFA)`,
      type: 'DFA',
      alphabet,
      states: rawStates,
      transitions: [...currentDfaTransitions],
    });
  };

  const steps: StepRecord[] = [];

  // Step 0: INIT
  steps.push({
    stepIndex: 0,
    type: 'INIT',
    fromDfaState: startDfaName,
    fromSubset: initialClosure,
    symbol: '',
    moveSet: [],
    targetClosure: initialClosure,
    toDfaState: startDfaName,
    isNewState: true,
    isAccepting: isStartAccepting,
    toProcessQueue: JSON.parse(JSON.stringify(toProcessQueue)),
    processedSubsets: JSON.parse(JSON.stringify(processedSubsets)),
    knownSubsets: JSON.parse(JSON.stringify(knownSubsets)),
    partialDfaGraph: buildPartialGraph(),
    explanation: `We begin with the ε-closure of the NFA start state ${getNfaLabels(
      startStates
    )}. This subset ${getNfaLabels(initialClosure)} becomes DFA Start State '${startDfaName}'.`,
    moveExplanation: `Initial ε-closure set: ${getNfaLabels(initialClosure)}`,
    acceptExplanation: isStartAccepting
      ? `Subset ${getNfaLabels(initialClosure)} contains an accepting NFA state. Therefore, DFA State '${startDfaName}' is an Accept State.`
      : `Subset ${getNfaLabels(initialClosure)} contains no accepting NFA states. State '${startDfaName}' is a Non-Accepting State.`,
  });

  let stepCounter = 1;

  while (toProcessQueue.length > 0) {
    const currentItem = toProcessQueue.shift()!;
    const { dfaState: currentDfaName, subset: currentSubset } = currentItem;

    // Mark processed
    processedSubsets.push(currentItem);
    const knownItem = knownSubsets.find((k) => k.dfaState === currentDfaName);
    if (knownItem) knownItem.isProcessed = true;

    for (const symbol of alphabet) {
      // Direct outgoing transitions
      const moveSet = Array.from(
        new Set(
          nfaGraph.transitions
            .filter(
              (t) => currentSubset.includes(t.source) && (t.symbols || []).includes(symbol)
            )
            .map((t) => t.target)
        )
      );

      // Target ε-closure
      const targetClosure = Array.from(
        getEpsilonClosureSet(moveSet, nfaGraph.transitions)
      ).sort();

      const targetKey = getKey(targetClosure);
      let targetDfaName: string;
      let isNew = false;

      if (targetClosure.length === 0) {
        targetDfaName = 'Trap';
        if (!keyToDfaName['Trap']) {
          keyToDfaName['Trap'] = 'Trap';
          dfaStateMap['Trap'] = [];
          toProcessQueue.push({ dfaState: 'Trap', subset: [] });
          knownSubsets.push({
            dfaState: 'Trap',
            subset: [],
            isProcessed: false,
            isAccepting: false,
          });
          isNew = true;
        }
      } else if (keyToDfaName[targetKey]) {
        targetDfaName = keyToDfaName[targetKey];
      } else {
        targetDfaName = getNextStateName();
        keyToDfaName[targetKey] = targetDfaName;
        dfaStateMap[targetDfaName] = targetClosure;
        toProcessQueue.push({ dfaState: targetDfaName, subset: targetClosure });

        const isTargetAccepting = targetClosure.some((nfaId) =>
          nfaGraph.states.some((s) => s.id === nfaId && s.isAccept)
        );

        knownSubsets.push({
          dfaState: targetDfaName,
          subset: targetClosure,
          isProcessed: false,
          isAccepting: isTargetAccepting,
        });
        isNew = true;
      }

      // Add transition if not present
      const existing = currentDfaTransitions.find(
        (t) => t.source === currentDfaName && t.target === targetDfaName
      );
      if (existing) {
        if (!existing.symbols.includes(symbol)) {
          existing.symbols.push(symbol);
        }
      } else {
        currentDfaTransitions.push({
          id: `t_${currentDfaName}_${targetDfaName}_${symbol}`,
          source: currentDfaName,
          target: targetDfaName,
          symbols: [symbol],
        });
      }

      const isTargetAccepting = targetClosure.some((nfaId) =>
        nfaGraph.states.some((s) => s.id === nfaId && s.isAccept)
      );

      steps.push({
        stepIndex: stepCounter++,
        type: 'TRANSITION',
        fromDfaState: currentDfaName,
        fromSubset: currentSubset,
        symbol,
        moveSet,
        targetClosure,
        toDfaState: targetDfaName,
        isNewState: isNew,
        isAccepting: isTargetAccepting,
        toProcessQueue: JSON.parse(JSON.stringify(toProcessQueue)),
        processedSubsets: JSON.parse(JSON.stringify(processedSubsets)),
        knownSubsets: JSON.parse(JSON.stringify(knownSubsets)),
        partialDfaGraph: buildPartialGraph(),
        explanation: `From DFA State '${currentDfaName}' ${getNfaLabels(
          currentSubset
        )}, reading symbol '${symbol}' yields Move set ${getNfaLabels(
          moveSet
        )}. Its ε-closure is ${getNfaLabels(targetClosure)}, which maps to DFA State '${targetDfaName}'.${
          isNew ? ' [New DFA State Discovered!]' : ''
        }`,
        moveExplanation: `Move(${getNfaLabels(currentSubset)}, '${symbol}') = ${getNfaLabels(
          moveSet
        )} ➔ ε-Closure = ${getNfaLabels(targetClosure)}`,
        acceptExplanation: isTargetAccepting
          ? `Subset ${getNfaLabels(targetClosure)} contains an accepting NFA state. DFA State '${targetDfaName}' is marked Accepting.`
          : `Subset ${getNfaLabels(targetClosure)} contains no accepting NFA states.`,
      });
    }
  }

  // Step COMPLETE
  const finalGraph = buildPartialGraph();
  steps.push({
    stepIndex: stepCounter,
    type: 'COMPLETE',
    fromDfaState: '',
    fromSubset: [],
    symbol: '',
    moveSet: [],
    targetClosure: [],
    toDfaState: '',
    isNewState: false,
    isAccepting: false,
    toProcessQueue: [],
    processedSubsets: JSON.parse(JSON.stringify(processedSubsets)),
    knownSubsets: JSON.parse(JSON.stringify(knownSubsets)),
    partialDfaGraph: finalGraph,
    explanation:
      'All discovered subsets have been fully processed! The NFA to DFA conversion via Subset Construction is complete.',
    moveExplanation: 'Conversion finished successfully.',
    acceptExplanation: 'Final deterministic finite automaton generated.',
  });

  return { steps, finalDfaGraph: finalGraph };
}

export const NFAToDFAStepByStepModal: React.FC<NFAToDFAStepByStepModalProps> = ({
  isOpen,
  nfaGraph,
  onClose,
  onApplyDFA,
}) => {
  // Apply Dagre layout to the input NFA graph so states are cleanly arranged
  const laidOutNfaGraph = useMemo(() => {
    return applyDagreLayout(nfaGraph);
  }, [nfaGraph]);

  const { steps, finalDfaGraph } = useMemo(
    () => buildSubsetConstructionSteps(laidOutNfaGraph),
    [laidOutNfaGraph]
  );

  const [currentStepIdx, setCurrentStepIdx] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [speed, setSpeed] = useState<number>(1); // 0.5x, 1x, 2x
  const [educationalMode, setEducationalMode] = useState<boolean>(true);
  const [selectedDfaState, setSelectedDfaState] = useState<string | null>(null);

  const currentStep = steps[currentStepIdx] || steps[0];
  const isFinalStep = currentStepIdx === steps.length - 1;

  // Auto-play timer effect
  useEffect(() => {
    if (!isPlaying) return;
    if (isFinalStep) {
      setIsPlaying(false);
      return;
    }

    const delay = Math.round(1500 / speed);
    const timer = setTimeout(() => {
      setCurrentStepIdx((prev) => Math.min(steps.length - 1, prev + 1));
    }, delay);

    return () => clearTimeout(timer);
  }, [isPlaying, currentStepIdx, isFinalStep, speed, steps.length]);

  if (!isOpen) return null;

  const alphabet = laidOutNfaGraph.alphabet.filter((s) => s !== 'ε' && s !== 'e');

  const nfaViewBox = computeSVGViewBox(laidOutNfaGraph.states);
  const dfaViewBox = computeSVGViewBox(currentStep.partialDfaGraph.states);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-950/95 backdrop-blur-xl text-slate-100 animate-in fade-in duration-200 select-none overflow-hidden">
      {/* ── TOP CONTROL TOOLBAR ── */}
      <div className="flex items-center justify-between px-5 py-3 bg-slate-900 border-b border-slate-800 shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-sky-600/20 border border-sky-500/40 text-sky-400 rounded-xl">
            <GraduationCap className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              NFA → DFA Interactive Step-by-Step Conversion
              <span className="px-2 py-0.5 bg-sky-950 text-sky-300 border border-sky-500/40 rounded-full text-[10px] uppercase tracking-wider font-mono font-semibold">
                Subset Construction
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              Interactive classroom demonstration of powerset state creation and move functions
            </p>
          </div>
        </div>

        {/* Stepper Controls */}
        <div className="flex items-center gap-2">
          {/* Previous Step */}
          <button
            disabled={currentStepIdx === 0}
            onClick={() => {
              setIsPlaying(false);
              setCurrentStepIdx((prev) => Math.max(0, prev - 1));
            }}
            className="p-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 rounded-xl text-slate-200 transition cursor-pointer flex items-center gap-1 text-xs font-semibold"
            title="Previous Step"
          >
            <ChevronLeft className="w-4 h-4" /> Previous
          </button>

          {/* Step Indicator Counter */}
          <div className="px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl font-mono text-xs text-sky-300 font-bold">
            Step {currentStepIdx + 1} / {steps.length}
          </div>

          {/* Next Step */}
          <button
            disabled={isFinalStep}
            onClick={() => {
              setIsPlaying(false);
              setCurrentStepIdx((prev) => Math.min(steps.length - 1, prev + 1));
            }}
            className="p-2 bg-sky-600 hover:bg-sky-500 disabled:opacity-40 rounded-xl text-white transition cursor-pointer flex items-center gap-1 text-xs font-semibold"
            title="Next Step"
          >
            Next <ChevronRight className="w-4 h-4" />
          </button>

          {/* Play / Pause Toggle */}
          <button
            onClick={() => setIsPlaying((prev) => !prev)}
            className={`p-2 rounded-xl text-white font-bold transition flex items-center gap-1.5 text-xs cursor-pointer ${
              isPlaying
                ? 'bg-amber-600 hover:bg-amber-500 shadow-lg shadow-amber-600/30'
                : 'bg-emerald-600 hover:bg-emerald-500 shadow-lg shadow-emerald-600/30'
            }`}
          >
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            {isPlaying ? 'Pause' : 'Play'}
          </button>

          {/* Restart Button */}
          <button
            onClick={() => {
              setIsPlaying(false);
              setCurrentStepIdx(0);
            }}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition cursor-pointer"
            title="Restart Stepper"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          {/* Finish Conversion Button */}
          <button
            onClick={() => {
              setIsPlaying(false);
              setCurrentStepIdx(steps.length - 1);
            }}
            className="px-3 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-bold text-xs shadow-lg shadow-purple-600/30 transition cursor-pointer flex items-center gap-1.5"
            title="Jump to Finish"
          >
            <CheckCircle2 className="w-4 h-4" /> Finish Conversion
          </button>

          <div className="h-6 w-[1px] bg-slate-800 my-auto" />

          {/* Speed Selector */}
          <div className="flex items-center bg-slate-950 border border-slate-800 rounded-xl p-1 text-[11px] font-mono font-bold text-slate-400">
            {[0.5, 1, 2].map((s) => (
              <button
                key={s}
                onClick={() => setSpeed(s)}
                className={`px-2 py-1 rounded-lg transition cursor-pointer ${
                  speed === s ? 'bg-sky-600 text-white' : 'hover:text-slate-200'
                }`}
              >
                {s}x
              </button>
            ))}
          </div>

          {/* Educational Mode Toggle */}
          <button
            onClick={() => setEducationalMode((prev) => !prev)}
            className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              educationalMode
                ? 'bg-sky-950/80 border-sky-500/60 text-sky-300 shadow-md shadow-sky-500/20'
                : 'bg-slate-800/80 border-slate-700 text-slate-400'
            }`}
          >
            <GraduationCap className="w-4 h-4" />
            Edu Mode: {educationalMode ? 'ON' : 'OFF'}
          </button>

          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-800 rounded-xl text-slate-400 hover:text-white transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* ── MAIN HORIZONTAL SPLIT BODY LAYOUT ── */}
      <div className="flex-1 flex flex-col overflow-hidden relative">
        {/* ── TOP SECTION: ALGORITHM EXECUTION, QUEUE & TABLES (COMPACT AUTO-HEIGHT) ── */}
        <div className="max-h-[35%] min-h-[160px] bg-slate-950 border-b border-slate-800 overflow-y-auto p-3 shrink-0">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* 1. Step Action Header Card */}
            <div className="p-3.5 bg-slate-900/90 border border-slate-800 rounded-2xl space-y-2.5 shadow-xl">
              <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
                <span className="font-bold text-xs text-sky-400 flex items-center gap-1.5 uppercase tracking-wider">
                  <Sparkles className="w-3.5 h-3.5" /> Current Step Execution
                </span>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 bg-sky-950 text-sky-300 border border-sky-500/40 rounded-full">
                  {currentStep.type}
                </span>
              </div>

              {/* Step Computation Info */}
              <div className="font-mono text-xs space-y-1.5">
                <div className="p-2 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between">
                  <span className="text-slate-400">Processing DFA State:</span>
                  <span className="font-bold text-amber-400 text-xs">
                    {currentStep.fromDfaState || 'Start'} {formatNfaSubsetLabels(currentStep.fromSubset, laidOutNfaGraph)}
                  </span>
                </div>

                {currentStep.type === 'TRANSITION' && (
                  <div className="p-2 bg-slate-950 border border-slate-800 rounded-xl space-y-1">
                    <div className="flex items-center justify-between text-slate-300">
                      <span>Input Symbol:</span>
                      <span className="font-bold text-sky-400 bg-sky-950 px-1.5 py-0.5 border border-sky-500/40 rounded">
                        '{currentStep.symbol}'
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-400 truncate">
                      {currentStep.moveExplanation}
                    </div>
                    <div className="flex items-center justify-between pt-1 border-t border-slate-800/80">
                      <span>Target State:</span>
                      <span className="font-bold text-emerald-400">
                        {currentStep.toDfaState} {formatNfaSubsetLabels(currentStep.targetClosure, laidOutNfaGraph)}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Educational Explanation Box */}
              {educationalMode && (
                <div className="p-2.5 bg-sky-950/40 border border-sky-500/40 rounded-xl space-y-0.5 text-xs text-sky-200">
                  <div className="flex items-center gap-1 font-bold text-sky-300 text-[10px]">
                    <Info className="w-3 h-3 text-sky-400 shrink-0" /> Step Rationale
                  </div>
                  <p className="text-[10px] leading-relaxed text-sky-100/90 font-sans">
                    {currentStep.explanation}
                  </p>
                </div>
              )}
            </div>

            {/* 2. Queue Visualization Card */}
            <div className="p-3.5 bg-slate-900/90 border border-slate-800 rounded-2xl space-y-2 shadow-xl font-mono text-xs">
              <div className="flex items-center justify-between border-b border-slate-800 pb-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                <span className="flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-amber-400" /> Subsets Processing Queue
                </span>
              </div>

              <div className="space-y-2 text-[11px]">
                <div className="p-2 bg-slate-950 border border-slate-800 rounded-xl space-y-1">
                  <span className="text-[10px] text-amber-400 font-bold uppercase block">
                    To Process ({currentStep.toProcessQueue.length}):
                  </span>
                  <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto">
                    {currentStep.toProcessQueue.length === 0 ? (
                      <span className="text-slate-500 text-[10px]">Queue Empty</span>
                    ) : (
                      currentStep.toProcessQueue.map((item, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 bg-amber-950/80 border border-amber-500/50 text-amber-300 rounded-md font-bold text-[10px]"
                        >
                          {item.dfaState} {formatNfaSubsetLabels(item.subset, laidOutNfaGraph)}
                        </span>
                      ))
                    )}
                  </div>
                </div>

                <div className="p-2 bg-slate-950 border border-slate-800 rounded-xl space-y-1">
                  <span className="text-[10px] text-emerald-400 font-bold uppercase block">
                    Processed ({currentStep.processedSubsets.length}):
                  </span>
                  <div className="flex flex-wrap gap-1 max-h-16 overflow-y-auto">
                    {currentStep.processedSubsets.map((item, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 rounded-md font-bold text-[10px]"
                      >
                        {item.dfaState}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* 3. Subset Mapping Table */}
            <div className="p-3.5 bg-slate-900/90 border border-slate-800 rounded-2xl space-y-1.5 shadow-xl font-mono text-xs">
              <div className="flex items-center justify-between border-b border-slate-800 pb-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                <span>DFA Subsets ({currentStep.knownSubsets.length}):</span>
                <span className="text-[9px] text-slate-500">Click to highlight</span>
              </div>

              <div className="overflow-x-auto max-h-40 rounded-xl border border-slate-800">
                <table className="w-full text-left text-[11px]">
                  <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 sticky top-0">
                    <tr>
                      <th className="p-1.5">State</th>
                      <th className="p-1.5">Subset</th>
                      <th className="p-1.5 text-center">Done</th>
                      <th className="p-1.5 text-center">Accept</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 bg-slate-900/60">
                    {currentStep.knownSubsets.map((row) => {
                      const isSelected = selectedDfaState === row.dfaState;
                      return (
                        <tr
                          key={row.dfaState}
                          onClick={() => setSelectedDfaState(row.dfaState)}
                          className={`cursor-pointer transition ${
                            isSelected
                              ? 'bg-sky-950/90 text-sky-200'
                              : 'hover:bg-slate-800/80 text-slate-200'
                          }`}
                        >
                          <td className="p-1.5 font-bold text-amber-300">{row.dfaState}</td>
                          <td className="p-1.5 text-sky-400 font-bold">
                            {formatNfaSubsetLabels(row.subset, laidOutNfaGraph)}
                          </td>
                          <td className="p-1.5 text-center">
                            {row.isProcessed ? (
                              <Check className="w-3.5 h-3.5 text-emerald-400 inline" />
                            ) : (
                              <span className="text-slate-500 text-[10px]">—</span>
                            )}
                          </td>
                          <td className="p-1.5 text-center">
                            {row.isAccepting ? (
                              <span className="px-1 py-0.5 bg-emerald-950 text-emerald-300 border border-emerald-500/40 rounded text-[9px] font-bold">
                                YES
                              </span>
                            ) : (
                              <span className="text-slate-500 text-[10px]">No</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 4. Incremental DFA Transition Matrix & Summary Card */}
            <div className="p-3.5 bg-slate-900/90 border border-slate-800 rounded-2xl space-y-1.5 shadow-xl font-mono text-xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block border-b border-slate-800 pb-1">
                DFA Transition Matrix:
              </span>

              <div className="overflow-x-auto max-h-36 rounded-xl border border-slate-800">
                <table className="w-full text-center text-[11px]">
                  <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 sticky top-0">
                    <tr>
                      <th className="p-1.5 text-left">State</th>
                      {alphabet.map((sym) => (
                        <th key={sym} className="p-1.5">
                          '{sym}'
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 bg-slate-900/60">
                    {currentStep.knownSubsets.map((row) => {
                      const rowTransitions = currentStep.partialDfaGraph.transitions.filter(
                        (t) => t.source === row.dfaState
                      );

                      return (
                        <tr key={row.dfaState} className="hover:bg-slate-800/50">
                          <td className="p-1.5 text-left font-bold text-amber-300">
                            {row.dfaState}
                          </td>
                          {alphabet.map((sym) => {
                            const edge = rowTransitions.find((t) =>
                              (t.symbols || []).includes(sym)
                            );
                            return (
                              <td key={sym} className="p-1.5 text-sky-300 font-bold">
                                {edge ? edge.target : '—'}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {isFinalStep && (
                <div className="pt-1">
                  <button
                    onClick={() => {
                      onApplyDFA(finalDfaGraph);
                      onClose();
                    }}
                    className="w-full py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs shadow-lg transition cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" /> Apply DFA to Canvas
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── BOTTOM SECTION: DIAGRAMS SIDE-BY-SIDE (EXPANDS TO FILL REMAINING SPACE) ── */}
        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 overflow-hidden relative border-t border-slate-800">
          {/* Bottom Left: Original NFA Graph (50% Width) */}
          <div className="bg-slate-900/80 border-r border-slate-800 flex flex-col overflow-hidden relative">
            <div className="px-4 py-2 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between text-xs font-bold text-sky-400 uppercase tracking-wider shrink-0">
              <span className="flex items-center gap-1.5">
                <Layers className="w-4 h-4" /> Original NFA Graph
              </span>
              <span className="text-[10px] text-slate-500 font-mono">
                Active Subset:{' '}
                {selectedDfaState
                  ? `{${(
                      currentStep.knownSubsets.find((k) => k.dfaState === selectedDfaState)
                        ?.subset || []
                    ).join(', ')}}`
                  : `{${(currentStep.fromSubset || []).join(', ')}}`}
              </span>
            </div>

            <ZoomableSVGContainer viewBox={nfaViewBox}>
              <defs>
                <marker
                  id="nfa-arrow-active"
                  viewBox="0 0 10 10"
                  refX="28"
                  refY="5"
                  markerWidth="6"
                  markerHeight="6"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 0 L 10 5 L 0 10 z" fill="#38bdf8" />
                </marker>
                <marker
                  id="nfa-arrow-muted"
                  viewBox="0 0 10 10"
                  refX="28"
                  refY="5"
                  markerWidth="6"
                  markerHeight="6"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 0 L 10 5 L 0 10 z" fill="#475569" />
                </marker>
              </defs>

              {/* NFA Transitions */}
              {laidOutNfaGraph.transitions.map((t) => {
                const srcState = laidOutNfaGraph.states.find((s) => s.id === t.source);
                const tgtState = laidOutNfaGraph.states.find((s) => s.id === t.target);
                if (!srcState || !tgtState) return null;

                const isMoveEdge =
                  currentStep.type === 'TRANSITION' &&
                  currentStep.fromSubset.includes(t.source) &&
                  (t.symbols || []).includes(currentStep.symbol);

                const isSelfLoop = t.source === t.target;
                const sx = srcState.x;
                const sy = srcState.y;
                const tx = tgtState.x;
                const ty = tgtState.y;

                if (isSelfLoop) {
                  return (
                    <g key={t.id}>
                      <path
                        d={`M ${sx - 10} ${sy - 22} C ${sx - 25} ${sy - 55}, ${sx + 25} ${sy - 55}, ${sx + 10} ${sy - 22}`}
                        fill="none"
                        stroke={isMoveEdge ? '#38bdf8' : '#475569'}
                        strokeWidth={isMoveEdge ? 3 : 1.5}
                        markerEnd={isMoveEdge ? 'url(#nfa-arrow-active)' : 'url(#nfa-arrow-muted)'}
                      />
                      <text
                        x={sx}
                        y={sy - 58}
                        fill={isMoveEdge ? '#38bdf8' : '#94a3b8'}
                        fontSize="10"
                        fontWeight="bold"
                        textAnchor="middle"
                        fontFamily="monospace"
                      >
                        {t.symbols.join(',')}
                      </text>
                    </g>
                  );
                }

                const mx = (sx + tx) / 2;
                const my = (sy + ty) / 2;

                return (
                  <g key={t.id}>
                    <line
                      x1={sx}
                      y1={sy}
                      x2={tx}
                      y2={ty}
                      stroke={isMoveEdge ? '#38bdf8' : '#475569'}
                      strokeWidth={isMoveEdge ? 3 : 1.5}
                      markerEnd={isMoveEdge ? 'url(#nfa-arrow-active)' : 'url(#nfa-arrow-muted)'}
                    />
                    <rect
                      x={mx - 10}
                      y={my - 8}
                      width={20}
                      height={16}
                      rx={4}
                      fill="#0f172a"
                      stroke={isMoveEdge ? '#38bdf8' : '#334155'}
                      strokeWidth={1}
                    />
                    <text
                      x={mx}
                      y={my + 3}
                      fill={isMoveEdge ? '#38bdf8' : '#cbd5e1'}
                      fontSize="9"
                      fontWeight="bold"
                      textAnchor="middle"
                      fontFamily="monospace"
                    >
                      {t.symbols.join(',')}
                    </text>
                  </g>
                );
              })}

              {/* NFA States */}
              {laidOutNfaGraph.states.map((s) => {
                const activeSubset =
                  selectedDfaState
                    ? currentStep.knownSubsets.find((k) => k.dfaState === selectedDfaState)?.subset || []
                    : currentStep.fromSubset;

                const isInActiveSubset = activeSubset.includes(s.id);

                return (
                  <g key={s.id} transform={`translate(${s.x}, ${s.y})`}>
                    {isInActiveSubset && (
                      <circle
                        r={32}
                        fill="rgba(56, 189, 248, 0.25)"
                        stroke="#38bdf8"
                        strokeWidth={2}
                        className="animate-pulse"
                      />
                    )}

                    <circle
                      r={24}
                      fill={isInActiveSubset ? '#0369a1' : '#0f172a'}
                      stroke={isInActiveSubset ? '#38bdf8' : s.isAccept ? '#10b981' : '#334155'}
                      strokeWidth={isInActiveSubset ? 2.5 : 2}
                    />

                    {s.isAccept && (
                      <circle
                        r={19}
                        fill="none"
                        stroke={isInActiveSubset ? '#38bdf8' : '#10b981'}
                        strokeWidth={1.5}
                      />
                    )}

                    <text
                      textAnchor="middle"
                      dy="4"
                      fill={isInActiveSubset ? '#ffffff' : '#f1f5f9'}
                      fontSize="12"
                      fontWeight="bold"
                      fontFamily="monospace"
                    >
                      {s.label || s.id}
                    </text>
                  </g>
                );
              })}
            </ZoomableSVGContainer>
          </div>

          {/* Bottom Right: Generated DFA Graph (50% Width) */}
          <div className="bg-slate-900/80 flex flex-col overflow-hidden relative">
            <div className="px-4 py-2 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between text-xs font-bold text-emerald-400 uppercase tracking-wider shrink-0">
              <span className="flex items-center gap-1.5">
                <ArrowRightLeft className="w-4 h-4" /> Generated DFA Graph
              </span>
              <span className="text-[10px] text-slate-500 font-mono">
                {currentStep.partialDfaGraph.states.length} states
              </span>
            </div>

            {/* Powerset Subset Mapping Legend Bar */}
            <div className="px-3 py-1.5 bg-slate-950 border-b border-slate-800 text-[11px] font-mono flex items-center gap-2 overflow-x-auto shrink-0 no-scrollbar">
              <span className="text-amber-400 font-bold uppercase tracking-wider shrink-0 text-[10px]">
                Subset Mapping:
              </span>
              {currentStep.knownSubsets.map((item) => (
                <button
                  key={item.dfaState}
                  onClick={() => setSelectedDfaState(item.dfaState)}
                  className={`px-2 py-0.5 border rounded-md font-bold shrink-0 cursor-pointer transition ${
                    selectedDfaState === item.dfaState
                      ? 'bg-sky-900 border-sky-400 text-white shadow-md'
                      : 'bg-slate-900 border-slate-800 text-amber-300 hover:border-slate-700'
                  }`}
                  title={`Click to highlight DFA state ${item.dfaState}`}
                >
                  {item.dfaState} ➔{' '}
                  <span className="text-sky-400 font-normal">
                    {formatNfaSubsetLabels(item.subset, laidOutNfaGraph)}
                  </span>
                </button>
              ))}
            </div>

            <ZoomableSVGContainer viewBox={dfaViewBox}>
              <defs>
                <marker
                  id="dfa-arrow-active"
                  viewBox="0 0 10 10"
                  refX="28"
                  refY="5"
                  markerWidth="6"
                  markerHeight="6"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 0 L 10 5 L 0 10 z" fill="#10b981" />
                </marker>
                <marker
                  id="dfa-arrow-muted"
                  viewBox="0 0 10 10"
                  refX="28"
                  refY="5"
                  markerWidth="6"
                  markerHeight="6"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 0 L 10 5 L 0 10 z" fill="#64748b" />
                </marker>
              </defs>

              {/* DFA Transitions */}
              {currentStep.partialDfaGraph.transitions.map((t) => {
                const src = currentStep.partialDfaGraph.states.find((s) => s.id === t.source);
                const tgt = currentStep.partialDfaGraph.states.find((s) => s.id === t.target);
                if (!src || !tgt) return null;

                const isNewTrans =
                  currentStep.type === 'TRANSITION' &&
                  currentStep.fromDfaState === t.source &&
                  currentStep.toDfaState === t.target;

                const sx = src.x;
                const sy = src.y;
                const tx = tgt.x;
                const ty = tgt.y;

                if (t.source === t.target) {
                  return (
                    <g key={t.id}>
                      <path
                        d={`M ${sx - 10} ${sy - 22} C ${sx - 25} ${sy - 55}, ${sx + 25} ${sy - 55}, ${sx + 10} ${sy - 22}`}
                        fill="none"
                        stroke={isNewTrans ? '#10b981' : '#64748b'}
                        strokeWidth={isNewTrans ? 3 : 1.5}
                        markerEnd={isNewTrans ? 'url(#dfa-arrow-active)' : 'url(#dfa-arrow-muted)'}
                      />
                      <text
                        x={sx}
                        y={sy - 58}
                        fill={isNewTrans ? '#10b981' : '#94a3b8'}
                        fontSize="10"
                        fontWeight="bold"
                        textAnchor="middle"
                        fontFamily="monospace"
                      >
                        {t.symbols.join(',')}
                      </text>
                    </g>
                  );
                }

                const mx = (sx + tx) / 2;
                const my = (sy + ty) / 2;

                return (
                  <g key={t.id}>
                    <line
                      x1={sx}
                      y1={sy}
                      x2={tx}
                      y2={ty}
                      stroke={isNewTrans ? '#10b981' : '#64748b'}
                      strokeWidth={isNewTrans ? 3 : 1.5}
                      markerEnd={isNewTrans ? 'url(#dfa-arrow-active)' : 'url(#dfa-arrow-muted)'}
                    />
                    <rect
                      x={mx - 10}
                      y={my - 8}
                      width={20}
                      height={16}
                      rx={4}
                      fill="#0f172a"
                      stroke={isNewTrans ? '#10b981' : '#334155'}
                      strokeWidth={1}
                    />
                    <text
                      x={mx}
                      y={my + 3}
                      fill={isNewTrans ? '#10b981' : '#cbd5e1'}
                      fontSize="9"
                      fontWeight="bold"
                      textAnchor="middle"
                      fontFamily="monospace"
                    >
                      {t.symbols.join(',')}
                    </text>
                  </g>
                );
              })}

                {/* DFA States */}
              {currentStep.partialDfaGraph.states.map((s) => {
                const isSelected = selectedDfaState === s.id;
                const isNewlyDiscovered =
                  currentStep.type === 'TRANSITION' && currentStep.toDfaState === s.id;

                const knownItem = currentStep.knownSubsets.find((k) => k.dfaState === s.id);
                const subLabel = knownItem
                  ? formatNfaSubsetLabels(knownItem.subset, laidOutNfaGraph)
                  : '';

                return (
                  <g key={s.id} transform={`translate(${s.x}, ${s.y})`}>
                    {(isSelected || isNewlyDiscovered) && (
                      <circle
                        r={32}
                        fill="rgba(16, 185, 129, 0.25)"
                        stroke="#10b981"
                        strokeWidth={2}
                        className="animate-pulse"
                      />
                    )}

                    <circle
                      r={24}
                      fill={s.isStart ? '#1e1b4b' : '#0f172a'}
                      stroke={s.isAccept ? '#10b981' : s.isStart ? '#818cf8' : '#475569'}
                      strokeWidth={2.5}
                    />

                    {s.isAccept && (
                      <circle r={19} fill="none" stroke="#10b981" strokeWidth={1.5} />
                    )}

                    <text
                      textAnchor="middle"
                      dy={subLabel ? "-2" : "4"}
                      fill="#f1f5f9"
                      fontSize="12"
                      fontWeight="bold"
                      fontFamily="monospace"
                    >
                      {s.id}
                    </text>

                    {subLabel && (
                      <text
                        textAnchor="middle"
                        dy="12"
                        fill="#38bdf8"
                        fontSize="8 font-bold"
                        fontFamily="monospace"
                      >
                        {subLabel}
                      </text>
                    )}
                  </g>
                );
              })}
            </ZoomableSVGContainer>
          </div>
        </div>
      </div>
    </div>
  );
};
