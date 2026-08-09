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
  type MealyMachine,
  type MealySimulationStep,
  PRESET_MEALY_MACHINES,
  simulateMealyMachine,
  validateMealyMachine,
  convertMealyToMoore,
  convertMooreToAutomatonGraph,
} from '../../algorithms/mealyEngine';
import { downloadFile, generateAcademicPDFReport } from '../../utils/exportUtils';
import { AutomataCanvas } from '../canvas/AutomataCanvas';
import { useAutomata } from '../../context/AutomataContext';
import type { AutomatonGraph } from '../../types/automata';


export const MealyMachineWorkspace: React.FC = () => {
  const { graph, setGraph } = useAutomata();

  // ── State Management ──────────────────────────────────────────────────────────
  const [currentMachine, setCurrentMachine] = useState<MealyMachine>(PRESET_MEALY_MACHINES[0]);
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

  // Search & Filter State for Presets (Allows Typing!)
  const [presetSearchQuery, setPresetSearchQuery] = useState<string>('');
  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);



  // Convert Mealy Machine to AutomatonGraph for ReactFlow AutomataCanvas
  const mealyGraph: AutomatonGraph = useMemo(() => {
    const total = currentMachine.states.length;
    return {
      id: currentMachine.id,
      name: currentMachine.name,
      type: 'DFA',
      alphabet: currentMachine.inputAlphabet,
      states: currentMachine.states.map((s, idx) => {
        const customPos = nodePositions[s];
        const angle = (idx / total) * 2 * Math.PI - Math.PI / 2;
        const defaultX = 240 + 160 * Math.cos(angle);
        const defaultY = 150 + 100 * Math.sin(angle);
        return {
          id: s,
          label: s,
          isStart: s === currentMachine.startState,
          isAccept: false,
          x: customPos ? customPos.x : defaultX,
          y: customPos ? customPos.y : defaultY,
        };
      }),
      transitions: currentMachine.transitions.map((t) => ({
        id: t.id,
        source: t.from,
        target: t.to,
        symbols: [`${t.inputSymbol} / ${t.outputSymbol}`],
      })),
      description: currentMachine.description,
    };
  }, [currentMachine, nodePositions]);

  // Categorized Presets Filtered by Typing Query
  const filteredPresets = useMemo(() => {
    const query = presetSearchQuery.toLowerCase().trim();
    if (!query) return PRESET_MEALY_MACHINES;
    return PRESET_MEALY_MACHINES.filter(
      (m) => m.name.toLowerCase().includes(query) || m.description.toLowerCase().includes(query) || m.id.toLowerCase().includes(query)
    );
  }, [presetSearchQuery]);

  // Categorized Groups
  const categorizedPresets = useMemo(() => {
    const sequenceDetectors = filteredPresets.filter((m) => m.id.startsWith('seq_'));
    const digitalLogic = filteredPresets.filter((m) =>
      ['even_parity', 'odd_parity', 'parity_checker', 'bit_complementer', 'binary_incrementer', 'binary_decrementer', 'serial_adder', 'serial_subtractor', 'magnitude_comparator'].includes(m.id)
    );
    const controllers = filteredPresets.filter((m) =>
      ['traffic_light', 'pedestrian_crossing', 'elevator_controller', 'vending_machine', 'door_lock', 'atm_pin_verifier', 'washing_machine', 'railway_crossing'].includes(m.id)
    );

    return [
      { category: '🟩 Sequence Detectors', items: sequenceDetectors },
      { category: '🟨 Digital Logic & Arithmetic', items: digitalLogic },
      { category: '🟧 Controllers & Embedded Systems', items: controllers },
    ];
  }, [filteredPresets]);

  // Inspector & Selection States
  const [selectedStateId, setSelectedStateId] = useState<string | null>(null);
  const [highlightedComponent, setHighlightedComponent] = useState<'Q' | 'Sigma' | 'Delta' | 'delta' | 'lambda' | 'q0' | null>(null);

  // Streamlined Center Tabs ('canvas' | 'tables' | 'conversion')
  const [activeCenterTab, setActiveCenterTab] = useState<'canvas' | 'tables' | 'conversion'>('canvas');

  // Export menu toggle state
  const [showExportMenu, setShowExportMenu] = useState<boolean>(false);

  // ── Engine Executions (100% Deterministic) ───────────────────────────────────
  const simulationResult = useMemo(() => {
    return simulateMealyMachine(currentMachine, inputTape);
  }, [currentMachine, inputTape]);

  const validationReport = useMemo(() => {
    return validateMealyMachine(currentMachine);
  }, [currentMachine]);

  const conversionResult = useMemo(() => {
    return convertMealyToMoore(currentMachine);
  }, [currentMachine]);

  // ── Conversion Stepper State & Timer ─────────────────────────────────────────
  const [conversionStep, setConversionStep] = useState<number>(0);
  const [isConversionPlaying, setIsConversionPlaying] = useState<boolean>(false);

  const totalConversionSteps = useMemo(() => {
    return (conversionResult?.explanationSteps?.length || 0) + 2;
  }, [conversionResult]);

  const mooreGraph: AutomatonGraph = useMemo(() => {
    return convertMooreToAutomatonGraph(
      conversionResult.equivalentMoore,
      conversionStep,
      conversionResult.explanationSteps
    );
  }, [conversionResult, conversionStep]);

  const { activeMealyStateIds, activeMooreStateIds } = useMemo(() => {
    const mealySet = new Set<string>();
    const mooreSet = new Set<string>();

    if (conversionStep > 0 && conversionStep <= (conversionResult.explanationSteps?.length || 0)) {
      const stepInfo = conversionResult.explanationSteps[conversionStep - 1];
      if (stepInfo) {
        mealySet.add(stepInfo.mealyState);
        (stepInfo.createdMooreStates || []).forEach((s) => mooreSet.add(s));
      }
    } else if (conversionStep >= (conversionResult.explanationSteps?.length || 0) + 1) {
      (conversionResult.equivalentMoore?.states || []).forEach((s) => mooreSet.add(s));
    }

    return { activeMealyStateIds: mealySet, activeMooreStateIds: mooreSet };
  }, [conversionStep, conversionResult]);

  useEffect(() => {
    setConversionStep(0);
    setIsConversionPlaying(false);
  }, [currentMachine.id]);

  useEffect(() => {
    let timer: any;
    if (isConversionPlaying) {
      if (conversionStep < totalConversionSteps - 1) {
        timer = setTimeout(() => {
          setConversionStep((prev) => prev + 1);
        }, 1600);
      } else {
        setIsConversionPlaying(false);
      }
    }
    return () => clearTimeout(timer);
  }, [isConversionPlaying, conversionStep, totalConversionSteps]);

  const currentStep: MealySimulationStep | null = useMemo(() => {
    if (currentStepIndex === 0) return null;
    return simulationResult.steps[currentStepIndex - 1] || null;
  }, [simulationResult, currentStepIndex]);

  const currentStateId = currentStep ? currentStep.toState : currentMachine.startState;

  // Active highlights on canvas driven by simulation or formal definition inspection
  const activeStateIdsForCanvas = useMemo(() => {
    if (highlightedComponent === 'Q') {
      return new Set(currentMachine.states);
    }
    return new Set([currentStateId]);
  }, [highlightedComponent, currentMachine.states, currentStateId]);

  const activeEdgeIdsForCanvas = useMemo(() => {
    if (highlightedComponent === 'delta' || highlightedComponent === 'lambda') {
      return new Set(currentMachine.transitions.map((t) => t.id));
    }
    return currentStep ? new Set([currentStep.activeTransitionId]) : undefined;
  }, [highlightedComponent, currentMachine.transitions, currentStep]);

  // ── Playback Controls ────────────────────────────────────────────────────────
  useEffect(() => {
    let timer: any;
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

  const handleInvertBits = () => {
    const symbols = currentMachine.inputAlphabet || ['0', '1'];
    setInputTape((prev) =>
      prev
        .split('')
        .map((c) => {
          const idx = symbols.indexOf(c);
          if (idx >= 0) {
            return symbols[(idx + 1) % symbols.length];
          }
          return c === '0' ? '1' : '0';
        })
        .join('')
    );
    handleReset();
  };

  // ── Export Handlers ──────────────────────────────────────────────────────────
  const handleExportJSON = () => {
    downloadFile(JSON.stringify(currentMachine, null, 2), `${currentMachine.id}_spec.json`, 'application/json');
    setShowExportMenu(false);
  };

  const handleExportPNG = () => {
    const svgElement = document.querySelector('#automata-canvas-container svg');
    if (svgElement) {
      const svgData = new XMLSerializer().serializeToString(svgElement);
      const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${currentMachine.id}_graph.svg`;
      link.click();
    }
    setShowExportMenu(false);
  };

  const handleExportPDF = () => {
    generateAcademicPDFReport(mealyGraph, currentMachine.description);
    setShowExportMenu(false);
  };

  return (
    <div className="flex flex-col h-full bg-slate-950 text-slate-100 font-sans overflow-hidden select-none">
      {/* ────────────────────────────────────────────────────────────────── */}
      {/* 1. TOP HEADER BAR WITH TITLE & CONSOLIDATED EXPORT MENU            */}
      {/* ────────────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-5 py-3 bg-slate-900/90 border-b border-slate-800/80 shrink-0 shadow-md">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-600/20 border border-indigo-500/30 rounded-xl">
            <Cpu className="w-5 h-5 text-indigo-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-extrabold text-base text-white tracking-wide">{currentMachine.name}</h1>
              <span className="px-2.5 py-0.5 bg-indigo-950 border border-indigo-500/40 text-indigo-300 rounded-full text-[10px] font-mono font-bold">
                Mealy FSM Laboratory
              </span>
            </div>
            <p className="text-xs text-slate-400 font-medium line-clamp-1">{currentMachine.description}</p>
          </div>
        </div>

        {/* Header Right Status Bar & Consolidated Export Menu */}
        <div className="flex items-center gap-3 font-mono text-xs flex-wrap">
          <div className="flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800 text-[11px]">
            <span className="text-slate-400">Σ: <strong>[{currentMachine.inputAlphabet.join(',')}]</strong></span>
            <span className="text-slate-600">|</span>
            <span className="text-slate-400">Δ: <strong>[{currentMachine.outputAlphabet.join(',')}]</strong></span>
          </div>

          <div className="flex items-center gap-2 bg-indigo-950/80 border border-indigo-500/40 px-3 py-1.5 rounded-xl text-indigo-200 font-bold">
            <span>State:</span>
            <span className="px-2 py-0.5 bg-indigo-600 text-white rounded font-mono text-xs">{currentStateId}</span>
          </div>

          {/* Single Consolidated Export Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowExportMenu(!showExportMenu)}
              className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-md shadow-indigo-600/30"
            >
              <Download className="w-3.5 h-3.5" />
              Export Spec
            </button>

            {showExportMenu && (
              <div className="absolute right-0 mt-2 w-44 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl p-1.5 z-50 space-y-1 text-xs font-sans">
                <button
                  onClick={handleExportJSON}
                  className="w-full px-3 py-2 text-left hover:bg-slate-800 rounded-lg text-slate-200 flex items-center gap-2 font-medium cursor-pointer"
                >
                  <FileJson className="w-3.5 h-3.5 text-purple-400" /> JSON Spec
                </button>
                <button
                  onClick={handleExportPNG}
                  className="w-full px-3 py-2 text-left hover:bg-slate-800 rounded-lg text-slate-200 flex items-center gap-2 font-medium cursor-pointer"
                >
                  <Share2 className="w-3.5 h-3.5 text-sky-400" /> PNG Graph Image
                </button>
                <button
                  onClick={handleExportPDF}
                  className="w-full px-3 py-2 text-left hover:bg-slate-800 rounded-lg text-slate-200 flex items-center gap-2 font-medium cursor-pointer"
                >
                  <FileText className="w-3.5 h-3.5 text-emerald-400" /> PDF Academic Report
                </button>
              </div>
            )}
          </div>
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
                        index === currentStepIndex
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

            {/* Dynamic Quick Edit Bit Action Toolbar */}
            <div className="grid grid-cols-4 gap-1 text-[11px] font-mono font-bold pt-0.5">
              {(currentMachine.inputAlphabet || ['0', '1']).slice(0, 2).map((sym) => (
                <button
                  key={sym}
                  onClick={() => handleAppendBit(sym)}
                  className="py-1 bg-slate-900 hover:bg-slate-800 text-indigo-300 rounded-lg border border-slate-800 transition cursor-pointer"
                  title={`Append symbol '${sym}'`}
                >
                  +{sym}
                </button>
              ))}
              <button
                onClick={handleBackspaceBit}
                disabled={inputTape.length === 0}
                className="py-1 bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-rose-400 rounded-lg border border-slate-800 transition cursor-pointer"
                title="Backspace (Remove last bit)"
              >
                ⌫ Del
              </button>
              <button
                onClick={handleInvertBits}
                disabled={inputTape.length === 0}
                className="py-1 bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-amber-400 rounded-lg border border-slate-800 transition cursor-pointer"
                title="Cycle / Flip symbols"
              >
                Flip
              </button>
            </div>

            {/* 3. Simulation Controls */}
            <div className="grid grid-cols-4 gap-1.5 pt-1 font-mono">
              <button
                onClick={handleReset}
                className="p-2 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-xl border border-slate-800 flex items-center justify-center transition cursor-pointer"
                title="Reset Simulation"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
              <button
                onClick={() => setCurrentStepIndex((prev) => Math.max(0, prev - 1))}
                disabled={currentStepIndex === 0}
                className="p-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-slate-300 rounded-xl border border-slate-800 flex items-center justify-center transition cursor-pointer"
                title="Step Backward"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className={`p-2 rounded-xl flex items-center justify-center transition font-bold cursor-pointer ${
                  isPlaying
                    ? 'bg-amber-600 hover:bg-amber-500 text-white shadow-lg shadow-amber-600/30'
                    : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30'
                }`}
                title={isPlaying ? 'Pause Simulation' : 'Play Simulation'}
              >
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              </button>
              <button
                onClick={() => setCurrentStepIndex((prev) => Math.min(simulationResult.steps.length, prev + 1))}
                disabled={currentStepIndex >= simulationResult.steps.length}
                className="p-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-slate-300 rounded-xl border border-slate-800 flex items-center justify-center transition cursor-pointer"
                title="Step Forward"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Speed Multiplier Slider */}
            <div className="space-y-1 pt-1 text-[11px] font-mono">
              <div className="flex justify-between text-slate-400 font-sans">
                <span>Speed</span>
                <span className="text-indigo-300 font-bold">{speedMultiplier.toFixed(1)}x</span>
              </div>
              <input
                type="range"
                min="0.5"
                max="4.0"
                step="0.5"
                value={speedMultiplier}
                onChange={(e) => setSpeedMultiplier(parseFloat(e.target.value))}
                className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
              />
            </div>
          </div>

          {/* 4. Machine Validator Card */}
          <div className="p-3.5 bg-slate-950/80 rounded-xl border border-slate-800/80 space-y-2 font-sans">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> Machine Validator
              </span>
              <span className="px-2 py-0.5 bg-emerald-950 border border-emerald-500/40 text-emerald-300 text-[10px] font-bold rounded-full">
                Valid
              </span>
            </div>

            <div className="space-y-1.5 text-[11px]">
              <div className="flex items-center gap-2 text-slate-300">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Deterministic Transition Function</span>
              </div>
              <div className="flex items-center gap-2 text-slate-300">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Complete Transition Function (δ: Q × Σ ➔ Q)</span>
              </div>
              <div className="flex items-center gap-2 text-slate-300">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Valid Output Symbols (λ: Q × Σ ➔ Δ)</span>
              </div>
              <div className="flex items-center gap-2 text-slate-300">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Reachability Status (No Unreachable States)</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── CENTER PANEL: SIMULATION WORKSPACE ── */}
        <div className="flex-1 flex flex-col gap-3 min-w-0 overflow-hidden">
          {/* Live Status Bar */}
          <div className="p-3 bg-slate-900/90 border border-slate-800/80 rounded-2xl flex items-center justify-between gap-3 text-xs font-mono shrink-0 shadow-md">
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-1.5">
                <span className="text-slate-400 font-sans">Current State:</span>
                <span className="px-2 py-0.5 bg-indigo-950 border border-indigo-500/40 text-indigo-300 rounded font-bold">
                  {currentStateId}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-slate-400 font-sans">Input:</span>
                <span className="px-2 py-0.5 bg-slate-950 border border-slate-800 text-sky-300 font-bold">
                  {currentStep ? currentStep.inputSymbol : '-'}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-slate-400 font-sans">Output:</span>
                <span className="px-2 py-0.5 bg-amber-950 border border-amber-500/40 text-amber-300 font-bold">
                  {currentStep ? currentStep.outputSymbol : '-'}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-slate-400 font-sans">Transition:</span>
                <span className="text-purple-300 font-bold">
                  {currentStep ? `${currentStep.fromState} --${currentStep.inputSymbol}/${currentStep.outputSymbol}--> ${currentStep.toState}` : 'Ready'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {currentStepIndex === simulationResult.steps.length && inputTape.length > 0 && (
                <div
                  className={`px-2.5 py-1 rounded-xl text-[11px] font-bold font-sans flex items-center gap-1.5 shadow-md ${
                    simulationResult.isAccepted
                      ? 'bg-emerald-950/90 border border-emerald-500/50 text-emerald-300 shadow-emerald-950/40 animate-pulse'
                      : 'bg-rose-950/90 border border-rose-500/50 text-rose-300 shadow-rose-950/40'
                  }`}
                >
                  {simulationResult.isAccepted ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span>STRING ACCEPTED</span>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                      <span>STRING REJECTED</span>
                    </>
                  )}
                </div>
              )}

              <div className="px-3 py-1 bg-slate-950 border border-slate-800 rounded-xl text-slate-300 font-bold text-[11px]">
                Cycle: <span className="text-indigo-400">{currentStepIndex}</span> / {simulationResult.steps.length}
              </div>
            </div>
          </div>

          {/* View Switcher Tabs */}
          <div className="flex items-center justify-between gap-2 px-1 shrink-0">
            <div className="flex items-center gap-1.5 bg-slate-900/90 p-1 rounded-xl border border-slate-800 text-xs font-bold font-sans">
              <button
                onClick={() => setActiveCenterTab('canvas')}
                className={`px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
                  activeCenterTab === 'canvas' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Cpu className="w-3.5 h-3.5" /> Machine Canvas
              </button>
              <button
                onClick={() => setActiveCenterTab('tables')}
                className={`px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
                  activeCenterTab === 'tables' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <TableIcon className="w-3.5 h-3.5" /> Transition Table
              </button>
              <button
                onClick={() => setActiveCenterTab('conversion')}
                className={`px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
                  activeCenterTab === 'conversion' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <RefreshCwIcon className="w-3.5 h-3.5" /> Mealy → Moore Lab
              </button>
            </div>

            {/* Compact Simulation Tape Strip */}
            <div className="flex items-center gap-2 bg-slate-900/90 px-3 py-1.5 rounded-xl border border-slate-800 text-xs font-mono">
              <span className="text-[11px] font-bold text-slate-400 font-sans">Tape:</span>
              <div className="flex items-center gap-1">
                {inputTape.split('').map((char, i) => {
                  const isRead = i < currentStepIndex;
                  const isHead = i === currentStepIndex;
                  return (
                    <button
                      key={i}
                      onClick={() => handleToggleBit(i)}
                      className={`w-6 h-6 rounded flex items-center justify-center font-bold transition text-xs relative ${
                        isHead
                          ? 'bg-indigo-600 text-white ring-2 ring-indigo-400 scale-110'
                          : isRead
                          ? 'bg-slate-800 text-slate-500'
                          : 'bg-slate-950 text-slate-200 border border-slate-800'
                      }`}
                    >
                      {char}
                      {isHead && <span className="absolute -top-3 text-[9px] text-indigo-400">▼</span>}
                    </button>
                  );
                })}
              </div>
              <span className="text-slate-600 mx-1">➔</span>
              <span className="text-emerald-400 font-bold font-mono">
                {simulationResult.outputTape || 'ε'}
              </span>

              {/* Live Acceptance Status Badge on Tape */}
              {currentStepIndex === simulationResult.steps.length && inputTape.length > 0 && (
                <div
                  className={`px-2 py-0.5 rounded-lg text-[10.5px] font-bold font-sans flex items-center gap-1 ml-1 transition ${
                    simulationResult.isAccepted
                      ? 'bg-emerald-950 border border-emerald-500/50 text-emerald-300'
                      : 'bg-rose-950 border border-rose-500/50 text-rose-300'
                  }`}
                >
                  {simulationResult.isAccepted ? (
                    <>
                      <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                      <span>Accepted</span>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="w-3 h-3 text-rose-400 shrink-0" />
                      <span>Rejected</span>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Center Workspace Content */}
          <div className="flex-1 relative overflow-y-auto p-1 min-h-0">
            {/* VIEW 1: MACHINE CANVAS */}
            {activeCenterTab === 'canvas' && (
              <div className="w-full h-full min-h-[460px] bg-slate-950 border border-slate-800/80 rounded-2xl relative overflow-hidden flex flex-col">
                <div className="flex-1 relative w-full h-full min-h-[420px]">
                  <AutomataCanvas
                    customGraph={mealyGraph}
                    selectedStateId={selectedStateId}
                    onSelectState={setSelectedStateId}
                    onNodePositionChange={(id, x, y) =>
                      setNodePositions((prev) => ({ ...prev, [id]: { x, y } }))
                    }
                    customActiveStateIds={activeStateIdsForCanvas}
                    customActiveEdgeIds={activeEdgeIdsForCanvas}
                  />
                </div>
              </div>
            )}

            {/* VIEW 2: TRANSITION TABLE */}
            {activeCenterTab === 'tables' && (
              <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl space-y-3 font-mono text-xs">
                <span className="text-xs font-bold text-indigo-300 uppercase tracking-wider block font-sans">
                  Mealy Transition & Output Mapping δ(q, x) ➔ (q', y)
                </span>
                <div className="overflow-x-auto border border-slate-800 rounded-xl">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-900 text-slate-400 border-b border-slate-800">
                      <tr>
                        <th className="p-2.5 font-bold font-sans">Current State (q)</th>
                        <th className="p-2.5 font-bold font-sans">Input Symbol (x)</th>
                        <th className="p-2.5 font-bold font-sans">Output Symbol (y)</th>
                        <th className="p-2.5 font-bold font-sans">Next State (q')</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {currentMachine.transitions.map((t) => {
                        const isActive = currentStep && currentStep.activeTransitionId === t.id;
                        return (
                          <tr
                            key={t.id}
                            className={`transition ${
                              isActive
                                ? 'bg-indigo-950/80 text-white font-extrabold border-l-4 border-l-indigo-400'
                                : 'hover:bg-slate-900 text-slate-300'
                            }`}
                          >
                            <td className="p-2.5 font-bold text-indigo-300">{t.from}</td>
                            <td className="p-2.5 text-sky-400 font-bold">{t.inputSymbol}</td>
                            <td className="p-2.5 text-amber-400 font-bold">{t.outputSymbol}</td>
                            <td className="p-2.5 text-emerald-400 font-bold">{t.to}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* VIEW 3: MEALY TO MOORE LAB */}
            {activeCenterTab === 'conversion' && (
              <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl space-y-4 font-sans text-xs">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div>
                    <h3 className="font-bold text-sm text-indigo-300">Mealy → Moore Conversion Stepper</h3>
                    <p className="text-slate-400 text-[11px]">Convert edge-output Mealy machine to state-output Moore machine.</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setConversionStep((prev) => Math.max(0, prev - 1))}
                      disabled={conversionStep === 0}
                      className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-slate-300 rounded-xl border border-slate-800 font-bold"
                    >
                      Prev
                    </button>
                    <button
                      onClick={() => setIsConversionPlaying(!isConversionPlaying)}
                      className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold shadow-md"
                    >
                      {isConversionPlaying ? 'Pause' : 'Auto Play'}
                    </button>
                    <button
                      onClick={() => setConversionStep((prev) => Math.min(totalConversionSteps - 1, prev + 1))}
                      disabled={conversionStep >= totalConversionSteps - 1}
                      className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-slate-300 rounded-xl border border-slate-800 font-bold"
                    >
                      Next
                    </button>
                  </div>
                </div>

                {/* Dual Canvases */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 h-80">
                  <div className="bg-slate-900 border border-slate-800 rounded-xl p-2 flex flex-col">
                    <span className="text-[11px] font-bold text-indigo-400 mb-1 font-mono">Original Mealy Graph</span>
                    <div className="flex-1 relative overflow-hidden rounded-lg">
                      <AutomataCanvas
                        customGraph={mealyGraph}
                        customActiveStateIds={activeMealyStateIds}
                        hideToolbar
                      />
                    </div>
                  </div>

                  <div className="bg-slate-900 border border-slate-800 rounded-xl p-2 flex flex-col">
                    <span className="text-[11px] font-bold text-emerald-400 mb-1 font-mono">Equivalent Moore Graph</span>
                    <div className="flex-1 relative overflow-hidden rounded-lg">
                      <AutomataCanvas
                        customGraph={mooreGraph}
                        customActiveStateIds={activeMooreStateIds}
                        hideToolbar
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── RIGHT PANEL: CLEAN MACHINE INSPECTOR ── */}
        <div className="w-80 bg-slate-900/90 border border-slate-800/80 rounded-2xl p-3.5 flex flex-col gap-3.5 shrink-0 shadow-lg overflow-y-auto custom-scrollbar font-sans">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <span className="font-extrabold text-xs text-white uppercase tracking-wider flex items-center gap-1.5 font-sans">
              <Info className="w-4 h-4 text-indigo-400" /> Machine Inspector
            </span>
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
                  <span>λ (Output Function):</span>
                  <span className="text-amber-400 font-bold">λ: Q × Σ ➔ Δ</span>
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

            {/* 3. Mealy Machine Summary Card */}
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
