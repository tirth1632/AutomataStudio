import React, { useState, useMemo, useEffect } from 'react';
import {
  Layers,
  GitCompare,
  Lightbulb,
  Undo2,
  Redo2,
  ChevronDown,
  ChevronRight,
  ShieldCheck,
  Activity,
  Play,
  Eye,
  LayoutGrid,
  Columns,
  Sparkles,
  HelpCircle,
  Cpu,
  BookOpen,
  GraduationCap,
  Compass,
  Key,
  Check,
  Dices,
  BarChart3,
  AlertTriangle,
  Clock,
} from 'lucide-react';
import { useAutomata } from '../../context/AutomataContext';
import { AutomataCanvas } from '../canvas/AutomataCanvas';
import { SavedStatesDropdown } from '../common/SavedStatesDropdown';
import { ALL_AUTOMATA_PROMPTS } from '../../data/allAutomataPrompts';
import type { AutomatonGraph, AutomatonState, AutomatonTransition, AIProvider, APIKeys } from '../../types/automata';
import { graphToDFA, dfaToGraph } from '../../utils/dfaAdapter';
import { DFAOperations } from '../../algorithms/DFAOperations/DFAOperations';
import { WHY_EXPLANATIONS } from '../../utils/dfaEducationalUtils';
import { TrapStateGenerator } from '../../algorithms/AutomataEngine/DFAGenerators/TrapStateGenerator';
import { generateAutomatonFromPrompt } from '../../algorithms/aiAutomatonGenerator';
import { applyDagreLayout } from '../../services/layoutEngine';
import { AnimatedProductConstructionModal } from '../dfa/AnimatedProductConstructionModal';
import { ThreeAutomataArena } from '../dfa/ThreeAutomataArena';
import { WhyExplanationModal } from '../dfa/WhyExplanationModal';
import { DFAComparisonView } from '../dfa/DFAComparisonView';
import { AlgorithmChoiceModal } from '../visualizer/AlgorithmChoiceModal';
import { AlgorithmVisualizerModal } from '../visualizer/AlgorithmVisualizerModal';
import { AIVideoGeneratorModal } from '../video/AIVideoGeneratorModal';
import { DFAInspectorPanel, type InspectorTab } from '../dfa/inspector/DFAInspectorPanel';
import { inspectAutomaton } from '../../utils/dfaInspectorEngine';
import { loadAPIKeys, saveAPIKeys, loadPreferredProvider, savePreferredProvider, fetchAITextExplanation } from '../../services/aiProviders';
import {
  generateProductTrace,
  generateComplementTrace,
  generateEquivalenceTrace,
  generateInclusionTrace,
} from '../../algorithms/visualizerTraces';
import type { AlgorithmTrace } from '../../types/algorithmVisualizer';

interface OperationHistoryItem {
  id: string;
  name: string;
  details: string;
  timestamp: string;
  prevGraph: AutomatonGraph;
  newGraph: AutomatonGraph;
}

export function sanitizeGraphName(name: string): string {
  if (!name) return 'Current DFA';
  const parts = name.split(' [');
  if (parts.length <= 1) return name;
  const primaryName = parts[0].trim();
  const lastOp = parts[parts.length - 1].replace(/\]/g, '').trim();
  return `${primaryName} (${lastOp})`;
}

export const AdvancedDFAView: React.FC = () => {
  const { graph, setGraph, promptInput, setPromptInput, generateFromPrompt } = useAutomata();

  // ── Global Educational Mode & Workspace State ──────────────────────────────
  const [educationalMode, setEducationalMode] = useState<boolean>(() => {
    return localStorage.getItem('educational_mode_enabled') !== 'false';
  });

  const [whyTopic, setWhyTopic] = useState<keyof typeof WHY_EXPLANATIONS | null>(null);

  // Active Center Workspace View: 'canvas' | 'product_anim' | 'counterexample_vis' | 'multi_arena' | 'comparison'
  const [activeCenterView, setActiveCenterView] = useState<'canvas' | 'product_anim' | 'counterexample_vis' | 'multi_arena' | 'comparison'>('canvas');
  const [arenaResultGraph, setArenaResultGraph] = useState<AutomatonGraph | null>(null);

  // Selected State for bidirectional Canvas <-> Transition Table highlighting
  const [selectedStateId, setSelectedStateId] = useState<string | null>(null);

  // Target DFA B query string (type custom prompt or pick preset)
  const [targetBQuery, setTargetBQuery] = useState<string>('');
  const [targetDropdownOpen, setTargetDropdownOpen] = useState<boolean>(false);
  const [inputADropdownOpen, setInputADropdownOpen] = useState<boolean>(false);

  // Left Sidebar Accordion Collapsed States
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    quickPresets: true,
    setOps: true,
    comparison: true,
    quickAnalysis: true,
    practice: false,
    aiAssistant: false,
    recentOps: false,
  });

  // Left Sidebar AI Assistant & Keys State
  const [sidebarAiProvider, setSidebarAiProvider] = useState<AIProvider>(() => loadPreferredProvider() || 'openrouter');
  const [_sidebarShowKeyModal, _setSidebarShowKeyModal] = useState<boolean>(false);
  const [_sidebarApiKeys, _setSidebarApiKeys] = useState<APIKeys>(() => loadAPIKeys());
  const [sidebarAiExplanation, setSidebarAiExplanation] = useState<string | null>(null);
  const [_sidebarAiLoading, _setSidebarAiLoading] = useState<boolean>(false);
  const [_sidebarAiSourceBadge, _setSidebarAiSourceBadge] = useState<string>('');

  // Right Sidebar Tab & Resizing
  const [rightTab, setRightTab] = useState<InspectorTab>('overview');
  const [rightSidebarWidth, setRightSidebarWidth] = useState<number>(420);
  const [isResizingRightSidebar, setIsResizingRightSidebar] = useState<boolean>(false);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizingRightSidebar) return;
      const newWidth = window.innerWidth - e.clientX;
      if (newWidth >= 320 && newWidth <= 700) {
        setRightSidebarWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsResizingRightSidebar(false);
    };

    if (isResizingRightSidebar) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizingRightSidebar]);

  // History & Undo / Redo Stacks
  const [historyStack, setHistoryStack] = useState<OperationHistoryItem[]>([]);
  const [redoStack, setRedoStack] = useState<OperationHistoryItem[]>([]);

  // Algorithm Visualizer Framework States
  const [choiceModalConfig, setChoiceModalConfig] = useState<{
    title: string;
    description: string;
    onInstant: () => void;
    onAnimate: () => void;
  } | null>(null);

  const [activeTrace, setActiveTrace] = useState<AlgorithmTrace | null>(null);

  // AI Video Generator Modal State
  const [showAIVideoModal, setShowAIVideoModal] = useState<boolean>(false);

  // Target DFA B Graph Object
  const targetGraphB = useMemo(() => {
    if (!targetBQuery.trim()) {
      return {
        id: 'target_b_empty',
        name: 'DFA B (Empty)',
        type: 'DFA' as const,
        states: [],
        transitions: [],
        alphabet: ['0', '1'],
      };
    }
    try {
      const res = generateAutomatonFromPrompt(targetBQuery.trim());
      return res.graph;
    } catch {
      return {
        id: 'target_b_empty',
        name: 'DFA B (Empty)',
        type: 'DFA' as const,
        states: [],
        transitions: [],
        alphabet: ['0', '1'],
      };
    }
  }, [targetBQuery]);

  // Helper to completely strip A_/B_ prefixes from a graph for single-DFA operations
  const stripPrefixes = (g: AutomatonGraph): AutomatonGraph => {
    const cleanStates = g.states
      .filter((s) => !s.isAnnotation && !s.id.includes('CAPTION'))
      .map((s) => ({
        ...s,
        id: s.id.replace(/^[AB]_+/, ''),
        label: s.label ? s.label.replace(/^[AB]_+/, '') : s.label,
      }));
    const cleanIds = new Set(cleanStates.map((s) => s.id));
    return {
      ...g,
      states: cleanStates,
      transitions: g.transitions
        .map((t) => ({
          ...t,
          id: t.id.replace(/^[AB]_+/, ''),
          source: t.source.replace(/^[AB]_+/, ''),
          target: t.target.replace(/^[AB]_+/, ''),
        }))
        .filter((t) => cleanIds.has(t.source) && cleanIds.has(t.target)),
    };
  };

  // Store base DFA A so repeated set operation clicks retain original DFA A
  const [baseGraphAOverride, setBaseGraphAOverride] = useState<AutomatonGraph | null>(null);

  // Keep baseGraphAOverride in sync with initial graph
  React.useEffect(() => {
    if (!baseGraphAOverride && graph && graph.states.length > 0) {
      setBaseGraphAOverride(graph);
    }
  }, [graph, baseGraphAOverride]);

  // Clean AutomatonGraph for DFA A — strips DFA B states from combined dual-view graph.
  const cleanGraphAForArena = useMemo(() => {
    if (baseGraphAOverride && baseGraphAOverride.states.length > 0) {
      return stripPrefixes(baseGraphAOverride);
    }
    const dfaAStates = graph.states.filter(
      (s) => (s.id.startsWith('A_') || s.dfaTag === 'DFA A') && !s.id.includes('B_')
    );
    if (dfaAStates.length > 0) {
      const aIds = new Set(dfaAStates.map((s) => s.id));
      const extracted = {
        ...graph,
        name: graph.name.replace(/^Dual View: /, '').split(' + ')[0] || 'DFA A',
        states: dfaAStates,
        transitions: graph.transitions.filter((t) => aIds.has(t.source) && aIds.has(t.target)),
      };
      return stripPrefixes(extracted);
    }
    return stripPrefixes(graph);
  }, [graph, baseGraphAOverride]);

  // Clean AutomatonGraph for DFA B
  const cleanGraphBForArena = useMemo(() => {
    const dfaBStates = targetGraphB.states.filter(
      (s) => (s.id.startsWith('B_') || s.dfaTag === 'DFA B') && !s.id.includes('A_')
    );
    if (dfaBStates.length > 0) {
      const bIds = new Set(dfaBStates.map((s) => s.id));
      const extracted = {
        ...targetGraphB,
        name: targetGraphB.name.replace(/^Dual View: /, '').split(' + ')[1] || 'DFA B',
        states: dfaBStates,
        transitions: targetGraphB.transitions.filter((t) => bIds.has(t.source) && bIds.has(t.target)),
      };
      return stripPrefixes(extracted);
    }
    return stripPrefixes(targetGraphB);
  }, [targetGraphB]);

  // DFAs for Operation Engines
  const dfaA = useMemo(() => {
    return graphToDFA(cleanGraphAForArena);
  }, [cleanGraphAForArena]);

  const dfaB = useMemo(() => graphToDFA(cleanGraphBForArena), [cleanGraphBForArena]);

  // Engine Inspection Data for Badges & Quick Analysis
  const inspectA = useMemo(() => inspectAutomaton(cleanGraphAForArena), [cleanGraphAForArena]);
  const inspectB = useMemo(() => inspectAutomaton(cleanGraphBForArena), [cleanGraphBForArena]);
  const inspectActive = useMemo(() => inspectAutomaton(graph), [graph]);

  // Formal Analysis & Properties
  const _isEquiv = useMemo(() => DFAOperations.areEquivalent(dfaA, dfaB), [dfaA, dfaB]);

  const _isIncluded = useMemo(() => {
    const diff = DFAOperations.difference(dfaA, dfaB);
    const minDiff = DFAOperations.minimize(diff);
    return minDiff.acceptStates.length === 0;
  }, [dfaA, dfaB]);

  // Combine DFA A and DFA B side-by-side onto interactive Canvas (Guaranteed exactly 2 DFAs)
  const loadBothDFAsOntoCanvas = () => {
    const pureA = stripPrefixes(cleanGraphAForArena);
    const pureB = stripPrefixes(cleanGraphBForArena);

    const laidOutA = applyDagreLayout(pureA);
    const laidOutB = applyDagreLayout(pureB);

    const validXA = laidOutA.states.map((s) => s.x || 0);
    const maxXA = validXA.length > 0 ? Math.max(...validXA) : 300;
    const minXA = validXA.length > 0 ? Math.min(...validXA) : 0;
    const xOffsetB = Math.max(maxXA - minXA + 350, 450);

    const statesA: AutomatonState[] = laidOutA.states.map((s) => ({
      ...s,
      id: `A_${s.id}`,
      label: s.label && s.label !== s.id ? s.label : `q${s.id.replace(/\D/g, '') || s.id}`,
      dfaTag: 'DFA A',
    }));

    const statesB: AutomatonState[] = laidOutB.states.map((s) => ({
      ...s,
      id: `B_${s.id}`,
      label: s.label && s.label !== s.id ? s.label : `p${s.id.replace(/\D/g, '') || s.id}`,
      dfaTag: 'DFA B',
      x: (s.x || 0) + xOffsetB,
    }));

    const transitionsA: AutomatonTransition[] = laidOutA.transitions.map((t) => ({
      ...t,
      id: `A_${t.id}`,
      source: `A_${t.source}`,
      target: `A_${t.target}`,
    }));

    const transitionsB: AutomatonTransition[] = laidOutB.transitions.map((t) => ({
      ...t,
      id: `B_${t.id}`,
      source: `B_${t.source}`,
      target: `B_${t.target}`,
    }));

    const combinedGraph: AutomatonGraph = {
      id: `graph_dual_${Date.now()}`,
      name: `Dual View: DFA A (${pureA.name || 'Graph A'}) + DFA B (${pureB.name || 'Graph B'})`,
      type: 'DFA',
      alphabet: Array.from(new Set([...(pureA.alphabet || []), ...(pureB.alphabet || [])])),
      states: [...statesA, ...statesB],
      transitions: [...transitionsA, ...transitionsB],
    };

    pushOperation('Load Dual Canvas', 'Combined DFA A and DFA B side-by-side onto interactive canvas', combinedGraph);
    setActiveCenterView('canvas');
  };

  // Toggle Left Sidebar Accordions
  const toggleSection = (key: string) => {
    setExpandedSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // Helper to record an operation step into history
  const pushOperation = (name: string, details: string, newGraph: AutomatonGraph) => {
    const item: OperationHistoryItem = {
      id: Date.now().toString(),
      name,
      details,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      prevGraph: graph,
      newGraph,
    };
    setHistoryStack((prev) => [item, ...prev]);
    setRedoStack([]);
    setGraph(newGraph);
  };

  // Undo Operation
  const handleUndo = () => {
    if (historyStack.length === 0) return;
    const [top, ...restHistory] = historyStack;
    setRedoStack((prev) => [top, ...prev]);
    setHistoryStack(restHistory);
    setGraph(top.prevGraph);
  };

  // Redo Operation
  const handleRedo = () => {
    if (redoStack.length === 0) return;
    const [top, ...restRedo] = redoStack;
    setRedoStack(restRedo);
    setHistoryStack((prev) => [top, ...prev]);
    setGraph(top.newGraph);
  };

  // ── Operations Handlers ──────────────────────────────────────────────────
  const handleRunSetOperation = (op: 'OR' | 'AND' | 'DIFF' | 'XOR' | 'COMPLEMENT') => {
    try {
      let rawDFA;
      let opName = '';
      if (op === 'OR') {
        rawDFA = DFAOperations.union(dfaA, dfaB);
        opName = 'Union (A ∪ B)';
      } else if (op === 'AND') {
        rawDFA = DFAOperations.intersection(dfaA, dfaB);
        opName = 'Intersection (A ∩ B)';
      } else if (op === 'DIFF') {
        rawDFA = DFAOperations.difference(dfaA, dfaB);
        opName = 'Difference (A \\ B)';
      } else if (op === 'XOR') {
        rawDFA = DFAOperations.symmetricDifference(dfaA, dfaB);
        opName = 'Symmetric Difference (A ⊕ B)';
      } else {
        rawDFA = DFAOperations.complement(dfaA);
        opName = 'Complement (A^c)';
      }

      // Apply Hopcroft Minimization to produce the Canonical Minimal DFA
      const resultDFA = DFAOperations.minimize(rawDFA);
      const cleanBaseName = sanitizeGraphName(graph.name);
      const newGraph = dfaToGraph(resultDFA, `${cleanBaseName} [${opName}]`);
      pushOperation(opName, `Executed ${opName} operation against target ${targetGraphB.name}`, newGraph);
    } catch (e) {
      console.error(e);
    }
  };

  // Intercept operation calls with Choice Modal (Build Instantly vs Animate & Learn)
  const triggerSetOperationWithChoice = (op: 'OR' | 'AND' | 'DIFF' | 'XOR' | 'COMPLEMENT') => {
    const titles: Record<string, string> = {
      OR: 'DFA Union Operation (A ∪ B)',
      AND: 'DFA Intersection Operation (A ∩ B)',
      DIFF: 'DFA Difference Operation (A \\ B)',
      XOR: 'DFA Symmetric Difference (A ⊕ B)',
      COMPLEMENT: 'DFA Complement Operation (A^c)',
    };
    const descriptions: Record<string, string> = {
      OR: 'Computes Cartesian product automaton accepting L(A) ∪ L(B).',
      AND: 'Computes Cartesian product automaton accepting L(A) ∩ L(B).',
      DIFF: 'Computes difference automaton accepting L(A) \\ L(B).',
      XOR: 'Computes symmetric difference automaton accepting L(A) ⊕ L(B).',
      COMPLEMENT: 'Swaps accept and non-accept states to invert language acceptance.',
    };

    setChoiceModalConfig({
      title: titles[op],
      description: descriptions[op],
      onInstant: () => handleRunSetOperation(op),
      onAnimate: () => {
        if (op === 'COMPLEMENT') {
          setActiveTrace(generateComplementTrace(dfaA));
        } else {
          setActiveTrace(generateProductTrace(dfaA, dfaB, op as any));
        }
      },
    });
  };

  const triggerEquivalenceWithChoice = () => {
    setChoiceModalConfig({
      title: 'DFA Equivalence Verification',
      description: 'Tests whether L(A) = L(B) using symmetric difference reachability analysis.',
      onInstant: () => setActiveCenterView('multi_arena'),
      onAnimate: () => {
        setActiveTrace(generateEquivalenceTrace(dfaA, dfaB));
      },
    });
  };

  const _triggerInclusionWithChoice = () => {
    setChoiceModalConfig({
      title: 'Language Inclusion Test (L(A) ⊆ L(B))',
      description: 'Tests whether every string accepted by A is also accepted by B.',
      onInstant: () => setActiveCenterView('multi_arena'),
      onAnimate: () => {
        setActiveTrace(generateInclusionTrace(dfaA, dfaB));
      },
    });
  };

  const _handleAddTrapState = () => {
    try {
      const completeDFA = TrapStateGenerator.completeDFA(dfaA);
      const adapted = dfaToGraph(completeDFA, `${graph.name} (Complete)`);
      pushOperation('Add Complete Trap State', 'Added explicit trap state for missing symbol transitions', adapted);
    } catch (e) {
      console.error(e);
    }
  };

  const handleAISelectPrompt = (promptStr: string) => {
    setPromptInput(promptStr);
    try {
      const res = generateAutomatonFromPrompt(promptStr);
      if (res && res.graph) {
        setBaseGraphAOverride(res.graph);
        setGraph(res.graph);
      }
    } catch {
      generateFromPrompt(promptStr);
    }
  };

  return (
    <div className="flex-1 min-h-0 h-full w-full bg-slate-950 text-slate-100 flex flex-col overflow-hidden select-none font-sans">
      {/* ────────────────────────────────────────────────────────────────── */}
      {/* ── 3-COLUMN MAIN IDE WORKSPACE ─────────────────────────────────── */}
      {/* ────────────────────────────────────────────────────────────────── */}
      <div className="flex-1 min-h-0 flex flex-col lg:flex-row overflow-hidden relative">
        {/* ── LEFT SIDEBAR: OPERATIONS NAVIGATOR (Width: 300px) ───────────── */}
        <div className="w-full lg:w-76 bg-slate-900/95 border-r border-slate-800 flex flex-col shrink-0 overflow-y-auto p-3 space-y-3 font-mono">
          {/* Saved States & Diagrams Dropdown */}
          <SavedStatesDropdown />

          {/* Educational Mode Toggle in Side Panel */}
          <div className="p-2.5 bg-slate-950/80 border border-slate-800 rounded-2xl space-y-1.5 font-sans">
            <label className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block flex items-center gap-1.5">
              <Lightbulb className="w-3.5 h-3.5 text-amber-400" /> Educational Assistance:
            </label>
            <button
              onClick={() => setEducationalMode(!educationalMode)}
              className={`w-full py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-between border cursor-pointer ${educationalMode
                ? 'bg-amber-950/90 border-amber-500/50 text-amber-300 shadow-md'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
            >
              <span>{educationalMode ? 'Edu Mode: ON' : 'Edu Mode: OFF'}</span>
              <span className={`w-2 h-2 rounded-full ${educationalMode ? 'bg-amber-400 animate-pulse' : 'bg-slate-600'}`} />
            </button>
            {educationalMode && (
              <div className="p-2 rounded-lg bg-amber-950/40 border border-amber-500/20 text-[10px] text-amber-200/90 leading-relaxed font-mono mt-1">
                ⓘ Edu Mode Active: Interactive theory notes, exam tips, and step-by-step trace modals enabled.
              </div>
            )}
          </div>

          {/* Input DFA A Selector Card */}
          <div className="p-2.5 bg-slate-950/80 border border-slate-800 rounded-2xl space-y-1.5 font-sans relative">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider block">
                INPUT AUTOMATON (DFA A):
              </label>
              <span className="text-[9px] font-mono font-bold text-indigo-300 bg-indigo-950/60 px-1.5 py-0.5 rounded border border-indigo-500/30">
                {inspectA.constructionInfo.difficulty}
              </span>
            </div>
            <div className="relative flex items-center">
              <input
                type="text"
                value={promptInput}
                onChange={(e) => setPromptInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAISelectPrompt(promptInput);
                }}
                placeholder="Type custom prompt or select..."
                className="w-full py-2 pl-3 pr-8 bg-slate-900 border border-slate-700 rounded-xl text-xs text-slate-200 font-semibold focus:outline-none focus:border-indigo-500 transition font-sans"
              />
              <button
                type="button"
                onClick={() => setInputADropdownOpen((prev) => !prev)}
                className="absolute right-2 text-slate-400 hover:text-white cursor-pointer focus:outline-none p-1"
              >
                <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${inputADropdownOpen ? 'rotate-180' : ''}`} />
              </button>
            </div>

            {/* Language Preview Badge */}
            <div className="p-2 rounded-lg bg-slate-900/90 border border-slate-800 text-[10px] text-slate-300 font-mono space-y-1">
              <div className="text-[9px] text-slate-400 uppercase font-bold font-sans flex items-center justify-between">
                <span>Generator: {inspectA.constructionInfo.generatorName}</span>
              </div>
              <p className="text-indigo-200 truncate">{inspectA.languageInfo.description}</p>
            </div>

            {inputADropdownOpen && (
              <div className="absolute left-0 right-0 top-full mt-1 z-50 max-h-56 overflow-y-auto bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-1 space-y-1 custom-scrollbar animate-in fade-in zoom-in-95">
                <div className="px-2 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-800">
                  Preset Automata Theory Prompts
                </div>
                {ALL_AUTOMATA_PROMPTS.map((p, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setPromptInput(p.prompt);
                      handleAISelectPrompt(p.prompt);
                      setInputADropdownOpen(false);
                    }}
                    className="w-full px-2.5 py-1.5 text-left text-xs rounded-lg hover:bg-indigo-600/30 hover:text-indigo-200 transition flex items-center justify-between group cursor-pointer"
                  >
                    <span className="font-semibold text-slate-200 group-hover:text-white">{p.label}</span>
                    <span className="text-[10px] text-slate-400 group-hover:text-indigo-300 font-mono">{p.category}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Target DFA Selector for Binary Operations (DFA B) */}
          <div className="p-2.5 bg-slate-950/80 border border-slate-800 rounded-2xl space-y-1.5 font-sans relative">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-bold text-purple-400 uppercase tracking-wider block">
                Target Automaton (DFA B):
              </label>
              <span className="text-[9px] font-mono font-bold text-purple-300 bg-purple-950/60 px-1.5 py-0.5 rounded border border-purple-500/30">
                {targetBQuery.trim() ? inspectB.constructionInfo.difficulty : 'Empty'}
              </span>
            </div>
            <div className="relative flex items-center">
              <input
                type="text"
                value={targetBQuery}
                onChange={(e) => setTargetBQuery(e.target.value)}
                placeholder="Type prompt or select for DFA B (optional)..."
                className="w-full py-2 pl-3 pr-8 bg-slate-900 border border-slate-700 rounded-xl text-xs text-slate-200 font-semibold focus:outline-none focus:border-indigo-500 transition"
              />
              <button
                type="button"
                onClick={() => setTargetDropdownOpen((prev) => !prev)}
                className="absolute right-2 text-slate-400 hover:text-white cursor-pointer focus:outline-none p-1"
              >
                <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${targetDropdownOpen ? 'rotate-180' : ''}`} />
              </button>
            </div>

            {/* Language Preview Badge */}
            <div className="p-2 rounded-lg bg-slate-900/90 border border-slate-800 text-[10px] text-slate-300 font-mono space-y-1">
              <div className="text-[9px] text-slate-400 uppercase font-bold font-sans flex items-center justify-between">
                <span>Generator: {targetBQuery.trim() ? inspectB.constructionInfo.generatorName : 'None (Empty)'}</span>
              </div>
              <p className="text-purple-200 truncate font-sans text-[11px]">
                {targetBQuery.trim() ? inspectB.languageInfo.description : 'No target DFA B selected. DFA A occupies full workspace space.'}
              </p>
            </div>

            {targetDropdownOpen && (
              <div className="absolute left-0 right-0 top-full mt-1 z-50 max-h-56 overflow-y-auto bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-1 space-y-1 custom-scrollbar animate-in fade-in zoom-in-95">
                <div className="px-2 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-800">
                  Preset Automata Theory Prompts
                </div>
                {ALL_AUTOMATA_PROMPTS.map((p, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setTargetBQuery(p.prompt);
                      setTargetDropdownOpen(false);
                    }}
                    className="w-full px-2.5 py-1.5 text-left text-xs rounded-lg hover:bg-indigo-600/30 hover:text-indigo-200 transition flex items-center justify-between group cursor-pointer"
                  >
                    <span className="font-semibold text-slate-200 group-hover:text-white">{p.label}</span>
                    <span className="text-[10px] text-slate-400 group-hover:text-indigo-300 font-mono">{p.category}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 1. Set Operations Group */}
          <div className="border border-slate-800/80 bg-slate-950/80 rounded-2xl">
            <button
              onClick={() => toggleSection('setOps')}
              className="w-full p-3 flex items-center justify-between font-sans font-bold text-xs text-slate-200 hover:text-indigo-300 transition cursor-pointer"
            >
              <span className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-indigo-400" /> Set Operations
              </span>
              {expandedSections.setOps ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
            </button>

            {expandedSections.setOps && (
              <div className="p-2.5 pt-0 space-y-2 font-sans">
                {[
                  { op: 'OR' as const, label: 'Union (A ∪ B)', tag: 'OR' },
                  { op: 'AND' as const, label: 'Intersection (A ∩ B)', tag: 'AND' },
                  { op: 'DIFF' as const, label: 'Difference (A \\ B)', tag: 'DIFF' },
                  { op: 'XOR' as const, label: 'Symm. Diff (A ⊕ B)', tag: 'XOR' },
                ].map((item) => (
                  <button
                    key={item.op}
                    onClick={() => handleRunSetOperation(item.op)}
                    className="w-full py-2 px-3 bg-slate-900 hover:bg-indigo-600/30 text-slate-200 hover:text-white rounded-xl border border-slate-800 hover:border-indigo-400 hover:ring-1 hover:ring-indigo-400/60 hover:shadow-[0_0_15px_rgba(129,140,248,0.35)] transition-all duration-200 ease-out transform hover:-translate-y-0.5 hover:scale-[1.02] active:scale-95 text-xs font-bold text-left flex items-center justify-between group cursor-pointer"
                  >
                    <span className="flex items-center gap-1.5">
                      <Play className="w-3 h-3 text-indigo-400 group-hover:text-white fill-current" />
                      {item.label}
                    </span>
                    <span className="text-[10px] text-slate-400 group-hover:text-indigo-200 font-mono font-bold">
                      {item.tag}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Comparison Group */}
          <div className="border border-slate-800/80 bg-slate-950/80 rounded-2xl font-sans">
            <button
              onClick={() => toggleSection('comparison')}
              className="w-full p-3 flex items-center justify-between font-bold text-xs text-slate-200 hover:text-indigo-300 transition cursor-pointer"
            >
              <span className="flex items-center gap-2">
                <Columns className="w-4 h-4 text-indigo-400" /> Comparison
              </span>
              {expandedSections.comparison ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
            </button>

            {expandedSections.comparison && (
              <div className="p-2.5 pt-0 space-y-2">
                <button
                  onClick={() => setActiveCenterView('comparison')}
                  className="w-full py-2 px-3 bg-slate-900 hover:bg-slate-800 text-slate-200 rounded-xl border border-slate-800 hover:border-indigo-400 hover:ring-1 hover:ring-indigo-400/60 hover:shadow-[0_0_15px_rgba(129,140,248,0.35)] transition-all duration-200 ease-out transform hover:-translate-y-0.5 hover:scale-[1.02] active:scale-95 text-xs font-bold text-left flex items-center gap-2 cursor-pointer"
                >
                  <Columns className="w-3.5 h-3.5 text-indigo-400" /> Side-by-side Compare
                </button>
                <button
                  onClick={() => setActiveCenterView('multi_arena')}
                  className="w-full py-2 px-3 bg-slate-900 hover:bg-slate-800 text-slate-200 rounded-xl border border-slate-800 hover:border-emerald-400 hover:ring-1 hover:ring-emerald-400/60 hover:shadow-[0_0_15px_rgba(52,211,153,0.35)] transition-all duration-200 ease-out transform hover:-translate-y-0.5 hover:scale-[1.02] active:scale-95 text-xs font-bold text-left flex items-center gap-2 cursor-pointer"
                >
                  <Layers className="w-3.5 h-3.5 text-emerald-400" /> 3-DFA Arena
                </button>
                <button
                  onClick={() => setActiveCenterView('product_anim')}
                  className="w-full py-2 px-3 bg-slate-900 hover:bg-slate-800 text-slate-200 rounded-xl border border-slate-800 hover:border-sky-400 hover:ring-1 hover:ring-sky-400/60 hover:shadow-[0_0_15px_rgba(56,189,248,0.35)] transition-all duration-200 ease-out transform hover:-translate-y-0.5 hover:scale-[1.02] active:scale-95 text-xs font-bold text-left flex items-center gap-2 cursor-pointer"
                >
                  <Play className="w-3.5 h-3.5 text-sky-400" /> Product Stepper
                </button>
              </div>
            )}
          </div>

          {/* NEW SECTION: QUICK ANALYSIS (Engine Computed) */}
          <div className="border border-slate-800/80 bg-slate-950/80 rounded-2xl font-sans">
            <button
              onClick={() => toggleSection('quickAnalysis')}
              className="w-full p-3 flex items-center justify-between font-bold text-xs text-sky-300 hover:text-sky-200 transition cursor-pointer"
            >
              <span className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-sky-400" /> Quick Analysis
              </span>
              {expandedSections.quickAnalysis ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
            </button>

            {expandedSections.quickAnalysis && (
              <div className="p-2.5 pt-0 space-y-3 text-[10.5px] font-mono">
                {/* ── DFA A ANALYSIS ── */}
                {cleanGraphAForArena.states.length > 0 && (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-[10px] font-sans font-bold text-sky-400">
                      <span>DFA A ({cleanGraphAForArena.name || 'Input A'})</span>
                      <span className="px-1.5 py-0.5 bg-sky-950 text-sky-300 rounded border border-sky-500/30 text-[9px]">
                        {inspectA.statistics.totalStates} States
                      </span>
                    </div>
                    <div className="p-2.5 bg-slate-900/90 rounded-xl border border-slate-800 grid grid-cols-2 gap-2">
                      <div>
                        <span className="text-[8.5px] text-slate-400 uppercase font-sans font-bold block">Generator</span>
                        <span className="text-sky-300 font-bold truncate block">{inspectA.constructionInfo.generatorName}</span>
                      </div>
                      <div>
                        <span className="text-[8.5px] text-slate-400 uppercase font-sans font-bold block">Algorithm</span>
                        <span className="text-indigo-300 font-bold truncate block">{inspectA.constructionInfo.algorithmUsed}</span>
                      </div>
                      <div>
                        <span className="text-[8.5px] text-slate-400 uppercase font-sans font-bold block">States</span>
                        <span className="text-slate-200 font-bold">{inspectA.statistics.totalStates}</span>
                      </div>
                      <div>
                        <span className="text-[8.5px] text-slate-400 uppercase font-sans font-bold block">Transitions</span>
                        <span className="text-slate-200 font-bold">{inspectA.statistics.totalTransitions}</span>
                      </div>
                      <div>
                        <span className="text-[8.5px] text-slate-400 uppercase font-sans font-bold block">Accept States</span>
                        <span className="text-emerald-400 font-bold">{inspectA.statistics.acceptStatesCount}</span>
                      </div>
                      <div>
                        <span className="text-[8.5px] text-slate-400 uppercase font-sans font-bold block">Reachable</span>
                        <span className="text-slate-200 font-bold">{inspectA.statistics.reachableStates.length}</span>
                      </div>
                      <div>
                        <span className="text-[8.5px] text-slate-400 uppercase font-sans font-bold block">Trap State</span>
                        <span className={inspectA.statistics.trapStates.length > 0 ? 'text-amber-400 font-bold' : 'text-slate-500'}>
                          {inspectA.statistics.trapStates.length > 0 ? 'YES' : 'NO'}
                        </span>
                      </div>
                      <div>
                        <span className="text-[8.5px] text-slate-400 uppercase font-sans font-bold block">Minimal</span>
                        <span className={inspectA.properties.find((p) => p.id === 'val_min')?.status === 'passed' ? 'text-emerald-400 font-bold' : 'text-amber-400 font-bold'}>
                          {inspectA.properties.find((p) => p.id === 'val_min')?.status === 'passed' ? 'YES' : 'NO'}
                        </span>
                      </div>
                      <div>
                        <span className="text-[8.5px] text-slate-400 uppercase font-sans font-bold block">Complete</span>
                        <span className="text-emerald-400 font-bold">YES</span>
                      </div>
                      <div>
                        <span className="text-[8.5px] text-slate-400 uppercase font-sans font-bold block">Language</span>
                        <span className="text-purple-300 font-bold">{inspectA.statistics.hasCycle ? 'Infinite' : 'Finite'}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* ── DFA B ANALYSIS (Shown ONLY if DFA B is loaded & non-empty) ── */}
                {targetBQuery.trim().length > 0 && cleanGraphBForArena.states.length > 0 && (
                  <div className="space-y-1.5 pt-2 border-t border-slate-800/80">
                    <div className="flex items-center justify-between text-[10px] font-sans font-bold text-purple-400">
                      <span>DFA B ({cleanGraphBForArena.name || 'Target B'})</span>
                      <span className="px-1.5 py-0.5 bg-purple-950 text-purple-300 rounded border border-purple-500/30 text-[9px]">
                        {inspectB.statistics.totalStates} States
                      </span>
                    </div>
                    <div className="p-2.5 bg-slate-900/90 rounded-xl border border-slate-800 grid grid-cols-2 gap-2">
                      <div>
                        <span className="text-[8.5px] text-slate-400 uppercase font-sans font-bold block">Generator</span>
                        <span className="text-purple-300 font-bold truncate block">{inspectB.constructionInfo.generatorName}</span>
                      </div>
                      <div>
                        <span className="text-[8.5px] text-slate-400 uppercase font-sans font-bold block">Algorithm</span>
                        <span className="text-indigo-300 font-bold truncate block">{inspectB.constructionInfo.algorithmUsed}</span>
                      </div>
                      <div>
                        <span className="text-[8.5px] text-slate-400 uppercase font-sans font-bold block">States</span>
                        <span className="text-slate-200 font-bold">{inspectB.statistics.totalStates}</span>
                      </div>
                      <div>
                        <span className="text-[8.5px] text-slate-400 uppercase font-sans font-bold block">Transitions</span>
                        <span className="text-slate-200 font-bold">{inspectB.statistics.totalTransitions}</span>
                      </div>
                      <div>
                        <span className="text-[8.5px] text-slate-400 uppercase font-sans font-bold block">Accept States</span>
                        <span className="text-emerald-400 font-bold">{inspectB.statistics.acceptStatesCount}</span>
                      </div>
                      <div>
                        <span className="text-[8.5px] text-slate-400 uppercase font-sans font-bold block">Reachable</span>
                        <span className="text-slate-200 font-bold">{inspectB.statistics.reachableStates.length}</span>
                      </div>
                      <div>
                        <span className="text-[8.5px] text-slate-400 uppercase font-sans font-bold block">Trap State</span>
                        <span className={inspectB.statistics.trapStates.length > 0 ? 'text-amber-400 font-bold' : 'text-slate-500'}>
                          {inspectB.statistics.trapStates.length > 0 ? 'YES' : 'NO'}
                        </span>
                      </div>
                      <div>
                        <span className="text-[8.5px] text-slate-400 uppercase font-sans font-bold block">Minimal</span>
                        <span className={inspectB.properties.find((p) => p.id === 'val_min')?.status === 'passed' ? 'text-emerald-400 font-bold' : 'text-amber-400 font-bold'}>
                          {inspectB.properties.find((p) => p.id === 'val_min')?.status === 'passed' ? 'YES' : 'NO'}
                        </span>
                      </div>
                      <div>
                        <span className="text-[8.5px] text-slate-400 uppercase font-sans font-bold block">Complete</span>
                        <span className="text-emerald-400 font-bold">YES</span>
                      </div>
                      <div>
                        <span className="text-[8.5px] text-slate-400 uppercase font-sans font-bold block">Language</span>
                        <span className="text-purple-300 font-bold">{inspectB.statistics.hasCycle ? 'Infinite' : 'Finite'}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* NEW SECTION: PRACTICE MODE (Collapsible Card) */}
          <div className="border border-slate-800/80 bg-slate-950/80 rounded-2xl font-sans">
            <button
              onClick={() => toggleSection('practice')}
              className="w-full p-3 flex items-center justify-between font-bold text-xs text-emerald-300 hover:text-emerald-200 transition cursor-pointer"
            >
              <span className="flex items-center gap-2">
                <Dices className="w-4 h-4 text-emerald-400" /> Practice Mode
              </span>
              {expandedSections.practice ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
            </button>

            {expandedSections.practice && (
              <div className="p-2.5 pt-0 space-y-1.5 text-xs font-bold">
                <button
                  onClick={() => {
                    const rnd = ALL_AUTOMATA_PROMPTS[Math.floor(Math.random() * ALL_AUTOMATA_PROMPTS.length)];
                    handleAISelectPrompt(rnd.prompt);
                  }}
                  className="w-full py-2 px-3 bg-slate-900 hover:bg-slate-800 text-slate-200 rounded-xl border border-slate-800 transition text-left flex items-center justify-between cursor-pointer"
                >
                  <span>🎲 Generate Random DFA</span>
                </button>
                <button
                  onClick={() => {
                    try {
                      const minDFA = DFAOperations.minimize(dfaA);
                      const minGraph = dfaToGraph(minDFA, `${graph.name} (Minimized)`);
                      pushOperation('Minimize DFA', 'Applied Hopcroft Minimization Algorithm', minGraph);
                    } catch (e) {
                      console.error(e);
                    }
                  }}
                  className="w-full py-2 px-3 bg-slate-900 hover:bg-slate-800 text-slate-200 rounded-xl border border-slate-800 transition text-left flex items-center justify-between cursor-pointer"
                >
                  <span>✂ Minimize this DFA</span>
                </button>
                <button
                  onClick={triggerEquivalenceWithChoice}
                  className="w-full py-2 px-3 bg-slate-900 hover:bg-slate-800 text-slate-200 rounded-xl border border-slate-800 transition text-left flex items-center justify-between cursor-pointer"
                >
                  <span>⚖ Equivalent or Not?</span>
                </button>
              </div>
            )}
          </div>

          {/* NEW SECTION: AI ASSISTANT (Multi-Provider Architecture) */}
          <div className="border border-slate-800/80 bg-slate-950/80 rounded-2xl font-sans">
            <button
              onClick={() => toggleSection('aiAssistant')}
              className="w-full p-3 flex items-center justify-between font-bold text-xs text-purple-300 hover:text-purple-200 transition cursor-pointer"
            >
              <span className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-400" /> AI Laboratory Assistant
              </span>
              {expandedSections.aiAssistant ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
            </button>

            {expandedSections.aiAssistant && (
              <div className="p-2.5 pt-0 space-y-2 text-xs">
                <div className="flex items-center justify-between gap-1">
                  <select
                    value={sidebarAiProvider}
                    onChange={(e) => {
                      const p = e.target.value as AIProvider;
                      setSidebarAiProvider(p);
                      savePreferredProvider(p);
                    }}
                    className="w-full px-2 py-1 bg-slate-900 border border-slate-800 rounded-lg text-[10px] font-bold text-purple-300 focus:outline-none focus:border-purple-500 cursor-pointer"
                  >
                    <option value="openrouter">Auto / OpenRouter</option>
                    <option value="gemini">Google Gemini</option>
                    <option value="groq">Groq Llama-3.3</option>
                    <option value="openai">OpenAI GPT-4o</option>
                    <option value="claude">Anthropic Claude</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-1 font-bold text-[10px]">
                  <button
                    onClick={async () => {
                      const cleanName = sanitizeGraphName(graph.name || 'DFA');
                      const isMin = inspectActive.properties.find((p) => p.id === 'val_min')?.status === 'passed';
                      const keys = loadAPIKeys();

                      _setSidebarAiLoading(true);
                      const prompt = `Explain the following DFA in a natural, intuitive, human-readable way:
Name: ${cleanName}
States: ${inspectActive.statistics.totalStates}
Transitions: ${inspectActive.statistics.totalTransitions}
Accept States: ${inspectActive.statistics.acceptStatesCount}
Language Description: ${inspectActive.languageInfo.description}
Is Minimal: ${isMin ? 'Yes' : 'No (can be reduced)'}`;

                      let response = await fetchAITextExplanation(prompt, sidebarAiProvider, keys);

                      if (!response) {
                        response = `### 💡 DFA Analysis: "${cleanName}"\n\n` +
                          `**Automaton Structure**\n` +
                          `• **Total States**: ${inspectActive.statistics.totalStates}\n` +
                          `• **Transitions**: ${inspectActive.statistics.totalTransitions}\n` +
                          `• **Accepting States**: ${inspectActive.statistics.acceptStatesCount}\n\n` +
                          `**Language Properties**\n` +
                          `• **Description**: ${inspectActive.languageInfo.description}\n` +
                          `• **Minimality**: ${isMin ? 'This DFA is already in canonical minimal form.' : 'This DFA can be further reduced using Hopcroft Minimization.'}`;
                      }

                      setSidebarAiExplanation(response);
                      _setSidebarAiLoading(false);
                    }}
                    className="p-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg text-slate-300 text-left cursor-pointer"
                  >
                    Explain DFA
                  </button>
                  <button
                    onClick={async () => {
                      const cleanName = sanitizeGraphName(graph.name || 'DFA');
                      const keys = loadAPIKeys();

                      _setSidebarAiLoading(true);
                      const prompt = `Explain the DFA generator and algorithm naturally for:
DFA Name: ${cleanName}
Generator: ${inspectActive.constructionInfo.generatorName}
Algorithm: ${inspectActive.constructionInfo.algorithmUsed}
Pattern: ${inspectActive.constructionInfo.patternType}
Difficulty: ${inspectActive.constructionInfo.difficulty}`;

                      let response = await fetchAITextExplanation(prompt, sidebarAiProvider, keys);

                      if (!response) {
                        response = `### ⚙️ Generator Specs: "${cleanName}"\n\n` +
                          `**Construction Info**\n` +
                          `• **Generator**: ${inspectActive.constructionInfo.generatorName}\n` +
                          `• **Algorithm**: ${inspectActive.constructionInfo.algorithmUsed}\n` +
                          `• **Pattern Type**: ${inspectActive.constructionInfo.patternType}\n` +
                          `• **Difficulty Level**: ${inspectActive.constructionInfo.difficulty}`;
                      }

                      setSidebarAiExplanation(response);
                      _setSidebarAiLoading(false);
                    }}
                    className="p-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg text-slate-300 text-left cursor-pointer"
                  >
                    Explain Generator
                  </button>
                </div>

                {_sidebarAiLoading && (
                  <div className="p-2.5 bg-slate-900 rounded-xl border border-purple-500/30 text-[10px] text-purple-300 font-mono flex items-center justify-center gap-2">
                    <Sparkles className="w-3.5 h-3.5 animate-spin text-purple-400" />
                    <span>Generating natural AI explanation...</span>
                  </div>
                )}

                {sidebarAiExplanation && !_sidebarAiLoading && (
                  <div className="p-3 bg-slate-900 rounded-xl border border-purple-500/30 text-xs text-slate-200 font-sans leading-relaxed whitespace-pre-line space-y-1">
                    {sidebarAiExplanation}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* NEW SECTION: RECENT OPERATIONS LOG */}
          {historyStack.length > 0 && (
            <div className="border border-slate-800/80 bg-slate-950/80 rounded-2xl font-sans">
              <button
                onClick={() => toggleSection('recentOps')}
                className="w-full p-3 flex items-center justify-between font-bold text-xs text-amber-300 hover:text-amber-200 transition cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-400" /> Recent Operations Log ({historyStack.length})
                </span>
                {expandedSections.recentOps ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
              </button>

              {expandedSections.recentOps && (
                <div className="p-2.5 pt-0 space-y-1.5 text-[10px] font-mono">
                  {historyStack.slice(0, 5).map((item) => (
                    <button
                      key={item.id}
                      onClick={() => setGraph(item.newGraph)}
                      className="w-full p-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl text-left flex items-center justify-between cursor-pointer group transition"
                    >
                      <span className="font-bold text-slate-200 group-hover:text-amber-300 truncate">{item.name}</span>
                      <span className="text-[9px] text-slate-500 shrink-0">{item.timestamp}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── CENTER WORKSPACE: VISUALIZATION & ANIMATION ARENA ───────────── */}
        <div className="flex-1 flex flex-col min-w-0 bg-slate-950 relative overflow-hidden">
          {/* Normal Center Visualization Canvas / Steppers */}
            <div className="flex-1 flex flex-col min-h-0 relative">
              {/* ── Sleek Integrated IDE Workspace Header Bar ── */}
              <div className="px-3.5 py-2 bg-slate-950 border-b border-slate-800 flex items-center justify-between gap-3 shrink-0 font-sans select-none overflow-x-auto no-scrollbar">
                {/* Left: Active Graph Title & Metadata Pill */}
                <div className="flex items-center gap-2.5 min-w-0 shrink-0">
                  <div className="p-1 bg-indigo-500/10 border border-indigo-500/20 rounded-lg text-indigo-400 shrink-0">
                    <Activity className="w-4 h-4" />
                  </div>
                  <div className="flex items-center gap-2 truncate">
                    <span className="text-xs text-slate-400 font-medium shrink-0">Active Graph:</span>
                    <span className="text-xs font-bold text-white font-mono truncate max-w-[260px]" title={graph.name || 'Current DFA'}>
                      {graph.name || 'Current DFA'}
                    </span>
                    <span className="px-2 py-0.5 bg-slate-900 text-indigo-300 border border-slate-800 text-[10px] font-mono font-bold rounded-full whitespace-nowrap shrink-0">
                      {graph.states.length} States • {graph.transitions.length} Edges
                    </span>
                  </div>
                </div>

                {/* Right: Undo/Redo & View Controls */}
                <div className="flex items-center gap-2 shrink-0">
                  {/* Undo / Redo Buttons */}
                  <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-xl p-1">
                    <button
                      onClick={handleUndo}
                      disabled={historyStack.length === 0}
                      className="p-1 hover:bg-slate-800 text-slate-300 disabled:opacity-30 rounded-lg transition cursor-pointer"
                      title={`Undo (${historyStack.length} states in history)`}
                    >
                      <Undo2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={handleRedo}
                      disabled={redoStack.length === 0}
                      className="p-1 hover:bg-slate-800 text-slate-300 disabled:opacity-30 rounded-lg transition cursor-pointer"
                      title="Redo"
                    >
                      <Redo2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Dual View Action & Canvas View Switcher */}
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setActiveCenterView('canvas')}
                      className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all duration-150 flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${activeCenterView === 'canvas'
                          ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30 border border-indigo-400/40'
                          : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
                        }`}
                    >
                      <LayoutGrid className="w-3.5 h-3.5" />
                      <span>Canvas</span>
                    </button>

                    <button
                      onClick={loadBothDFAsOntoCanvas}
                      className="px-2.5 py-1 rounded-xl text-xs font-bold text-indigo-300 hover:text-white bg-indigo-950/50 hover:bg-indigo-600/30 border border-indigo-500/30 hover:border-indigo-400 transition-all duration-150 flex items-center gap-1.5 whitespace-nowrap cursor-pointer shadow-sm"
                      title="Render both DFA A and DFA B side-by-side on the interactive canvas"
                    >
                      <GitCompare className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Dual View</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Main Visualization Workspace Body */}
              <div className="flex-1 relative overflow-hidden flex flex-col">
                {activeCenterView === 'canvas' && (
                  <div className="w-full h-full relative">
                    <AutomataCanvas selectedStateId={selectedStateId} onSelectState={setSelectedStateId} />
                  </div>
                )}

                {activeCenterView === 'multi_arena' && (
                  <div className="w-full h-full overflow-y-auto">
                    <ThreeAutomataArena
                      graphA={cleanGraphAForArena}
                      graphB={targetGraphB}
                      onResultGraphChange={setArenaResultGraph}
                      onSelectState={setSelectedStateId}
                      onApplyResultGraph={(resGraph, opName) => {
                        pushOperation(`Operation: ${opName}`, 'Generated from 3-DFA Arena', resGraph);
                        setActiveCenterView('canvas');
                      }}
                    />
                  </div>
                )}

                {activeCenterView === 'product_anim' && (
                  <div className="w-full h-full overflow-y-auto p-4">
                    <AnimatedProductConstructionModal
                      graphA={cleanGraphAForArena}
                      graphB={cleanGraphBForArena}
                      operation="OR"
                      onClose={() => setActiveCenterView('canvas')}
                      onApplyResult={(resGraph) => {
                        pushOperation('Animated Product Construction', 'Applied generated Cartesian product graph', resGraph);
                        setActiveCenterView('canvas');
                      }}
                    />
                  </div>
                )}

                {activeCenterView === 'comparison' && (
                  <div className="w-full h-full overflow-y-auto p-4">
                    <DFAComparisonView
                      graphA={cleanGraphAForArena}
                      graphB={cleanGraphBForArena}
                    />
                  </div>
                )}
              </div>
            </div>
        </div>

        {/* ── RIGHT SIDEBAR: PROFESSIONAL DFA INSPECTOR & ANALYSIS PANEL (Wider & Resizable) ───── */}
        <div
          className="hidden lg:flex items-center justify-center w-2 hover:w-2.5 bg-slate-900 border-l border-slate-800 hover:bg-indigo-500/80 cursor-col-resize transition-all shrink-0 group relative z-10 select-none"
          onMouseDown={(e) => {
            e.preventDefault();
            setIsResizingRightSidebar(true);
          }}
          title="Drag to resize Inspector panel"
        >
          <div className="w-0.5 h-8 bg-slate-700 group-hover:bg-white rounded-full transition-colors" />
        </div>

        <div
          style={{ width: `${rightSidebarWidth}px` }}
          className="w-full lg:w-auto h-full flex flex-col shrink-0 overflow-hidden font-sans border-l border-slate-800/80"
        >
          <DFAInspectorPanel
            graph={activeCenterView === 'multi_arena' && arenaResultGraph ? arenaResultGraph : cleanGraphAForArena}
            selectedStateId={selectedStateId}
            onSelectState={setSelectedStateId}
            activeTab={rightTab}
            onTabChange={setRightTab}
          />
        </div>
      </div>

      {/* Why Explanation Modal */}
      {whyTopic && <WhyExplanationModal topicKey={whyTopic} onClose={() => setWhyTopic(null)} />}

      {/* Choice Modal (Build Instantly vs Animate & Learn) */}
      {choiceModalConfig && (
        <AlgorithmChoiceModal
          title={choiceModalConfig.title}
          description={choiceModalConfig.description}
          onBuildInstantly={choiceModalConfig.onInstant}
          onAnimateAndLearn={choiceModalConfig.onAnimate}
          onClose={() => setChoiceModalConfig(null)}
        />
      )}

      {/* Reusable Universal Algorithm Visualizer Modal */}
      {activeTrace && (
        <AlgorithmVisualizerModal
          trace={activeTrace}
          onClose={() => setActiveTrace(null)}
          onApplyResultGraph={(resGraph) => {
            pushOperation(activeTrace.algorithmName, 'Loaded algorithm result onto main canvas', resGraph);
            setActiveTrace(null);
          }}
        />
      )}

      {/* Hugging Face AI Video Generator Modal (Wan 2.1 & LTX-Video) */}
      {showAIVideoModal && (
        <AIVideoGeneratorModal
          initialPrompt={`2D motion graphics animation of a deterministic finite automaton state machine for ${graph.name}`}
          onClose={() => setShowAIVideoModal(false)}
        />
      )}
    </div>
  );
};
