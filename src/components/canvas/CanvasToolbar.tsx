import {
  Plus,
  Trash2,
  Undo2,
  Redo2,
  Maximize2,
  ZoomIn,
  ZoomOut,
  Grid,
  Map,
  Sparkles,
} from 'lucide-react';
import { useAutomata } from '../../context/AutomataContext';

interface CanvasToolbarProps {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFitView: () => void;
  onAutoLayout: () => void;
  showMiniMap: boolean;
  setShowMiniMap: (b: boolean | ((prev: boolean) => boolean)) => void;
}

export const CanvasToolbar: React.FC<CanvasToolbarProps> = ({
  onZoomIn,
  onZoomOut,
  onFitView,
  onAutoLayout,
  showMiniMap,
  setShowMiniMap,
}) => {
  const { addState, clearCanvas, undo, redo, canUndo, canRedo, settings, updateSettings } =
    useAutomata();

  return (
    <div className="absolute top-4 left-4 z-20 flex items-center gap-1.5 p-1.5 bg-slate-900/90 border border-slate-700/80 backdrop-blur-xl rounded-2xl shadow-xl">
      <button
        onClick={() => addState()}
        className="flex items-center gap-1.5 px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-medium text-xs shadow-lg shadow-indigo-600/30 transition active:scale-95"
      >
        <Plus className="w-4 h-4" />
        Add State
      </button>

      <div className="h-6 w-[1px] bg-slate-800 my-auto" />

      <button
        onClick={undo}
        disabled={!canUndo}
        title="Undo (Ctrl+Z)"
        className="p-2 text-slate-300 hover:bg-slate-800 rounded-xl disabled:opacity-40 disabled:hover:bg-transparent transition"
      >
        <Undo2 className="w-4 h-4" />
      </button>

      <button
        onClick={redo}
        disabled={!canRedo}
        title="Redo (Ctrl+Y)"
        className="p-2 text-slate-300 hover:bg-slate-800 rounded-xl disabled:opacity-40 disabled:hover:bg-transparent transition"
      >
        <Redo2 className="w-4 h-4" />
      </button>

      <div className="h-6 w-[1px] bg-slate-800 my-auto" />

      <button
        onClick={onAutoLayout}
        title="Auto Arrange Graph"
        className="flex items-center gap-1.5 px-2.5 py-2 text-slate-200 hover:bg-slate-800 rounded-xl text-xs font-medium transition"
      >
        <Sparkles className="w-4 h-4 text-purple-400" />
        <span className="hidden sm:inline">Auto Arrange</span>
      </button>

      <div className="h-6 w-[1px] bg-slate-800 my-auto" />

      <button
        onClick={onZoomIn}
        title="Zoom In"
        className="p-2 text-slate-300 hover:bg-slate-800 rounded-xl transition"
      >
        <ZoomIn className="w-4 h-4" />
      </button>

      <button
        onClick={onZoomOut}
        title="Zoom Out"
        className="p-2 text-slate-300 hover:bg-slate-800 rounded-xl transition"
      >
        <ZoomOut className="w-4 h-4" />
      </button>

      <button
        onClick={onFitView}
        title="Fit to Canvas"
        className="p-2 text-slate-300 hover:bg-slate-800 rounded-xl transition"
      >
        <Maximize2 className="w-4 h-4" />
      </button>

      <div className="h-6 w-[1px] bg-slate-800 my-auto" />

      <button
        onClick={() => updateSettings({ showGrid: !settings.showGrid })}
        title="Toggle Grid"
        className={`p-2 rounded-xl transition ${
          settings.showGrid ? 'bg-slate-800 text-indigo-400' : 'text-slate-400 hover:bg-slate-800'
        }`}
      >
        <Grid className="w-4 h-4" />
      </button>

      <button
        onClick={() => setShowMiniMap((prev) => !prev)}
        title="Toggle MiniMap"
        className={`p-2 rounded-xl transition ${
          showMiniMap ? 'bg-slate-800 text-indigo-400' : 'text-slate-400 hover:bg-slate-800'
        }`}
      >
        <Map className="w-4 h-4" />
      </button>

      <div className="h-6 w-[1px] bg-slate-800 my-auto" />

      <button
        onClick={clearCanvas}
        title="Clear Canvas"
        className="flex items-center gap-1.5 px-2.5 py-1.5 text-rose-400 hover:text-white hover:bg-rose-600/80 border border-rose-500/30 rounded-xl text-xs font-semibold transition active:scale-95 shadow-sm cursor-pointer"
      >
        <Trash2 className="w-3.5 h-3.5" />
        <span>Clear</span>
      </button>
    </div>
  );
};
