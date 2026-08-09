import React from 'react';
import { GitFork, CheckCircle2, XCircle, Layers } from 'lucide-react';
import type { AutomatonGraph } from '../../types/automata';
import { simulateNFA } from '../../algorithms/nfaSimulator';

interface NFABranchTreeVisualizerProps {
  graph: AutomatonGraph;
  inputString: string;
}

export const NFABranchTreeVisualizer: React.FC<NFABranchTreeVisualizerProps> = ({ graph, inputString }) => {
  const steps = React.useMemo(() => {
    return simulateNFA(graph, inputString);
  }, [graph, inputString]);

  const lastStep = steps[steps.length - 1];
  const isAccepted = lastStep?.isAccepting || false;

  return (
    <div className="p-5 bg-slate-900/95 text-slate-100 rounded-2xl border border-slate-800 space-y-5 shadow-2xl font-sans">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3 flex-wrap gap-2">
        <div className="flex items-center gap-2.5 font-bold text-base text-sky-300">
          <GitFork className="w-5 h-5 text-sky-400 shrink-0" />
          NFA Execution Branch Tree Visualizer
        </div>
        <div className="flex items-center gap-2 text-xs font-mono">
          <span className="text-slate-400">Input String:</span>
          <span className="px-2 py-0.5 bg-slate-950 border border-slate-700 text-sky-300 rounded font-bold">
            "{inputString || 'ε'}"
          </span>
          <span
            className={`px-2 py-0.5 rounded font-bold flex items-center gap-1 ${
              isAccepted ? 'bg-emerald-950/80 border border-emerald-500/40 text-emerald-300' : 'bg-rose-950/80 border border-rose-500/40 text-rose-300'
            }`}
          >
            {isAccepted ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
            {isAccepted ? 'ACCEPTED' : 'REJECTED'}
          </span>
        </div>
      </div>

      {/* Description */}
      <p className="text-xs text-slate-300 leading-relaxed font-sans">
        This tool visualizes every concurrent execution path explored by the NFA for input string <code className="text-sky-300 font-mono font-bold">"{inputString}"</code>. At each symbol, nondeterministic branching expands state subsets simultaneously.
      </p>

      {/* Branch Timeline Steps */}
      <div className="space-y-3 font-mono text-xs max-h-96 overflow-y-auto pr-1 custom-scrollbar">
        {steps.map((step, idx) => {
          const isFinal = idx === steps.length - 1;
          return (
            <div
              key={idx}
              className={`p-3.5 rounded-xl border transition-all ${
                isFinal
                  ? step.isAccepting
                    ? 'bg-emerald-950/30 border-emerald-500/40 shadow-lg shadow-emerald-500/10'
                    : 'bg-rose-950/30 border-rose-500/40 shadow-lg shadow-rose-500/10'
                  : 'bg-slate-950/80 border-slate-800/80'
              }`}
            >
              <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
                <div className="flex items-center gap-2 font-bold">
                  <span className="px-2 py-0.5 bg-sky-950 border border-sky-500/30 text-sky-300 rounded text-[11px]">
                    Step {step.stepIndex}
                  </span>
                  <span className="text-slate-400">
                    Symbol Read: <strong className="text-amber-300">{step.currentSymbol || 'ε (Initial)'}</strong>
                  </span>
                </div>
                <div className="text-[11px] text-slate-400">
                  Active Branches: <span className="text-sky-300 font-bold">{step.currentStateIds.length}</span>
                </div>
              </div>

              {/* Active State Tokens */}
              <div className="flex items-center gap-1.5 flex-wrap pt-1">
                <span className="text-[10px] text-slate-400 uppercase font-sans font-bold mr-1">Active Set:</span>
                {step.currentStateIds.length === 0 ? (
                  <span className="px-2 py-0.5 bg-rose-950 border border-rose-800 text-rose-400 rounded text-[11px]">
                    ∅ (All branches dead)
                  </span>
                ) : (
                  step.currentStateIds.map((stId) => {
                    const stObj = graph.states.find((s) => s.id === stId);
                    const isAcc = stObj?.isAccept || false;
                    return (
                      <span
                        key={stId}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
                          isAcc
                            ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30 ring-1 ring-emerald-300'
                            : 'bg-sky-900/80 text-sky-200 border border-sky-500/40'
                        }`}
                      >
                        {stObj?.label || stId}
                        {isAcc && <span className="text-[9px] bg-emerald-950 text-emerald-200 px-1 rounded">ACC</span>}
                      </span>
                    );
                  })
                )}
              </div>

              {/* Description */}
              <p className="text-[11px] text-slate-400 font-sans mt-2 leading-relaxed">
                {step.description}
              </p>
            </div>
          );
        })}
      </div>

      {/* Summary Note */}
      <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center gap-2 text-xs text-slate-300">
        <Layers className="w-4 h-4 text-sky-400 shrink-0" />
        <span>
          An NFA accepts an input string if <strong>at least one active branch</strong> lands on an accept state after consuming the input.
        </span>
      </div>
    </div>
  );
};
