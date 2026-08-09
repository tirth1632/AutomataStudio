import React from 'react';
import { useAutomata } from '../../context/AutomataContext';

export const StepTimeline: React.FC = () => {
  const { simulationSteps, currentStepIndex, setCurrentStepIndex } = useAutomata();

  if (simulationSteps.length === 0) return null;

  return (
    <div className="w-full bg-slate-900/90 border-t border-slate-800 p-2 overflow-x-auto flex items-center gap-2">
      <span className="text-xs font-semibold text-slate-400 px-2 shrink-0">Timeline:</span>
      <div className="flex items-center gap-1.5 min-w-max">
        {simulationSteps.map((step, idx) => {
          const isSelected = idx === currentStepIndex;
          return (
            <button
              key={idx}
              onClick={() => setCurrentStepIndex(idx)}
              className={`px-2.5 py-1 rounded-xl text-xs font-mono font-medium transition-all border flex items-center gap-1.5
                ${isSelected
                  ? 'bg-indigo-600 text-white border-indigo-400 shadow-md shadow-indigo-600/30 scale-105'
                  : 'bg-slate-950/60 text-slate-300 border-slate-800 hover:border-slate-700 hover:bg-slate-800'
                }
              `}
            >
              <span className="text-[10px] text-indigo-300">Step {idx}</span>
              <span>
                {step.consumedInput ? `'${step.consumedInput[step.consumedInput.length - 1]}'` : 'Start'}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
