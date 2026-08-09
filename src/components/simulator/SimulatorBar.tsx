import React, { useEffect, useRef } from 'react';
import {
  Play,
  Pause,
  SkipForward,
  SkipBack,
  RotateCcw,
  CheckCircle2,
  XCircle,
  Gauge,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { useAutomata } from '../../context/AutomataContext';

export const SimulatorBar: React.FC = () => {
  const {
    graph,
    inputString,
    setInputString,
    simulationSteps,
    currentStepIndex,
    setCurrentStepIndex,
    isPlaying,
    setIsPlaying,
    stepSpeed,
    setStepSpeed,
    runSimulation,
    resetSimulation,
  } = useAutomata();

  const currentStep = simulationSteps[currentStepIndex];
  const confettiFiredRef = useRef<boolean>(false);

  // Reset simulation to step 0 (paused) when graph or input string changes
  useEffect(() => {
    resetSimulation();
    confettiFiredRef.current = false;
  }, [graph.id, inputString, resetSimulation]);

  // Trigger celebratory confetti ONLY ONCE when simulation finishes on an accepted state
  useEffect(() => {
    const isFinalStep = currentStepIndex > 0 && currentStepIndex === simulationSteps.length - 1;
    if (isFinalStep && currentStep?.isAccepting && !confettiFiredRef.current) {
      confettiFiredRef.current = true;
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.8 },
      });
    } else if (!isFinalStep) {
      confettiFiredRef.current = false;
    }
  }, [currentStepIndex, simulationSteps.length, currentStep?.isAccepting]);

  const handleNext = () => {
    if (currentStepIndex < simulationSteps.length - 1) {
      setCurrentStepIndex(currentStepIndex + 1);
    }
  };

  const handlePrev = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(currentStepIndex - 1);
    }
  };

  return (
    <div className="w-full bg-slate-900/95 border-t border-slate-800 p-3 backdrop-blur-xl shadow-2xl flex flex-col md:flex-row items-center justify-between gap-3 text-slate-100">
      {/* Input String Box & Control Buttons */}
      <div className="flex flex-col md:flex-row items-start md:items-center gap-2 w-full md:w-auto">
        <div className="flex items-center bg-slate-950/80 border border-slate-700/80 rounded-xl px-3 py-1.5 focus-within:border-indigo-500 transition shadow-inner">
          <span className="text-xs text-slate-400 font-medium mr-2">Input:</span>
          <input
            type="text"
            value={inputString}
            onChange={(e) => setInputString(e.target.value)}
            placeholder="Enter binary string..."
            className="bg-transparent text-sm font-mono font-bold text-white focus:outline-none w-32 md:w-48 placeholder-slate-500"
          />
        </div>

        {/* Input Validation Feedback */}
        {(() => {
          const alphabet = (graph.alphabet && graph.alphabet.length > 0) ? graph.alphabet : ['0', '1'];
          const invalid = Array.from(new Set(inputString.split('').filter((char) => !alphabet.includes(char))));
          if (invalid.length > 0) {
            return (
              <div className="text-[10px] font-semibold text-rose-400 bg-rose-950/50 border border-rose-500/40 px-2 py-1 rounded-lg flex items-center gap-1">
                <XCircle className="w-3.5 h-3.5 shrink-0" />
                <span>Invalid: '{invalid.join("', '")}' not in &#123;{alphabet.join(', ')}&#125;</span>
              </div>
            );
          }
          return null;
        })()}

        <div className="flex items-center gap-1">
          <button
            onClick={runSimulation}
            className="px-2.5 py-2 bg-indigo-950 hover:bg-indigo-900 border border-indigo-500/40 text-indigo-200 rounded-xl text-xs font-bold transition"
            title="Run simulation"
          >
            Run
          </button>
          <button
            onClick={() => {
              if (simulationSteps.length === 0) runSimulation();
              else handleNext();
            }}
            className="px-2.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold transition"
            title="Single Step"
          >
            Step
          </button>
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="p-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl shadow-lg shadow-indigo-600/30 transition active:scale-95"
            title={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-current" />}
          </button>
          <button
            onClick={handlePrev}
            disabled={currentStepIndex === 0}
            className="p-2.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 rounded-xl transition"
            title="Previous Step"
          >
            <SkipBack className="w-4 h-4 text-slate-300" />
          </button>
          <button
            onClick={handleNext}
            disabled={currentStepIndex >= simulationSteps.length - 1}
            className="p-2.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 rounded-xl transition"
            title="Next Step"
          >
            <SkipForward className="w-4 h-4 text-slate-300" />
          </button>
          <button
            onClick={resetSimulation}
            className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 rounded-xl transition"
            title="Reset"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Input Execution Display */}
      {currentStep && (
        <div className="flex items-center gap-4 text-xs font-mono bg-slate-950/80 px-4 py-2 rounded-xl border border-slate-800 shadow-inner">
          <div className="flex items-center gap-1">
            <span className="text-slate-500">Consumed:</span>
            <span className="text-emerald-400 font-bold bg-emerald-950/50 px-1.5 py-0.5 rounded border border-emerald-800/40">
              {currentStep.consumedInput || 'ε'}
            </span>
          </div>

          <div className="flex items-center gap-1">
            <span className="text-slate-500">Current:</span>
            <span className="text-blue-400 font-bold bg-blue-950/50 px-2 py-0.5 rounded border border-blue-800/40 animate-pulse">
              {currentStep.currentSymbol || '-'}
            </span>
          </div>

          <div className="flex items-center gap-1">
            <span className="text-slate-500">Remaining:</span>
            <span className="text-slate-300 font-bold bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">
              {currentStep.remainingInput || 'ε'}
            </span>
          </div>

          <div className="h-4 w-[1px] bg-slate-800" />

          <div className="flex items-center gap-1">
            <span className="text-slate-500 font-sans">Active Set:</span>
            <span className="text-indigo-300 font-bold">
              {`{${currentStep.currentStateIds.join(', ')}}`}
            </span>
          </div>
        </div>
      )}

      {/* Speed Slider & Status Banner */}
      <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end">
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <Gauge className="w-4 h-4 text-slate-400" />
          <input
            type="range"
            min="100"
            max="1500"
            step="100"
            value={stepSpeed}
            onChange={(e) => setStepSpeed(Number(e.target.value))}
            className="w-20 accent-indigo-500 cursor-pointer"
          />
          <span className="w-8 font-mono text-[10px]">{stepSpeed}ms</span>
        </div>

        {currentStep?.isAccepting && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-950 border border-emerald-500/50 text-emerald-300 rounded-xl font-bold text-xs shadow-lg shadow-emerald-950/50">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            ACCEPTED
          </div>
        )}

        {currentStep?.isRejected && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-950 border border-rose-500/50 text-rose-300 rounded-xl font-bold text-xs shadow-lg shadow-rose-950/50">
            <XCircle className="w-4 h-4 text-rose-400" />
            REJECTED
          </div>
        )}
      </div>
    </div>
  );
};
