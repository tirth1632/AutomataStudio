import React, { useState } from 'react';
import { Bot, Sparkles, ChevronDown, ChevronUp } from 'lucide-react';
import { useAutomata } from '../../context/AutomataContext';
import { generateAIExplanation } from '../../algorithms/aiExplainer';

export const AIExplainerCard: React.FC = () => {
  const { graph, inputString, simulationSteps } = useAutomata();
  const [expanded, setExpanded] = useState<boolean>(false);

  const explanation = generateAIExplanation(graph, inputString, simulationSteps);
  const lastStep = simulationSteps[simulationSteps.length - 1];

  if (!lastStep) return null;

  return (
    <div className="bg-slate-900/90 border border-slate-700/80 backdrop-blur-xl rounded-2xl p-4 shadow-xl text-slate-200">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-indigo-600/20 border border-indigo-500/30 rounded-xl text-indigo-400">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-semibold flex items-center gap-1.5 text-indigo-300">
              AI Automaton Tutor
              <Sparkles className="w-3.5 h-3.5 text-purple-400" />
            </h4>
            <p className="text-xs text-slate-400">Step-by-step formal analysis</p>
          </div>
        </div>

        <button
          onClick={() => setExpanded(!expanded)}
          className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-200 transition"
        >
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      <div className="mt-3 p-3 bg-slate-950/60 rounded-xl border border-slate-800/80 text-xs leading-relaxed">
        <p className="text-slate-300">{explanation.summary}</p>
      </div>

      {expanded && (
        <div className="mt-3 space-y-2 text-xs border-t border-slate-800 pt-3 animate-in fade-in duration-200">
          <h5 className="font-semibold text-slate-400 uppercase tracking-wider">Key Insights</h5>
          <ul className="space-y-1 text-slate-300">
            {explanation.keyTakeaways.map((item, idx) => (
              <li key={idx} className="flex items-start gap-1.5">
                <span className="text-indigo-400 font-bold">•</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>

          <h5 className="font-semibold text-slate-400 uppercase tracking-wider pt-2">Execution Trace</h5>
          <div className="max-h-32 overflow-y-auto space-y-1 font-mono text-[11px] text-slate-400 bg-slate-950/80 p-2 rounded-lg border border-slate-800">
            {explanation.detailedSteps.map((step, idx) => (
              <div key={idx}>{step}</div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
