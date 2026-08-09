import React, { useState, useMemo, useEffect } from 'react';
import {
  Columns,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Play,
  Pause,
  Layers,
  CheckCircle2,
  Table as TableIcon,
  Search,
  Sparkles,
  Zap,
  ArrowRight,
  HelpCircle,
  FileJson,
  BookOpen,
  Activity,
  Cpu,
} from 'lucide-react';
import type { NFA } from '../../algorithms/nfa/NFA';
import { performSubsetConstruction } from '../../algorithms/shared/SubsetConstruction';
import { useAutomata } from '../../context/AutomataContext';

interface NFASubsetConstructionPanelProps {
  nfa: NFA;
  onSelectDFAState?: (stateId: string | null) => void;
}

export const NFASubsetConstructionPanel: React.FC<NFASubsetConstructionPanelProps> = ({
  nfa,
  onSelectDFAState,
}) => {
  const result = useMemo(() => performSubsetConstruction(nfa), [nfa]);
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [selectedSymbol, setSelectedSymbol] = useState<string>(result.alphabet[0] || '0');
  const [activeTab, setActiveTab] = useState<'mapping' | 'matrix' | 'history' | 'math' | 'tutor'>('mapping');

  const totalSteps = result.states.length;
  const currentDFAState = result.states[currentStepIndex] || result.states[0] || 'A';
  const currentSubset = result.subsetMap[currentDFAState] || [];
  const progressPercent = Math.round(((currentStepIndex + 1) / Math.max(1, totalSteps)) * 100);

  // Auto-play timer
  useEffect(() => {
    let timer: any = null;
    if (isPlaying) {
      timer = setInterval(() => {
        setCurrentStepIndex((prev) => {
          if (prev >= totalSteps - 1) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, 1500 / playbackSpeed);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isPlaying, totalSteps, playbackSpeed]);

  // Construction History Traversal Log
  const constructionHistory = useMemo(() => {
    const history: Array<{
      step: number;
      dfaState: string;
      subset: string[];
      isAccept: boolean;
      transitions: Record<string, string>;
    }> = [];

    result.states.forEach((st, idx) => {
      history.push({
        step: idx + 1,
        dfaState: st,
        subset: result.subsetMap[st] || [],
        isAccept: result.acceptStates.includes(st),
        transitions: result.transitions[st] || {},
      });
    });

    return history;
  }, [result]);

  // BFS Queue Simulation State
  const queueState = useMemo(() => {
    const active = currentDFAState;
    const remaining = result.states.slice(currentStepIndex + 1);
    const completed = result.states.slice(0, currentStepIndex);
    return { active, remaining, completed };
  }, [result.states, currentStepIndex, currentDFAState]);

  // Insights List
  const insights = useMemo(() => {
    const list: string[] = [];
    const nfaStateCount = nfa.states.length;
    const dfaStateCount = result.states.length;
    const ratio = (dfaStateCount / Math.max(1, nfaStateCount)).toFixed(2);

    list.push(`Constructed ${dfaStateCount} DFA states from ${nfaStateCount} NFA states (Expansion Ratio: ${ratio}x).`);
    list.push(`Powerset space |P(Q)| = 2^${nfaStateCount} = ${Math.pow(2, nfaStateCount)} possible subsets.`);
    if (dfaStateCount < Math.pow(2, nfaStateCount)) {
      list.push(`Achieved state reduction: Only ${dfaStateCount} / ${Math.pow(2, nfaStateCount)} subsets were reachable!`);
    }
    list.push(`${result.acceptStates.length} DFA accept states generated (containing NFA accept states).`);
    return list;
  }, [nfa, result]);

  return (
    <div className="p-4 sm:p-5 space-y-4 bg-slate-900/95 text-slate-100 rounded-2xl border border-slate-800 text-sm shadow-xl font-sans select-none">
      {/* ────────────────────────────────────────────────────────────────── */}
      {/* TOP HEADER & PLAYBACK CONTROLS                                    */}
      {/* ────────────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3 flex-wrap gap-2">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-purple-600/20 border border-purple-500/40 text-purple-400 rounded-xl">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-base text-purple-300">Subset Construction Laboratory (NFA → DFA)</h3>
            <p className="text-xs text-slate-400 font-medium">
              Interactive Power Set Algorithm mapping NFA state subsets into deterministic DFA states
            </p>
          </div>
        </div>

        {/* Stepper & Playback Controls Bar */}
        <div className="flex items-center gap-2 font-mono flex-wrap">
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => {
                setCurrentStepIndex(0);
                setIsPlaying(false);
              }}
              className="p-1.5 bg-slate-900 hover:bg-slate-800 rounded-lg text-slate-300 transition cursor-pointer"
              title="Reset to Step 1"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>

            <button
              disabled={currentStepIndex === 0}
              onClick={() => setCurrentStepIndex((prev) => Math.max(0, prev - 1))}
              className="p-1.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-40 rounded-lg text-slate-300 transition cursor-pointer"
              title="Step Back"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="px-2.5 py-1.5 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-lg text-xs flex items-center gap-1 transition shadow cursor-pointer"
            >
              {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              {isPlaying ? 'Pause' : 'Play'}
            </button>

            <button
              disabled={currentStepIndex >= totalSteps - 1}
              onClick={() => setCurrentStepIndex((prev) => Math.min(totalSteps - 1, prev + 1))}
              className="p-1.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-40 rounded-lg text-slate-300 transition cursor-pointer"
              title="Step Forward"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Playback Speed Buttons */}
          <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 text-[10px]">
            {[0.5, 1, 2, 4].map((spd) => (
              <button
                key={spd}
                onClick={() => setPlaybackSpeed(spd)}
                className={`px-2 py-0.5 rounded-md font-bold transition cursor-pointer ${
                  playbackSpeed === spd ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {spd}x
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Construction Progress Bar */}
      <div className="space-y-1 font-mono text-xs">
        <div className="flex justify-between items-center text-slate-400 text-[11px]">
          <span>
            Current DFA State: <strong className="text-purple-300 font-bold">{currentDFAState}</strong> (Subset: &#123;{currentSubset.join(', ')}&#125;)
          </span>
          <span className="font-bold text-purple-300">
            Step {currentStepIndex + 1} of {totalSteps} ({progressPercent}%)
          </span>
        </div>
        <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-800">
          <div
            className="bg-gradient-to-r from-purple-600 to-indigo-500 h-full transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* ────────────────────────────────────────────────────────────────── */}
      {/* SECTION 1: POWER SET SUBSET CARDS EXPLORER                        */}
      {/* ────────────────────────────────────────────────────────────────── */}
      <div className="space-y-2">
        <span className="text-xs font-bold text-purple-300 uppercase tracking-wider block font-mono">
          1. Discovered Power Set DFA States ({result.states.length})
        </span>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 font-mono">
          {result.states.map((dfaState, idx) => {
            const subset = result.subsetMap[dfaState] || [];
            const isCurrent = idx === currentStepIndex;
            const isAccept = result.acceptStates.includes(dfaState);
            const isStart = dfaState === result.startState;

            return (
              <div
                key={dfaState}
                onClick={() => {
                  setCurrentStepIndex(idx);
                  onSelectDFAState?.(dfaState);
                }}
                className={`p-3 rounded-xl border transition cursor-pointer transform hover:-translate-y-0.5 ${
                  isCurrent
                    ? 'bg-purple-950/90 border-purple-500 shadow-lg shadow-purple-950/50 ring-1 ring-purple-500/50 scale-[1.02]'
                    : 'bg-slate-950/80 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex justify-between items-center mb-1">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-sm text-purple-300">{dfaState}</span>
                    {isStart && (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-500/40">
                        START
                      </span>
                    )}
                  </div>
                  <span
                    className={`text-[9.5px] font-bold px-1.5 py-0.5 rounded ${
                      isAccept
                        ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/40'
                        : 'bg-slate-900 text-slate-400'
                    }`}
                  >
                    {isAccept ? 'ACCEPT' : 'State'}
                  </span>
                </div>
                <div className="text-[11px] text-slate-300">
                  Subset: <span className="font-bold text-emerald-300">&#123; {subset.join(', ')} &#125;</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ────────────────────────────────────────────────────────────────── */}
      {/* SECTION 2: ALGORITHM BFS QUEUE VISUALIZER                          */}
      {/* ────────────────────────────────────────────────────────────────── */}
      <div className="p-3.5 bg-slate-950/90 rounded-xl border border-slate-800 space-y-2 font-mono text-xs">
        <span className="text-xs font-bold text-sky-400 uppercase tracking-wider block font-sans">
          2. Algorithm BFS Processing Queue
        </span>
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pt-1">
          <span className="text-slate-400 text-[11px]">Processed:</span>
          {queueState.completed.map((st) => (
            <span key={st} className="px-2 py-0.5 bg-slate-900 border border-slate-800 text-slate-500 rounded text-[11px]">
              {st} ✓
            </span>
          ))}
          <span className="text-slate-400 text-[11px] ml-2">Active:</span>
          <span className="px-2.5 py-1 bg-purple-600 border border-purple-400 text-white rounded font-bold text-xs shadow-md">
            [{queueState.active}]
          </span>
          <span className="text-slate-400 text-[11px] ml-2">Remaining:</span>
          {queueState.remaining.length === 0 ? (
            <span className="text-emerald-400 text-[11px] italic font-sans">Queue Empty (Construction Finished!)</span>
          ) : (
            queueState.remaining.map((st) => (
              <span key={st} className="px-2 py-0.5 bg-slate-900 border border-slate-800 text-slate-300 rounded text-[11px]">
                {st}
              </span>
            ))
          )}
        </div>
      </div>

      {/* ────────────────────────────────────────────────────────────────── */}
      {/* SECTION 3: WORKSPACE NAVIGATION TABS & MAPPING WORKSPACE           */}
      {/* ────────────────────────────────────────────────────────────────── */}
      <div className="space-y-3">
        <div className="flex items-center gap-1.5 border-b border-slate-800 pb-2 text-xs font-bold font-sans">
          {[
            { id: 'mapping' as const, label: '🔀 Subset Mapping' },
            { id: 'matrix' as const, label: '📊 Transition Matrix' },
            { id: 'history' as const, label: '📜 Timeline History' },
            { id: 'math' as const, label: '📐 Math & Theorems' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-1.5 rounded-xl border transition cursor-pointer ${
                activeTab === tab.id
                  ? 'bg-purple-600 border-purple-400 text-white shadow-md shadow-purple-600/30'
                  : 'bg-slate-950/80 border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab 1: Subset Transition Mapping Workspace */}
        {activeTab === 'mapping' && (
          <div className="p-4 bg-slate-950/90 border border-slate-800 rounded-xl space-y-3 font-mono text-xs">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="font-bold text-purple-300 uppercase tracking-wider text-xs font-sans">
                Active DFA State Transition Resolver ({currentDFAState})
              </span>
              <div className="flex items-center gap-1">
                <span className="text-slate-400 text-[11px] font-sans">Input Symbol:</span>
                {result.alphabet.map((sym) => (
                  <button
                    key={sym}
                    onClick={() => setSelectedSymbol(sym)}
                    className={`px-2 py-0.5 rounded font-bold transition cursor-pointer ${
                      selectedSymbol === sym ? 'bg-sky-600 text-white' : 'bg-slate-900 border border-slate-800 text-slate-400'
                    }`}
                  >
                    '{sym}'
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
              <div className="p-3 bg-slate-900/90 rounded-xl border border-slate-800 space-y-1">
                <span className="text-[10px] text-slate-400 uppercase font-sans font-bold block">Current NFA Subset</span>
                <span className="text-sm font-bold text-purple-300">&#123; {currentSubset.join(', ')} &#125;</span>
              </div>
              <div className="p-3 bg-slate-900/90 rounded-xl border border-slate-800 space-y-1">
                <span className="text-[10px] text-slate-400 uppercase font-sans font-bold block">Symbol Move & ε-Closure</span>
                <span className="text-sm font-bold text-sky-400">
                  δ'({currentDFAState}, '{selectedSymbol}')
                </span>
              </div>
              <div className="p-3 bg-slate-900/90 rounded-xl border border-slate-800 space-y-1">
                <span className="text-[10px] text-slate-400 uppercase font-sans font-bold block">Target DFA State</span>
                <span className="text-sm font-bold text-emerald-300">
                  ➔ {result.transitions[currentDFAState]?.[selectedSymbol] || '∅'}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Live Transition Matrix */}
        {activeTab === 'matrix' && (
          <div className="p-3.5 bg-slate-950/90 border border-slate-800 rounded-xl space-y-2 font-mono text-xs">
            <span className="text-xs font-bold text-purple-300 uppercase tracking-wider block font-sans">
              Complete DFA Subset Transition Matrix
            </span>
            <div className="overflow-x-auto max-h-[220px] overflow-y-auto border border-slate-800 rounded-xl">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-900 text-slate-400 sticky top-0 border-b border-slate-800">
                  <tr>
                    <th className="p-2.5">DFA State</th>
                    <th className="p-2.5">NFA Subset</th>
                    {result.alphabet.map((sym) => (
                      <th key={sym} className="p-2.5 text-center">
                        δ('{sym}')
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {result.states.map((st, idx) => (
                    <tr
                      key={st}
                      onClick={() => setCurrentStepIndex(idx)}
                      className={`cursor-pointer transition ${
                        currentStepIndex === idx ? 'bg-purple-950/60 border-l-4 border-l-purple-500 font-bold' : 'hover:bg-slate-900/80'
                      }`}
                    >
                      <td className="p-2.5 font-bold text-purple-300">{st}</td>
                      <td className="p-2.5 text-emerald-300">&#123; {(result.subsetMap[st] || []).join(', ')} &#125;</td>
                      {result.alphabet.map((sym) => (
                        <td key={sym} className="p-2.5 text-center font-bold text-sky-300">
                          {result.transitions[st]?.[sym] || '∅'}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 3: Timeline History */}
        {activeTab === 'history' && (
          <div className="p-3.5 bg-slate-950/90 border border-slate-800 rounded-xl space-y-2 font-mono text-xs max-h-[240px] overflow-y-auto">
            <span className="text-xs font-bold text-purple-300 uppercase tracking-wider block font-sans">
              Construction Timeline Step History
            </span>
            <div className="space-y-1.5">
              {constructionHistory.map((item) => (
                <div
                  key={item.step}
                  onClick={() => setCurrentStepIndex(item.step - 1)}
                  className={`p-2 rounded-lg border transition cursor-pointer ${
                    currentStepIndex === item.step - 1 ? 'bg-purple-950/80 border-purple-500' : 'bg-slate-900/60 border-slate-800'
                  }`}
                >
                  <div className="flex justify-between items-center font-bold text-slate-200">
                    <span>
                      Step #{item.step}: Created DFA State <strong className="text-purple-300">{item.dfaState}</strong>
                    </span>
                    <span className="text-emerald-400 font-mono text-[11px]">&#123; {item.subset.join(', ')} &#125;</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 4: Mathematical View */}
        {activeTab === 'math' && (
          <div className="p-4 bg-slate-950/90 border border-slate-800 rounded-xl space-y-2 text-xs text-slate-300 leading-relaxed font-sans">
            <h4 className="font-bold text-white text-sm">Powerset Construction Mathematical Theorems</h4>
            <p>
              The Subset Construction converts an NFA $M = (Q, \Sigma, \delta, q_0, F)$ into an equivalent DFA $M' = (Q', \Sigma, \delta', q_0', F')$ where:
            </p>
            <ul className="list-disc list-inside space-y-1 font-mono text-[11px] text-purple-200">
              <li>Q' = P(Q) (Power set of all state subsets)</li>
              <li>q0' = ECLOSE(q0)</li>
              <li>δ'(S, a) = ECLOSE( ⋃ (q ∈ S) δ(q, a) )</li>
              <li>F' = &#123; S ∈ Q' | S ∩ F ≠ ∅ &#125;</li>
            </ul>
          </div>
        )}
      </div>

      {/* ────────────────────────────────────────────────────────────────── */}
      {/* SECTION 4: AUTOMATA DIAGNOSTICS & INSIGHTS                        */}
      {/* ────────────────────────────────────────────────────────────────── */}
      <div className="p-4 bg-slate-950/90 rounded-xl border border-slate-800 space-y-2">
        <span className="text-xs font-bold text-sky-400 uppercase tracking-wider block flex items-center gap-1.5 font-sans">
          <Sparkles className="w-4 h-4 text-sky-400" /> Subset Construction Diagnostics
        </span>
        <ul className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs font-sans text-slate-300">
          {insights.map((ins, idx) => (
            <li key={idx} className="flex items-center gap-2 p-2 bg-slate-900/70 border border-slate-800/80 rounded-lg">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>{ins}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};
