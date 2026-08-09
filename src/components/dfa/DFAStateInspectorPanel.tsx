import React, { useState } from 'react';
import { Search, ArrowDownRight, ArrowUpRight } from 'lucide-react';
import type { AutomatonGraph } from '../../types/automata';

interface DFAStateInspectorPanelProps {
  graph: AutomatonGraph;
  selectedStateId?: string;
  onSelectState?: (stateId: string) => void;
}

export const DFAStateInspectorPanel: React.FC<DFAStateInspectorPanelProps> = ({
  graph,
  selectedStateId,
  onSelectState,
}) => {
  const [internalSelectedId, setInternalSelectedId] = useState<string>(
    selectedStateId || graph.states[0]?.id || 'q0'
  );

  const activeId = selectedStateId || internalSelectedId;
  const stateObj = graph.states.find((s) => s.id === activeId) || graph.states[0];

  if (!stateObj) {
    return (
      <div className="p-4 bg-slate-900 text-slate-400 text-xs rounded-xl">
        No state available to inspect.
      </div>
    );
  }

  // Find incoming transitions
  const incomingTransitions: Array<{ source: string; symbol: string }> = [];
  graph.transitions.forEach((t) => {
    if (t.target === stateObj.id) {
      t.symbols.forEach((sym) => {
        incomingTransitions.push({ source: t.source, symbol: sym });
      });
    }
  });

  // Find outgoing transitions
  const outgoingTransitions: Array<{ target: string; symbol: string }> = [];
  graph.transitions.forEach((t) => {
    if (t.source === stateObj.id) {
      t.symbols.forEach((sym) => {
        outgoingTransitions.push({ target: t.target, symbol: sym });
      });
    }
  });

  // Reachability check
  const startStateId = graph.states.find((s) => s.isStart)?.id;
  const visited = new Set<string>();
  if (startStateId) {
    const queue = [startStateId];
    visited.add(startStateId);

    while (queue.length > 0) {
      const curr = queue.shift()!;
      graph.transitions.forEach((t) => {
        if (t.source === curr && !visited.has(t.target)) {
          visited.add(t.target);
          queue.push(t.target);
        }
      });
    }
  }

  const isReachable = visited.has(stateObj.id);
  const isTrapState =
    !stateObj.isAccept &&
    outgoingTransitions.length > 0 &&
    outgoingTransitions.every((t) => t.target === stateObj.id);

  const handleStateChange = (id: string) => {
    setInternalSelectedId(id);
    if (onSelectState) onSelectState(id);
  };

  return (
    <div className="p-4 sm:p-5 space-y-4 bg-slate-900/95 text-slate-100 rounded-2xl border border-slate-800 text-sm shadow-xl">
      {/* Header & State Picker */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3 gap-2 flex-wrap">
        <div className="flex items-center gap-2.5 font-bold text-base text-indigo-300">
          <Search className="w-5 h-5 text-indigo-400 shrink-0" />
          State Inspector & Connectivity Analysis
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400 font-medium">Select State:</span>
          <select
            value={activeId}
            onChange={(e) => handleStateChange(e.target.value)}
            className="px-2.5 py-1 bg-slate-950 border border-slate-700/80 rounded-lg text-xs font-mono font-bold text-indigo-300 focus:outline-none focus:border-indigo-500"
          >
            {graph.states.map((s) => (
              <option key={s.id} value={s.id}>
                {s.id} {s.label && s.label !== s.id ? `(${s.label})` : ''} {s.isStart ? '➔ Start' : ''}{' '}
                {s.isAccept ? '★ Accept' : ''}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Overview Card */}
      <div className="p-4 bg-slate-950/90 rounded-xl border border-slate-800 space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="font-mono font-bold text-lg text-indigo-200 flex items-center gap-2">
            <span className="px-3 py-1 bg-slate-900 rounded-lg border border-slate-700 text-indigo-300">
              State {stateObj.id}
            </span>
            {stateObj.label && stateObj.label !== stateObj.id && (
              <span className="text-slate-400 text-sm font-normal">({stateObj.label})</span>
            )}
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            {stateObj.isStart && (
              <span className="px-2.5 py-1 bg-indigo-600/30 border border-indigo-500/40 text-indigo-300 rounded-lg text-xs font-bold uppercase">
                ➔ Start State
              </span>
            )}
            {stateObj.isAccept ? (
              <span className="px-2.5 py-1 bg-emerald-600/30 border border-emerald-500/40 text-emerald-300 rounded-lg text-xs font-bold uppercase">
                ★ Accept State
              </span>
            ) : (
              <span className="px-2.5 py-1 bg-slate-800 border border-slate-700 text-slate-400 rounded-lg text-xs font-semibold">
                Non-Accepting
              </span>
            )}
            {isTrapState && (
              <span className="px-2.5 py-1 bg-rose-600/30 border border-rose-500/40 text-rose-300 rounded-lg text-xs font-bold uppercase">
                Trap State
              </span>
            )}
          </div>
        </div>

        <div className="flex gap-4 text-xs font-medium pt-1 text-slate-300">
          <div>
            Reachability:{' '}
            <strong className={isReachable ? 'text-emerald-400' : 'text-rose-400'}>
              {isReachable ? '✓ Reachable from Start State' : '✗ Unreachable (Dead Code)'}
            </strong>
          </div>
        </div>
      </div>

      {/* Incoming vs Outgoing Transitions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 font-mono text-xs">
        {/* Incoming */}
        <div className="p-3.5 bg-slate-950/90 rounded-xl border border-slate-800 space-y-2">
          <div className="flex items-center gap-1.5 font-bold text-sky-400 uppercase tracking-wider text-xs font-sans">
            <ArrowDownRight className="w-4 h-4 text-sky-400" /> Incoming Transitions ({incomingTransitions.length})
          </div>
          {incomingTransitions.length === 0 ? (
            <div className="text-slate-500 italic font-sans text-xs">No incoming transitions.</div>
          ) : (
            <div className="space-y-1.5 max-h-36 overflow-y-auto">
              {incomingTransitions.map((t, idx) => (
                <div
                  key={idx}
                  className="p-2 bg-slate-900 rounded-lg border border-slate-800 flex items-center justify-between"
                >
                  <span className="font-bold text-slate-200">State {t.source}</span>
                  <span className="px-2 py-0.5 bg-indigo-950 border border-indigo-500/30 text-indigo-300 rounded font-bold">
                    Symbol '{t.symbol}'
                  </span>
                  <span className="font-bold text-emerald-400">➔ {stateObj.id}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Outgoing */}
        <div className="p-3.5 bg-slate-950/90 rounded-xl border border-slate-800 space-y-2">
          <div className="flex items-center gap-1.5 font-bold text-purple-400 uppercase tracking-wider text-xs font-sans">
            <ArrowUpRight className="w-4 h-4 text-purple-400" /> Outgoing Transitions ({outgoingTransitions.length})
          </div>
          {outgoingTransitions.length === 0 ? (
            <div className="text-slate-500 italic font-sans text-xs">No outgoing transitions.</div>
          ) : (
            <div className="space-y-1.5 max-h-36 overflow-y-auto">
              {outgoingTransitions.map((t, idx) => (
                <div
                  key={idx}
                  className="p-2 bg-slate-900 rounded-lg border border-slate-800 flex items-center justify-between"
                >
                  <span className="font-bold text-emerald-400">{stateObj.id}</span>
                  <span className="px-2 py-0.5 bg-purple-950 border border-purple-500/30 text-purple-300 rounded font-bold">
                    Symbol '{t.symbol}'
                  </span>
                  <span className="font-bold text-slate-200">➔ State {t.target}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
