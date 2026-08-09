import React from 'react';
import { Columns, ShieldCheck } from 'lucide-react';
import type { NFA } from '../../algorithms/nfa/NFA';
import { convertNFAToDFA } from '../../algorithms/nfa/conversion/NFAToDFA';
import { minimizeDFA } from '../../algorithms/hopcroftMinimization';
import type { AutomatonGraph } from '../../types/automata';

interface NFAComparisonViewProps {
  nfa: NFA;
  promptDescription?: string;
}

export const NFAComparisonView: React.FC<NFAComparisonViewProps> = ({ nfa }) => {
  const dfa = React.useMemo(() => convertNFAToDFA(nfa), [nfa]);

  // Convert DFA to AutomatonGraph format for Hopcroft minimization
  const dfaGraph: AutomatonGraph = React.useMemo(() => {
    return {
      id: 'converted-dfa',
      name: 'Converted DFA',
      type: 'DFA',
      alphabet: dfa.alphabet,
      states: dfa.states.map((s, idx) => ({
        id: s,
        label: s,
        isStart: s === dfa.startState,
        isAccept: dfa.acceptStates.includes(s),
        x: idx * 100,
        y: 100,
      })),
      transitions: Object.entries(dfa.transitions).flatMap(([src, trans]) =>
        Object.entries(trans).map(([sym, tgt]) => ({
          id: `${src}-${sym}-${tgt}`,
          source: src,
          target: tgt,
          symbols: [sym],
        }))
      ),
    };
  }, [dfa]);

  const minimizationResult = React.useMemo(() => minimizeDFA(dfaGraph), [dfaGraph]);
  const minDFA = minimizationResult.minimizedGraph;

  return (
    <div className="p-4 bg-slate-900/95 border border-slate-800 rounded-2xl space-y-3.5 text-slate-100 text-xs font-sans shadow-xl select-none">
      {/* Top Header */}
      <div className="space-y-2 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-indigo-600/20 border border-indigo-500/40 text-indigo-400 rounded-xl shrink-0">
            <Columns className="w-4 h-4" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-bold text-xs sm:text-sm text-slate-100 truncate">3-Way Equivalence Comparison</h3>
            <p className="text-[10px] sm:text-[11px] text-indigo-400 font-medium truncate">
              NFA ➔ Subset DFA ➔ Minimal DFA
            </p>
          </div>
        </div>

        <div className="px-3 py-1 bg-emerald-950/90 border border-emerald-500/50 text-emerald-300 rounded-xl font-mono text-[10.5px] font-bold flex items-center justify-center gap-1.5 shadow-sm text-center">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <span>L(NFA) ≡ L(DFA) ≡ L(MinDFA)</span>
        </div>
      </div>

      {/* 3 Vertical Comparison Cards (1-Column Stack for Sidebar Readability) */}
      <div className="space-y-3 font-mono">
        {/* Card 1: Original NFA */}
        <div className="p-3 bg-slate-950/90 border border-slate-800 rounded-xl space-y-2 shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-1.5 gap-2">
            <span className="font-bold text-xs text-indigo-400 font-sans tracking-wide">
              1. Original NFA
            </span>
            <span className="text-[9.5px] px-2 py-0.5 bg-indigo-950 text-indigo-300 rounded border border-indigo-500/40 font-sans font-bold shrink-0">
              Nondeterministic
            </span>
          </div>

          <div className="space-y-1 text-xs">
            <div className="flex justify-between items-center">
              <span className="text-slate-400 font-sans">States:</span>
              <span className="font-bold text-slate-100">{nfa.states.length}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400 font-sans">Start State:</span>
              <span className="font-bold text-sky-300">{nfa.startState}</span>
            </div>
            <div className="flex justify-between items-center gap-2">
              <span className="text-slate-400 font-sans shrink-0">Accept States:</span>
              <span className="font-bold text-emerald-300 text-right truncate">
                &#123; {nfa.acceptStates.join(', ')} &#125;
              </span>
            </div>
          </div>
        </div>

        {/* Card 2: Subset DFA */}
        <div className="p-3 bg-slate-950/90 border border-slate-800 rounded-xl space-y-2 shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-1.5 gap-2">
            <span className="font-bold text-xs text-sky-400 font-sans tracking-wide">
              2. Subset DFA
            </span>
            <span className="text-[9.5px] px-2 py-0.5 bg-sky-950 text-sky-300 rounded border border-sky-500/40 font-sans font-bold shrink-0">
              Deterministic
            </span>
          </div>

          <div className="space-y-1 text-xs">
            <div className="flex justify-between items-center">
              <span className="text-slate-400 font-sans">States:</span>
              <span className="font-bold text-slate-100">{dfa.states.length}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400 font-sans">Start State:</span>
              <span className="font-bold text-sky-300">{dfa.startState}</span>
            </div>
            <div className="flex justify-between items-center gap-2">
              <span className="text-slate-400 font-sans shrink-0">Accept States:</span>
              <span className="font-bold text-emerald-300 text-right truncate">
                &#123; {dfa.acceptStates.join(', ')} &#125;
              </span>
            </div>
          </div>
        </div>

        {/* Card 3: Minimal Hopcroft DFA */}
        <div className="p-3 bg-slate-950/90 border border-slate-800 rounded-xl space-y-2 shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-1.5 gap-2">
            <span className="font-bold text-xs text-emerald-400 font-sans tracking-wide">
              3. Minimal DFA
            </span>
            <span className="text-[9.5px] px-2 py-0.5 bg-emerald-950 text-emerald-300 rounded border border-emerald-500/40 font-sans font-bold shrink-0">
              Hopcroft Minimized
            </span>
          </div>

          <div className="space-y-1 text-xs">
            <div className="flex justify-between items-center">
              <span className="text-slate-400 font-sans">States:</span>
              <span className="font-bold text-slate-100">{minDFA.states.length}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400 font-sans">Start State:</span>
              <span className="font-bold text-sky-300">{minDFA.states.find((s) => s.isStart)?.id || 'q0'}</span>
            </div>
            <div className="flex justify-between items-center gap-2">
              <span className="text-slate-400 font-sans shrink-0">Accept States:</span>
              <span className="font-bold text-emerald-300 text-right truncate">
                &#123; {minDFA.states.filter((s) => s.isAccept).map((s) => s.id).join(', ')} &#125;
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
