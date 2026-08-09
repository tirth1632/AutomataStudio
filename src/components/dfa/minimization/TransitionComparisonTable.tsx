import React from 'react';
import type { AutomatonGraph, TransitionTableRow } from '../../../types/automata';
import { Table, Sparkles, Layers } from 'lucide-react';

interface TransitionComparisonTableProps {
  originalGraph: AutomatonGraph;
  minimizedGraph: AutomatonGraph;
  currentStepRows?: TransitionTableRow[];
  alphabet: string[];
  splitSymbol?: string;
  highlightStateId?: string | null;
}

export const TransitionComparisonTable: React.FC<TransitionComparisonTableProps> = ({
  originalGraph,
  minimizedGraph,
  currentStepRows = [],
  alphabet,
  splitSymbol,
  highlightStateId,
}) => {
  // Build minimal graph transition table rows
  const minimalRows = minimizedGraph.states.map((st) => {
    const transitions: Record<string, string> = {};
    for (const sym of alphabet) {
      const edge = minimizedGraph.transitions.find((t) => t.source === st.id && t.symbols.includes(sym));
      transitions[sym] = edge ? edge.target : '—';
    }
    return {
      state: st,
      transitions,
    };
  });

  return (
    <div className="space-y-4">
      {/* Side-by-Side Section Title */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-200 uppercase tracking-wider">
          <Table className="w-4 h-4 text-indigo-400" />
          Side-by-Side Transition Tables (Before vs After Minimization)
        </div>
        {splitSymbol && (
          <span className="text-[11px] font-mono px-2.5 py-0.5 bg-amber-500/20 text-amber-300 border border-amber-500/40 rounded-lg font-bold">
            Refinement Split Symbol: '{splitSymbol}'
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* ── LEFT TABLE: ORIGINAL DFA TRANSITION TABLE ── */}
        <div className="bg-slate-950/90 border border-slate-800 rounded-2xl p-4 space-y-3 shadow-xl backdrop-blur-xl flex flex-col">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
            <span className="text-xs font-bold text-indigo-300 uppercase tracking-wider flex items-center gap-1.5 font-mono">
              <Layers className="w-3.5 h-3.5 text-indigo-400" /> 1. BEFORE (Original DFA: {originalGraph.states.length} States)
            </span>
            <span className="text-[10px] bg-indigo-950/80 text-indigo-300 border border-indigo-500/40 px-2 py-0.5 rounded font-mono font-bold">
              δ_original(q, a)
            </span>
          </div>

          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left text-xs font-mono border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 bg-slate-900/80">
                  <th className="p-2">State</th>
                  <th className="p-2 text-center">Type</th>
                  {alphabet.map((sym) => (
                    <th
                      key={sym}
                      className={`p-2 text-center ${
                        sym === splitSymbol ? 'bg-amber-500/20 text-amber-300 font-bold border-x border-amber-500/40' : ''
                      }`}
                    >
                      '{sym}' Target
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-800/60">
                {originalGraph.states.map((st) => {
                  const stepRow = currentStepRows.find((r) => r.stateId === st.id);
                  const isSelected = highlightStateId === st.id;

                  return (
                    <tr
                      key={st.id}
                      className={`transition ${
                        isSelected
                          ? 'bg-indigo-950/70 text-white font-bold'
                          : 'hover:bg-slate-900/60 text-slate-300'
                      }`}
                    >
                      <td className="p-2 font-bold flex items-center gap-1">
                        <span className="px-1.5 py-0.5 bg-slate-900 border border-slate-700 rounded text-slate-200">
                          {st.label || st.id}
                        </span>
                      </td>

                      <td className="p-2 text-center">
                        {st.isStart && (
                          <span className="text-[9px] bg-sky-950 text-sky-300 px-1.5 py-0.5 rounded border border-sky-500/30 font-bold mr-1">
                            START
                          </span>
                        )}
                        {st.isAccept ? (
                          <span className="text-[9px] bg-emerald-950 text-emerald-300 px-1.5 py-0.5 rounded border border-emerald-500/30 font-bold">
                            ACCEPT
                          </span>
                        ) : (
                          <span className="text-[9px] text-slate-500">—</span>
                        )}
                      </td>

                      {alphabet.map((sym) => {
                        const edge = originalGraph.transitions.find((t) => t.source === st.id && t.symbols.includes(sym));
                        const targetId = edge ? edge.target : 'Ø';
                        const info = stepRow?.transitions[sym];
                        const isSplitCol = sym === splitSymbol;

                        return (
                          <td
                            key={sym}
                            className={`p-2 text-center ${
                              isSplitCol ? 'bg-amber-950/30 border-x border-amber-500/30 font-bold' : ''
                            }`}
                          >
                            <span
                              className={`inline-block px-2 py-0.5 rounded font-mono text-[11px] border ${
                                isSplitCol
                                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 font-bold'
                                  : 'bg-slate-900 text-indigo-300 border-slate-800'
                              }`}
                            >
                              {targetId} {info ? `(${info.targetGroupLabel})` : ''}
                            </span>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── RIGHT TABLE: MINIMAL DFA TRANSITION TABLE ── */}
        <div className="bg-slate-950/90 border border-slate-800 rounded-2xl p-4 space-y-3 shadow-xl backdrop-blur-xl flex flex-col">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
            <span className="text-xs font-bold text-emerald-300 uppercase tracking-wider flex items-center gap-1.5 font-mono">
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" /> 2. AFTER (Minimal DFA: {minimizedGraph.states.length} States)
            </span>
            <span className="text-[10px] bg-emerald-950/80 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 rounded font-mono font-bold">
              δ_minimal(m, a)
            </span>
          </div>

          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left text-xs font-mono border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 bg-slate-900/80">
                  <th className="p-2">Minimal State</th>
                  <th className="p-2">Merged States</th>
                  <th className="p-2 text-center">Type</th>
                  {alphabet.map((sym) => (
                    <th key={sym} className="p-2 text-center">
                      '{sym}' Target
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-800/60">
                {minimalRows.map((row) => (
                  <tr key={row.state.id} className="hover:bg-slate-900/60 text-slate-300">
                    <td className="p-2 font-bold">
                      <span className="px-2 py-0.5 bg-emerald-950/80 text-emerald-300 border border-emerald-500/40 rounded font-mono font-bold">
                        {row.state.id}
                      </span>
                    </td>

                    <td className="p-2 text-slate-400 text-[11px]">
                      {row.state.label || row.state.id}
                    </td>

                    <td className="p-2 text-center">
                      {row.state.isStart && (
                        <span className="text-[9px] bg-sky-950 text-sky-300 px-1.5 py-0.5 rounded border border-sky-500/30 font-bold mr-1">
                          START
                        </span>
                      )}
                      {row.state.isAccept ? (
                        <span className="text-[9px] bg-emerald-950 text-emerald-300 px-1.5 py-0.5 rounded border border-emerald-500/30 font-bold">
                          ACCEPT
                        </span>
                      ) : (
                        <span className="text-[9px] text-slate-500">—</span>
                      )}
                    </td>

                    {alphabet.map((sym) => (
                      <td key={sym} className="p-2 text-center">
                        <span className="inline-block px-2.5 py-0.5 bg-emerald-950/40 text-emerald-300 border border-emerald-500/30 rounded font-bold font-mono text-[11px]">
                          {row.transitions[sym]}
                        </span>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
