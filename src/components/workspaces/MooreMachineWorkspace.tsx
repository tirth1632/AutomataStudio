import React, { useState, useMemo, useEffect } from 'react';
import {
  Cpu,
  Play,
  Pause,
  RotateCcw,
  SkipForward,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  FileText,
  Download,
  Layers,
  Sparkles,
  Activity,
  ArrowRight,
  ShieldCheck,
  Zap,
  BookOpen,
  Info,
  Sliders,
  Share2,
  Clock,
  RefreshCw as RefreshCwIcon,
  Table as TableIcon,
  Search,
  FileJson,
  BarChart3,
  Sigma,
  X,
} from 'lucide-react';
import {
  type MooreMachine,
  type MooreSimulationStep,
  PRESET_MOORE_MACHINES,
  simulateMooreMachine,
  validateMooreMachine,
  convertMooreToMealy,
  convertMooreMachineToAutomatonGraph,
  convertEquivalentMealyToAutomatonGraph,
} from '../../algorithms/mooreEngine';
import { useAutomata } from '../../context/AutomataContext';
import { AutomataCanvas } from '../canvas/AutomataCanvas';
import type { AutomatonGraph } from '../../types/automata';

export const MooreMachineWorkspace: React.FC = () => {
  const { graph, setGraph } = useAutomata();

  // ── State Management ──────────────────────────────────────────────────────────
  const [currentMachine, setCurrentMachine] = useState<MooreMachine>(PRESET_MOORE_MACHINES[0]);
  const [inputTape, setInputTape] = useState<string>('10110');
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [speedMultiplier, setSpeedMultiplier] = useState<number>(1);
  const playbackSpeed = useMemo(() => Math.round(1000 / speedMultiplier), [speedMultiplier]);

  // Custom node positions map to allow dragging state circles ("balls")
  const [nodePositions, setNodePositions] = useState<Record<string, { x: number; y: number }>>({});

  useEffect(() => {
    setNodePositions({});
  }, [currentMachine.id]);

  // Search & Filter State for Presets
  const [presetSearchQuery, setPresetSearchQuery] = useState<string>('');
  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);

  // Center Tab State
  const [activeCenterTab, setActiveCenterTab] = useState<'canvas' | 'tables' | 'conversion'>('canvas');

  // ── Deterministic Engine Execution ──────────────────────────────────────────
  const simulationResult = useMemo(() => {
    return simulateMooreMachine(currentMachine, inputTape);
  }, [currentMachine, inputTape]);

  const validationReport = useMemo(() => {
    return validateMooreMachine(currentMachine);
  }, [currentMachine]);

  const conversionResult = useMemo(() => {
    return convertMooreToMealy(currentMachine);
  }, [currentMachine]);

  // Conversion Lab State & Playback
  const [conversionStep, setConversionStep] = useState<number>(0);
  const [isConversionPlaying, setIsConversionPlaying] = useState<boolean>(false);

  const totalConversionSteps = useMemo(() => {
    return conversionResult.explanationSteps.length;
  }, [conversionResult]);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    if (isConversionPlaying) {
      if (conversionStep < totalConversionSteps - 1) {
        timer = setTimeout(() => {
          setConversionStep((prev) => prev + 1);
        }, 1200);
      } else {
        setIsConversionPlaying(false);
      }
    }
    return () => clearTimeout(timer);
  }, [isConversionPlaying, conversionStep, totalConversionSteps]);

  // Converted Equivalent Mealy Graph (Minimized 3-state vs Raw 4-state)
  const [useMinimizedMealy, setUseMinimizedMealy] = useState<boolean>(true);

  const targetMealyMachine = useMemo(() => {
    return useMinimizedMealy ? conversionResult.equivalentMealy : conversionResult.rawEquivalentMealy;
  }, [useMinimizedMealy, conversionResult]);

  useEffect(() => {
    setConversionStep(0);
    setIsConversionPlaying(false);
  }, [currentMachine.id]);

  const mealyGraph: AutomatonGraph = useMemo(() => {
    return convertEquivalentMealyToAutomatonGraph(
      targetMealyMachine,
      nodePositions,
      conversionStep,
      totalConversionSteps
    );
  }, [targetMealyMachine, nodePositions, conversionStep, totalConversionSteps]);

  const currentConversionExplanation = conversionResult.explanationSteps[conversionStep];

  const activeMooreStateIds = useMemo(() => {
    if (!currentConversionExplanation) return new Set<string>();
    return new Set([currentConversionExplanation.targetState]);
  }, [currentConversionExplanation]);

  const activeMooreEdgeIds = useMemo(() => {
    const rule = currentMachine.transitions[conversionStep];
    return rule ? new Set([rule.id]) : new Set<string>();
  }, [currentMachine, conversionStep]);

  const activeMealyEdgeIds = useMemo(() => {
    const rule = targetMealyMachine.transitions[conversionStep];
    return rule ? new Set([rule.id]) : new Set<string>();
  }, [targetMealyMachine, conversionStep]);

  // Inspector Highlight State
  const [highlightedComponent, setHighlightedComponent] = useState<string | null>(null);

  // Current Active Step Data
  const currentStep: MooreSimulationStep | undefined = useMemo(() => {
    if (currentStepIndex === 0) return undefined;
    return simulationResult.steps[currentStepIndex - 1];
  }, [simulationResult, currentStepIndex]);

  const currentStateId = useMemo(() => {
    if (!currentStep) return currentMachine.startState;
    return currentStep.toState;
  }, [currentStep, currentMachine]);

  const activeTransitionId = currentStep?.activeTransitionId;

  // Convert Moore Machine to AutomatonGraph for ReactFlow AutomataCanvas
  const mooreGraph: AutomatonGraph = useMemo(() => {
    return convertMooreMachineToAutomatonGraph(currentMachine, nodePositions);
  }, [currentMachine, nodePositions]);

  // Categorized Presets Filtered by Typing Query
  const filteredPresets = useMemo(() => {
    const query = presetSearchQuery.toLowerCase().trim();
    if (!query) return PRESET_MOORE_MACHINES;
    return PRESET_MOORE_MACHINES.filter(
      (m) => m.name.toLowerCase().includes(query) || m.description.toLowerCase().includes(query) || m.id.toLowerCase().includes(query)
    );
  }, [presetSearchQuery]);

  const categorizedPresets = useMemo(() => {
    return [
      {
        category: 'Sequence Detectors',
        items: filteredPresets.filter((m) => m.id.includes('seq')),
      },
      {
        category: 'Parity & Signal Generators',
        items: filteredPresets.filter((m) => m.id.includes('parity')),
      },
      {
        category: 'Industrial Control Systems',
        items: filteredPresets.filter((m) => m.id.includes('traffic')),
      },
      {
        category: 'All Preset Machines',
        items: filteredPresets.filter(
          (m) => !m.id.includes('seq') && !m.id.includes('parity') && !m.id.includes('traffic')
        ),
      },
    ];
  }, [filteredPresets]);

  // ── Playback Controls & Timers ───────────────────────────────────────────────
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    if (isPlaying) {
      if (currentStepIndex < simulationResult.steps.length) {
        timer = setTimeout(() => {
          setCurrentStepIndex((prev) => prev + 1);
        }, playbackSpeed);
      } else {
        setIsPlaying(false);
      }
    }
    return () => clearTimeout(timer);
  }, [isPlaying, currentStepIndex, simulationResult, playbackSpeed]);

  const handleReset = () => {
    setIsPlaying(false);
    setCurrentStepIndex(0);
  };

  const handleToggleBit = (index: number) => {
    const symbols = currentMachine.inputAlphabet || ['0', '1'];
    setInputTape((prev) => {
      const arr = prev.split('');
      if (index >= 0 && index < arr.length) {
        const currSym = arr[index];
        const nextIdx = (symbols.indexOf(currSym) + 1) % symbols.length;
        arr[index] = symbols[nextIdx >= 0 ? nextIdx : 0];
      }
      return arr.join('');
    });
    handleReset();
  };

  const handleAppendBit = (sym: string) => {
    setInputTape((prev) => prev + sym);
    handleReset();
  };

  const handleInputTapeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputEl = e.target;
    const rawVal = inputEl.value;
    const cursorPos = inputEl.selectionStart ?? rawVal.length;

    const allowedChars = (currentMachine.inputAlphabet || ['0', '1']).join('');
    const escaped = allowedChars.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
    const regex = new RegExp(`[^${escaped}]`, 'gi');
    const sanitizedVal = rawVal.replace(regex, '');

    const removedBeforeCursor = (rawVal.slice(0, cursorPos).match(regex) || []).length;
    const newCursorPos = Math.max(0, cursorPos - removedBeforeCursor);

    setInputTape(sanitizedVal);
    handleReset();

    requestAnimationFrame(() => {
      if (inputEl) {
        inputEl.setSelectionRange(newCursorPos, newCursorPos);
      }
    });
  };

  const handlePresetSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputEl = e.target;
    const cursorPos = inputEl.selectionStart ?? e.target.value.length;
    const val = e.target.value;

    setPresetSearchQuery(val);
    setIsDropdownOpen(true);

    requestAnimationFrame(() => {
      if (inputEl) {
        inputEl.setSelectionRange(cursorPos, cursorPos);
      }
    });
  };

  const handleBackspaceBit = () => {
    setInputTape((prev) => prev.slice(0, -1));
    handleReset();
  };

  // Export JSON specification of the Moore Machine
  const handleExportJSON = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(currentMachine, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `${currentMachine.id}_moore_spec.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="flex flex-col h-full bg-slate-950 text-slate-100 font-sans overflow-hidden select-none">
      {/* ────────────────────────────────────────────────────────────────── */}
      {/* 1. IDE TOP HEADER BANNER                                           */}
      {/* ────────────────────────────────────────────────────────────────── */}
      <div className="bg-slate-900 border-b border-slate-800 px-4 py-2.5 flex items-center justify-between shadow-md shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-600/20 border border-indigo-500/30 rounded-xl text-indigo-400">
            <Cpu className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-white font-sans">{currentMachine.name}</h1>
              <span className="text-[10px] font-mono font-semibold px-2 py-0.5 bg-indigo-950 border border-indigo-500/40 text-indigo-300 rounded-full">
                Moore FSM Laboratory
              </span>
            </div>
            <p className="text-xs text-slate-400 font-sans line-clamp-1">{currentMachine.description}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 px-3 py-1 rounded-xl text-xs font-mono">
            <span className="text-slate-400">Σ: [{currentMachine.inputAlphabet.join(', ')}]</span>
            <span className="text-slate-600">|</span>
            <span className="text-slate-400">Δ: [{currentMachine.outputAlphabet.join(', ')}]</span>
            <span className="text-slate-600">|</span>
            <span className="text-indigo-400 font-bold">q₀: {currentMachine.startState}</span>
          </div>

          <button
            onClick={handleExportJSON}
            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-md shadow-indigo-600/30 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" /> Export Spec
          </button>
        </div>
      </div>

      {/* ────────────────────────────────────────────────────────────────── */}
      {/* 2. MAIN THREE-COLUMN IDE WORKSPACE                                 */}
      {/* ────────────────────────────────────────────────────────────────── */}
      <div className="flex-1 flex overflow-hidden p-3 gap-3">
        {/* ── LEFT PANEL: SIMULATION CONTROLS & VALIDATOR ── */}
        <div className="w-72 bg-slate-900/90 border border-slate-800/80 rounded-2xl p-4 flex flex-col gap-4 shrink-0 shadow-lg overflow-y-auto custom-scrollbar">
          {/* 1. Preset Machine Selector */}
          <div className="space-y-1.5 relative">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 font-sans">
                <Layers className="w-3.5 h-3.5 text-indigo-400" /> Preset Machine
              </label>
              <span className="text-[9.5px] text-purple-400 font-mono font-bold">Type to Filter</span>
            </div>

            <div className="relative">
              <input
                type="text"
                value={presetSearchQuery}
                onFocus={(e) => {
                  setIsDropdownOpen(true);
                  e.target.select();
                }}
                onChange={handlePresetSearchChange}
                placeholder={`Active: ${currentMachine.name}`}
                className="w-full pl-8 pr-7 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs font-bold text-indigo-300 focus:outline-none focus:border-indigo-500 placeholder-slate-400"
              />
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
              {presetSearchQuery && (
                <button
                  onClick={() => {
                    setPresetSearchQuery('');
                    setIsDropdownOpen(false);
                  }}
                  className="absolute right-2 top-2 text-slate-500 hover:text-slate-200"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {isDropdownOpen && (
              <div className="absolute left-0 right-0 top-full mt-1 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl p-1.5 z-50 max-h-64 overflow-y-auto space-y-2 text-xs font-sans">
                {categorizedPresets.map((group) => {
                  if (group.items.length === 0) return null;
                  return (
                    <div key={group.category} className="space-y-1">
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 pt-1">
                        {group.category}
                      </div>
                      {group.items.map((m) => (
                        <button
                          key={m.id}
                          onClick={() => {
                            setCurrentMachine(m);
                            setPresetSearchQuery('');
                            setIsDropdownOpen(false);
                            handleReset();
                          }}
                          className={`w-full px-2.5 py-1.5 text-left rounded-lg transition flex flex-col font-medium cursor-pointer ${
                            currentMachine.id === m.id
                              ? 'bg-indigo-600 text-white font-bold'
                              : 'text-slate-200 hover:bg-slate-800'
                          }`}
                        >
                          <span className="text-xs font-bold">{m.name}</span>
                          <span className="text-[9.5px] opacity-80 line-clamp-1">{m.description}</span>
                        </button>
                      ))}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* 2. Input Tape Card */}
          <div className="space-y-2.5 p-3.5 bg-slate-950/80 rounded-xl border border-slate-800/80">
            <div className="flex justify-between items-center text-xs">
              <label className="font-bold text-slate-300 flex items-center gap-1.5 font-sans">
                <Activity className="w-3.5 h-3.5 text-indigo-400" /> Input Tape
              </label>
              <span className="text-[10px] text-slate-500 font-mono">{inputTape.length} Bits</span>
            </div>

            {/* Editable Input Box */}
            <div className="relative flex items-center">
              <input
                type="text"
                value={inputTape}
                onFocus={(e) => e.target.select()}
                onChange={handleInputTapeChange}
                className="w-full pl-3 pr-7 py-2 bg-slate-900 border border-slate-800 rounded-xl text-sm font-mono text-indigo-300 focus:outline-none focus:border-indigo-500 font-bold tracking-widest"
                placeholder={`Valid: ${currentMachine.inputAlphabet.join(', ')}`}
              />
              {inputTape.length > 0 && (
                <button
                  onClick={() => {
                    setInputTape('');
                    handleReset();
                  }}
                  className="absolute right-2 text-xs text-slate-500 hover:text-rose-400 font-bold px-1.5 py-0.5 rounded hover:bg-slate-800 transition cursor-pointer"
                  title="Clear Tape"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Interactive Bit-by-Bit Cell Editor Bar */}
            {inputTape.length > 0 && (
              <div className="space-y-1 pt-0.5">
                <span className="text-[10px] font-bold text-slate-400 font-sans block">
                  Click any cell to edit or cycle symbol:
                </span>
                <div className="flex items-center gap-1 overflow-x-auto p-1.5 bg-slate-900 border border-slate-800 rounded-xl custom-scrollbar">
                  {inputTape.split('').map((char, index) => (
                    <button
                      key={index}
                      onClick={() => handleToggleBit(index)}
                      className={`w-7 h-7 shrink-0 rounded-lg flex flex-col items-center justify-center font-mono font-bold text-xs border transition cursor-pointer relative group ${
                        index === currentStepIndex - 1
                          ? 'bg-indigo-600 border-indigo-400 text-white shadow-md shadow-indigo-600/40 ring-2 ring-indigo-400/50 scale-105'
                          : 'bg-slate-950 border-slate-800 text-indigo-300 hover:border-indigo-500 hover:bg-slate-900'
                      }`}
                      title={`Bit #${index + 1}: '${char}' (Click to cycle symbol)`}
                    >
                      <span>{char}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Dynamic Symbol Append Toolbar */}
            <div className="flex items-center gap-1.5 flex-wrap pt-1 font-mono text-[10.5px]">
              {currentMachine.inputAlphabet.map((sym) => (
                <button
                  key={sym}
                  onClick={() => handleAppendBit(sym)}
                  className="px-2.5 py-1 bg-slate-900 hover:bg-indigo-950 border border-slate-800 hover:border-indigo-500/50 text-indigo-300 rounded-lg font-bold transition cursor-pointer"
                >
                  +{sym}
                </button>
              ))}

              <button
                onClick={handleBackspaceBit}
                className="px-2.5 py-1 bg-slate-900 hover:bg-rose-950 border border-slate-800 hover:border-rose-500/50 text-slate-400 hover:text-rose-300 rounded-lg font-bold transition cursor-pointer ml-auto flex items-center gap-1"
                title="Delete Last Symbol"
              >
                ⌫ Del
              </button>
            </div>
          </div>

          {/* 3. Playback Controls Card */}
          <div className="space-y-3 p-3.5 bg-slate-950/80 rounded-xl border border-slate-800/80">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-300 font-sans">Simulation Controls</span>
              <span className="font-mono text-[10.5px] text-indigo-400 font-bold">
                Cycle {currentStepIndex} / {simulationResult.steps.length}
              </span>
            </div>

            <div className="flex items-center justify-center gap-2">
              <button
                onClick={handleReset}
                className="p-2 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-xl border border-slate-800 transition cursor-pointer"
                title="Reset Simulation"
              >
                <RotateCcw className="w-4 h-4" />
              </button>

              <button
                onClick={() => setCurrentStepIndex((prev) => Math.max(0, prev - 1))}
                disabled={currentStepIndex === 0}
                className="p-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-slate-300 rounded-xl border border-slate-800 transition cursor-pointer"
                title="Step Backward"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <button
                onClick={() => {
                  if (currentStepIndex >= simulationResult.steps.length) {
                    setCurrentStepIndex(0);
                  }
                  setIsPlaying(!isPlaying);
                }}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold flex items-center gap-1.5 shadow-lg shadow-indigo-600/40 transition cursor-pointer text-xs"
              >
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                {isPlaying ? 'Pause' : 'Play'}
              </button>

              <button
                onClick={() => setCurrentStepIndex((prev) => Math.min(simulationResult.steps.length, prev + 1))}
                disabled={currentStepIndex >= simulationResult.steps.length}
                className="p-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-slate-300 rounded-xl border border-slate-800 transition cursor-pointer"
                title="Step Forward"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Speed Control Slider */}
            <div className="space-y-1 pt-1">
              <div className="flex justify-between items-center text-[10px] text-slate-400 font-sans">
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3 text-slate-500" /> Speed
                </span>
                <span className="font-mono font-bold text-indigo-400">{speedMultiplier}x</span>
              </div>
              <input
                type="range"
                min="0.5"
                max="4"
                step="0.5"
                value={speedMultiplier}
                onChange={(e) => setSpeedMultiplier(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
              />
            </div>
          </div>

          {/* 4. Machine Health & Diagnostics */}
          <div className="space-y-2 p-3 bg-slate-950/90 rounded-xl border border-slate-800">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-300 flex items-center gap-1.5 font-sans">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> Machine Validator
              </span>
              <span
                className={`px-2 py-0.5 rounded-md text-[10px] font-bold font-mono ${
                  validationReport.isValid
                    ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/30'
                    : 'bg-rose-950 text-rose-400 border border-rose-500/30'
                }`}
              >
                {validationReport.isValid ? 'Valid' : 'Issues Detected'}
              </span>
            </div>

            <div className="space-y-1.5 text-[11px] text-slate-400 font-sans">
              <div className="flex items-start gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                <span>Deterministic Transition Function</span>
              </div>

              <div className="flex items-start gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                <span>
                  State Output Function (λ: Q ➔ Δ) Complete
                </span>
              </div>

              <div className="flex items-start gap-1.5">
                {validationReport.unreachableStates.length === 0 ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                )}
                <span>
                  {validationReport.unreachableStates.length === 0
                    ? 'All States Reachable from q0'
                    : `${validationReport.unreachableStates.length} Unreachable State(s)`}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ── CENTER PANEL: MACHINE CANVAS & SIMULATION WORKSPACE ── */}
        <div className="flex-1 bg-slate-900/90 border border-slate-800/80 rounded-2xl flex flex-col overflow-hidden shadow-lg">
          {/* Workspace Tabs & Live Status Bar */}
          <div className="bg-slate-950 border-b border-slate-800 px-4 py-2.5 flex items-center justify-between shrink-0 font-sans text-xs">
            <div className="flex items-center gap-1.5 bg-slate-900 p-1 rounded-xl border border-slate-800">
              <button
                onClick={() => setActiveCenterTab('canvas')}
                className={`px-3 py-1 rounded-lg font-bold transition cursor-pointer flex items-center gap-1.5 ${
                  activeCenterTab === 'canvas'
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Layers className="w-3.5 h-3.5" /> Machine Canvas
              </button>
              <button
                onClick={() => setActiveCenterTab('tables')}
                className={`px-3 py-1 rounded-lg font-bold transition cursor-pointer flex items-center gap-1.5 ${
                  activeCenterTab === 'tables'
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <TableIcon className="w-3.5 h-3.5" /> Transition Table
              </button>
              <button
                onClick={() => setActiveCenterTab('conversion')}
                className={`px-3 py-1 rounded-lg font-bold transition cursor-pointer flex items-center gap-1.5 ${
                  activeCenterTab === 'conversion'
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <RefreshCwIcon className="w-3.5 h-3.5" /> Moore ➔ Mealy Lab
              </button>
            </div>

            {/* Live State & Simulation Tape Banner */}
            <div className="flex items-center gap-3">
              {currentStepIndex === simulationResult.steps.length && inputTape.length > 0 && (
                <div
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-extrabold shadow-lg animate-pulse ${
                    simulationResult.isAccepted
                      ? 'bg-emerald-950/90 border border-emerald-500/50 text-emerald-300 shadow-emerald-950/50'
                      : 'bg-rose-950/90 border border-rose-500/50 text-rose-300 shadow-rose-950/50'
                  }`}
                >
                  {simulationResult.isAccepted ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      <span>STRING ACCEPTED</span>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="w-4 h-4 text-rose-400" />
                      <span>STRING REJECTED</span>
                    </>
                  )}
                </div>
              )}

              <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 px-3 py-1 rounded-xl text-xs font-mono">
                <span className="text-slate-400">Current State:</span>
                <span className="text-indigo-400 font-bold">{currentStateId}</span>
                <span className="text-slate-600">|</span>
                <span className="text-slate-400">State Output:</span>
                <span className="text-emerald-400 font-bold">
                  {currentMachine.stateOutputs[currentStateId] || '0'}
                </span>
              </div>
            </div>
          </div>

          {/* Main Workspace Body */}
          <div className="flex-1 relative overflow-hidden bg-slate-950/40">
            {activeCenterTab === 'canvas' && (
              <div className="w-full h-full relative">
                <AutomataCanvas
                  customGraph={mooreGraph}
                  customActiveStateIds={new Set([currentStateId])}
                  customActiveEdgeIds={activeTransitionId ? new Set([activeTransitionId]) : new Set()}
                  onNodePositionChange={(stateId, x, y) => {
                    setNodePositions((prev) => ({
                      ...prev,
                      [stateId]: { x, y },
                    }));
                  }}
                />

                {/* Simulation Output Tape Overlay at Top Right of Canvas */}
                <div className="absolute top-4 right-4 bg-slate-900/90 border border-slate-800 p-2.5 rounded-xl shadow-2xl backdrop-blur-md font-mono text-xs max-w-md">
                  <div className="flex items-center justify-between gap-4 mb-1 text-[10px] text-slate-400 font-sans">
                    <span className="font-bold text-indigo-400 uppercase tracking-wider">Accumulated Output Tape</span>
                    <span>{simulationResult.outputTape.length} Symbols</span>
                  </div>

                  <div className="flex items-center gap-1 overflow-x-auto custom-scrollbar p-1 bg-slate-950 rounded-lg border border-slate-800">
                    <span className="text-slate-500 font-sans text-[10px] px-1">λ(q₀)={simulationResult.initialOutput}</span>
                    {simulationResult.outputTape.split('').map((char, i) => (
                      <span
                        key={i}
                        className={`w-6 h-6 shrink-0 flex items-center justify-center rounded font-bold ${
                          i === currentStepIndex
                            ? 'bg-emerald-600 text-white font-extrabold ring-2 ring-emerald-400'
                            : i < currentStepIndex
                            ? 'bg-emerald-950 text-emerald-300 border border-emerald-800/60'
                            : 'bg-slate-900 text-slate-500 border border-slate-800'
                        }`}
                      >
                        {char}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeCenterTab === 'tables' && (
              <div className="w-full h-full p-6 overflow-y-auto space-y-6 custom-scrollbar text-xs font-sans">
                {/* 1. Formal Transition Function Grid δ: Q × Σ ➔ Q */}
                <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl space-y-3">
                  <div className="flex justify-between items-center">
                    <h3 className="font-bold text-sm text-indigo-300 flex items-center gap-2">
                      <TableIcon className="w-4 h-4 text-indigo-400" /> Transition Table δ(q, x) & State Output λ(q)
                    </h3>
                    <span className="text-slate-400 text-[11px] font-mono">
                      Output is mapped directly to States λ(q)
                    </span>
                  </div>

                  <div className="overflow-x-auto border border-slate-800 rounded-xl">
                    <table className="w-full text-left border-collapse">
                      <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 font-mono text-[11px]">
                        <tr>
                          <th className="p-3 border-r border-slate-800">State (q)</th>
                          <th className="p-3 border-r border-slate-800">State Output λ(q)</th>
                          {currentMachine.inputAlphabet.map((sym) => (
                            <th key={sym} className="p-3 text-center border-r border-slate-800">
                              Input '{sym}'
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60 font-mono">
                        {currentMachine.states.map((state) => {
                          const isCurrent = state === currentStateId;
                          const stateOut = currentMachine.stateOutputs[state] || '0';
                          return (
                            <tr
                              key={state}
                              className={`transition ${
                                isCurrent ? 'bg-indigo-950/70 text-indigo-200 font-bold' : 'hover:bg-slate-800/40 text-slate-300'
                              }`}
                            >
                              <td className="p-3 border-r border-slate-800 flex items-center gap-2">
                                <span className="font-bold">{state}</span>
                                {state === currentMachine.startState && (
                                  <span className="text-[9px] px-1.5 py-0.5 bg-indigo-900 text-indigo-300 rounded font-sans">
                                    Start
                                  </span>
                                )}
                              </td>

                              <td className="p-3 border-r border-slate-800 font-bold text-emerald-400">
                                {stateOut}
                              </td>

                              {currentMachine.inputAlphabet.map((sym) => {
                                const trans = currentMachine.transitions.find(
                                  (t) => t.from === state && t.inputSymbol === sym
                                );
                                return (
                                  <td key={sym} className="p-3 text-center border-r border-slate-800">
                                    {trans ? (
                                      <span className="text-purple-300 font-bold">{trans.to}</span>
                                    ) : (
                                      <span className="text-slate-600">—</span>
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
              </div>
            )}

            {activeCenterTab === 'conversion' && (
              <div className="w-full h-full p-4 overflow-y-auto space-y-4 custom-scrollbar text-xs font-sans">
                {/* Moore to Mealy Conversion Header & Stepper Controls */}
                <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl space-y-3 shadow-xl">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div>
                      <h3 className="font-bold text-sm text-indigo-300">Moore ➔ Mealy Conversion Stepper</h3>
                      <p className="text-slate-400 text-[11px]">
                        Convert state-output Moore machine into an equivalent edge-output Mealy machine (Same state count: {conversionResult.equivalentMealy.states.length} states).
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setConversionStep((prev) => Math.max(0, prev - 1))}
                        disabled={conversionStep === 0}
                        className="px-3 py-1.5 bg-slate-950 hover:bg-slate-800 disabled:opacity-40 text-slate-300 rounded-xl border border-slate-800 font-bold transition cursor-pointer"
                      >
                        Prev
                      </button>
                      <button
                        onClick={() => setIsConversionPlaying(!isConversionPlaying)}
                        className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold shadow-md transition cursor-pointer"
                      >
                        {isConversionPlaying ? 'Pause' : 'Auto Play'}
                      </button>
                      <button
                        onClick={() => setConversionStep((prev) => Math.min(totalConversionSteps - 1, prev + 1))}
                        disabled={conversionStep >= totalConversionSteps - 1}
                        className="px-3 py-1.5 bg-slate-950 hover:bg-slate-800 disabled:opacity-40 text-slate-300 rounded-xl border border-slate-800 font-bold transition cursor-pointer"
                      >
                        Next
                      </button>
                    </div>
                  </div>

                  {/* Active Step Rule Card */}
                  {currentConversionExplanation && (
                    <div className="p-3 bg-slate-950 border border-indigo-500/40 rounded-xl space-y-1 font-mono">
                      <div className="flex justify-between items-center text-xs font-bold">
                        <span className="text-indigo-300">Rule #{conversionStep + 1} / {totalConversionSteps}: {currentConversionExplanation.title}</span>
                        <span className="text-emerald-400 font-extrabold">Assigned Output: '{currentConversionExplanation.assignedMealyOutput}'</span>
                      </div>
                      <p className="text-slate-400 text-[11.5px] font-sans">{currentConversionExplanation.description}</p>
                    </div>
                  )}
                </div>

                {/* Side-by-Side Animated Dual Canvases */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 h-80">
                  <div className="bg-slate-900 border border-slate-800 rounded-xl p-2.5 flex flex-col shadow-lg">
                    <div className="flex justify-between items-center mb-1.5 font-mono text-[11px]">
                      <span className="font-bold text-indigo-400">1. Original Moore Graph (State Output)</span>
                      <span className="text-slate-400 text-[10px]">q / λ(q)</span>
                    </div>
                    <div className="flex-1 relative overflow-hidden rounded-lg">
                      <AutomataCanvas
                        customGraph={mooreGraph}
                        customActiveStateIds={activeMooreStateIds}
                        customActiveEdgeIds={activeMooreEdgeIds}
                        hideToolbar
                      />
                    </div>
                  </div>

                  <div className="bg-slate-900 border border-slate-800 rounded-xl p-2.5 flex flex-col shadow-lg">
                    <div className="flex justify-between items-center mb-1.5 font-mono text-[11px] flex-wrap gap-1">
                      <span className="font-bold text-emerald-400">2. Equivalent Mealy Graph (Edge Output)</span>
                      <div className="flex items-center gap-1 bg-slate-950 p-0.5 rounded-lg border border-slate-800 text-[10px]">
                        <button
                          onClick={() => setUseMinimizedMealy(true)}
                          className={`px-2 py-0.5 rounded font-bold transition cursor-pointer ${
                            useMinimizedMealy ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
                          }`}
                          title="Optimal Minimized Mealy Machine (Same as Preset Mealy Machine)"
                        >
                          Minimized ({conversionResult.equivalentMealy.states.length} States)
                        </button>
                        <button
                          onClick={() => setUseMinimizedMealy(false)}
                          className={`px-2 py-0.5 rounded font-bold transition cursor-pointer ${
                            !useMinimizedMealy ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
                          }`}
                          title="Raw Unminimized Converted Mealy Machine"
                        >
                          Raw ({conversionResult.rawEquivalentMealy.states.length} States)
                        </button>
                      </div>
                    </div>
                    <div className="flex-1 relative overflow-hidden rounded-lg">
                      <AutomataCanvas
                        customGraph={mealyGraph}
                        customActiveEdgeIds={activeMealyEdgeIds}
                        hideToolbar
                      />
                    </div>
                  </div>
                </div>

                {/* All Conversion Step Rules Summary */}
                <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-[11px] font-bold text-purple-400 uppercase tracking-wider block font-sans">
                      All Edge-Output Conversion Rules [{totalConversionSteps} Rules]
                    </span>
                    <span className="text-[10px] font-mono text-indigo-300">λ'(q, x) = λ_Moore(δ(q, x))</span>
                  </div>

                  <div className="space-y-1.5 max-h-40 overflow-y-auto custom-scrollbar font-mono text-xs">
                    {conversionResult.explanationSteps.map((step, idx) => (
                      <button
                        key={idx}
                        onClick={() => {
                          setConversionStep(idx);
                          setIsConversionPlaying(false);
                        }}
                        className={`w-full p-2 rounded-xl text-left border transition cursor-pointer ${
                          idx === conversionStep
                            ? 'bg-indigo-950/80 border-indigo-500 text-indigo-200 font-bold'
                            : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex justify-between items-center text-[11px]">
                          <span>{step.title}</span>
                          <span className="text-emerald-400 font-bold">λ'({step.mooreTransition.split('-->')[0].trim()}, {step.mooreTransition.split('--')[1]}) = '{step.assignedMealyOutput}'</span>
                        </div>
                      </button>
                    ))}
                  </div>

                  {/* Educational Minimization Card */}
                  <div className="p-3 bg-indigo-950/40 border border-indigo-500/30 rounded-xl space-y-1 font-sans">
                    <div className="flex items-center gap-1.5 font-bold text-xs text-indigo-300">
                      <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Why 4 States vs. 3 States? (State Minimization)
                    </div>
                    <p className="text-slate-300 text-[11px] leading-relaxed">
                      Converting a Moore machine to Mealy preserves the state count (<strong>4 states ➔ 4 states</strong>). In the converted Mealy machine, state <code className="text-purple-300">q3</code> behaves identically to <code className="text-purple-300">q1</code> for all input symbols. Merging state <code className="text-purple-300">q3</code> into <code className="text-purple-300">q1</code> yields the optimal <strong>3-state Mealy Machine</strong>!
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Simulation Output Tape Bar at Bottom of Center Workspace */}
          <div className="bg-slate-950 border-t border-slate-800 px-4 py-2.5 flex items-center justify-between shrink-0 font-mono text-xs">
            <div className="flex items-center gap-3">
              <span className="text-slate-400 font-sans text-[11px]">Output Sequence (Δ*):</span>
              <span className="text-emerald-400 font-bold tracking-widest text-sm bg-slate-900 px-3 py-1 rounded-xl border border-slate-800">
                {simulationResult.outputTape || '—'}
              </span>
            </div>

            <div className="flex items-center gap-4 text-[11px] font-sans text-slate-400">
              <span>
                Sequence Matches ('1'): <strong className="text-indigo-400 font-mono">{simulationResult.sequenceMatchCount}</strong>
              </span>
              <span>
                Consumed Input: <strong className="text-sky-400 font-mono">{simulationResult.steps.length} / {inputTape.length}</strong>
              </span>
            </div>
          </div>
        </div>

        {/* ── RIGHT PANEL: MACHINE INSPECTOR & FORMAL 6-TUPLE ── */}
        <div className="w-80 bg-slate-900/90 border border-slate-800/80 rounded-2xl p-4 flex flex-col gap-4 shrink-0 shadow-lg overflow-y-auto custom-scrollbar font-sans">
          <div className="flex items-center justify-between">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 text-indigo-400" /> Machine Inspector
            </label>
            <span className="text-[10px] px-2 py-0.5 bg-indigo-950 border border-indigo-500/40 text-indigo-300 font-mono font-bold rounded-full">
              FSM Specs
            </span>
          </div>

          <div className="space-y-3.5">
            {/* 1. Formal Definition Card */}
            <div className="p-3.5 bg-slate-950/80 border border-slate-800 rounded-xl space-y-2.5">
              <span className="text-[11px] font-bold text-purple-400 uppercase tracking-wider block font-sans">
                1. Formal Definition M = (Q, Σ, Δ, δ, λ, q₀)
              </span>

              <div className="space-y-1 font-mono text-xs">
                <button
                  onClick={() => setHighlightedComponent(highlightedComponent === 'Q' ? null : 'Q')}
                  className={`w-full p-1.5 rounded-lg text-left transition flex justify-between items-center cursor-pointer ${
                    highlightedComponent === 'Q' ? 'bg-indigo-950 border border-indigo-500 text-indigo-200 font-bold' : 'hover:bg-slate-900'
                  }`}
                >
                  <span>Q (States):</span>
                  <span className="text-indigo-400 font-bold">&#123; {currentMachine.states.join(', ')} &#125;</span>
                </button>

                <div className="p-1.5 flex justify-between items-center text-slate-300">
                  <span>Σ (Input Alphabet):</span>
                  <span className="text-sky-400 font-bold">[{currentMachine.inputAlphabet.join(', ')}]</span>
                </div>

                <div className="p-1.5 flex justify-between items-center text-slate-300">
                  <span>Δ (Output Alphabet):</span>
                  <span className="text-emerald-400 font-bold">[{currentMachine.outputAlphabet.join(', ')}]</span>
                </div>

                <button
                  onClick={() => {
                    setHighlightedComponent(highlightedComponent === 'delta' ? null : 'delta');
                    setActiveCenterTab('tables');
                  }}
                  className={`w-full p-1.5 rounded-lg text-left transition flex justify-between items-center cursor-pointer ${
                    highlightedComponent === 'delta' ? 'bg-purple-950 border border-purple-500 text-purple-200 font-bold' : 'hover:bg-slate-900'
                  }`}
                >
                  <span>δ (Transition Mapping):</span>
                  <span className="text-purple-300 font-bold">{currentMachine.transitions.length} Rules</span>
                </button>

                <button
                  onClick={() => setHighlightedComponent(highlightedComponent === 'lambda' ? null : 'lambda')}
                  className={`w-full p-1.5 rounded-lg text-left transition flex justify-between items-center cursor-pointer ${
                    highlightedComponent === 'lambda' ? 'bg-amber-950 border border-amber-500 text-amber-200 font-bold' : 'hover:bg-slate-900'
                  }`}
                >
                  <span>λ (State Output Function):</span>
                  <span className="text-amber-400 font-bold">λ: Q ➔ Δ</span>
                </button>

                <div className="p-1.5 flex justify-between items-center text-slate-300">
                  <span>q₀ (Start State):</span>
                  <span className="text-indigo-300 font-bold">{currentMachine.startState}</span>
                </div>
              </div>
            </div>

            {/* 2. Machine Statistics Card */}
            <div className="p-3.5 bg-slate-950/80 border border-slate-800 rounded-xl space-y-2">
              <span className="text-[11px] font-bold text-sky-400 uppercase tracking-wider block font-sans">
                2. Machine Statistics & Coverage
              </span>

              <div className="grid grid-cols-2 gap-2 text-center font-mono">
                <div className="p-2 bg-slate-900 rounded-lg border border-slate-800">
                  <span className="text-[9px] text-slate-400 block font-sans">Total States</span>
                  <span className="text-sm font-bold text-indigo-300">{currentMachine.states.length}</span>
                </div>
                <div className="p-2 bg-slate-900 rounded-lg border border-slate-800">
                  <span className="text-[9px] text-slate-400 block font-sans">Transitions</span>
                  <span className="text-sm font-bold text-purple-300">{currentMachine.transitions.length}</span>
                </div>
                <div className="p-2 bg-slate-900 rounded-lg border border-slate-800">
                  <span className="text-[9px] text-slate-400 block font-sans">Visited States</span>
                  <span className="text-sm font-bold text-emerald-400">
                    {simulationResult.visitedStates.size}/{currentMachine.states.length}
                  </span>
                </div>
                <div className="p-2 bg-slate-900 rounded-lg border border-slate-800">
                  <span className="text-[9px] text-slate-400 block font-sans">Coverage</span>
                  <span className="text-sm font-bold text-amber-400">
                    {Math.round((simulationResult.visitedTransitions.size / Math.max(1, currentMachine.transitions.length)) * 100)}%
                  </span>
                </div>
              </div>
            </div>

            {/* 3. Moore Machine Summary Card */}
            <div className="p-3.5 bg-slate-950/80 border border-slate-800 rounded-xl space-y-2 text-xs font-mono">
              <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider block font-sans">
                3. Machine Summary
              </span>

              <div className="space-y-1.5 text-[11px] text-slate-300">
                <div className="flex justify-between">
                  <span>Input Alphabet (Σ):</span>
                  <span className="text-sky-300 font-bold">[{currentMachine.inputAlphabet.join(', ')}]</span>
                </div>
                <div className="flex justify-between">
                  <span>Output Alphabet (Δ):</span>
                  <span className="text-amber-300 font-bold">[{currentMachine.outputAlphabet.join(', ')}]</span>
                </div>
                <div className="flex justify-between">
                  <span>Start State (q₀):</span>
                  <span className="text-indigo-300 font-bold">{currentMachine.startState}</span>
                </div>
                <div className="flex justify-between">
                  <span>Current State (q):</span>
                  <span className="text-emerald-400 font-bold">{currentStateId}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
