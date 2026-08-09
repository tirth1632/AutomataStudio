import React from 'react';
import { Table, Download, FileSpreadsheet } from 'lucide-react';
import type { AutomatonGraph } from '../../types/automata';
import { downloadFile, exportToCSV, exportToJSON } from '../../utils/exportUtils';

interface DFATransitionTablePanelProps {
  graph: AutomatonGraph;
  currentStateId?: string;
}

export const DFATransitionTablePanel: React.FC<DFATransitionTablePanelProps> = ({
  graph,
  currentStateId = '',
}) => {
  const alphabet = graph.alphabet && graph.alphabet.length > 0 ? graph.alphabet : ['0', '1'];

  // Map transitions for fast lookup: table[state][symbol] = target
  const table: { [state: string]: { [symbol: string]: string } } = {};
  graph.states.forEach((s) => {
    table[s.id] = {};
  });

  graph.transitions.forEach((t) => {
    if (!table[t.source]) table[t.source] = {};
    t.symbols.forEach((sym) => {
      table[t.source][sym] = t.target;
    });
  });

  const handleExportCSV = () => {
    const csv = exportToCSV(graph);
    downloadFile(`${graph.name || 'dfa'}_transition_table.csv`, csv, 'text/csv');
  };

  const handleExportJSON = () => {
    const json = exportToJSON(graph);
    downloadFile(`${graph.name || 'dfa'}_structure.json`, json, 'application/json');
  };

  return (
    <div className="p-4 sm:p-5 space-y-4 bg-slate-900/95 text-slate-100 rounded-2xl border border-slate-800 text-sm shadow-xl">
      <div className="flex items-center justify-between border-b border-slate-800 pb-3 gap-2 flex-wrap">
        <div className="flex items-center gap-2.5 font-bold text-base text-indigo-300">
          <Table className="w-5 h-5 text-indigo-400 shrink-0" />
          DFA Transition Table δ(q, σ)
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition border border-slate-700"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
            Export CSV
          </button>
          <button
            onClick={handleExportJSON}
            className="px-2.5 py-1 bg-indigo-950 hover:bg-indigo-900 text-indigo-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition border border-indigo-500/40"
          >
            <Download className="w-3.5 h-3.5 text-indigo-400" />
            Export JSON
          </button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-800">
        <table className="w-full font-mono text-sm border-collapse">
          <thead>
            <tr className="bg-slate-950/90 text-slate-300 text-xs border-b border-slate-800">
              <th className="text-left py-2.5 px-4 font-bold uppercase tracking-wider">State (Q)</th>
              {alphabet.map((sym) => (
                <th key={sym} className="py-2.5 px-4 text-center text-indigo-300 font-bold uppercase tracking-wider">
                  Symbol '{sym}'
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/80 bg-slate-900/60">
            {graph.states.map((s) => {
              const isActive = s.id === currentStateId;

              return (
                <tr
                  key={s.id}
                  className={`transition ${
                    isActive
                      ? 'bg-indigo-950/80 font-bold border-l-4 border-indigo-400'
                      : 'hover:bg-slate-950/60'
                  }`}
                >
                  <td className="py-2.5 px-4 font-bold flex items-center gap-2">
                    {s.isStart && <span className="text-amber-400 font-bold text-xs" title="Start State">➔</span>}
                    {s.isAccept && <span className="text-emerald-400 font-bold text-xs" title="Accept State">★</span>}
                    <span className={isActive ? 'text-indigo-300' : 'text-white'}>{s.id}</span>
                    {s.label && s.label !== s.id && (
                      <span className="text-slate-400 text-xs font-normal">({s.label})</span>
                    )}
                    {isActive && (
                      <span className="ml-2 text-[10px] bg-indigo-600/40 text-indigo-200 px-2 py-0.5 rounded-full border border-indigo-500/50 font-sans font-semibold">
                        Active State
                      </span>
                    )}
                  </td>

                  {alphabet.map((sym) => {
                    const target = table[s.id]?.[sym];
                    return (
                      <td key={sym} className="py-2.5 px-4 text-center font-bold">
                        {target ? (
                          <span className="px-2.5 py-1 bg-slate-950 rounded-lg border border-slate-700/80 text-sky-300 shadow-sm">
                            {target}
                          </span>
                        ) : (
                          <span className="text-rose-400 text-xs italic">∅ Trap</span>
                        )}
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
  );
};
