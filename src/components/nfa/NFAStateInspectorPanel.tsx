import React, { useState } from 'react';
import { Search, ArrowDownRight, ArrowUpRight, X, Zap, Compass, CheckCircle2 } from 'lucide-react';
import type { NFA } from '../../algorithms/nfa/NFA';
import type { AutomatonGraph } from '../../types/automata';
import { getEpsilonClosureSingle } from '../../algorithms/epsilonClosure';

interface NFAStateInspectorPanelProps {
  nfa: NFA;
  graph?: AutomatonGraph;
  selectedStateId?: string;
  onSelectState?: (stateId: string) => void;
  onClose?: () => void;
}

export const NFAStateInspectorPanel: React.FC<NFAStateInspectorPanelProps> = ({
  nfa,
  graph,
  selectedStateId,
  onSelectState,
  onClose,
}) => {
  const [internalSelectedId, setInternalSelectedId] = useState<string>(
    selectedStateId || nfa.startState || nfa.states[0] || 'q0'
  );

  const activeId = selectedStateId || internalSelectedId;
  const isStart = activeId === nfa.startState;
  const isAccept = nfa.acceptStates.includes(activeId);

  // Compute incoming transitions
  const incomingTransitions: Array<{ source: string; symbol: string }> = [];
  for (const src of Object.keys(nfa.transitions)) {
    const symMap = nfa.transitions[src] || {};
    for (const sym of Object.keys(symMap)) {
      const targets = symMap[sym] || [];
      if (targets.includes(activeId)) {
        incomingTransitions.push({ source: src, symbol: sym });
      }
    }
  }

  // Compute outgoing transitions
  const outgoingTransitions: Array<{ target: string; symbol: string }> = [];
  const symMap = nfa.transitions[activeId] || {};
  for (const sym of Object.keys(symMap)) {
    const targets = symMap[sym] || [];
    for (const tgt of targets) {
      outgoingTransitions.push({ target: tgt, symbol: sym });
    }
  }

  // Compute BFS Shortest Path to reach activeId from startState
  const shortestPath = React.useMemo(() => {
    if (activeId === nfa.startState) return 'ε';
    const queue: Array<{ state: string; path: string }> = [{ state: nfa.startState, path: '' }];
    const visited = new Set<string>();
    visited.add(nfa.startState);

    while (queue.length > 0) {
      const { state, path } = queue.shift()!;
      if (state === activeId) return path || 'ε';

      const sMap = nfa.transitions[state] || {};
      for (const sym of Object.keys(sMap)) {
        const targets = sMap[sym] || [];
        for (const tgt of targets) {
          if (!visited.has(tgt)) {
            visited.add(tgt);
            const symStr = sym === 'ε' || sym === 'epsilon' ? 'ε' : sym;
            queue.push({ state: tgt, path: path ? `${path}${symStr}` : symStr });
          }
        }
      }
    }
    return 'Unreachable';
  }, [nfa, activeId]);

  // Compute ε-Closure for activeId
  const epsClosureSet = React.useMemo(() => {
    try {
      const g = graph || {
        id: 'temp',
        name: 'NFA',
        type: 'NFA' as const,
        alphabet: nfa.alphabet,
        states: nfa.states.map((s) => ({
          id: s,
          label: s,
          x: 0,
          y: 0,
          isStart: s === nfa.startState,
          isAccept: nfa.acceptStates.includes(s),
        })),
        transitions: [],
      };
      return Array.from(getEpsilonClosureSingle(activeId, g.transitions));
    } catch {
      return [activeId];
    }
  }, [nfa, graph, activeId]);

  // Generate State Meaning Explanation
  const stateMeaning = React.useMemo(() => {
    if (isStart && isAccept) {
      return 'Initial & Accept State. Accepts the empty string ε and serves as the starting point of computation.';
    }
    if (isStart) {
      return 'Initial State. Start node of computation. No input symbols processed yet.';
    }
    if (isAccept) {
      return `Accepting State. Reaching this state means the processed string matches the required NFA language pattern.`;
    }
    if (outgoingTransitions.length === 0) {
      return `Dead / Terminal State. No outgoing transitions exist from this node.`;
    }
    const hasEpsilon = outgoingTransitions.some((t) => t.symbol === 'ε' || t.symbol === 'epsilon');
    if (hasEpsilon) {
      return `Nondeterministic State with Spontaneous ε-Transitions. Branches without consuming input symbols.`;
    }
    return `Intermediate NFA State. Evaluates symbol transitions along parallel computation branches.`;
  }, [isStart, isAccept, outgoingTransitions]);

  const handleStateChange = (id: string) => {
    setInternalSelectedId(id);
    if (onSelectState) onSelectState(id);
  };

  return (
    <div className="p-4 sm:p-5 space-y-4 bg-slate-900/95 text-slate-100 rounded-2xl border border-slate-800 text-sm shadow-2xl font-sans relative">
      {/* Header Bar & Dropdown Picker */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3 gap-2 flex-wrap">
        <div className="flex items-center gap-2.5 font-bold text-base text-purple-300">
          <Search className="w-5 h-5 text-purple-400 shrink-0" />
          NFA State Overview & Semantics
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400 font-medium font-sans">State:</span>
          <select
            value={activeId}
            onChange={(e) => handleStateChange(e.target.value)}
            className="px-3 py-1 bg-slate-950 border border-slate-700/80 rounded-xl text-xs font-mono font-bold text-purple-300 focus:outline-none focus:border-purple-500 cursor-pointer"
          >
            {nfa.states.map((s) => (
              <option key={s} value={s}>
                {s} {s === nfa.startState ? '➔ Start' : ''} {nfa.acceptStates.includes(s) ? '★ Accept' : ''}
              </option>
            ))}
          </select>

          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-lg transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Main State Card */}
      <div className="p-4 bg-slate-950/90 rounded-2xl border border-slate-800/90 space-y-3 shadow-inner">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="font-mono font-bold text-base text-purple-200 flex items-center gap-2">
            <span className="px-3 py-1 bg-purple-950/80 border border-purple-500/40 text-purple-300 rounded-xl text-sm shadow">
              {activeId}
            </span>
            <span className="text-slate-300 font-sans font-bold text-sm">{activeId}</span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {isStart && (
              <span className="px-2.5 py-1 bg-purple-600/30 border border-purple-500/40 text-purple-300 rounded-xl text-xs font-bold uppercase tracking-wider">
                Start
              </span>
            )}
            {isAccept ? (
              <span className="px-2.5 py-1 bg-emerald-600/30 border border-emerald-500/40 text-emerald-300 rounded-xl text-xs font-bold uppercase tracking-wider">
                Accept
              </span>
            ) : (
              <span className="px-2.5 py-1 bg-slate-800/80 border border-slate-700 text-slate-400 rounded-xl text-xs font-semibold">
                Non-Accept
              </span>
            )}
          </div>
        </div>

        {/* STATE MEANING Box */}
        <div className="p-3 bg-slate-900/90 rounded-xl border border-slate-800 space-y-1 font-sans">
          <span className="text-[10px] font-extrabold text-purple-400 uppercase tracking-wider block">
            STATE MEANING
          </span>
          <p className="text-xs text-slate-200 leading-relaxed font-sans">{stateMeaning}</p>
        </div>

        {/* ε-Closure Info */}
        <div className="flex items-center justify-between text-xs font-mono pt-1 text-slate-300">
          <span className="text-slate-400 flex items-center gap-1">
            <Zap className="w-3.5 h-3.5 text-purple-400" /> ε-Closure ECLOSE({activeId}):
          </span>
          <strong className="text-purple-300 font-bold bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
            &#123;{epsClosureSet.join(', ')}&#125;
          </strong>
        </div>
      </div>

      {/* Incoming vs Outgoing Transitions Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 font-mono text-xs">
        {/* Incoming Transitions */}
        <div className="p-3.5 bg-slate-950/90 rounded-xl border border-slate-800 space-y-2">
          <div className="flex items-center gap-1.5 font-bold text-sky-400 uppercase tracking-wider text-xs font-sans">
            <ArrowDownRight className="w-4 h-4 text-sky-400" /> INCOMING ({incomingTransitions.length})
          </div>
          {incomingTransitions.length === 0 ? (
            <div className="text-slate-500 italic font-sans text-xs p-2 bg-slate-900 rounded-lg">
              None (Start node)
            </div>
          ) : (
            <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto p-1">
              {incomingTransitions.map((t, idx) => (
                <span
                  key={idx}
                  className="px-2.5 py-1 bg-slate-900 border border-slate-800 rounded-lg text-slate-200 font-bold text-xs flex items-center gap-1"
                >
                  <span className="text-purple-400">'{t.symbol}'</span>
                  <span className="text-slate-400">➔</span>
                  <span className="text-emerald-400">{t.source}</span>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Outgoing Transitions */}
        <div className="p-3.5 bg-slate-950/90 rounded-xl border border-slate-800 space-y-2">
          <div className="flex items-center gap-1.5 font-bold text-purple-400 uppercase tracking-wider text-xs font-sans">
            <ArrowUpRight className="w-4 h-4 text-purple-400" /> OUTGOING ({outgoingTransitions.length})
          </div>
          {outgoingTransitions.length === 0 ? (
            <div className="text-slate-500 italic font-sans text-xs p-2 bg-slate-900 rounded-lg">
              None (Terminal node)
            </div>
          ) : (
            <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto p-1">
              {outgoingTransitions.map((t, idx) => (
                <span
                  key={idx}
                  className="px-2 py-1 bg-slate-900 border border-slate-800 rounded-lg text-slate-200 font-bold text-xs flex items-center gap-1"
                >
                  <span className="text-purple-300 font-bold">'{t.symbol}'</span>
                  <span className="text-slate-400">➔</span>
                  <span className="text-sky-300 font-bold">{t.target}</span>
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Footer Info */}
      <div className="flex items-center justify-between text-xs font-sans text-slate-400 pt-1 border-t border-slate-800">
        <div>
          Shortest Path:{' '}
          <strong className="text-emerald-400 font-mono font-bold">{shortestPath}</strong>
        </div>
        <div className="text-[11px] text-purple-400 font-mono font-bold">
          {isStart ? 'Initial Start Node' : isAccept ? 'Accepting State' : 'Unique State'}
        </div>
      </div>
    </div>
  );
};
