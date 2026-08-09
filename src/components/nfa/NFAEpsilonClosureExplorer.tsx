import React, { useState } from 'react';
import { Layers, Zap, HelpCircle } from 'lucide-react';
import type { NFA } from '../../algorithms/nfa/NFA';
import { computeEpsilonClosure } from '../../algorithms/shared/EpsilonClosure';

interface NFAEpsilonClosureExplorerProps {
  nfa: NFA;
}

export const NFAEpsilonClosureExplorer: React.FC<NFAEpsilonClosureExplorerProps> = ({ nfa }) => {
  const [selectedState, setSelectedState] = useState<string>(nfa.startState || nfa.states[0] || 'q0');

  // Re-format transitions to match epsilonClosure expectations
  const formattedTransitions: Record<string, Record<string, string[]>> = React.useMemo(() => {
    return nfa.transitions || {};
  }, [nfa]);

  const closureSet = React.useMemo(() => {
    const closure = computeEpsilonClosure([selectedState], formattedTransitions);
    return Array.from(closure).sort();
  }, [selectedState, formattedTransitions]);

  return (
    <div className="p-5 bg-slate-900/95 text-slate-100 rounded-2xl border border-slate-800 space-y-4 shadow-2xl font-sans">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3 flex-wrap gap-2">
        <div className="flex items-center gap-2.5 font-bold text-base text-purple-300">
          <Zap className="w-5 h-5 text-purple-400 shrink-0" />
          Interactive ε-Closure Explorer: ECLOSE(q)
        </div>
        <span className="text-xs font-mono font-bold text-purple-300 bg-purple-950/80 px-2 py-0.5 rounded border border-purple-500/40">
          ECLOSE({selectedState}) = {'{ '}{closureSet.join(', ')}{' }'}
        </span>
      </div>

      <p className="text-xs text-slate-300 leading-relaxed">
        Select any state <code className="text-purple-300 font-mono font-bold">q</code> below to compute its complete ε-closure <code className="text-purple-300 font-mono font-bold">ECLOSE(q)</code>. The ε-closure is the set of all states reachable from <code className="text-purple-300 font-mono font-bold">q</code> using zero or more consecutive ε-transitions.
      </p>

      {/* State Selector Buttons */}
      <div className="space-y-1.5 font-mono text-xs">
        <label className="text-[10px] font-sans font-bold text-slate-400 uppercase tracking-wider block">
          Select Target State:
        </label>
        <div className="flex items-center gap-2 flex-wrap">
          {nfa.states.map((st) => {
            const isSel = st === selectedState;
            const isStart = st === nfa.startState;
            const isAccept = nfa.acceptStates.includes(st);
            return (
              <button
                key={st}
                onClick={() => setSelectedState(st)}
                className={`px-3 py-1.5 rounded-xl font-bold transition flex items-center gap-1.5 cursor-pointer ${
                  isSel
                    ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30 scale-105 border border-purple-400'
                    : 'bg-slate-950 text-slate-300 border border-slate-800 hover:border-purple-500/50 hover:text-white'
                }`}
              >
                <span>{st}</span>
                {isStart && <span className="text-[9px] bg-sky-950 text-sky-300 px-1 rounded">START</span>}
                {isAccept && <span className="text-[9px] bg-emerald-950 text-emerald-300 px-1 rounded">ACC</span>}
              </button>
            );
          })}
        </div>
      </div>

      {/* Result Card */}
      <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-3 font-mono">
        <div className="flex items-center justify-between text-xs font-bold border-b border-slate-800/80 pb-2">
          <span className="text-purple-300 flex items-center gap-1.5">
            <Layers className="w-4 h-4 text-purple-400" />
            Computed ε-Closure Set:
          </span>
          <span className="text-slate-400">Total: {closureSet.length} states</span>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {closureSet.map((st) => {
            const isDirect = st === selectedState;
            return (
              <div
                key={st}
                className={`px-3 py-1.5 rounded-xl font-bold text-xs transition flex items-center gap-1.5 ${
                  isDirect
                    ? 'bg-indigo-600 text-white border border-indigo-400 shadow'
                    : 'bg-purple-950/80 border border-purple-500/40 text-purple-200'
                }`}
              >
                <span>{st}</span>
                {isDirect ? (
                  <span className="text-[9px] bg-indigo-950 text-indigo-200 px-1 rounded">Self</span>
                ) : (
                  <span className="text-[9px] bg-purple-900 text-purple-200 px-1 rounded">Via ε</span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Educational Theory Note */}
      <div className="p-3 bg-purple-950/30 border border-purple-500/30 rounded-xl text-xs text-purple-200/90 leading-relaxed font-sans flex items-start gap-2">
        <HelpCircle className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
        <div>
          <strong className="text-purple-300 block mb-0.5">Theory Note:</strong>
          Every state is always in its own ε-closure because <code className="text-purple-200 font-mono">q --(ε^0)&rarr; q</code> is always valid. If state <code className="text-purple-200 font-mono">q</code> has no outgoing ε-transitions, <code className="text-purple-200 font-mono">ECLOSE(q) = {'{q}'}</code>.
        </div>
      </div>
    </div>
  );
};
