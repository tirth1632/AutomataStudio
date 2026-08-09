import React from 'react';
import type { PartitionStep } from '../../../types/automata';
import { GitBranch, ChevronRight } from 'lucide-react';

interface PartitionEvolutionTreeProps {
  steps: PartitionStep[];
  currentStepIndex: number;
  onStepSelect: (idx: number) => void;
}

export const PartitionEvolutionTree: React.FC<PartitionEvolutionTreeProps> = ({
  steps,
  currentStepIndex,
  onStepSelect,
}) => {
  return (
    <div className="bg-slate-950/90 border border-slate-800 rounded-2xl p-4 space-y-4 shadow-xl backdrop-blur-xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-300 uppercase tracking-wider">
          <GitBranch className="w-4 h-4 text-indigo-400" />
          Partition Evolution History (P₀ → Pₖ)
        </div>
        <span className="text-[11px] font-mono text-slate-400">
          Click any step to jump
        </span>
      </div>

      <div className="space-y-3 overflow-y-auto max-h-72 pr-1">
        {steps.map((step, idx) => {
          const isActive = idx === currentStepIndex;

          return (
            <div
              key={idx}
              onClick={() => onStepSelect(idx)}
              className={`p-3 rounded-xl border transition cursor-pointer flex items-center justify-between gap-3 ${
                isActive
                  ? 'bg-indigo-950/70 border-indigo-500/60 shadow-lg'
                  : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 text-slate-300'
              }`}
            >
              <div className="flex items-center gap-3">
                <span
                  className={`w-7 h-7 rounded-lg flex items-center justify-center font-mono font-bold text-xs ${
                    isActive
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  P{step.stepIndex}
                </span>

                <div>
                  <div className="text-xs font-bold text-white flex items-center gap-2">
                    {step.phase}
                    {step.splitBySymbol && (
                      <span className="px-2 py-0.2 bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-mono rounded">
                        Split on '{step.splitBySymbol}'
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-slate-400 truncate max-w-lg">
                    {step.description}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <div className="flex flex-wrap gap-1 max-w-xs font-mono text-[10px]">
                  {step.partitions.slice(0, 4).map((group, gIdx) => (
                    <span
                      key={gIdx}
                      className="px-2 py-0.5 bg-slate-950 border border-slate-800 text-slate-300 rounded"
                    >
                      {`{${group.filter((id) => id !== '__TRAP__').join(',') || 'Ø'}}`}
                    </span>
                  ))}
                  {step.partitions.length > 4 && (
                    <span className="text-slate-500 text-[10px]">
                      +{step.partitions.length - 4} more
                    </span>
                  )}
                </div>

                <ChevronRight className={`w-4 h-4 ${isActive ? 'text-indigo-400' : 'text-slate-600'}`} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
