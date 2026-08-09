import React, { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import {
  Zap,
  ArrowRight,
  Layers,
  RotateCcw,
  CheckCircle2,
  Table as TableIcon,
  Search,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  FileJson,
  Cpu,
  AlertTriangle,
} from 'lucide-react';
import type { NFA } from '../../../algorithms/nfa/NFA';
import { computeEpsilonClosure } from '../../../algorithms/shared/EpsilonClosure';
import { NFABottomEducationalPanel } from './NFABottomEducationalPanel';
import { downloadFile } from '../../../utils/exportUtils';
import { nfaToAutomatonGraph } from '../../../algorithms/nfa/renderer/NFARenderer';
import { MiniAutomataGraph } from '../../dfa/MiniAutomataGraph';

interface NFAEpsilonClosureLabViewProps {
  nfa: NFA;
  nfaB?: NFA;
}

export interface ClosureTraversalStep {
  stepIndex: number;
  phase: 'select' | 'traversal' | 'closure' | 'accept_check';
  phaseName: string;
  currentState: string;
  visitedSet: string[];
  queue: string[];
  explanation: string;
  rule: string;
  isAcceptState: boolean;
}

export const NFAEpsilonClosureLabView: React.FC<NFAEpsilonClosureLabViewProps> = ({ nfa, nfaB }) => {
  const [selectedNFASource, setSelectedNFASource] = useState<'A' | 'B'>('A');
  const [selectedStates, setSelectedStates] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);

  // Active Selected NFA Object (NFA A or NFA B)
  const activeNFA = useMemo(() => {
    if (selectedNFASource === 'B') {
      return nfaB || { states: [], alphabet: [], transitions: {}, startState: '', acceptStates: [] };
    }
    return nfa || { states: [], alphabet: [], transitions: {}, startState: '', acceptStates: [] };
  }, [selectedNFASource, nfa, nfaB]);

  const isEmptyNFA = !activeNFA || activeNFA.states.length === 0;

  // Initialize selected state to startState when activeNFA changes
  useEffect(() => {
    if (activeNFA && activeNFA.states.length > 0) {
      setSelectedStates([activeNFA.startState || activeNFA.states[0]]);
    } else {
      setSelectedStates([]);
    }
    setCurrentStepIndex(0);
    setIsPlaying(false);
  }, [activeNFA, selectedNFASource]);

  // Compute graph for active NFA
  const activeGraph = useMemo(() => {
    if (isEmptyNFA) {
      return { id: 'empty_graph', name: `NFA ${selectedNFASource}`, type: 'NFA' as const, alphabet: [], states: [], transitions: [] };
    }
    return nfaToAutomatonGraph(activeNFA, `Original NFA Canvas (NFA ${selectedNFASource})`);
  }, [activeNFA, selectedNFASource, isEmptyNFA]);

  // Compute ECLOSE for selected state set
  const closureData = useMemo(() => {
    if (isEmptyNFA || selectedStates.length === 0) {
      return {
        closureArray: [],
        closureSet: new Set<string>(),
        containsAccept: false,
        visitedOrder: [],
        depthMap: {},
        maxDepth: 0,
      };
    }

    const closureArray = Array.from(computeEpsilonClosure(selectedStates, activeNFA.transitions)).sort();
    const closureSet = new Set(closureArray);
    const acceptSet = new Set(activeNFA.acceptStates);
    const containsAccept = closureArray.some((s) => acceptSet.has(s));

    const visitedOrder: string[] = [];
    const depthMap: Record<string, number> = {};
    const queue: Array<{ state: string; depth: number }> = selectedStates.map((s) => ({ state: s, depth: 0 }));

    selectedStates.forEach((s) => {
      depthMap[s] = 0;
      visitedOrder.push(s);
    });

    while (queue.length > 0) {
      const { state, depth } = queue.shift()!;
      const epsTargets = activeNFA.transitions[state]?.['ε'] || activeNFA.transitions[state]?.['epsilon'] || [];
      for (const tgt of epsTargets) {
        if (depthMap[tgt] === undefined) {
          depthMap[tgt] = depth + 1;
          visitedOrder.push(tgt);
          queue.push({ state: tgt, depth: depth + 1 });
        }
      }
    }

    const maxDepth = Object.values(depthMap).length > 0 ? Math.max(...Object.values(depthMap)) : 0;

    return {
      closureArray,
      closureSet,
      containsAccept,
      visitedOrder,
      depthMap,
      maxDepth,
    };
  }, [selectedStates, activeNFA, isEmptyNFA]);

  // Generate step-by-step traversal steps
  const traversalSteps = useMemo(() => {
    if (isEmptyNFA || selectedStates.length === 0) {
      return [
        {
          stepIndex: 0,
          phase: 'select' as const,
          phaseName: '1. Select Initial State S',
          currentState: 'None',
          visitedSet: [],
          queue: [],
          explanation: 'No NFA model loaded.',
          rule: 'N/A',
          isAcceptState: false,
        },
      ];
    }

    const steps: ClosureTraversalStep[] = [];
    let stepCount = 0;

    // Step 0: Initial Selection
    steps.push({
      stepIndex: 0,
      phase: 'select',
      phaseName: '1. Select Initial State S',
      currentState: selectedStates.join(', '),
      visitedSet: [...selectedStates],
      queue: [...selectedStates],
      explanation: `Selected initial state set S = { ${selectedStates.join(', ')} }. Initializing BFS queue for ε-closure exploration.`,
      rule: 'ECLOSE(S) initially contains all states in S directly.',
      isAcceptState: selectedStates.some((s) => activeNFA.acceptStates.includes(s)),
    });

    // BFS Traversal steps
    const visited = new Set<string>(selectedStates);
    const queue = [...selectedStates];

    while (queue.length > 0) {
      const curr = queue.shift()!;
      const epsTargets = activeNFA.transitions[curr]?.['ε'] || activeNFA.transitions[curr]?.['epsilon'] || [];

      steps.push({
        stepIndex: ++stepCount,
        phase: 'traversal',
        phaseName: '2. Traverse ε-Transitions',
        currentState: curr,
        visitedSet: Array.from(visited),
        queue: [...queue],
        explanation: `Exploring state '${curr}'. Outgoing ε-transitions: ${
          epsTargets.length > 0 ? epsTargets.map((t) => `'ε' ➔ ${t}`).join(', ') : 'None'
        }.`,
        rule: `If q ∈ ECLOSE(S) and q ──ε──> p, then p ∈ ECLOSE(S).`,
        isAcceptState: activeNFA.acceptStates.includes(curr),
      });

      for (const tgt of epsTargets) {
        if (!visited.has(tgt)) {
          visited.add(tgt);
          queue.push(tgt);
        }
      }
    }

    // Step Final: ECLOSE Set & Accept Verification
    steps.push({
      stepIndex: ++stepCount,
      phase: 'closure',
      phaseName: '3. ECLOSE(S) Set',
      currentState: selectedStates.join(', '),
      visitedSet: Array.from(visited).sort(),
      queue: [],
      explanation: `Calculated complete ε-closure ECLOSE({ ${selectedStates.join(', ')} }) = { ${Array.from(visited)
        .sort()
        .join(', ')} }. Total closure size: ${visited.size} states.`,
      rule: 'ECLOSE(S) is the reflexive-transitive closure under ε-transitions.',
      isAcceptState: Array.from(visited).some((s) => activeNFA.acceptStates.includes(s)),
    });

    steps.push({
      stepIndex: ++stepCount,
      phase: 'accept_check',
      phaseName: '4. Accept Check',
      currentState: selectedStates.join(', '),
      visitedSet: Array.from(visited).sort(),
      queue: [],
      explanation: `Accept state verification: ECLOSE(S) ∩ F ${
        closureData.containsAccept ? '≠ ∅ (Contains Accepting State!)' : '= ∅ (No Accepting States)'
      }.`,
      rule: 'State S inherits accepting status if any state in its ε-closure is accepting.',
      isAcceptState: closureData.containsAccept,
    });

    return steps;
  }, [selectedStates, activeNFA, closureData, isEmptyNFA]);

  const activeStep = traversalSteps[currentStepIndex] || traversalSteps[0];
  const maxStepIndex = Math.max(1, traversalSteps.length - 1);
  const progressPercent = Math.round((currentStepIndex / maxStepIndex) * 100);

  // Compute closure table for ALL states in NFA
  const allStateClosures = useMemo(() => {
    if (isEmptyNFA) return [];
    const acceptSet = new Set(activeNFA.acceptStates);
    return activeNFA.states.map((st) => {
      const cl = Array.from(computeEpsilonClosure([st], activeNFA.transitions)).sort();
      const hasAccept = cl.some((s) => acceptSet.has(s));
      return {
        state: st,
        closure: cl,
        size: cl.length,
        hasAccept,
      };
    });
  }, [activeNFA, isEmptyNFA]);

  // Filtered closures by search query
  const filteredClosures = useMemo(() => {
    if (!searchQuery.trim()) return allStateClosures;
    const q = searchQuery.toLowerCase();
    return allStateClosures.filter(
      (item) => item.state.toLowerCase().includes(q) || item.closure.some((s) => s.toLowerCase().includes(q))
    );
  }, [allStateClosures, searchQuery]);

  // Auto-play timer
  useEffect(() => {
    let timer: ReturnType<typeof setInterval>;
    if (isPlaying && !isEmptyNFA) {
      const intervalMs = Math.round(1200 / playbackSpeed);
      timer = setInterval(() => {
        setCurrentStepIndex((prev) => {
          if (prev >= traversalSteps.length - 1) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, intervalMs);
    }
    return () => clearInterval(timer);
  }, [isPlaying, playbackSpeed, traversalSteps.length, isEmptyNFA]);

  // Export Handlers
  const handleExportCSV = () => {
    const csvLines = [
      'State,ECLOSE(q),Closure_Size,Contains_Accept_State',
      ...allStateClosures.map(
        (item) => `"${item.state}","{ ${item.closure.join(', ')} }",${item.size},${item.hasAccept ? 'YES' : 'NO'}`
      ),
    ];
    downloadFile(`epsilon-closure-nfa-${selectedNFASource}.csv`, csvLines.join('\n'), 'text/csv');
  };

  const handleExportJSON = () => {
    const data = {
      nfaTarget: `NFA ${selectedNFASource}`,
      states: activeNFA.states,
      startState: activeNFA.startState,
      acceptStates: activeNFA.acceptStates,
      epsilonClosures: allStateClosures,
    };
    downloadFile(`epsilon-closure-nfa-${selectedNFASource}.json`, JSON.stringify(data, null, 2), 'application/json');
  };

  const pipelineStages = [
    { id: 1, label: '1. Select State S', phase: 'select' },
    { id: 2, label: '2. Traverse ε-Transitions', phase: 'traversal' },
    { id: 3, label: '3. ECLOSE(S) Set', phase: 'closure' },
    { id: 4, label: '4. Accept Check', phase: 'accept_check' },
  ];

  return (
    <div className="space-y-3 text-slate-100 font-sans">
      {/* ────────────────────────────────────────────────────────────────── */}
      {/* 1. HEADER BANNER & NFA A / B SELECTION                             */}
      {/* ────────────────────────────────────────────────────────────────── */}
      <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl flex flex-wrap items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-purple-600/20 border border-purple-500/40 text-purple-400 rounded-2xl">
            <Zap className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base font-extrabold text-white flex items-center gap-2">
              ⚡ ε-Closure Explorer & Reachability Analyzer
            </h2>
            <p className="text-xs text-slate-400">
              Interactive Reachability Analysis using ε-Transitions (Spontaneous Non-deterministic Hops)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* NFA Target Selection (NFA A vs NFA B) */}
          <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs font-bold">
            <span className="text-[11px] text-slate-400 font-sans px-2">Select Target:</span>
            <button
              onClick={() => setSelectedNFASource('A')}
              className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer ${
                selectedNFASource === 'A'
                  ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              NFA A
            </button>
            <button
              onClick={() => setSelectedNFASource('B')}
              className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer ${
                selectedNFASource === 'B'
                  ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              NFA B
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCSV}
              className="px-3 py-1.5 bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow"
            >
              <TableIcon className="w-3.5 h-3.5 text-emerald-400" />
              <span>CSV Log</span>
            </button>
            <button
              onClick={handleExportJSON}
              className="px-3 py-1.5 bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow"
            >
              <FileJson className="w-3.5 h-3.5 text-purple-400" />
              <span>JSON</span>
            </button>
          </div>
        </div>
      </div>

      {/* EMPTY STATE BANNER */}
      {isEmptyNFA ? (
        <div className="p-8 bg-slate-900 border border-slate-800 rounded-2xl text-center space-y-3 shadow-xl">
          <div className="p-3 bg-amber-500/10 border border-amber-500/30 text-amber-400 rounded-2xl w-fit mx-auto">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-white font-sans">
            Selected NFA {selectedNFASource} is Empty
          </h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            No states or transitions are configured for NFA {selectedNFASource}. Please construct or prompt an NFA model on the main workspace.
          </p>
        </div>
      ) : (
        <>
          {/* ────────────────────────────────────────────────────────────────── */}
          {/* 2. TIMELINE STEPPER BAR                                            */}
          {/* ────────────────────────────────────────────────────────────────── */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-3 shadow-lg">
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
              {pipelineStages.map((st, idx) => {
                const isActive = activeStep.phase === st.phase;
                return (
                  <React.Fragment key={st.id}>
                    <div
                      onClick={() => {
                        const targetIdx = traversalSteps.findIndex((s) => s.phase === st.phase);
                        if (targetIdx !== -1) setCurrentStepIndex(targetIdx);
                      }}
                      className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
                        isActive
                          ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30 border border-purple-400/40 ring-1 ring-purple-400'
                          : 'text-slate-400 bg-slate-950/60 border border-slate-800 hover:text-slate-200'
                      }`}
                    >
                      <span>{st.label}</span>
                    </div>
                    {idx < pipelineStages.length - 1 && <ArrowRight className="w-3.5 h-3.5 text-slate-700 shrink-0" />}
                  </React.Fragment>
                );
              })}
            </div>
          </div>

          {/* ────────────────────────────────────────────────────────────────── */}
          {/* 3. 3-COLUMN WORKSPACE: LEFT SELECTOR | CENTER CANVAS | INSPECTOR  */}
          {/* ────────────────────────────────────────────────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
            {/* LEFT PANEL: SELECTABLE STATE LIST */}
            <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl space-y-3 shadow-xl font-sans text-xs flex flex-col justify-between">
              <div className="space-y-3">
                <span className="font-bold text-purple-300 block border-b border-slate-800 pb-2">
                  Select State / Set S:
                </span>

                {/* Quick preset sets */}
                <div className="space-y-1.5">
                  <button
                    onClick={() => setSelectedStates([activeNFA.startState || 'q0'])}
                    className="w-full py-1.5 px-2.5 bg-slate-950 hover:bg-slate-800 border border-slate-800 text-sky-300 rounded-xl font-mono text-[11px] font-bold text-left cursor-pointer transition flex items-center justify-between"
                  >
                    <span>Start State: &#123;{activeNFA.startState || 'q0'}&#125;</span>
                    {selectedStates.join(',') === (activeNFA.startState || 'q0') && (
                      <span className="w-2 h-2 rounded-full bg-sky-400 shadow-sm" />
                    )}
                  </button>
                  <button
                    onClick={() =>
                      setSelectedStates(activeNFA.acceptStates.length > 0 ? activeNFA.acceptStates : [activeNFA.states[0]])
                    }
                    className="w-full py-1.5 px-2.5 bg-slate-950 hover:bg-slate-800 border border-slate-800 text-emerald-300 rounded-xl font-mono text-[11px] font-bold text-left cursor-pointer transition flex items-center justify-between"
                  >
                    <span>Accept States: &#123;{activeNFA.acceptStates.join(', ')}&#125;</span>
                  </button>
                </div>

                <div className="border-t border-slate-800 pt-2 space-y-1 max-h-[220px] overflow-y-auto pr-1">
                  {activeNFA.states.map((st) => {
                    const isSelected = selectedStates.includes(st);
                    const isReachableInClosure = closureData.closureSet.has(st);
                    return (
                      <button
                        key={st}
                        onClick={() => setSelectedStates([st])}
                        className={`w-full p-2 rounded-xl text-left font-mono font-bold transition flex items-center justify-between cursor-pointer ${
                          isSelected
                            ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                            : isReachableInClosure
                            ? 'bg-purple-950/40 text-purple-300 border border-purple-800/40 hover:bg-purple-900/40'
                            : 'bg-slate-950/60 text-slate-400 border border-slate-800 hover:bg-slate-800 hover:text-slate-200'
                        }`}
                      >
                        <span>State {st}</span>
                        {isSelected ? (
                          <span className="text-[9px] px-1.5 py-0.5 bg-purple-950 border border-purple-400 text-purple-200 rounded font-sans uppercase">
                            Selected
                          </span>
                        ) : isReachableInClosure ? (
                          <span className="text-[9px] px-1.5 py-0.5 bg-purple-950/80 text-purple-300 rounded font-sans uppercase">
                            Reachable
                          </span>
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* CENTER GRAPH WORKSPACE (MiniAutomataGraph) */}
            <div className="lg:col-span-2 rounded-2xl p-3 flex flex-col min-h-[340px] bg-slate-900 border border-slate-800 shadow-xl">
              <MiniAutomataGraph
                graph={activeGraph}
                title={`Interactive ε-Reachability Graph (NFA ${selectedNFASource})`}
                accentColor="#a855f7"
                highlightState={activeStep.currentState}
                svgH={300}
              />
            </div>

            {/* RIGHT PANEL: INSPECTOR SUMMARY */}
            <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl space-y-3 shadow-xl text-xs font-sans">
              <span className="font-bold text-sky-300 block border-b border-slate-800 pb-2 flex items-center gap-1.5">
                <Cpu className="w-4 h-4 text-sky-400" /> ε-Closure Inspector
              </span>

              <div className="space-y-2 font-mono text-[11px]">
                <div className="flex justify-between items-center p-2 bg-slate-950 rounded-xl border border-slate-800">
                  <span className="text-slate-400 font-sans">Selected Set S:</span>
                  <span className="font-bold text-purple-300">&#123;{selectedStates.join(', ')}&#125;</span>
                </div>
                <div className="flex justify-between items-center p-2 bg-slate-950 rounded-xl border border-slate-800">
                  <span className="text-slate-400 font-sans">ECLOSE(S) Set:</span>
                  <span className="font-bold text-emerald-300">&#123;{closureData.closureArray.join(', ')}&#125;</span>
                </div>
                <div className="flex justify-between items-center p-2 bg-slate-950 rounded-xl border border-slate-800">
                  <span className="text-slate-400 font-sans">Closure Size:</span>
                  <span className="font-bold text-white">{closureData.closureArray.length} States</span>
                </div>
                <div className="flex justify-between items-center p-2 bg-slate-950 rounded-xl border border-slate-800">
                  <span className="text-slate-400 font-sans">Max Traversal Depth:</span>
                  <span className="font-bold text-amber-300">{closureData.maxDepth} Hops</span>
                </div>
                <div className="flex justify-between items-center p-2 bg-slate-950 rounded-xl border border-slate-800">
                  <span className="text-slate-400 font-sans">Accept State Present:</span>
                  <span
                    className={`font-bold ${
                      closureData.containsAccept ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {closureData.containsAccept ? 'YES (Accepting)' : 'NO (Non-accepting)'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* ────────────────────────────────────────────────────────────────── */}
          {/* 4. SYNCHRONIZED PLAYBACK CONTROLS BAR                              */}
          {/* ────────────────────────────────────────────────────────────────── */}
          <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl flex flex-wrap items-center justify-between gap-4 shadow-xl text-xs font-sans">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setCurrentStepIndex(0)}
                className="p-2 bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 rounded-xl cursor-pointer transition"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
              <button
                onClick={() => setCurrentStepIndex((prev) => Math.max(0, prev - 1))}
                disabled={currentStepIndex === 0}
                className="p-2 bg-slate-950 hover:bg-slate-800 disabled:opacity-40 border border-slate-800 text-slate-300 rounded-xl cursor-pointer transition"
              >
                <SkipBack className="w-4 h-4" />
              </button>
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className={`px-4 py-2 rounded-xl font-bold flex items-center gap-2 transition border cursor-pointer ${
                  isPlaying ? 'bg-amber-600 border-amber-400 text-white' : 'bg-purple-600 border-purple-400 text-white'
                }`}
              >
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-current" />}
                <span>{isPlaying ? 'Pause' : 'Play Step'}</span>
              </button>
              <button
                onClick={() => setCurrentStepIndex((prev) => Math.min(traversalSteps.length - 1, prev + 1))}
                disabled={currentStepIndex >= traversalSteps.length - 1}
                className="p-2 bg-slate-950 hover:bg-slate-800 disabled:opacity-40 border border-slate-800 text-slate-300 rounded-xl cursor-pointer transition"
              >
                <SkipForward className="w-4 h-4" />
              </button>
            </div>

            {/* Progress Bar */}
            <div className="flex-1 max-w-md mx-4">
              <div className="flex justify-between text-[11px] font-mono text-slate-400 mb-1">
                <span>Step {activeStep.stepIndex} of {traversalSteps.length - 1}</span>
                <span className="font-bold text-purple-400">{progressPercent}%</span>
              </div>
              <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-800">
                <div className="bg-purple-500 h-full transition-all duration-300" style={{ width: `${progressPercent}%` }} />
              </div>
            </div>

            {/* Speed Selector */}
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] text-slate-400 font-bold">Speed:</span>
              {[0.5, 1, 2, 4].map((spd) => (
                <button
                  key={spd}
                  onClick={() => setPlaybackSpeed(spd)}
                  className={`px-2 py-1 rounded-lg text-[11px] font-bold border transition cursor-pointer ${
                    playbackSpeed === spd ? 'bg-purple-600 border-purple-400 text-white' : 'bg-slate-950 border-slate-800 text-slate-400'
                  }`}
                >
                  {spd}x
                </button>
              ))}
            </div>
          </div>

          {/* ────────────────────────────────────────────────────────────────── */}
          {/* 5. FULL AUTOMATON ε-CLOSURE LOOKUP TABLE                           */}
          {/* ────────────────────────────────────────────────────────────────── */}
          <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl space-y-3 shadow-xl">
            <div className="flex items-center justify-between gap-4">
              <h3 className="text-sm font-bold text-white font-sans flex items-center gap-2">
                <TableIcon className="w-4 h-4 text-purple-400" /> Full Automaton ε-Closure Lookup Table
              </h3>

              <div className="relative w-64">
                <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search state..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
                />
              </div>
            </div>

            <div className="overflow-x-auto max-h-[300px] overflow-y-auto font-mono text-xs border border-slate-800 rounded-xl">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-950 text-slate-400 sticky top-0 border-b border-slate-800">
                  <tr>
                    <th className="p-3">State q</th>
                    <th className="p-3">ECLOSE(q) Set</th>
                    <th className="p-3">Closure Size</th>
                    <th className="p-3">Contains Accept State</th>
                    <th className="p-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredClosures.map((item) => {
                    const isSelected = selectedStates.includes(item.state);
                    return (
                      <tr
                        key={item.state}
                        onClick={() => setSelectedStates([item.state])}
                        className={`cursor-pointer transition ${
                          isSelected
                            ? 'bg-purple-950/70 text-purple-200 border-l-4 border-l-purple-500 font-bold'
                            : 'hover:bg-slate-850 bg-slate-900/40 text-slate-300'
                        }`}
                      >
                        <td className="p-3 font-bold text-purple-300">{item.state}</td>
                        <td className="p-3 font-mono text-emerald-300">&#123;{item.closure.join(', ')}&#125;</td>
                        <td className="p-3 font-bold">{item.size} States</td>
                        <td className="p-3">
                          {item.hasAccept ? (
                            <span className="px-2 py-0.5 bg-emerald-950 border border-emerald-500/40 text-emerald-300 rounded text-[10px] uppercase font-bold">
                              YES
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 bg-slate-950 border border-slate-800 text-slate-500 rounded text-[10px] uppercase font-bold">
                              NO
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-right">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedStates([item.state]);
                            }}
                            className="px-2.5 py-1 bg-slate-950 hover:bg-purple-900 border border-slate-800 hover:border-purple-500 text-purple-300 rounded-lg text-[11px] font-bold transition cursor-pointer"
                          >
                            Explore
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Educational Footer */}
      <NFABottomEducationalPanel
        nfa={activeNFA}
        toolKey="epsilon_closure"
        toolTitle="ε-Closure Explorer"
      />
    </div>
  );
};
