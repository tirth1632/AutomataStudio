import React, { useState, useMemo, useEffect } from 'react';
import {
  Columns,
  ShieldCheck,
  Zap,
  Layers,
  Activity,
  Database,
  Play,
  Pause,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  Table,
  CheckCircle2,
  XCircle,
  BarChart3,
  Code,
  Cpu,
  BookOpen,
  ArrowRight,
  Sparkles,
  Link2,
} from 'lucide-react';
import type { NFA } from '../../../algorithms/nfa/NFA';
import { convertNFAToDFA } from '../../../algorithms/nfa/conversion/NFAToDFA';
import { simulateNFA, type NFASimulationStep } from '../../../algorithms/nfa/simulation/NFASimulator';
import { nfaToAutomatonGraph } from '../../../algorithms/nfa/renderer/NFARenderer';
import { computeEpsilonClosure } from '../../../algorithms/shared/EpsilonClosure';
import { SingleAutomatonCanvas } from '../../canvas/SingleAutomatonCanvas';
import { NFABottomEducationalPanel } from './NFABottomEducationalPanel';
import { useSmoothTabScroll } from '../../../hooks/useSmoothTabScroll';
import type { AutomatonGraph } from '../../../types/automata';

interface NFADFAEquivalenceComparisonProps {
  nfa: NFA;
}

export type NFADFATabId = 'overview' | 'statistics' | 'transitions';

export const NFADFAEquivalenceComparison: React.FC<NFADFAEquivalenceComparisonProps> = ({ nfa }) => {
  // Tab Persistence (Defaults to Dual Canvas Simulation 'overview')
  const [activeTab, setActiveTab] = useState<NFADFATabId>('overview');

  const {
    containerRef: tabsRef,
    handleWheel,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleMouseLeave,
  } = useSmoothTabScroll<HTMLDivElement>({
    activeTab,
    autoCenterOnSelect: true,
  });

  // Engine Computation (Deterministic Engine Rule)
  const dfa = useMemo(() => convertNFAToDFA(nfa), [nfa]);

  // Convert NFA & DFA to AutomatonGraph objects for independent canvases
  const nfaGraph: AutomatonGraph = useMemo(() => nfaToAutomatonGraph(nfa, 'Original NFA'), [nfa]);

  const dfaAsNFA: NFA = useMemo(() => {
    const nfaTrans: { [state: string]: { [symbol: string]: string[] } } = {};
    for (const s of dfa.states) {
      nfaTrans[s] = {};
      for (const sym of Object.keys(dfa.transitions[s] || {})) {
        if (dfa.transitions[s][sym]) {
          nfaTrans[s][sym] = [dfa.transitions[s][sym]];
        }
      }
    }
    return {
      alphabet: dfa.alphabet,
      states: dfa.states,
      startState: dfa.startState,
      acceptStates: dfa.acceptStates,
      transitions: nfaTrans,
    };
  }, [dfa]);

  const dfaGraph: AutomatonGraph = useMemo(() => nfaToAutomatonGraph(dfaAsNFA, 'Equivalent DFA'), [dfaAsNFA]);

  // Synchronized Simulation State
  const [testString, setTestString] = useState<string>('0101');
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1000);

  // Correspondence Overlay Toggle & Cross-Highlighting State
  const [showCorrespondenceOverlay, setShowCorrespondenceOverlay] = useState<boolean>(true);
  const [hoveredNFAStateId, setHoveredNFAStateId] = useState<string | null>(null);
  const [hoveredDFAStateId, setHoveredDFAStateId] = useState<string | null>(null);

  const handleNFAHover = React.useCallback((id: string | null) => {
    setHoveredNFAStateId((prev) => (prev === id ? prev : id));
  }, []);

  const handleDFAHover = React.useCallback((id: string | null) => {
    setHoveredDFAStateId((prev) => (prev === id ? prev : id));
  }, []);

  // Engine NFA Simulation Steps
  const nfaSteps: NFASimulationStep[] = useMemo(() => {
    return simulateNFA(nfa, testString);
  }, [nfa, testString]);

  // Engine DFA Simulation Steps
  const dfaSteps = useMemo(() => {
    const steps: Array<{
      stepIndex: number;
      dfaState: string;
      nfaSubsetEquivalent: string[];
      consumed: string;
      remaining: string;
      symbol: string | null;
      isAccepting: boolean;
    }> = [];

    let currentState = dfa.startState;
    let consumed = '';

    steps.push({
      stepIndex: 0,
      dfaState: currentState,
      nfaSubsetEquivalent: dfa.subsetMap[currentState] || [],
      consumed: '',
      remaining: testString,
      symbol: testString.length > 0 ? testString[0] : null,
      isAccepting: testString.length === 0 && dfa.acceptStates.includes(currentState),
    });

    for (let i = 0; i < testString.length; i++) {
      const sym = testString[i];
      consumed += sym;
      const remaining = testString.slice(i + 1);

      const nextState = dfa.transitions[currentState]?.[sym] || 'DEAD';
      currentState = nextState;

      const isLast = i === testString.length - 1;
      steps.push({
        stepIndex: i + 1,
        dfaState: currentState,
        nfaSubsetEquivalent: dfa.subsetMap[currentState] || [],
        consumed,
        remaining,
        symbol: isLast ? null : remaining[0],
        isAccepting: isLast && dfa.acceptStates.includes(currentState),
      });
    }

    return steps;
  }, [dfa, testString]);

  // Playback timer
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (isPlaying) {
      interval = setInterval(() => {
        setCurrentStepIndex((prev) => {
          if (prev >= nfaSteps.length - 1) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, playbackSpeed);
    }
    return () => clearInterval(interval);
  }, [isPlaying, nfaSteps.length, playbackSpeed]);

  const activeNFAStep = nfaSteps[Math.min(currentStepIndex, nfaSteps.length - 1)] || nfaSteps[0];
  const activeDFAStep = dfaSteps[Math.min(currentStepIndex, dfaSteps.length - 1)] || dfaSteps[0];

  // Epsilon-closure computation for NFA display
  const currentEpsilonClosure = useMemo(() => {
    return Array.from(computeEpsilonClosure(activeNFAStep.activeStates, nfa.transitions)).sort();
  }, [nfa.transitions, activeNFAStep.activeStates]);

  // Compute transition metrics
  const nfaTransitionsCount = useMemo(() => {
    let count = 0;
    for (const src of Object.keys(nfa.transitions)) {
      for (const sym of Object.keys(nfa.transitions[src] || {})) {
        count += (nfa.transitions[src][sym] || []).length;
      }
    }
    return count;
  }, [nfa]);

  const nfaEpsilonTransitionsCount = useMemo(() => {
    let count = 0;
    for (const src of Object.keys(nfa.transitions)) {
      count += (nfa.transitions[src]?.['ε'] || nfa.transitions[src]?.['epsilon'] || []).length;
    }
    return count;
  }, [nfa]);

  const dfaTransitionsCount = useMemo(() => {
    let count = 0;
    for (const src of Object.keys(dfa.transitions)) {
      count += Object.keys(dfa.transitions[src] || {}).length;
    }
    return count;
  }, [dfa]);

  const conversionCostRatio = (dfa.states.length / Math.max(1, nfa.states.length)).toFixed(2);

  // Cross-highlighting calculation
  const highlightedNFAStates = useMemo(() => {
    if (hoveredDFAStateId) {
      return dfa.subsetMap[hoveredDFAStateId] || [];
    }
    return activeNFAStep.activeStates;
  }, [hoveredDFAStateId, dfa.subsetMap, activeNFAStep.activeStates]);

  const highlightedDFAState = useMemo(() => {
    if (hoveredNFAStateId) {
      // Find DFA state containing hoveredNFAStateId
      for (const dfaSt of dfa.states) {
        if ((dfa.subsetMap[dfaSt] || []).includes(hoveredNFAStateId)) {
          return dfaSt;
        }
      }
    }
    return activeDFAStep.dfaState;
  }, [hoveredNFAStateId, dfa.states, dfa.subsetMap, activeDFAStep.dfaState]);

  const tabs: Array<{ id: NFADFATabId; label: string; icon: any }> = [
    { id: 'overview', label: 'Dual Canvas Simulation', icon: Columns },
    { id: 'statistics', label: 'Statistics & Dashboard', icon: BarChart3 },
    { id: 'transitions', label: 'Transition Tables', icon: Table },
  ];

  return (
    <div className="space-y-5 text-slate-100 font-sans">
      {/* Header Banner */}
      <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl flex items-center justify-between shadow-xl">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-purple-600/20 border border-purple-500/40 text-purple-400 rounded-2xl">
            <Columns className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base font-extrabold text-white flex items-center gap-2">
              📊 Dual Canvas NFA vs DFA Comparison Laboratory
            </h2>
            <p className="text-xs text-slate-400">
              Side-by-side Automata Graphs, Synchronized Execution & Interactive Subset Mapping
            </p>
          </div>
        </div>

        <div className="px-3 py-1.5 bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 rounded-full font-mono text-xs font-bold flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          L(NFA) ≡ L(DFA)
        </div>
      </div>

      {/* Workspace Tab Navigation Bar (Full Width Equal Grid) */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-1.5 shadow-lg">
        <div className="grid grid-cols-3 gap-2 w-full select-none">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isSel = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                data-tab={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98] ${
                  isSel
                    ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30 border border-purple-400/30 ring-1 ring-purple-400/20'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/80 border border-transparent'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* SHARED SYNCHRONIZED SIMULATION CONTROLS BAR */}
      <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl space-y-3 shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-4 font-sans text-xs">
          {/* Input string tester */}
          <div className="flex items-center gap-3">
            <span className="font-bold text-slate-300">Input String:</span>
            <input
              type="text"
              value={testString}
              onChange={(e) => {
                setTestString(e.target.value);
                setCurrentStepIndex(0);
                setIsPlaying(false);
              }}
              className="px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-indigo-300 focus:outline-none focus:border-purple-500 w-44 font-bold"
              placeholder="Enter symbols..."
            />
          </div>

          {/* Controls: Play/Pause, Prev, Next, Reset, Speed */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentStepIndex((prev) => Math.max(0, prev - 1))}
              disabled={currentStepIndex === 0}
              className="p-2 bg-slate-950 hover:bg-slate-800 text-slate-300 disabled:opacity-30 border border-slate-800 rounded-xl cursor-pointer transition"
              title="Previous Step"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <button
              onClick={() => setIsPlaying((prev) => !prev)}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-bold flex items-center gap-2 shadow-md transition cursor-pointer"
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              {isPlaying ? 'Pause' : 'Play'}
            </button>

            <button
              onClick={() => setCurrentStepIndex((prev) => Math.min(nfaSteps.length - 1, prev + 1))}
              disabled={currentStepIndex >= nfaSteps.length - 1}
              className="p-2 bg-slate-950 hover:bg-slate-800 text-slate-300 disabled:opacity-30 border border-slate-800 rounded-xl cursor-pointer transition"
              title="Next Step"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            <button
              onClick={() => {
                setCurrentStepIndex(0);
                setIsPlaying(false);
              }}
              className="p-2 bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800 rounded-xl cursor-pointer transition"
              title="Reset Simulation"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            {/* Speed Buttons */}
            <div className="flex items-center gap-1 bg-slate-950 border border-slate-800 p-1 rounded-xl font-mono">
              {[2000, 1000, 500, 200].map((spd) => (
                <button
                  key={spd}
                  onClick={() => setPlaybackSpeed(spd)}
                  className={`px-2 py-1 rounded-lg text-[10px] font-bold cursor-pointer transition ${playbackSpeed === spd ? 'bg-purple-600 text-white shadow' : 'text-slate-400 hover:text-white'
                    }`}
                >
                  {spd === 2000 ? '0.5x' : spd === 1000 ? '1x' : spd === 500 ? '2x' : '5x'}
                </button>
              ))}
            </div>

            {/* Correspondence Toggle */}
            <button
              onClick={() => setShowCorrespondenceOverlay((prev) => !prev)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 border cursor-pointer ${showCorrespondenceOverlay
                ? 'bg-indigo-950 text-indigo-300 border-indigo-500/50 shadow-md shadow-indigo-950/40'
                : 'bg-slate-950 text-slate-500 border-slate-800'
                }`}
              title="Toggle Live Correspondence Badge Overlay"
            >
              <Link2 className="w-3.5 h-3.5" />
              <span>Connectors</span>
            </button>
          </div>
        </div>

        {/* Product Stepper Timeline Track */}
        <div className="pt-2 border-t border-slate-800/80 space-y-3">
          {/* Stepper Header / Summary Bar */}
          <div className="flex items-center justify-between text-xs font-mono px-1">
            <span className="text-slate-400 font-sans font-bold flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-purple-400" />
              <span>Simulation Stepper:</span>
              <span className="text-white font-bold">{`Step ${currentStepIndex} of ${nfaSteps.length - 1}`}</span>
            </span>

            {/* Status Outcome Badge */}
            <div className="flex items-center gap-2">
              {currentStepIndex === nfaSteps.length - 1 ? (
                activeNFAStep.isAccepting ? (
                  <span className="px-2.5 py-0.5 bg-emerald-950 border border-emerald-500/50 text-emerald-300 rounded-full font-bold flex items-center gap-1 text-[11px] shadow-sm">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> ACCEPTED
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 bg-rose-950 border border-rose-500/50 text-rose-300 rounded-full font-bold flex items-center gap-1 text-[11px] shadow-sm">
                    <XCircle className="w-3.5 h-3.5 text-rose-400" /> REJECTED
                  </span>
                )
              ) : (
                <span className="px-2.5 py-0.5 bg-indigo-950 border border-indigo-500/40 text-indigo-300 rounded-full font-bold text-[11px]">
                  Processing Input...
                </span>
              )}
            </div>
          </div>

          {/* Interactive Stepper Track Container */}
          <div className="relative py-2 px-2 overflow-x-auto scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent">
            {/* Stepper Nodes & Inter-Node Connecting Track Lines */}
            <div className="relative z-10 flex items-start justify-between min-w-max gap-1 px-2">
              {nfaSteps.map((step, idx) => {
                const isPassed = idx < currentStepIndex;
                const isCurrent = idx === currentStepIndex;
                const charSymbol = idx === 0 ? 'ε' : testString[idx - 1] || '';
                const isLastNode = idx === nfaSteps.length - 1;

                return (
                  <React.Fragment key={idx}>
                    <button
                      onClick={() => {
                        setCurrentStepIndex(idx);
                        setIsPlaying(false);
                      }}
                      className="flex flex-col items-center gap-1.5 group cursor-pointer transition focus:outline-none shrink-0"
                      title={`Jump to Step ${idx}: ${idx === 0 ? 'Start State' : `Symbol '${charSymbol}'`}`}
                    >
                      {/* Node Circle */}
                      <div
                        className={`w-9 h-9 rounded-xl border flex items-center justify-center font-mono text-xs font-bold transition-all duration-200 ${isCurrent
                          ? 'bg-purple-600 border-purple-300 text-white shadow-lg shadow-purple-600/50 scale-110 ring-4 ring-purple-500/30'
                          : isPassed
                            ? 'bg-indigo-950/90 border-indigo-500/50 text-indigo-300 hover:bg-indigo-900/60'
                            : 'bg-slate-950 border-slate-800 text-slate-500 hover:bg-slate-900 hover:text-slate-300'
                          }`}
                      >
                        {isPassed ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        ) : isCurrent ? (
                          <Zap className="w-4 h-4 text-white animate-pulse" />
                        ) : (
                          <span>{idx}</span>
                        )}
                      </div>

                      {/* Step Label / Consumed Symbol Pill */}
                      <div className="flex flex-col items-center">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold transition ${isCurrent
                            ? 'bg-purple-950 border border-purple-500/60 text-purple-200 shadow-sm'
                            : isPassed
                              ? 'bg-slate-900 text-slate-300'
                              : 'bg-slate-950 text-slate-600'
                            }`}
                        >
                          {idx === 0 ? 'Start' : `'${charSymbol}'`}
                        </span>
                        <span className="text-[9px] text-slate-400 font-mono mt-0.5">
                          {`{${step.activeStates.join(',')}}`}
                        </span>
                      </div>
                    </button>

                    {/* Inter-Node Connecting Segment Line */}
                    {!isLastNode && (
                      <div className="flex-1 min-w-[24px] max-w-[64px] h-1 mt-4 rounded-full self-start">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${idx < currentStepIndex
                            ? 'bg-gradient-to-r from-purple-500 via-indigo-500 to-sky-400 shadow-sm shadow-purple-500/50'
                            : 'bg-slate-800'
                            }`}
                        />
                      </div>
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* DUAL CANVAS SIDE-BY-SIDE SIDE PANEL WORKSPACE */}
      {activeTab === 'overview' && (
        <div className="space-y-5">
          {/* Live Mapping Center Badge */}
          {showCorrespondenceOverlay && (
            <div className="p-3 bg-slate-900 border border-indigo-500/40 rounded-2xl flex items-center justify-center gap-3 font-mono text-xs shadow-xl animate-fade-in">
              <span className="text-purple-300 font-bold flex items-center gap-1.5">
                <Zap className="w-4 h-4 text-purple-400" />
                NFA Subset: <span className="text-white">{`{ ${activeNFAStep.activeStates.join(', ')} }`}</span>
              </span>

              <ArrowRight className="w-4 h-4 text-indigo-400 animate-pulse" />

              <span className="text-sky-300 font-bold flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-sky-400" />
                DFA State: <span className="text-white">{activeDFAStep.dfaState}</span>
              </span>

              <span className="px-2 py-0.5 bg-indigo-950 text-indigo-300 rounded border border-indigo-500/30 text-[10px] font-sans">
                Subset Construction Mapping
              </span>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* LEFT PANEL: ORIGINAL NFA */}
            <div className="p-4 bg-slate-900 border border-purple-500/30 rounded-2xl space-y-3 shadow-xl">
              {/* Left Panel Header */}
              <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                <div>
                  <h3 className="text-xs font-bold text-purple-300 uppercase tracking-wider flex items-center gap-1.5 font-sans">
                    <Zap className="w-4 h-4 text-purple-400" /> Original NFA
                  </h3>
                  <span className="text-[10px] text-slate-400">Non-Deterministic Automaton</span>
                </div>

                <div className="flex items-center gap-1.5 font-mono text-[10px]">
                  <span className="px-2 py-1 bg-slate-950 border border-slate-800 text-purple-300 rounded font-bold">
                    |Q| = {nfa.states.length}
                  </span>
                  <span className="px-2 py-1 bg-slate-950 border border-slate-800 text-purple-300 rounded font-bold">
                    Trans = {nfaTransitionsCount}
                  </span>
                  <span className="px-2 py-1 bg-purple-950 border border-purple-500/40 text-purple-300 rounded font-bold">
                    ε = {nfaEpsilonTransitionsCount}
                  </span>
                </div>
              </div>

              {/* Left Independent Canvas Viewport */}
              <SingleAutomatonCanvas
                graph={nfaGraph}
                activeStateIds={highlightedNFAStates}
                prevStateIds={currentStepIndex > 0 ? nfaSteps[currentStepIndex - 1]?.activeStates : undefined}
                activeSymbol={currentStepIndex > 0 ? testString[currentStepIndex - 1] : null}
                hoveredStateId={hoveredNFAStateId}
                onHoverState={handleNFAHover}
                containerId="nfa-canvas-container"
                title="Original NFA"
                colorScheme="purple"
              />

              {/* Below Canvas NFA Info Panel */}
              <div className="p-3 bg-slate-950 border border-slate-800/80 rounded-xl space-y-2 font-mono text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] text-slate-400 font-sans uppercase tracking-wider font-semibold">Active State Set Q_t:</span>
                  <span className="px-2.5 py-1 bg-purple-950/70 border border-purple-500/40 text-purple-200 rounded-lg font-bold shadow-sm">
                    {`{ ${activeNFAStep.activeStates.join(', ')} }`}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[10px] text-slate-400 font-sans uppercase tracking-wider font-semibold">ε-Closure ECLOSE(Q_t):</span>
                  <span className="px-2.5 py-1 bg-purple-950/40 border border-purple-500/20 text-purple-300 rounded-lg font-bold">
                    {`{ ${currentEpsilonClosure.join(', ')} }`}
                  </span>
                </div>
              </div>
            </div>

            {/* RIGHT PANEL: EQUIVALENT DFA */}
            <div className="p-4 bg-slate-900 border border-sky-500/30 rounded-2xl space-y-3 shadow-xl">
              {/* Right Panel Header */}
              <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                <div>
                  <h3 className="text-xs font-bold text-sky-300 uppercase tracking-wider flex items-center gap-1.5 font-sans">
                    <ShieldCheck className="w-4 h-4 text-sky-400" /> Equivalent DFA
                  </h3>
                  <span className="text-[10px] text-slate-400">Subset Construction Result</span>
                </div>

                <div className="flex items-center gap-1.5 font-mono text-[10px]">
                  <span className="px-2 py-1 bg-slate-950 border border-slate-800 text-sky-300 rounded font-bold">
                    |Q'| = {dfa.states.length}
                  </span>
                  <span className="px-2 py-1 bg-slate-950 border border-slate-800 text-sky-300 rounded font-bold">
                    Trans = {dfaTransitionsCount}
                  </span>
                  <span className="px-2 py-1 bg-sky-950 border border-sky-500/40 text-sky-300 rounded font-bold">
                    Ratio = {conversionCostRatio}x
                  </span>
                </div>
              </div>

              {/* Right Independent Canvas Viewport */}
              <SingleAutomatonCanvas
                graph={dfaGraph}
                activeStateIds={highlightedDFAState ? [highlightedDFAState] : [activeDFAStep.dfaState]}
                prevStateIds={currentStepIndex > 0 ? [dfaSteps[currentStepIndex - 1]?.dfaState] : undefined}
                activeSymbol={currentStepIndex > 0 ? testString[currentStepIndex - 1] : null}
                subsetMap={dfa.subsetMap}
                hoveredStateId={hoveredDFAStateId}
                onHoverState={handleDFAHover}
                containerId="dfa-canvas-container"
                title="Equivalent DFA"
                colorScheme="sky"
              />

              {/* Below Canvas DFA Info Panel */}
              <div className="p-3 bg-slate-950 border border-slate-800/80 rounded-xl space-y-2 font-mono text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] text-slate-400 font-sans uppercase tracking-wider font-semibold">Active DFA State:</span>
                  <span className="px-2.5 py-1 bg-sky-950/70 border border-sky-500/40 text-sky-200 rounded-lg font-bold shadow-sm">
                    {activeDFAStep.dfaState}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[10px] text-slate-400 font-sans uppercase tracking-wider font-semibold">Subset Composition:</span>
                  <span className="px-2.5 py-1 bg-sky-950/40 border border-sky-500/20 text-sky-300 rounded-lg font-bold">
                    {`{ ${activeDFAStep.nfaSubsetEquivalent.join(', ')} }`}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: STATISTICS & DASHBOARD */}
      {activeTab === 'statistics' && (
        <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl space-y-4 shadow-xl font-mono text-xs">
          <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2 font-sans">
            <BarChart3 className="w-4 h-4 text-purple-400" />
            Side-by-Side Automata Comparison Matrix
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 uppercase text-[10px]">
                  <th className="p-2.5">Property Metric</th>
                  <th className="p-2.5 text-purple-400">Original NFA</th>
                  <th className="p-2.5 text-sky-400">Equivalent DFA</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                <tr>
                  <td className="p-2.5 font-bold text-slate-200 font-sans">States Count (|Q|)</td>
                  <td className="p-2.5 text-purple-300 font-bold">{nfa.states.length}</td>
                  <td className="p-2.5 text-sky-300 font-bold">{dfa.states.length}</td>
                </tr>
                <tr>
                  <td className="p-2.5 font-bold text-slate-200 font-sans">Total Transitions</td>
                  <td className="p-2.5 text-purple-300 font-bold">{nfaTransitionsCount}</td>
                  <td className="p-2.5 text-sky-300 font-bold">{dfaTransitionsCount}</td>
                </tr>
                <tr>
                  <td className="p-2.5 font-bold text-slate-200 font-sans">Current Active State(s)</td>
                  <td className="p-2.5 text-purple-300">{`{ ${activeNFAStep.activeStates.join(', ')} }`}</td>
                  <td className="p-2.5 text-sky-300">{activeDFAStep.dfaState}</td>
                </tr>
                <tr>
                  <td className="p-2.5 font-bold text-slate-200 font-sans font-bold">Accepting State?</td>
                  <td className="p-2.5 text-emerald-400 font-bold">{activeNFAStep.isAccepting ? 'YES' : 'NO'}</td>
                  <td className="p-2.5 text-emerald-400 font-bold">{activeDFAStep.isAccepting ? 'YES' : 'NO'}</td>
                </tr>
                <tr>
                  <td className="p-2.5 font-bold text-slate-200 font-sans">Alphabet Σ</td>
                  <td className="p-2.5 text-purple-300">{`{ ${nfa.alphabet.join(', ')} }`}</td>
                  <td className="p-2.5 text-sky-300">{`{ ${dfa.alphabet.join(', ')} }`}</td>
                </tr>
                <tr>
                  <td className="p-2.5 font-bold text-slate-200 font-sans">Per-Step Matching Time</td>
                  <td className="p-2.5 text-amber-300">O(|Q|²) per character</td>
                  <td className="p-2.5 text-emerald-400 font-bold">O(1) constant time</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 4: TRANSITION TABLES */}
      {activeTab === 'transitions' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 font-mono text-xs">
          {/* NFA Table */}
          <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl space-y-3">
            <span className="text-xs font-bold text-purple-300 font-sans block">NFA Transition Table δ</span>
            <div className="overflow-x-auto border border-slate-800 rounded-xl bg-slate-950 p-2">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-slate-800 text-purple-400 text-[10px]">
                    <th className="p-2">State</th>
                    {nfa.alphabet.map((sym) => (
                      <th key={sym} className="p-2">'{sym}'</th>
                    ))}
                    <th className="p-2">'ε'</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {nfa.states.map((st) => (
                    <tr key={st}>
                      <td className="p-2 font-bold text-slate-200">{st}</td>
                      {nfa.alphabet.map((sym) => (
                        <td key={sym} className="p-2 text-indigo-300">
                          {nfa.transitions[st]?.[sym]?.length ? `{${nfa.transitions[st][sym].join(',')}}` : '∅'}
                        </td>
                      ))}
                      <td className="p-2 text-purple-300">
                        {nfa.transitions[st]?.['ε']?.length
                          ? `{${nfa.transitions[st]['ε'].join(',')}}`
                          : nfa.transitions[st]?.['epsilon']?.length
                            ? `{${nfa.transitions[st]['epsilon'].join(',')}}`
                            : '∅'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* DFA Table */}
          <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl space-y-3">
            <span className="text-xs font-bold text-sky-300 font-sans block">DFA Transition Table δ'</span>
            <div className="overflow-x-auto border border-slate-800 rounded-xl bg-slate-950 p-2">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-slate-800 text-sky-400 text-[10px]">
                    <th className="p-2">State</th>
                    {dfa.alphabet.map((sym) => (
                      <th key={sym} className="p-2">'{sym}'</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {dfa.states.map((st) => (
                    <tr key={st}>
                      <td className="p-2 font-bold text-slate-200">{st}</td>
                      {dfa.alphabet.map((sym) => (
                        <td key={sym} className="p-2 text-sky-300">
                          {dfa.transitions[st]?.[sym] || 'DEAD'}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
