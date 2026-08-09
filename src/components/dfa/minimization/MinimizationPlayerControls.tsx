import React from 'react';
import { Play, Pause, ChevronLeft, ChevronRight, RotateCcw, FastForward, Gauge } from 'lucide-react';

interface MinimizationPlayerControlsProps {
  currentStepIndex: number;
  totalSteps: number;
  isPlaying: boolean;
  speed: number;
  onPlayPause: () => void;
  onPrev: () => void;
  onNext: () => void;
  onRestart: () => void;
  onFinish: () => void;
  onSpeedChange: (speed: number) => void;
}

export const MinimizationPlayerControls: React.FC<MinimizationPlayerControlsProps> = ({
  currentStepIndex,
  totalSteps,
  isPlaying,
  speed,
  onPlayPause,
  onPrev,
  onNext,
  onRestart,
  onFinish,
  onSpeedChange,
}) => {
  const speeds = [0.5, 1, 2, 4];

  return (
    <div className="p-3 bg-slate-950/90 border border-slate-800 rounded-2xl flex items-center justify-between flex-wrap gap-3 backdrop-blur-xl shadow-lg">
      {/* Step Counter */}
      <div className="flex items-center gap-2">
        <span className="px-2.5 py-1 bg-indigo-950/80 border border-indigo-500/40 text-indigo-300 rounded-lg text-xs font-mono font-bold">
          Step {currentStepIndex + 1} / {totalSteps}
        </span>
      </div>

      {/* Main Controls */}
      <div className="flex items-center gap-1.5">
        <button
          onClick={onRestart}
          className="p-2 hover:bg-slate-800 text-slate-300 hover:text-white rounded-xl transition"
          title="Restart from Step 1"
        >
          <RotateCcw className="w-4 h-4" />
        </button>

        <button
          onClick={onPrev}
          disabled={currentStepIndex === 0}
          className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold flex items-center gap-1 transition disabled:opacity-40"
        >
          <ChevronLeft className="w-4 h-4" /> Prev
        </button>

        <button
          onClick={onPlayPause}
          className={`px-4 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md transition transform active:scale-95 ${
            isPlaying
              ? 'bg-amber-600 hover:bg-amber-500 text-white shadow-amber-600/30'
              : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/30'
          }`}
        >
          {isPlaying ? (
            <>
              <Pause className="w-4 h-4" /> Pause
            </>
          ) : (
            <>
              <Play className="w-4 h-4 fill-current" /> Play
            </>
          )}
        </button>

        <button
          onClick={onNext}
          disabled={currentStepIndex === totalSteps - 1}
          className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold flex items-center gap-1 transition disabled:opacity-40"
        >
          Next <ChevronRight className="w-4 h-4" />
        </button>

        <button
          onClick={onFinish}
          disabled={currentStepIndex === totalSteps - 1}
          className="p-2 hover:bg-slate-800 text-emerald-400 hover:text-emerald-300 rounded-xl transition disabled:opacity-40"
          title="Jump to Final Minimal DFA"
        >
          <FastForward className="w-4 h-4" />
        </button>
      </div>

      {/* Speed Selector */}
      <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 p-1 rounded-xl">
        <Gauge className="w-3.5 h-3.5 text-slate-400 ml-1.5 mr-0.5" />
        {speeds.map((s) => (
          <button
            key={s}
            onClick={() => onSpeedChange(s)}
            className={`px-2 py-0.5 rounded-lg text-[11px] font-mono font-bold transition ${
              speed === s
                ? 'bg-indigo-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            {s}×
          </button>
        ))}
      </div>
    </div>
  );
};
