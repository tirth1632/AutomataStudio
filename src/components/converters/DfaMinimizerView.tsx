import React, { useState, useMemo, useEffect } from 'react';
import { Sparkles, ArrowRight, FileText } from 'lucide-react';
import { useAutomata } from '../../context/AutomataContext';
import { minimizeDFA } from '../../algorithms/hopcroftMinimization';
import { MinimizationPlayerControls } from '../dfa/minimization/MinimizationPlayerControls';
import { MinimizationTimeline } from '../dfa/minimization/MinimizationTimeline';
import { WhySplitCard } from '../dfa/minimization/WhySplitCard';
import { MinimizationBottomPanels } from '../dfa/minimization/MinimizationBottomPanels';
import { generateMinimizationPDFReport } from '../../utils/exportUtils';
import type { MinimizationPhase } from '../../types/automata';

export const DfaMinimizerView: React.FC = () => {
  const { graph, setGraph, setActivePage } = useAutomata();

  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [speed, setSpeed] = useState<number>(1);
  const [highlightStateId, setHighlightStateId] = useState<string | null>(null);

  const minimizationResult = useMemo(() => {
    return minimizeDFA(graph);
  }, [graph]);

  const { steps, minimizedGraph } = minimizationResult;

  useEffect(() => {
    setCurrentStepIndex(0);
    setIsPlaying(false);
  }, [graph]);

  // Auto-play timer
  useEffect(() => {
    if (!isPlaying) return;
    const intervalTime = Math.max(200, 1500 / speed);
    const timer = setInterval(() => {
      setCurrentStepIndex((prev) => {
        if (prev >= steps.length - 1) {
          setIsPlaying(false);
          return prev;
        }
        return prev + 1;
      });
    }, intervalTime);

    return () => clearInterval(timer);
  }, [isPlaying, speed, steps.length]);

  const currentStep = steps[currentStepIndex] || steps[0];
  const currentWorkingGraph = currentStep.workingGraph || graph;

  const originalCount = graph.states.length;
  const minimizedCount = minimizedGraph.states.length;
  const reductionPct = Math.round(((originalCount - minimizedCount) / Math.max(1, originalCount)) * 100);

  const handleApplyMinimized = () => {
    setGraph(minimizedGraph);
    setActivePage('dfa');
  };

  const handlePhaseSelect = (phase: MinimizationPhase) => {
    const idx = steps.findIndex((s) => s.phase === phase);
    if (idx !== -1) {
      setCurrentStepIndex(idx);
    }
  };

  return (
    <div className="w-full h-full p-4 sm:p-6 bg-slate-950 text-slate-100 overflow-y-auto font-sans">
      <div className="max-w-6xl mx-auto space-y-5">
        {/* Header Banner */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 bg-gradient-to-r from-indigo-950/80 via-slate-900 to-slate-900 border border-indigo-500/30 rounded-3xl shadow-2xl backdrop-blur-xl">
          <div>
            <div className="flex items-center gap-2 text-indigo-400 font-semibold text-xs uppercase tracking-wider mb-1">
              <Sparkles className="w-4 h-4" /> Hopcroft Minimization Visualizer
            </div>
            <h2 className="text-2xl font-bold text-white">Interactive DFA Partition Refinement</h2>
            <p className="text-sm text-slate-400 mt-1">
              Interactive educational visualizer explaining why states split, why equivalent states merge, and how the minimal DFA is constructed.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => generateMinimizationPDFReport(graph, minimizationResult)}
              className="px-4 py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-2xl transition flex items-center gap-2"
            >
              <FileText className="w-4 h-4 text-red-400" /> Export PDF Report
            </button>

            <button
              onClick={handleApplyMinimized}
              className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold rounded-2xl shadow-xl shadow-emerald-600/30 transition active:scale-95 shrink-0 text-xs"
            >
              Load Minimized DFA into Canvas
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* State Reduction Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="p-4 bg-slate-900/90 border border-slate-800 rounded-2xl">
            <span className="text-xs text-slate-400">Original State Count</span>
            <p className="text-2xl font-bold text-white mt-1">{originalCount} states</p>
          </div>
          <div className="p-4 bg-slate-900/90 border border-slate-800 rounded-2xl">
            <span className="text-xs text-slate-400">Minimized State Count</span>
            <p className="text-2xl font-bold text-emerald-400 mt-1">{minimizedCount} states</p>
          </div>
          <div className="p-4 bg-slate-900/90 border border-slate-800 rounded-2xl">
            <span className="text-xs text-slate-400">States Reduced</span>
            <p className="text-2xl font-bold text-sky-400 mt-1">
              {reductionPct > 0 ? `${reductionPct}% Reduced` : 'Already Minimal'}
            </p>
          </div>
          <div className="p-4 bg-slate-900/90 border border-slate-800 rounded-2xl">
            <span className="text-xs text-slate-400">Time Complexity</span>
            <p className="text-2xl font-bold text-indigo-400 font-mono mt-1">O(n log n)</p>
          </div>
        </div>

        {/* Phase Timeline Stepper */}
        <MinimizationTimeline
          currentPhase={currentStep.phase}
          currentStepIndex={currentStepIndex}
          totalSteps={steps.length}
          onPhaseSelect={handlePhaseSelect}
        />

        {/* Player Controls */}
        <MinimizationPlayerControls
          currentStepIndex={currentStepIndex}
          totalSteps={steps.length}
          isPlaying={isPlaying}
          speed={speed}
          onPlayPause={() => setIsPlaying(!isPlaying)}
          onPrev={() => currentStepIndex > 0 && setCurrentStepIndex(currentStepIndex - 1)}
          onNext={() => currentStepIndex < steps.length - 1 && setCurrentStepIndex(currentStepIndex + 1)}
          onRestart={() => { setCurrentStepIndex(0); setIsPlaying(false); }}
          onFinish={() => { setCurrentStepIndex(steps.length - 1); setIsPlaying(false); }}
          onSpeedChange={setSpeed}
        />

        {/* Synchronized Graph Comparison Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 space-y-2 shadow-xl">
            <div className="flex items-center justify-between text-xs font-bold text-slate-400 uppercase tracking-wider">
              <span>Original Input DFA ({graph.states.length} States)</span>
              <span className="text-[10px] text-slate-500 font-mono">Static Reference</span>
            </div>
            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 flex flex-wrap gap-2 items-center justify-center min-h-[160px]">
              {graph.states.map((st) => (
                <div
                  key={st.id}
                  onClick={() => setHighlightStateId(highlightStateId === st.id ? null : st.id)}
                  className={`px-3 py-1.5 rounded-xl border font-mono text-xs font-bold cursor-pointer transition ${
                    highlightStateId === st.id
                      ? 'bg-indigo-600 text-white border-indigo-400'
                      : st.isAccept
                      ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                      : 'bg-slate-900 border-slate-700 text-slate-200'
                  }`}
                >
                  {st.isStart ? '→ ' : ''}{st.id}{st.isAccept ? ' *' : ''}
                </div>
              ))}
            </div>
          </div>

          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 space-y-2 shadow-xl">
            <div className="flex items-center justify-between text-xs font-bold text-emerald-400 uppercase tracking-wider">
              <span>Step {currentStep.stepIndex} Working Partitions ({currentWorkingGraph.states.length} Groups)</span>
              <span className="text-[10px] bg-emerald-950 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 rounded font-mono">
                {currentStep.phase}
              </span>
            </div>
            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 flex flex-wrap gap-2 items-center justify-center min-h-[160px]">
              {currentWorkingGraph.states.map((st) => (
                <div
                  key={st.id}
                  className={`px-3.5 py-2 rounded-xl border font-mono text-xs font-bold ${
                    st.isAccept
                      ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200'
                      : 'bg-slate-900 border-indigo-500/30 text-indigo-200'
                  }`}
                >
                  {st.isStart ? '→ ' : ''}{st.label || st.id}{st.isAccept ? ' *' : ''}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Why Did This Split Card */}
        <WhySplitCard splitDetail={currentStep.splitDetail} stepIndex={currentStep.stepIndex} />

        {/* 6-Tab Explanation Workspace */}
        <MinimizationBottomPanels
          result={minimizationResult}
          originalGraph={graph}
          currentStepIndex={currentStepIndex}
          onStepSelect={setCurrentStepIndex}
          highlightStateId={highlightStateId}
          onHighlightState={setHighlightStateId}
        />
      </div>
    </div>
  );
};
