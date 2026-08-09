import React, { useState, useEffect, useRef } from 'react';
import { X, ArrowDownRight, ArrowUpRight, Zap, GripHorizontal } from 'lucide-react';
import type { AutomatonGraph } from '../../types/automata';
import { getEpsilonClosureSingle } from '../../algorithms/epsilonClosure';

interface StateInspectorCardProps {
  nodeId: string;
  graph: AutomatonGraph;
  onClose: () => void;
}

export const StateInspectorCard: React.FC<StateInspectorCardProps> = ({
  nodeId,
  graph,
  onClose,
}) => {
  // Drag and Drop State
  const [position, setPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const dragRef = useRef<{ startX: number; startY: number; posX: number; posY: number }>({
    startX: 0,
    startY: 0,
    posX: 0,
    posY: 0,
  });

  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button')) return;
    setIsDragging(true);
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      posX: position.x,
      posY: position.y,
    };
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      const dx = e.clientX - dragRef.current.startX;
      const dy = e.clientY - dragRef.current.startY;
      setPosition({
        x: dragRef.current.posX + dx,
        y: dragRef.current.posY + dy,
      });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  const stateObj = graph.states.find((s) => s.id === nodeId) || {
    id: nodeId,
    label: nodeId,
    x: 0,
    y: 0,
    isStart: false,
    isAccept: false,
  };

  const isStart = stateObj.isStart;
  const isAccept = stateObj.isAccept;

  // Incoming transitions
  const incomingTransitions: Array<{ source: string; symbol: string }> = [];
  graph.transitions.forEach((t) => {
    if (t.target === nodeId) {
      t.symbols.forEach((sym) => {
        incomingTransitions.push({ source: t.source, symbol: sym });
      });
    }
  });

  // Outgoing transitions
  const outgoingTransitions: Array<{ target: string; symbol: string }> = [];
  graph.transitions.forEach((t) => {
    if (t.source === nodeId) {
      t.symbols.forEach((sym) => {
        outgoingTransitions.push({ target: t.target, symbol: sym });
      });
    }
  });

  // ε-Closure calculation
  const epsClosure = React.useMemo(() => {
    try {
      return Array.from(getEpsilonClosureSingle(nodeId, graph.transitions));
    } catch {
      return [nodeId];
    }
  }, [graph, nodeId]);

  // Shortest path via BFS
  const shortestPath = React.useMemo(() => {
    const startNode = graph.states.find((s) => s.isStart);
    if (!startNode || startNode.id === nodeId) return 'ε';

    const queue: Array<{ curr: string; path: string }> = [{ curr: startNode.id, path: '' }];
    const visited = new Set<string>([startNode.id]);

    while (queue.length > 0) {
      const { curr, path } = queue.shift()!;
      if (curr === nodeId) return path || 'ε';

      graph.transitions.forEach((t) => {
        if (t.source === curr && !visited.has(t.target)) {
          visited.add(t.target);
          const symStr = t.symbols.map((s) => (s === 'ε' || s === 'epsilon' ? 'ε' : s)).join('');
          queue.push({ curr: t.target, path: path ? `${path}${symStr}` : symStr });
        }
      });
    }
    return 'Unreachable';
  }, [graph, nodeId]);

  // State Meaning Explanation
  const stateMeaning = React.useMemo(() => {
    if (isStart && isAccept) {
      return 'Initial & Accept state. Accepts the empty string ε and serves as the starting point of computation.';
    }
    if (isStart) {
      return 'Initial state. No input symbols processed yet.';
    }
    if (isAccept) {
      return 'Accepting State. Reaching this state means the processed string matches the required NFA language pattern.';
    }
    if (outgoingTransitions.length === 0) {
      return 'Terminal dead state. Reaching here halts computation.';
    }
    const hasEps = outgoingTransitions.some((t) => t.symbol === 'ε' || t.symbol === 'e' || t.symbol === 'epsilon');
    if (hasEps) {
      return 'Nondeterministic state with spontaneous ε-transitions.';
    }
    return 'Intermediate state. Evaluates symbol transitions along computational branches.';
  }, [isStart, isAccept, outgoingTransitions]);

  return (
    <div
      style={{ transform: `translate(${position.x}px, ${position.y}px)` }}
      className={`p-4 bg-slate-950/95 text-slate-100 rounded-2xl border border-purple-500/30 shadow-2xl space-y-3 font-sans backdrop-blur-md text-xs relative select-none w-80 transition-shadow ${
        isDragging ? 'shadow-purple-500/20 ring-1 ring-purple-500/40' : ''
      }`}
    >
      {/* Top Draggable Header Row */}
      <div
        onMouseDown={handleMouseDown}
        className="flex items-center justify-between gap-2 border-b border-slate-800/80 pb-2.5 cursor-grab active:cursor-grabbing"
      >
        <div className="flex items-center gap-2">
          <GripHorizontal className="w-4 h-4 text-slate-500 shrink-0" />
          <span className="px-2.5 py-1 bg-purple-950/90 border border-purple-500/50 text-purple-300 rounded-xl font-mono font-bold text-xs shadow">
            {stateObj.id}
          </span>
          <span className="font-bold text-sm text-white font-mono">{stateObj.label || stateObj.id}</span>
        </div>

        <div className="flex items-center gap-1.5">
          {isStart && (
            <span className="px-2.5 py-1 bg-indigo-600/30 border border-indigo-500/40 text-indigo-300 rounded-xl text-[10px] font-bold uppercase tracking-wider">
              Start
            </span>
          )}
          {isAccept ? (
            <span className="px-2.5 py-1 bg-emerald-950/90 border border-emerald-500/40 text-emerald-400 font-extrabold tracking-wider rounded-xl text-[10px] uppercase">
              Accept
            </span>
          ) : (
            <span className="px-2.5 py-1 bg-slate-800/80 border border-slate-700 text-slate-400 rounded-xl text-[10px] font-semibold">
              Non-Accept
            </span>
          )}

          <button
            onClick={onClose}
            className="p-1 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-lg transition cursor-pointer ml-1"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* STATE MEANING Box */}
      <div className="p-3 bg-slate-900/90 rounded-xl border border-slate-800 space-y-1">
        <span className="text-[9.5px] font-extrabold text-purple-400 uppercase tracking-wider block">
          STATE MEANING
        </span>
        <p className="text-xs text-slate-200 leading-relaxed font-sans">{stateMeaning}</p>
      </div>

      {/* ε-Closure Line */}
      <div className="flex items-center justify-between text-xs font-mono pt-0.5 text-purple-400">
        <span className="flex items-center gap-1 font-bold">
          <Zap className="w-3.5 h-3.5 text-purple-400" /> ε-Closure ECLOSE({stateObj.id}):
        </span>
        <strong className="text-purple-300 font-bold bg-slate-950 px-2 py-0.5 rounded border border-slate-800 font-mono">
          &#123;{epsClosure.join(', ')}&#125;
        </strong>
      </div>

      {/* Incoming vs Outgoing Transitions Grid */}
      <div className="grid grid-cols-2 gap-2 font-mono text-[11px]">
        {/* Incoming */}
        <div className="p-2.5 bg-slate-900/90 rounded-xl border border-slate-800 space-y-1">
          <span className="text-[9px] font-bold text-sky-400 uppercase tracking-wider block flex items-center gap-1 font-sans">
            <ArrowDownRight className="w-3 h-3 text-sky-400" /> INCOMING ({incomingTransitions.length})
          </span>
          {incomingTransitions.length === 0 ? (
            <span className="text-slate-500 italic font-sans text-[10px] block p-1.5 bg-slate-950 rounded-lg">
              None (Start node)
            </span>
          ) : (
            <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto">
              {incomingTransitions.map((t, idx) => (
                <span key={idx} className="px-2 py-0.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 font-bold">
                  <span className="text-purple-300">'{t.symbol}'</span> <span className="text-slate-400">➔</span> <span className="text-emerald-400">{t.source}</span>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Outgoing */}
        <div className="p-2.5 bg-slate-900/90 rounded-xl border border-slate-800 space-y-1">
          <span className="text-[9px] font-bold text-purple-400 uppercase tracking-wider block flex items-center gap-1 font-sans">
            <ArrowUpRight className="w-3 h-3 text-purple-400" /> OUTGOING ({outgoingTransitions.length})
          </span>
          {outgoingTransitions.length === 0 ? (
            <span className="text-slate-500 italic font-sans text-[10px] block p-1.5 bg-slate-950 rounded-lg">
              None (Terminal node)
            </span>
          ) : (
            <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto">
              {outgoingTransitions.map((t, idx) => (
                <span key={idx} className="px-2 py-0.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 font-bold">
                  <span className="text-purple-300">'{t.symbol}'</span> <span className="text-slate-400">➔</span> <span className="text-sky-300">{t.target}</span>
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Footer Info */}
      <div className="flex items-center justify-between text-[11px] font-sans text-slate-400 pt-1 border-t border-slate-800">
        <div>
          Shortest Path: <strong className="text-emerald-400 font-mono font-bold">{shortestPath}</strong>
        </div>
        <div className="text-[10.5px] text-purple-400 font-mono font-bold">
          {isStart ? 'Initial Start Node' : isAccept ? 'Accepting State' : 'Intermediate State'}
        </div>
      </div>
    </div>
  );
};
