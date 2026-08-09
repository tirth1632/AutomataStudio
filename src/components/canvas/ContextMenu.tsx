import React from 'react';
import { Play, Check, Edit2, Copy, Trash2 } from 'lucide-react';
import { useAutomata } from '../../context/AutomataContext';

interface ContextMenuProps {
  x: number;
  y: number;
  nodeId: string | null;
  onClose: () => void;
  onRename: (nodeId: string) => void;
}

export const ContextMenu: React.FC<ContextMenuProps> = ({
  x,
  y,
  nodeId,
  onClose,
  onRename,
}) => {
  const { graph, toggleStartState, toggleAcceptState, duplicateState, deleteState, addState } =
    useAutomata();

  const node = nodeId ? graph.states.find((s) => s.id === nodeId) : null;

  return (
    <div
      style={{ top: y, left: x }}
      className="fixed z-50 min-w-[160px] bg-slate-900/95 border border-slate-700/80 backdrop-blur-lg rounded-xl shadow-2xl p-1.5 text-sm font-medium text-slate-200 animate-in fade-in zoom-in-95 duration-150"
      onClick={(e) => e.stopPropagation()}
    >
      {node ? (
        <>
          <div className="px-3 py-1.5 text-xs font-semibold text-slate-400 border-b border-slate-800 uppercase tracking-wider">
            State: {node.label}
          </div>

          <button
            onClick={() => {
              toggleStartState(node.id);
              onClose();
            }}
            className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-800/80 flex items-center gap-2 text-indigo-300 transition"
          >
            <Play className="w-4 h-4 text-indigo-400" />
            {node.isStart ? 'Remove Start' : 'Make Start State'}
          </button>

          <button
            onClick={() => {
              toggleAcceptState(node.id);
              onClose();
            }}
            className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-800/80 flex items-center gap-2 text-emerald-300 transition"
          >
            <Check className="w-4 h-4 text-emerald-400" />
            {node.isAccept ? 'Remove Accept' : 'Make Accept State'}
          </button>

          <button
            onClick={() => {
              onRename(node.id);
              onClose();
            }}
            className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-800/80 flex items-center gap-2 text-sky-300 transition"
          >
            <Edit2 className="w-4 h-4 text-sky-400" />
            Rename State
          </button>

          <button
            onClick={() => {
              duplicateState(node.id);
              onClose();
            }}
            className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-800/80 flex items-center gap-2 text-purple-300 transition"
          >
            <Copy className="w-4 h-4 text-purple-400" />
            Duplicate State
          </button>

          <div className="my-1 border-t border-slate-800" />

          <button
            onClick={() => {
              deleteState(node.id);
              onClose();
            }}
            className="w-full text-left px-3 py-2 rounded-lg hover:bg-rose-900/40 text-rose-400 flex items-center gap-2 transition"
          >
            <Trash2 className="w-4 h-4 text-rose-400" />
            Delete State
          </button>
        </>
      ) : (
        <>
          <button
            onClick={() => {
              addState({ x: x - 200, y: y - 100 });
              onClose();
            }}
            className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-800/80 flex items-center gap-2 text-indigo-300 transition"
          >
            <Plus className="w-4 h-4" />
            Add New State Here
          </button>
        </>
      )}
    </div>
  );
};

// Internal icon import helper
function Plus(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M5 12h14" />
      <path d="M12 5v14" />
    </svg>
  );
}
