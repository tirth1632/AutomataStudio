import React from 'react';
import { Target, ArrowDownLeft, ArrowUpRight, CheckCircle2, AlertTriangle, Layers, X } from 'lucide-react';
import type { StateSemantics } from '../../../utils/dfaInspectorEngine';

interface StateSemanticsCardProps {
  semantics: StateSemantics | null;
  onClearSelection: () => void;
}

export const StateSemanticsCard: React.FC<StateSemanticsCardProps> = ({ semantics, onClearSelection }) => {
  if (!semantics) {
    return (
      <div className="p-3 bg-slate-950/80 border border-slate-800/80 rounded-xl text-center space-y-1">
        <div className="flex items-center justify-center text-slate-500 gap-1.5 text-xs">
          <Target className="w-3.5 h-3.5" />
          <span>Click any state in graph or transition table to view semantics</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-3.5 bg-gradient-to-br from-indigo-950/90 via-slate-950 to-slate-900 border border-indigo-500/40 rounded-xl space-y-2.5 shadow-lg relative font-sans">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 bg-indigo-500/20 border border-indigo-500/40 text-indigo-300 font-mono font-bold text-xs rounded-md">
            {semantics.id}
          </span>
          <span className="font-bold text-white text-xs">{semantics.label}</span>
        </div>

        <div className="flex items-center gap-1.5">
          {semantics.isStart && (
            <span className="px-1.5 py-0.5 bg-blue-950 text-blue-300 border border-blue-500/30 text-[10px] font-bold rounded">
              Start
            </span>
          )}
          {semantics.isAccept ? (
            <span className="px-1.5 py-0.5 bg-emerald-950 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold rounded flex items-center gap-0.5">
              <CheckCircle2 className="w-2.5 h-2.5" /> Accept
            </span>
          ) : semantics.isTrap ? (
            <span className="px-1.5 py-0.5 bg-amber-950 text-amber-300 border border-amber-500/30 text-[10px] font-bold rounded flex items-center gap-0.5">
              <AlertTriangle className="w-2.5 h-2.5" /> Trap State
            </span>
          ) : (
            <span className="px-1.5 py-0.5 bg-slate-800 text-slate-400 border border-slate-700 text-[10px] font-bold rounded">
              Non-Accept
            </span>
          )}
          <button
            onClick={onClearSelection}
            className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition"
            title="Clear selection"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* State Meaning */}
      <div className="bg-slate-950/70 p-2.5 rounded-lg border border-slate-800 space-y-1">
        <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider block">State Meaning</span>
        <p className="text-slate-200 text-xs leading-relaxed">{semantics.meaning}</p>
      </div>

      {/* Grid Details: Incoming / Outgoing / Reachability */}
      <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
        {/* Incoming */}
        <div className="p-2 bg-slate-950/60 border border-slate-800/80 rounded-lg space-y-1">
          <div className="flex items-center gap-1 text-slate-400 font-sans text-[10px] font-bold uppercase">
            <ArrowDownLeft className="w-3 h-3 text-emerald-400" /> Incoming
          </div>
          {semantics.incomingTransitions.length === 0 ? (
            <span className="text-slate-500 italic block text-[10px]">None (Start node)</span>
          ) : (
            <div className="flex flex-wrap gap-1">
              {semantics.incomingTransitions.map((t, idx) => (
                <span key={idx} className="px-1.5 py-0.5 bg-slate-900 border border-slate-800 text-slate-300 rounded text-[10px]">
                  {t.source} ('{t.symbols.join(',')}')
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Outgoing */}
        <div className="p-2 bg-slate-950/60 border border-slate-800/80 rounded-lg space-y-1">
          <div className="flex items-center gap-1 text-slate-400 font-sans text-[10px] font-bold uppercase">
            <ArrowUpRight className="w-3 h-3 text-indigo-400" /> Outgoing
          </div>
          {semantics.outgoingTransitions.length === 0 ? (
            <span className="text-slate-500 italic block text-[10px]">None</span>
          ) : (
            <div className="flex flex-wrap gap-1">
              {semantics.outgoingTransitions.map((t, idx) => (
                <span key={idx} className="px-1.5 py-0.5 bg-slate-900 border border-slate-800 text-slate-300 rounded text-[10px]">
                  '{t.symbols.join(',')}' → {t.target}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Bottom Metadata Badges */}
      <div className="flex items-center justify-between pt-1 border-t border-slate-800/60 text-[10px]">
        <div className="flex items-center gap-1 text-slate-400">
          <span>Shortest Path:</span>
          <span className="font-mono text-indigo-300 font-bold">{semantics.shortestPathTo ?? 'N/A'}</span>
        </div>

        {semantics.equivalentStateId ? (
          <div className="flex items-center gap-1 text-amber-300 font-mono">
            <Layers className="w-3 h-3 text-amber-400" />
            <span>≡ {semantics.equivalentStateId}</span>
          </div>
        ) : (
          <span className="text-slate-500">Unique State</span>
        )}
      </div>
    </div>
  );
};
