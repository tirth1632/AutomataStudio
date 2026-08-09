import React from 'react';
import { CheckCircle2, PlayCircle, Split, ArrowRight, Layers, Cpu } from 'lucide-react';
import type { MinimizationPhase } from '../../../types/automata';

interface MinimizationTimelineProps {
  currentPhase: MinimizationPhase;
  currentStepIndex: number;
  totalSteps: number;
  onPhaseSelect: (phase: MinimizationPhase) => void;
}

const PHASES: Array<{ id: MinimizationPhase; label: string; icon: any; desc: string }> = [
  { id: 'Initialize', label: 'Initialize', icon: Cpu, desc: 'Load graph & alphabet' },
  { id: 'Initial Partition', label: 'P0 Partition', icon: Layers, desc: 'Accepting vs Non-Accepting' },
  { id: 'Partition Refinement', label: 'Refinement', icon: Split, desc: 'Group distinction loop' },
  { id: 'Split Groups', label: 'Split Groups', icon: Split, desc: 'Distinguish target states' },
  { id: 'Convergence', label: 'Convergence', icon: CheckCircle2, desc: 'Equivalence achieved' },
  { id: 'Build Minimal DFA', label: 'Minimal DFA', icon: PlayCircle, desc: 'Construct canonical DFA' },
];

export const MinimizationTimeline: React.FC<MinimizationTimelineProps> = ({
  currentPhase,
  onPhaseSelect,
}) => {
  const currentIdx = PHASES.findIndex((p) => p.id === currentPhase);

  return (
    <div className="w-full bg-slate-950/80 border border-slate-800 rounded-2xl p-3 backdrop-blur-xl overflow-x-auto">
      <div className="flex items-center justify-between min-w-[650px] gap-2">
        {PHASES.map((phase, idx) => {
          const Icon = phase.icon;
          const isActive = phase.id === currentPhase;
          const isPassed = idx < currentIdx;

          return (
            <React.Fragment key={phase.id}>
              <div
                onClick={() => onPhaseSelect(phase.id)}
                className={`flex-1 flex flex-col items-center text-center p-2 rounded-xl cursor-pointer transition transform hover:scale-[1.02] ${
                  isActive
                    ? 'bg-indigo-600/20 border border-indigo-500/50 shadow-lg shadow-indigo-500/10'
                    : isPassed
                    ? 'bg-emerald-950/20 border border-emerald-500/30 text-emerald-300'
                    : 'bg-slate-900/50 border border-slate-800 text-slate-500 hover:text-slate-300'
                }`}
              >
                <div className="flex items-center gap-1.5 mb-1">
                  <div
                    className={`p-1.5 rounded-lg ${
                      isActive
                        ? 'bg-indigo-600 text-white'
                        : isPassed
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                  <span className={`text-xs font-bold ${isActive ? 'text-white' : isPassed ? 'text-emerald-300' : 'text-slate-400'}`}>
                    {phase.label}
                  </span>
                </div>

                <span className="text-[10px] text-slate-400 truncate max-w-[110px]">
                  {phase.desc}
                </span>
              </div>

              {idx < PHASES.length - 1 && (
                <ArrowRight
                  className={`w-4 h-4 shrink-0 ${
                    idx < currentIdx ? 'text-emerald-500' : 'text-slate-700'
                  }`}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};
