import React from 'react';
import { CheckCircle2, Circle } from 'lucide-react';
import type { DFAInspectorData } from '../../../utils/dfaInspectorEngine';

interface TabTransitionTableProps {
  data: DFAInspectorData;
  selectedStateId: string | null;
  currentSimStateId?: string | null;
  onSelectState: (stateId: string | null) => void;
}

export const TabTransitionTable: React.FC<TabTransitionTableProps> = ({
  data,
  selectedStateId,
  currentSimStateId,
  onSelectState,
}) => {
  const { graph, alphabet, statistics } = data;

  return (
    <div className="space-y-3 font-sans text-xs">
      <div className="flex items-center justify-between px-1">
        <span className="text-[11px] font-bold text-indigo-400 uppercase tracking-wider block">
          Interactive Transition Table δ
        </span>
        <span className="text-[10px] text-slate-400">Click row to select state</span>
      </div>

      <div className="overflow-x-auto border border-slate-800 rounded-xl bg-slate-950/90 shadow-inner">
        <table className="w-full text-left border-collapse font-mono text-[11px]">
          <thead>
            <tr className="bg-slate-900/90 text-indigo-400 border-b border-slate-800 text-[10px]">
              <th className="p-2.5">State</th>
              {alphabet.map((sym) => (
                <th key={sym} className="p-2.5 text-center font-bold">
                  '{sym}'
                </th>
              ))}
              <th className="p-2.5 text-center">Accept</th>
              <th className="p-2.5 text-center">Start</th>
            </tr>
          </thead>
          <tbody>
            {graph.states.map((s) => {
              const isSelected = selectedStateId === s.id;
              const isSimCurrent = currentSimStateId === s.id;
              const isAccept = !!s.isAccept;
              const isStart = !!s.isStart;
              const isTrap = statistics.trapStates.includes(s.id);

              let rowStyle = 'hover:bg-slate-900/70 text-slate-300';
              if (isSimCurrent) {
                rowStyle = 'bg-cyan-950/90 border-l-4 border-l-cyan-400 text-white font-bold animate-pulse';
              } else if (isSelected) {
                rowStyle = 'bg-indigo-950/90 border-l-4 border-l-indigo-500 text-white font-bold';
              } else if (isTrap) {
                rowStyle = 'hover:bg-amber-950/40 text-amber-200/90';
              }

              return (
                <tr
                  key={s.id}
                  onClick={() => onSelectState(isSelected ? null : s.id)}
                  className={`border-b border-slate-800/60 cursor-pointer transition ${rowStyle}`}
                >
                  {/* State Name */}
                  <td className="p-2.5 font-bold flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full ${isSimCurrent ? 'bg-cyan-400 ring-2 ring-cyan-400/50' : isSelected ? 'bg-indigo-400' : 'bg-slate-700'}`} />
                    <span className={isAccept ? 'text-emerald-400 font-bold' : isTrap ? 'text-amber-400' : 'text-indigo-300'}>
                      {s.label || s.id}
                    </span>
                  </td>

                  {/* Symbol transitions */}
                  {alphabet.map((sym) => {
                    const edge = graph.transitions.find((t) => t.source === s.id && t.symbols.includes(sym));
                    const targetState = edge ? edge.target : '-';
                    const targetIsAccept = graph.states.find((st) => st.id === targetState)?.isAccept;

                    return (
                      <td key={sym} className="p-2.5 text-center font-bold">
                        {edge ? (
                          <span className={`px-2 py-0.5 rounded text-[10px] ${targetIsAccept ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-500/30' : 'bg-slate-900 border border-slate-800 text-slate-200'}`}>
                            {targetState}
                          </span>
                        ) : (
                          <span className="text-slate-600 font-normal">-</span>
                        )}
                      </td>
                    );
                  })}

                  {/* Accept Status */}
                  <td className="p-2.5 text-center">
                    {isAccept ? (
                      <span className="inline-flex items-center text-emerald-400">
                        <CheckCircle2 className="w-4 h-4" />
                      </span>
                    ) : (
                      <span className="inline-flex items-center text-slate-600">
                        <Circle className="w-3.5 h-3.5" />
                      </span>
                    )}
                  </td>

                  {/* Start Status */}
                  <td className="p-2.5 text-center">
                    {isStart ? (
                      <span className="px-1.5 py-0.5 bg-blue-950 text-blue-300 border border-blue-500/30 rounded text-[9px] font-bold">
                        q₀
                      </span>
                    ) : (
                      <span className="text-slate-600">-</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
