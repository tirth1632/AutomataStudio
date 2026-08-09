import React, { useState, useMemo, useEffect } from 'react';
import {
  Zap,
  ArrowRight,
  CheckCircle2,
  Table as TableIcon,
  Sparkles,
  Layers,
  ShieldCheck,
  Play,
  Pause,
  RotateCcw,
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

interface NFAEpsilonEliminationLabViewProps {
  nfa: NFA;
  nfaB?: NFA;
}

export interface DetailedEliminationStep {
  stepIndex: number;
  phase: 'initial' | 'closure' | 'propagation' | 'accept_update' | 'removal' | 'finished';
  phaseName: string;
  affectedState: string;
  closure: string[];
  symbol?: string;
  generatedTransitions: Array<{ from: string; symbol: string; to: string[] }>;
  isAcceptUpdate: boolean;
  newAcceptStates: string[];
  currentWorkingTransitions: Record<string, Record<string, string[]>>;
  remainingEpsilonEdges: number;
  explanation: string;
  formula: string;
  rule: string;
  status: string;
}

export const NFAEpsilonEliminationLabView: React.FC<NFAEpsilonEliminationLabViewProps> = ({ nfa, nfaB }) => {
  const [selectedNFASource, setSelectedNFASource] = useState<'A' | 'B'>('A');
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [selectedLogRow, setSelectedLogRow] = useState<number | null>(null);

  // Active Selected NFA Object (NFA A or NFA B)
  const activeNFA = useMemo(() => {
    if (selectedNFASource === 'B') {
      return nfaB || { states: [], alphabet: [], transitions: {}, startState: '', acceptStates: [] };
    }
    return nfa || { states: [], alphabet: [], transitions: {}, startState: '', acceptStates: [] };
  }, [selectedNFASource, nfa, nfaB]);

  const isEmptyNFA = !activeNFA || activeNFA.states.length === 0;

  // Reset steps when selected NFA changes
  useEffect(() => {
    setCurrentStepIndex(0);
    setIsPlaying(false);
  }, [selectedNFASource, activeNFA]);

  // Independent Left Canvas Graph: Original ε-NFA
  const leftGraph = useMemo(() => {
    if (isEmptyNFA) {
      return { id: 'empty_left', name: `NFA ${selectedNFASource}`, type: 'NFA' as const, alphabet: [], states: [], transitions: [] };
    }
    return nfaToAutomatonGraph(activeNFA, `Original ε-NFA (NFA ${selectedNFASource})`);
  }, [activeNFA, selectedNFASource, isEmptyNFA]);

  // Deterministic Elimination Trace Generation
  const traceData = useMemo(() => {
    if (isEmptyNFA) {
      const emptyStep: DetailedEliminationStep = {
        stepIndex: 1,
        phase: 'closure',
        phaseName: 'Empty NFA',
        affectedState: 'None',
        closure: [],
        generatedTransitions: [],
        isAcceptUpdate: false,
        newAcceptStates: [],
        currentWorkingTransitions: {},
        remainingEpsilonEdges: 0,
        explanation: `NFA ${selectedNFASource} is empty. No states or transitions available.`,
        formula: '∅',
        rule: 'N/A',
        status: 'Empty',
      };
      return {
        steps: [emptyStep],
        originalEpsilonCount: 0,
        newTransitionsTotalCount: 0,
        equivalentNFA: activeNFA,
        equivalentGraph: { id: 'empty_right', name: 'Empty', type: 'NFA' as const, alphabet: [], states: [], transitions: [] },
      };
    }

    const originalEpsilonEdgesCount = Object.entries(activeNFA.transitions).reduce((acc, [_, symMap]) => {
      const eps = symMap['ε'] || symMap['epsilon'] || [];
      return acc + eps.length;
    }, 0);

    const nonEpsilonAlphabet = activeNFA.alphabet.filter((s) => s !== 'ε' && s !== 'epsilon');
    const acceptSet = new Set(activeNFA.acceptStates);
    const newAcceptStates = new Set<string>();
    const currentTransitions: Record<string, Record<string, string[]>> = {};

    // Copy initial transitions
    activeNFA.states.forEach((st) => {
      currentTransitions[st] = {};
      Object.entries(activeNFA.transitions[st] || {}).forEach(([sym, tgts]) => {
        currentTransitions[st][sym] = [...tgts];
      });
    });

    const steps: DetailedEliminationStep[] = [];
    let stepCount = 0;

    // Step 0: Initial Original ε-NFA
    const initialStart = activeNFA.startState || activeNFA.states[0] || 'q0';
    steps.push({
      stepIndex: 0,
      phase: 'initial',
      phaseName: 'Original ε-NFA Loaded',
      affectedState: initialStart,
      closure: Array.from(computeEpsilonClosure([initialStart], activeNFA.transitions)).sort(),
      generatedTransitions: [],
      isAcceptUpdate: false,
      newAcceptStates: [...activeNFA.acceptStates],
      currentWorkingTransitions: JSON.parse(JSON.stringify(currentTransitions)),
      remainingEpsilonEdges: originalEpsilonEdgesCount,
      explanation: `Initial original ε-NFA loaded with ${activeNFA.states.length} states and ${originalEpsilonEdgesCount} ε-transitions. Click 'Play Step' or 'Step Forward' to begin ε-closure computation.`,
      formula: 'N = (Q, Σ, δ, q₀, F)',
      rule: 'Begin ε-transition elimination by computing state closures.',
      status: 'Initialized',
    });

    // Phase 1: Compute ε-Closure & Accept Propagation
    activeNFA.states.forEach((st) => {
      const eclose = Array.from(computeEpsilonClosure([st], activeNFA.transitions)).sort();
      const hasAcceptInClosure = eclose.some((q) => acceptSet.has(q));
      if (hasAcceptInClosure) {
        newAcceptStates.add(st);
      }

      steps.push({
        stepIndex: ++stepCount,
        phase: 'closure',
        phaseName: 'Compute ε-Closure & Accept Propagation',
        affectedState: st,
        closure: eclose,
        generatedTransitions: [],
        isAcceptUpdate: hasAcceptInClosure,
        newAcceptStates: Array.from(newAcceptStates).sort(),
        currentWorkingTransitions: JSON.parse(JSON.stringify(currentTransitions)),
        remainingEpsilonEdges: originalEpsilonEdgesCount,
        explanation: `Computed ε-closure for state '${st}': ECLOSE(${st}) = { ${eclose.join(', ')} }. ${
          hasAcceptInClosure ? `Contains accept state! Marked '${st}' as accepting.` : `No accept states in closure.`
        }`,
        formula: `ECLOSE(${st}) = { q ∈ Q ∣ ${st} ──ε*──> q }`,
        rule: `State ${st} becomes accepting if ECLOSE(${st}) ∩ F ≠ ∅`,
        status: 'Completed',
      });
    });

    // Phase 2: Propagate Non-ε Transitions
    activeNFA.states.forEach((st) => {
      const eclose = Array.from(computeEpsilonClosure([st], activeNFA.transitions));

      nonEpsilonAlphabet.forEach((sym) => {
        const reachableTargets = new Set<string>();

        eclose.forEach((q) => {
          const directTgts = activeNFA.transitions[q]?.[sym] || [];
          directTgts.forEach((tgt) => {
            const tgtEclose = computeEpsilonClosure([tgt], activeNFA.transitions);
            tgtEclose.forEach((t) => reachableTargets.add(t));
          });
        });

        if (reachableTargets.size > 0) {
          const targetArray = Array.from(reachableTargets).sort();
          if (!currentTransitions[st]) currentTransitions[st] = {};
          currentTransitions[st][sym] = targetArray;

          steps.push({
            stepIndex: ++stepCount,
            phase: 'propagation',
            phaseName: `Propagate Transition for Symbol '${sym}'`,
            affectedState: st,
            closure: eclose,
            symbol: sym,
            generatedTransitions: [{ from: st, symbol: sym, to: targetArray }],
            isAcceptUpdate: newAcceptStates.has(st),
            newAcceptStates: Array.from(newAcceptStates).sort(),
            currentWorkingTransitions: JSON.parse(JSON.stringify(currentTransitions)),
            remainingEpsilonEdges: originalEpsilonEdgesCount,
            explanation: `Propagated transitions for '${st}' over symbol '${sym}': δ'(${st}, '${sym}') = { ${targetArray.join(', ')} }.`,
            formula: `δ'(${st}, ${sym}) = ⋃_{p ∈ ECLOSE(${st})} ECLOSE(δ(p, ${sym}))`,
            rule: `Directly connect ${st} to all states reachable via ECLOSE → symbol '${sym}' → ECLOSE.`,
            status: 'Completed',
          });
        }
      });
    });

    // Phase 3: Remove ε-Transitions
    const finalTransitions: Record<string, Record<string, string[]>> = {};
    activeNFA.states.forEach((st) => {
      finalTransitions[st] = {};
      nonEpsilonAlphabet.forEach((sym) => {
        if (currentTransitions[st]?.[sym]) {
          finalTransitions[st][sym] = [...currentTransitions[st][sym]];
        }
      });
    });

    steps.push({
      stepIndex: ++stepCount,
      phase: 'removal',
      phaseName: 'Remove ε-Transitions',
      affectedState: 'ALL',
      closure: [],
      generatedTransitions: [],
      isAcceptUpdate: false,
      newAcceptStates: Array.from(newAcceptStates).sort(),
      currentWorkingTransitions: finalTransitions,
      remainingEpsilonEdges: 0,
      explanation: `Successfully removed all ${originalEpsilonEdgesCount} ε-transitions from the automaton graph.`,
      formula: `Σ' = Σ \\ {ε}`,
      rule: 'Eliminate all spontaneous ε-edges now that transitions are fully propagated.',
      status: 'Finished',
    });

    const equivalentNFA: NFA = {
      states: [...activeNFA.states],
      alphabet: nonEpsilonAlphabet,
      transitions: finalTransitions,
      startState: activeNFA.startState,
      acceptStates: Array.from(newAcceptStates).sort(),
    };

    let newTransitionsTotalCount = 0;
    Object.values(finalTransitions).forEach((symMap) => {
      Object.values(symMap).forEach((tgts) => {
        newTransitionsTotalCount += tgts.length;
      });
    });

    return {
      steps,
      originalEpsilonCount: originalEpsilonEdgesCount,
      newTransitionsTotalCount,
      equivalentNFA,
      equivalentGraph: nfaToAutomatonGraph(equivalentNFA, 'Equivalent ε-Free NFA'),
    };
  }, [activeNFA, isEmptyNFA, selectedNFASource]);

  const activeStep = traceData.steps[currentStepIndex] || traceData.steps[0];
  const maxStepIndex = Math.max(1, traceData.steps.length - 1);
  const progressPercent = Math.round((currentStepIndex / maxStepIndex) * 100);

  // Independent Right Canvas Graph: Current Working Machine
  const rightNFA: NFA = useMemo(() => {
    if (isEmptyNFA) {
      return { states: [], alphabet: [], transitions: {}, startState: '', acceptStates: [] };
    }
    return {
      states: [...activeNFA.states],
      alphabet: activeNFA.alphabet.filter((s) => s !== 'ε' && s !== 'epsilon'),
      transitions: activeStep.currentWorkingTransitions || {},
      startState: activeNFA.startState,
      acceptStates: activeStep.newAcceptStates || [],
    };
  }, [activeNFA, activeStep, isEmptyNFA]);

  const rightGraph = useMemo(() => {
    if (isEmptyNFA) {
      return { id: 'empty_right', name: `NFA ${selectedNFASource}`, type: 'NFA' as const, alphabet: [], states: [], transitions: [] };
    }
    return nfaToAutomatonGraph(rightNFA, 'Current Working Machine Canvas');
  }, [rightNFA, isEmptyNFA, selectedNFASource]);

  // Auto-play timer
  useEffect(() => {
    let timer: ReturnType<typeof setInterval>;
    if (isPlaying && !isEmptyNFA) {
      const intervalMs = Math.round(1200 / playbackSpeed);
      timer = setInterval(() => {
        setCurrentStepIndex((prev) => {
          if (prev >= traceData.steps.length - 1) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, intervalMs);
    }
    return () => clearInterval(timer);
  }, [isPlaying, playbackSpeed, traceData.steps.length, isEmptyNFA]);

  // Exports
  const handleExportJSON = () => {
    downloadFile(
      `epsilon-elimination-${activeNFA.startState || 'empty'}.json`,
      JSON.stringify(
        {
          originalNFA: activeNFA,
          equivalentNFA: traceData.equivalentNFA,
          steps: traceData.steps,
        },
        null,
        2
      ),
      'application/json'
    );
  };

  const handleExportCSV = () => {
    const csvLines = [
      'Step,Phase,AffectedState,GeneratedTransition,AcceptUpdate,Status',
      ...traceData.steps.map(
        (s) =>
          `${s.stepIndex},"${s.phaseName}",${s.affectedState},"${
            s.generatedTransitions.map((t) => `${t.from}-'${t.symbol}'->${t.to.join('/')}`).join(';') || 'N/A'
          }",${s.isAcceptUpdate ? 'YES' : 'NO'},${s.status}`
      ),
    ];
    downloadFile(`epsilon-elimination-log.csv`, csvLines.join('\n'), 'text/csv');
  };

  const pipelineStages = [
    { id: 1, label: '1. Original ε-NFA', phase: 'initial' },
    { id: 2, label: '2. Compute ε-Closure', phase: 'closure' },
    { id: 3, label: '3. Propagate Transitions', phase: 'propagation' },
    { id: 4, label: '4. Update Accept States', phase: 'accept_update' },
    { id: 5, label: '5. Remove ε-Edges', phase: 'removal' },
    { id: 6, label: '6. Equivalent NFA', phase: 'finished' },
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
              ⚡ ε-Transition Elimination Laboratory
            </h2>
            <p className="text-xs text-slate-400">
              Interactive Step-by-Step Animation Pipeline (ε-Closure → Propagation → Accept Updates → Removal)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* NFA Source Selection (NFA A vs NFA B) */}
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

      {/* ────────────────────────────────────────────────────────────────── */}
      {/* EMPTY STATE BANNER IF SELECTED NFA IS EMPTY                        */}
      {/* ────────────────────────────────────────────────────────────────── */}
      {isEmptyNFA ? (
        <div className="p-8 bg-slate-900 border border-slate-800 rounded-2xl text-center space-y-3 shadow-xl">
          <div className="p-3 bg-amber-500/10 border border-amber-500/30 text-amber-400 rounded-2xl w-fit mx-auto">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-white font-sans">
            Selected NFA {selectedNFASource} is Empty
          </h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            No states or transitions are configured for NFA {selectedNFASource}. Please construct or prompt an NFA model on the main workspace to run the elimination laboratory.
          </p>
        </div>
      ) : (
        <>
          {/* ────────────────────────────────────────────────────────────────── */}
          {/* 2. ANIMATED ALGORITHM TIMELINE STEPPER                             */}
          {/* ────────────────────────────────────────────────────────────────── */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-3 shadow-lg">
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
              {pipelineStages.map((st, idx) => {
                const isActive =
                  (currentStepIndex === 0 && st.id === 1) ||
                  (activeStep.phase === 'closure' && st.id === 2) ||
                  (activeStep.phase === 'propagation' && st.id === 3) ||
                  (activeStep.phase === 'accept_update' && st.id === 4) ||
                  (activeStep.phase === 'removal' && st.id === 5) ||
                  (currentStepIndex === traceData.steps.length - 1 && st.id === 6);
                return (
                  <React.Fragment key={st.id}>
                    <div
                      onClick={() => {
                        // Jump to first step matching phase if clicked
                        const targetIdx = traceData.steps.findIndex((s) => s.phase === st.phase);
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
          {/* 3. DUAL SYNCHRONIZED GRAPH WORKSPACE & CANVAS (MiniAutomataGraph)  */}
          {/* ────────────────────────────────────────────────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Left Canvas: Original ε-NFA */}
            <div className="rounded-2xl p-3 flex flex-col min-h-[340px] bg-slate-900 border border-slate-800 shadow-xl">
              <MiniAutomataGraph
                graph={leftGraph}
                title={`Original ε-NFA Canvas (NFA ${selectedNFASource})`}
                accentColor="#a855f7"
                highlightState={activeStep.affectedState}
                svgH={300}
              />
            </div>

            {/* Right Canvas: Current Working Machine / Equivalent ε-Free NFA */}
            <div className="rounded-2xl p-3 flex flex-col min-h-[340px] bg-slate-900 border border-slate-800 shadow-xl">
              <MiniAutomataGraph
                graph={rightGraph}
                title={
                  currentStepIndex === traceData.steps.length - 1
                    ? `Equivalent ε-Free NFA Canvas (NFA ${selectedNFASource})`
                    : `Current Working Machine Canvas (NFA ${selectedNFASource})`
                }
                accentColor="#10b981"
                highlightState={activeStep.affectedState}
                svgH={300}
              />
            </div>
          </div>

          {/* ────────────────────────────────────────────────────────────────── */}
          {/* 4. SYNCHRONIZED PLAYBACK CONTROLS BAR                              */}
          {/* ────────────────────────────────────────────────────────────────── */}
          <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl flex flex-wrap items-center justify-between gap-4 shadow-xl text-xs font-sans">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setCurrentStepIndex(0)}
                className="p-2 bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 rounded-xl cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
              <button
                onClick={() => setCurrentStepIndex((prev) => Math.max(0, prev - 1))}
                disabled={currentStepIndex === 0}
                className="p-2 bg-slate-950 hover:bg-slate-800 disabled:opacity-40 border border-slate-800 text-slate-300 rounded-xl cursor-pointer"
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
                onClick={() => setCurrentStepIndex((prev) => Math.min(traceData.steps.length - 1, prev + 1))}
                disabled={currentStepIndex >= traceData.steps.length - 1}
                className="p-2 bg-slate-950 hover:bg-slate-800 disabled:opacity-40 border border-slate-800 text-slate-300 rounded-xl cursor-pointer"
              >
                <SkipForward className="w-4 h-4" />
              </button>
            </div>

            {/* Progress Bar */}
            <div className="flex-1 max-w-md mx-4">
              <div className="flex justify-between text-[11px] font-mono text-slate-400 mb-1">
                <span>Step {activeStep.stepIndex} of {traceData.steps.length - 1}</span>
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
          {/* 5. STEP-BY-STEP TRANSFORMATION LOG (MOVED UP)                      */}
          {/* ────────────────────────────────────────────────────────────────── */}
          <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl space-y-3 shadow-xl">
            <h3 className="text-sm font-bold text-white font-sans flex items-center gap-2">
              <TableIcon className="w-4 h-4 text-purple-400" /> Step-by-Step Transformation Log
            </h3>

            <div className="overflow-x-auto max-h-[320px] overflow-y-auto font-mono text-xs border border-slate-800 rounded-xl">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-950 text-slate-400 sticky top-0 border-b border-slate-800">
                  <tr>
                    <th className="p-3">Step</th>
                    <th className="p-3">Phase / Operation</th>
                    <th className="p-3">Affected State</th>
                    <th className="p-3">Closure / Derivation</th>
                    <th className="p-3">Accept Update</th>
                    <th className="p-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {traceData.steps.slice(0, currentStepIndex + 1).map((st, idx) => {
                    const isCurrent = idx === currentStepIndex;
                    return (
                      <tr
                        key={st.stepIndex}
                        onClick={() => setSelectedLogRow(st.stepIndex)}
                        className={`cursor-pointer transition ${
                          isCurrent
                            ? 'bg-purple-950/70 text-purple-200 border-l-4 border-l-purple-500 font-bold'
                            : 'hover:bg-slate-850 bg-slate-900/40 text-slate-300'
                        }`}
                      >
                        <td className="p-3 text-purple-400">#{st.stepIndex}</td>
                        <td className="p-3 font-sans font-medium">{st.phaseName}</td>
                        <td className="p-3 text-sky-400">{st.affectedState}</td>
                        <td className="p-3 text-emerald-300 font-mono text-[11px]">{st.explanation}</td>
                        <td className="p-3">
                          {st.isAcceptUpdate ? (
                            <span className="px-2 py-0.5 bg-emerald-950 border border-emerald-500/40 text-emerald-300 rounded text-[10px]">
                              YES
                            </span>
                          ) : (
                            <span className="text-slate-500">NO</span>
                          )}
                        </td>
                        <td className="p-3 text-emerald-400">{st.status}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* ────────────────────────────────────────────────────────────────── */}
          {/* 6. LIVE ε-CLOSURE, TRANSITION PROPAGATION & ACCEPT CARDS (MOVED DOWN) */}
          {/* ────────────────────────────────────────────────────────────────── */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-mono">
            {/* Panel 1: Live ε-Closure Explorer */}
            <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl space-y-3 shadow-xl">
              <span className="font-bold text-purple-400 font-sans block border-b border-slate-800 pb-2 flex items-center gap-2">
                <Layers className="w-4 h-4 text-purple-400" /> Live ε-Closure Explorer
              </span>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-400 font-sans">Current State:</span>
                  <span className="font-bold text-white">{activeStep.affectedState}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 font-sans">ECLOSE({activeStep.affectedState}):</span>
                  <span className="font-bold text-purple-300">&#123;{activeStep.closure.join(', ')}&#125;</span>
                </div>
                <div className="p-2.5 bg-slate-950 border border-slate-800 rounded-xl">
                  <span className="text-[10px] text-slate-400 font-sans block uppercase">Traversal Sequence</span>
                  <span className="text-xs font-bold text-emerald-400">{activeStep.closure.join(' → ')}</span>
                </div>
              </div>
            </div>

            {/* Panel 2: Transition Propagation Derivation */}
            <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl space-y-3 shadow-xl">
              <span className="font-bold text-sky-400 font-sans block border-b border-slate-800 pb-2 flex items-center gap-2">
                <Cpu className="w-4 h-4 text-sky-400" /> Transition Propagation
              </span>
              <div className="space-y-2">
                <div className="text-[11px] text-slate-300 font-sans leading-relaxed">
                  {activeStep.explanation}
                </div>
                <div className="p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-[10px]">
                  <span className="text-slate-400 font-sans block uppercase">Formula Evaluation</span>
                  <span className="font-bold text-amber-300">{activeStep.formula}</span>
                </div>
              </div>
            </div>

            {/* Panel 3: Accept State & ε-Removal Status */}
            <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl space-y-3 shadow-xl">
              <span className="font-bold text-emerald-400 font-sans block border-b border-slate-800 pb-2 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Accept & Removal Status
              </span>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-400 font-sans">Closure Accept Check:</span>
                  <span className={`font-bold ${activeStep.isAcceptUpdate ? 'text-emerald-400' : 'text-slate-400'}`}>
                    {activeStep.isAcceptUpdate ? 'YES (Accepting)' : 'NO'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 font-sans">Remaining ε-Edges:</span>
                  <span className="font-bold text-purple-300">{activeStep.remainingEpsilonEdges}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 font-sans">Total Accept States:</span>
                  <span className="font-bold text-white">{activeStep.newAcceptStates.length}</span>
                </div>
              </div>
            </div>
          </div>

          {/* ────────────────────────────────────────────────────────────────── */}
          {/* 7. BEFORE VS AFTER COMPARISON SUMMARY CARD                         */}
          {/* ────────────────────────────────────────────────────────────────── */}
          <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl space-y-3 shadow-xl font-mono text-xs">
            <h3 className="text-sm font-bold text-emerald-400 font-sans flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" /> Transformation Summary & Equivalence Assertion
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
                <span className="font-bold text-purple-400 font-sans text-xs block">Original ε-NFA (NFA {selectedNFASource})</span>
                <div>States: <strong className="text-white">{activeNFA.states.length}</strong></div>
                <div>ε-Edges: <strong className="text-purple-300">{traceData.originalEpsilonCount}</strong></div>
                <div>Accept States: <strong className="text-emerald-400">&#123;{activeNFA.acceptStates.join(', ')}&#125;</strong></div>
              </div>

              <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
                <span className="font-bold text-emerald-400 font-sans text-xs block">Equivalent ε-Free NFA (NFA {selectedNFASource})</span>
                <div>States: <strong className="text-white">{traceData.equivalentNFA.states.length}</strong></div>
                <div>Remaining ε-Edges: <strong className="text-emerald-400">0</strong></div>
                <div>Accept States: <strong className="text-emerald-400">&#123;{traceData.equivalentNFA.acceptStates.join(', ')}&#125;</strong></div>
                <div>Language Equivalence: <strong className="text-emerald-300">L(Original) ≡ L(ε-Free)</strong></div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Educational Footer */}
      <NFABottomEducationalPanel
        nfa={activeNFA}
        toolKey="epsilon_elimination"
        toolTitle="ε-Transition Elimination"
      />
    </div>
  );
};
