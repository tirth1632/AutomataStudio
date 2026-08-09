import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  ArrowRight,
  CheckCircle2,
  Scissors,
  Download,
  FileCode,
  FileText,
  Code,
  Sparkles,
  Layers,
  Activity,
} from 'lucide-react';
import type { AutomatonGraph, MinimizationPhase } from '../../types/automata';
import { minimizeDFA } from '../../algorithms/hopcroftMinimization';
import { MinimizationPlayerControls } from './minimization/MinimizationPlayerControls';
import { MinimizationTimeline } from './minimization/MinimizationTimeline';
import { WhySplitCard } from './minimization/WhySplitCard';
import { MinimizationBottomPanels } from './minimization/MinimizationBottomPanels';
import { downloadFile, exportToLaTeX, exportToJSON, exportToCSV } from '../../utils/exportUtils';
import { generateMinimizationPDFReport } from '../../utils/exportUtils';

interface DFAMinimizationModalProps {
  graph: AutomatonGraph;
  isOpen: boolean;
  onClose: () => void;
  onApplyMinimized: (minimizedGraph: AutomatonGraph) => void;
}

export const DFAMinimizationModal: React.FC<DFAMinimizationModalProps> = ({
  graph,
  isOpen,
  onClose,
  onApplyMinimized,
}) => {
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [speed, setSpeed] = useState<number>(1);
  const [highlightStateId, setHighlightStateId] = useState<string | null>(null);
  const [isExportOpen, setIsExportOpen] = useState<boolean>(false);

  const minimizationResult = useMemo(() => {
    return minimizeDFA(graph);
  }, [graph]);

  const { steps, minimizedGraph } = minimizationResult;

  // Reset playback on modal open or graph change
  useEffect(() => {
    if (isOpen) {
      setCurrentStepIndex(0);
      setIsPlaying(false);
    }
  }, [isOpen, graph]);

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

  if (!isOpen) return null;

  const currentStep = steps[currentStepIndex] || steps[0];
  const currentWorkingGraph = currentStep.workingGraph || graph;

  const originalStateCount = graph.states.length;
  const minimalStateCount = minimizedGraph.states.length;
  const removedStatesCount = originalStateCount - minimalStateCount;
  const reductionPercentage = Math.round((removedStatesCount / Math.max(1, originalStateCount)) * 100);

  const handleNextStep = () => {
    if (currentStepIndex < steps.length - 1) {
      setCurrentStepIndex((prev) => prev + 1);
    }
  };

  const handlePrevStep = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex((prev) => prev - 1);
    }
  };

  const handleRestart = () => {
    setCurrentStepIndex(0);
    setIsPlaying(false);
  };

  const handleFinish = () => {
    setCurrentStepIndex(steps.length - 1);
    setIsPlaying(false);
  };

  const handlePhaseSelect = (phase: MinimizationPhase) => {
    const idx = steps.findIndex((s) => s.phase === phase);
    if (idx !== -1) {
      setCurrentStepIndex(idx);
    }
  };

  const handleApply = () => {
    onApplyMinimized(minimizedGraph);
    onClose();
  };

  const handleExportPDF = () => {
    generateMinimizationPDFReport(graph, minimizationResult);
    setIsExportOpen(false);
  };

  const handleExportLaTeX = () => {
    const latex = exportToLaTeX(minimizedGraph, `${graph.name || 'DFA'} Hopcroft Minimized`);
    downloadFile(`${(graph.name || 'DFA').replace(/\s+/g, '_')}_minimized.tex`, latex, 'text/x-tex');
    setIsExportOpen(false);
  };

  const handleExportJSON = () => {
    const jsonStr = exportToJSON(minimizedGraph);
    downloadFile(`${(graph.name || 'DFA').replace(/\s+/g, '_')}_minimized.json`, jsonStr, 'application/json');
    setIsExportOpen(false);
  };

  const handleExportCSV = () => {
    const csvStr = exportToCSV(minimizedGraph);
    downloadFile(`${(graph.name || 'DFA').replace(/\s+/g, '_')}_minimized.csv`, csvStr, 'text/csv');
    setIsExportOpen(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 select-none animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-700/80 rounded-3xl w-full max-w-6xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh]">
        
        {/* ── SECTION 1: HEADER ── */}
        <div className="p-4 sm:p-5 bg-slate-950 border-b border-slate-800 flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-600/20 border border-indigo-500/30 rounded-2xl text-indigo-400">
              <Scissors className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div>
              <h3 className="text-base sm:text-xl font-extrabold text-white flex items-center gap-2 tracking-tight">
                Hopcroft DFA Minimization & Partition Refinement Visualizer
              </h3>
              <p className="text-xs text-slate-400">Interactive step-by-step equivalence reduction workspace</p>
            </div>
          </div>

          {/* Header Metrics & Export */}
          <div className="flex items-center gap-3 flex-wrap">
            {/* Stats Badge */}
            <div className="flex items-center gap-2 p-1.5 bg-slate-900 border border-slate-800 rounded-2xl text-xs">
              <span className="px-2.5 py-1 bg-indigo-950 text-indigo-300 border border-indigo-500/40 rounded-xl font-mono font-bold">
                Original: {originalStateCount} States
              </span>
              <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
              <span className="px-2.5 py-1 bg-emerald-950 text-emerald-300 border border-emerald-500/40 rounded-xl font-mono font-bold">
                Minimal: {minimalStateCount} States
              </span>
              <span className="px-2.5 py-1 bg-sky-950 text-sky-300 border border-sky-500/40 rounded-xl font-mono font-bold">
                {reductionPercentage}% Reduction
              </span>
            </div>

            {/* Export Menu Dropdown */}
            <div className="relative">
              <button
                onClick={() => setIsExportOpen(!isExportOpen)}
                className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition"
              >
                <Download className="w-4 h-4 text-indigo-400" /> Export <Sparkles className="w-3 h-3 text-amber-400" />
              </button>

              {isExportOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-1.5 z-50 space-y-1">
                  <button
                    onClick={handleExportPDF}
                    className="w-full text-left px-3 py-2 text-xs text-slate-200 hover:bg-slate-800 rounded-xl flex items-center gap-2"
                  >
                    <FileText className="w-4 h-4 text-red-400" /> Academic PDF Report
                  </button>
                  <button
                    onClick={handleExportLaTeX}
                    className="w-full text-left px-3 py-2 text-xs text-slate-200 hover:bg-slate-800 rounded-xl flex items-center gap-2"
                  >
                    <Code className="w-4 h-4 text-sky-400" /> LaTeX TikZ Syntax
                  </button>
                  <button
                    onClick={handleExportJSON}
                    className="w-full text-left px-3 py-2 text-xs text-slate-200 hover:bg-slate-800 rounded-xl flex items-center gap-2"
                  >
                    <FileCode className="w-4 h-4 text-amber-400" /> Minimal DFA JSON
                  </button>
                  <button
                    onClick={handleExportCSV}
                    className="w-full text-left px-3 py-2 text-xs text-slate-200 hover:bg-slate-800 rounded-xl flex items-center gap-2"
                  >
                    <FileText className="w-4 h-4 text-emerald-400" /> Transition CSV
                  </button>
                </div>
              )}
            </div>

            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-800 text-slate-400 hover:text-white rounded-xl transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ── SECTION 2: TIMELINE ── */}
        <div className="px-5 pt-3">
          <MinimizationTimeline
            currentPhase={currentStep.phase}
            currentStepIndex={currentStepIndex}
            totalSteps={steps.length}
            onPhaseSelect={handlePhaseSelect}
          />
        </div>

        {/* ── SECTION 3 & 4: MAIN VISUALIZATION & EXPLANATION WORKSPACE ── */}
        <div className="p-5 overflow-y-auto space-y-5 flex-1">
          
          {/* Player Control Bar */}
          <MinimizationPlayerControls
            currentStepIndex={currentStepIndex}
            totalSteps={steps.length}
            isPlaying={isPlaying}
            speed={speed}
            onPlayPause={() => setIsPlaying(!isPlaying)}
            onPrev={handlePrevStep}
            onNext={handleNextStep}
            onRestart={handleRestart}
            onFinish={handleFinish}
            onSpeedChange={setSpeed}
          />

          {/* Synchronized Graphs Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Original DFA Reference Card */}
            <div className="bg-slate-950/90 border border-slate-800 rounded-2xl p-4 space-y-2 shadow-xl backdrop-blur-xl flex flex-col min-h-[220px]">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                  <Layers className="w-4 h-4 text-indigo-400" /> Original Input DFA ({graph.states.length} States)
                </span>
                <span className="text-[10px] bg-slate-900 border border-slate-800 text-slate-400 px-2 py-0.5 rounded font-mono">
                  Static Reference
                </span>
              </div>

              <div className="flex-1 bg-slate-900/60 border border-slate-800/80 rounded-xl p-3 flex flex-wrap gap-2 items-center justify-center overflow-auto">
                {graph.states.map((st) => {
                  const isHighlighted = highlightStateId === st.id;

                  return (
                    <div
                      key={st.id}
                      onClick={() => setHighlightStateId(isHighlighted ? null : st.id)}
                      className={`px-3 py-1.5 rounded-xl border font-mono text-xs font-bold cursor-pointer transition transform hover:scale-105 ${
                        isHighlighted
                          ? 'bg-indigo-600 text-white border-indigo-400 shadow-lg shadow-indigo-500/30'
                          : st.isAccept
                          ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                          : 'bg-slate-950 border-slate-700 text-slate-200'
                      }`}
                    >
                      {st.isStart ? '→ ' : ''}{st.id}{st.isAccept ? ' *' : ''}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Current Working / Minimal DFA Card */}
            <div className="bg-slate-950/90 border border-slate-800 rounded-2xl p-4 space-y-2 shadow-xl backdrop-blur-xl flex flex-col min-h-[220px]">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-2">
                  <Activity className="w-4 h-4 text-emerald-400" /> Step {currentStep.stepIndex} Working Partitions ({currentWorkingGraph.states.length} Groups)
                </span>
                <span className="text-[10px] bg-emerald-950/50 border border-emerald-500/40 text-emerald-300 px-2 py-0.5 rounded font-mono font-bold">
                  {currentStep.phase}
                </span>
              </div>

              <div className="flex-1 bg-slate-900/60 border border-slate-800/80 rounded-xl p-3 flex flex-wrap gap-2 items-center justify-center overflow-auto">
                {currentWorkingGraph.states.map((st) => (
                  <div
                    key={st.id}
                    className={`px-3.5 py-2 rounded-xl border font-mono text-xs font-bold transition transform hover:scale-105 shadow-md ${
                      st.isAccept
                        ? 'bg-gradient-to-r from-emerald-900/40 to-teal-900/40 border-emerald-500/50 text-emerald-200'
                        : 'bg-slate-950 border-indigo-500/30 text-indigo-200'
                    }`}
                  >
                    {st.isStart ? '→ ' : ''}{st.label || st.id}{st.isAccept ? ' *' : ''}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Why Did This Split? Card */}
          <WhySplitCard splitDetail={currentStep.splitDetail} stepIndex={currentStep.stepIndex} />

          {/* Educational Bottom Tabs */}
          <MinimizationBottomPanels
            result={minimizationResult}
            originalGraph={graph}
            currentStepIndex={currentStepIndex}
            onStepSelect={setCurrentStepIndex}
            highlightStateId={highlightStateId}
            onHighlightState={setHighlightStateId}
          />
        </div>

        {/* ── FOOTER ACTIONS ── */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition"
          >
            Close
          </button>

          <button
            onClick={handleApply}
            className="px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-bold transition shadow-lg shadow-emerald-600/30 flex items-center gap-2"
          >
            <CheckCircle2 className="w-4 h-4" /> Replace Canvas with Minimal DFA
          </button>
        </div>
      </div>
    </div>
  );
};
