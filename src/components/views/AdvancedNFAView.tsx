import React, { useState, useMemo, useEffect } from 'react';
import {
  Layers,
  Lightbulb,
  ChevronDown,
  ChevronRight,
  ShieldCheck,
  Play,
  LayoutGrid,
  Columns,
  Sparkles,
  Cpu,
  BarChart3,
  GitFork,
  FileCode,
  Zap,
  Sliders,
  Route,
  TrendingUp,
  Activity,
  Undo2,
  Redo2,
  AlertTriangle,
} from 'lucide-react';
import { useAutomata } from '../../context/AutomataContext';
import { AutomataCanvas } from '../canvas/AutomataCanvas';
import { MiniAutomataGraph } from '../dfa/MiniAutomataGraph';
import { SavedStatesDropdown } from '../common/SavedStatesDropdown';
import { ALL_AUTOMATA_PROMPTS } from '../../data/allAutomataPrompts';
import type { AutomatonGraph, AIProvider, APIKeys } from '../../types/automata';
import type { NFA } from '../../algorithms/nfa/NFA';
import { NFAOperations } from '../../algorithms/nfa/operations/NFAOperations';
import { removeEpsilonTransitions } from '../../algorithms/nfa/operations/EpsilonRemoval';
import { NFAIntentParser } from '../../algorithms/nfa/parser/NFAIntentParser';
import { NFAGeneratorRegistry } from '../../algorithms/nfa/generators/NFAGeneratorRegistry';
import { nfaToAutomatonGraph } from '../../algorithms/nfa/renderer/NFARenderer';
import { AlgorithmChoiceModal } from '../visualizer/AlgorithmChoiceModal';
import { AnimatedNFAOperationModal, type NFAOperationType } from '../nfa/AnimatedNFAOperationModal';
import { NFAInspectorPanel, type NFAInspectorTab } from '../nfa/inspector/NFAInspectorPanel';

// ── NFA Comparison Laboratory Specialized Views ──────────────────────────────
import { NFADFAEquivalenceComparison } from '../nfa/comparison/NFADFAEquivalenceComparison';
import { NFABranchTreeLabView } from '../nfa/comparison/NFABranchTreeLabView';
import { NFASubsetConstructionLabView } from '../nfa/comparison/NFASubsetConstructionLabView';
import { NFAEpsilonClosureLabView } from '../nfa/comparison/NFAEpsilonClosureLabView';
import { NFAEpsilonEliminationLabView } from '../nfa/comparison/NFAEpsilonEliminationLabView';
import { NFAThompsonConstructionLabView } from '../nfa/comparison/NFAThompsonConstructionLabView';

import { loadAPIKeys, loadPreferredProvider } from '../../services/aiProviders';

interface OperationHistoryItem {
  id: string;
  name: string;
  details: string;
  timestamp: string;
  prevGraph: AutomatonGraph;
  newGraph: AutomatonGraph;
}

export type NFAComparisonLabViewId =
  | 'canvas'
  | 'nfa_vs_dfa'
  | 'branch_tree'
  | 'subset_construction'
  | 'thompson_construction'
  | 'epsilon_closure'
  | 'epsilon_elimination';

export const AdvancedNFAView: React.FC = () => {
  const { graph, setGraph, promptInput, setPromptInput, generateNFAFromPrompt } = useAutomata();

  // ── Global Educational Mode & Workspace State ──────────────────────────────
  const [educationalMode, setEducationalMode] = useState<boolean>(() => {
    return localStorage.getItem('educational_mode_nfa_enabled') !== 'false';
  });

  // Active Center Workspace View (Defaults to Canvas)
  const [activeCenterView, setActiveCenterView] = useState<NFAComparisonLabViewId>('canvas');

  // Active Animated NFA Operation Modal Config (Animate & Learn)
  const [nfaOpModalConfig, setNfaOpModalConfig] = useState<{
    operation: NFAOperationType;
  } | null>(null);

  // Warning Modal Config for Missing Automaton Requirement
  const [warningModalConfig, setWarningModalConfig] = useState<{
    title: string;
    message: string;
  } | null>(null);

  // Canvas View Toggles
  const [showEpsilonTransitions, setShowEpsilonTransitions] = useState<boolean>(true);
  const [showActiveBranches, setShowActiveBranches] = useState<boolean>(true);
  const [isDualCanvas, setIsDualCanvas] = useState<boolean>(false);

  // Target NFA B query string (type custom prompt or pick preset)
  const [targetBQuery, setTargetBQuery] = useState<string>('');
  const [targetDropdownOpen, setTargetDropdownOpen] = useState<boolean>(false);
  const [inputADropdownOpen, setInputADropdownOpen] = useState<boolean>(false);

  // Left Sidebar Accordion Collapsed States (Persisted in localStorage)
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>(() => {
    try {
      const stored = localStorage.getItem('nfa_lab_expanded_sections');
      return stored
        ? JSON.parse(stored)
        : {
          nfaOps: true,
          conversionTools: true,
          comparison: true,
          quickAnalysis: true,
          practice: false,
          aiAssistant: false,
          recentOps: false,
        };
    } catch {
      return {
        nfaOps: true,
        conversionTools: true,
        comparison: true,
        quickAnalysis: true,
        practice: false,
        aiAssistant: false,
        recentOps: false,
      };
    }
  });

  useEffect(() => {
    localStorage.setItem('nfa_lab_expanded_sections', JSON.stringify(expandedSections));
  }, [expandedSections]);

  // Left Sidebar AI Assistant & Keys State
  const [_sidebarAiProvider] = useState<AIProvider>(() => loadPreferredProvider() || 'openrouter');
  const [_sidebarApiKeys] = useState<APIKeys>(() => loadAPIKeys());
  const [sidebarAiExplanation, setSidebarAiExplanation] = useState<string | null>(null);
  const [_sidebarAiLoading, setSidebarAiLoading] = useState<boolean>(false);
  const [sidebarAiStyle, setSidebarAiStyle] = useState<'exam' | 'technical' | 'analogy' | 'trick'>('exam');

  // Right Sidebar Tab & Resizing
  const [rightTab, setRightTab] = useState<NFAInspectorTab>('overview');
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

  // Saved Original Base NFA A (Preserves un-mutated input NFA A across operations)
  const [savedBaseNFAA, setSavedBaseNFAA] = useState<NFA | null>(null);

  // Structural NFA for Graph A (from current canvas)
  const currentNFAA: NFA = useMemo(() => {
    const states = graph.states.map((s) => s.id);
    const alphabet = graph.alphabet || ['0', '1'];
    const startState = graph.states.find((s) => s.isStart)?.id || states[0] || 'q0';
    const acceptStates = graph.states.filter((s) => s.isAccept).map((s) => s.id);

    const transitions: Record<string, Record<string, string[]>> = {};
    for (const s of states) transitions[s] = {};

    for (const edge of graph.transitions) {
      if (!transitions[edge.source]) transitions[edge.source] = {};
      const edgeSymbols = edge.symbols || [];
      for (const sym of edgeSymbols) {
        if (!transitions[edge.source][sym]) transitions[edge.source][sym] = [];
        if (!transitions[edge.source][sym].includes(edge.target)) {
          transitions[edge.source][sym].push(edge.target);
        }
      }
    }

    return { alphabet, states, startState, acceptStates, transitions };
  }, [graph]);

  // Effective NFA A: Returns saved original base NFA A if operation was built instantly on canvas
  const effectiveNFAA: NFA = useMemo(() => {
    return savedBaseNFAA || currentNFAA;
  }, [savedBaseNFAA, currentNFAA]);

  // Structural Target NFA B Object
  const targetNFAB: NFA = useMemo(() => {
    try {
      const intent = NFAIntentParser.parse(targetBQuery.trim() || 'Ends with 01');
      const registry = new NFAGeneratorRegistry();
      return registry.generate(intent) || new NFAGeneratorRegistry().generate({ type: 'ENDS_WITH', pattern: '01' });
    } catch {
      return new NFAGeneratorRegistry().generate({ type: 'ENDS_WITH', pattern: '01' });
    }
  }, [targetBQuery]);

  // Single Canvas Dual Graph (NFA A & NFA B combined on the SAME canvas)
  const dualMergedGraph = useMemo(() => {
    // 1. Prefix-safe NFA A
    const nfaA = effectiveNFAA;
    const statesA = nfaA.states.map((st) => `A_${st}`);
    const startA = `A_${nfaA.startState}`;
    const acceptA = nfaA.acceptStates.map((st) => `A_${st}`);
    const transA: Record<string, Record<string, string[]>> = {};

    Object.keys(nfaA.transitions).forEach((src) => {
      transA[`A_${src}`] = {};
      Object.keys(nfaA.transitions[src] || {}).forEach((sym) => {
        transA[`A_${src}`][sym] = (nfaA.transitions[src][sym] || []).map((tgt) => `A_${tgt}`);
      });
    });

    const graphA = nfaToAutomatonGraph(
      {
        states: statesA,
        alphabet: nfaA.alphabet,
        transitions: transA,
        startState: startA,
        acceptStates: acceptA,
      },
      'NFA A'
    );

    const relabeledStatesA = graphA.states.map((s) => ({
      ...s,
      label: s.id.replace(/^A_/, '') + ' (A)',
    }));

    // If target NFA B is empty or unconfigured
    if (!targetNFAB || targetNFAB.states.length === 0) {
      return {
        ...graphA,
        name: 'Dual View Canvas (NFA A)',
        states: relabeledStatesA,
      };
    }

    // 2. Prefix-safe NFA B
    const nfaB = targetNFAB;
    const statesB = nfaB.states.map((st) => `B_${st}`);
    const startB = nfaB.startState ? `B_${nfaB.startState}` : '';
    const acceptB = nfaB.acceptStates.map((st) => `B_${st}`);
    const transB: Record<string, Record<string, string[]>> = {};

    Object.keys(nfaB.transitions).forEach((src) => {
      transB[`B_${src}`] = {};
      Object.keys(nfaB.transitions[src] || {}).forEach((sym) => {
        transB[`B_${src}`][sym] = (nfaB.transitions[src][sym] || []).map((tgt) => `B_${tgt}`);
      });
    });

    const graphB = nfaToAutomatonGraph(
      {
        states: statesB,
        alphabet: nfaB.alphabet,
        transitions: transB,
        startState: startB,
        acceptStates: acceptB,
      },
      'NFA B'
    );

    // Calculate max X of graphA to offset graphB horizontally
    const maxXA = graphA.states.length > 0 ? Math.max(...graphA.states.map((s) => s.x)) : 300;
    const minXB = graphB.states.length > 0 ? Math.min(...graphB.states.map((s) => s.x)) : 0;
    const offsetX = maxXA + 300 - minXB;

    const relabeledStatesB = graphB.states.map((s) => ({
      ...s,
      label: s.id.replace(/^B_/, '') + ' (B)',
      x: s.x + offsetX,
    }));

    return {
      id: 'dual_merged_single_canvas',
      name: 'Dual View Canvas (NFA A & NFA B)',
      type: 'NFA' as const,
      alphabet: Array.from(new Set([...nfaA.alphabet, ...nfaB.alphabet])),
      states: [...relabeledStatesA, ...relabeledStatesB],
      transitions: [...graphA.transitions, ...graphB.transitions],
    };
  }, [currentNFAA, targetNFAB]);

  // Engine Computed Quick Analysis Data
  const quickAnalysis = useMemo(() => {
    const statesCount = currentNFAA.states.length;
    const acceptCount = currentNFAA.acceptStates.length;
    let totalTransitions = 0;
    let epsCount = 0;
    const branchMap: Record<string, number> = {};

    for (const src of Object.keys(currentNFAA.transitions)) {
      const symMap = currentNFAA.transitions[src] || {};
      let outCount = 0;
      for (const sym of Object.keys(symMap)) {
        const targets = symMap[sym] || [];
        totalTransitions += targets.length;
        if (sym === 'ε' || sym === 'epsilon') epsCount += targets.length;
        if (targets.length > 1) outCount += targets.length;
      }
      branchMap[src] = outCount;
    }

    const branchingStates = Object.values(branchMap).filter((c) => c > 1).length;
    const maxBranch = Math.max(1, ...Object.values(branchMap));
    const avgBranch = (totalTransitions / Math.max(1, statesCount)).toFixed(2);

    return {
      statesCount,
      acceptCount,
      totalTransitions,
      epsCount,
      branchingStates,
      maxBranch,
      avgBranch,
    };
  }, [currentNFAA]);

  const quickAnalysisB = useMemo(() => {
    if (!targetNFAB || targetNFAB.states.length === 0 || !targetBQuery.trim()) return null;
    const statesCount = targetNFAB.states.length;
    const acceptCount = targetNFAB.acceptStates.length;
    let totalTransitions = 0;
    let epsCount = 0;
    const branchMap: Record<string, number> = {};

    for (const src of Object.keys(targetNFAB.transitions)) {
      const symMap = targetNFAB.transitions[src] || {};
      let outCount = 0;
      for (const sym of Object.keys(symMap)) {
        const targets = symMap[sym] || [];
        totalTransitions += targets.length;
        if (sym === 'ε' || sym === 'epsilon') epsCount += targets.length;
        if (targets.length > 1) outCount += targets.length;
      }
      branchMap[src] = outCount;
    }

    const branchingStates = Object.values(branchMap).filter((c) => c > 1).length;
    const maxBranch = Math.max(1, ...Object.values(branchMap));
    const avgBranch = (totalTransitions / Math.max(1, statesCount)).toFixed(2);

    return {
      statesCount,
      acceptCount,
      totalTransitions,
      epsCount,
      branchingStates,
      maxBranch,
      avgBranch,
    };
  }, [targetNFAB, targetBQuery]);

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

  // Undo / Redo
  const handleUndo = () => {
    if (historyStack.length === 0) return;
    const [top, ...restHistory] = historyStack;
    setRedoStack((prev) => [top, ...prev]);
    setHistoryStack(restHistory);
    setGraph(top.prevGraph);
  };

  const handleRedo = () => {
    if (redoStack.length === 0) return;
    const [top, ...restRedo] = redoStack;
    setRedoStack(restRedo);
    setHistoryStack((prev) => [top, ...prev]);
    setGraph(top.newGraph);
  };

  const toggleSection = (key: string) => {
    setExpandedSections((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      localStorage.setItem('nfa_lab_expanded_sections', JSON.stringify(next));
      return next;
    });
  };

  // NFA Operations
  type NFAOpType = 'UNION' | 'CONCAT' | 'STAR' | 'PLUS' | 'OPTIONAL' | 'REVERSE_A' | 'REVERSE_B';

  const handleRunNFAOp = (op: NFAOpType) => {
    try {
      const inputA = effectiveNFAA;
      if (!savedBaseNFAA) {
        setSavedBaseNFAA(currentNFAA);
      }
      let resNFA: NFA;
      let opName = '';
      if (op === 'UNION') {
        resNFA = NFAOperations.union(inputA, targetNFAB);
        opName = 'NFA Union (A ∪ B)';
      } else if (op === 'CONCAT') {
        resNFA = NFAOperations.concat(inputA, targetNFAB);
        opName = 'NFA Concatenation (A · B)';
      } else if (op === 'STAR') {
        resNFA = NFAOperations.star(inputA);
        opName = 'Kleene Star (A*)';
      } else if (op === 'PLUS') {
        resNFA = NFAOperations.plus(inputA);
        opName = 'Kleene Plus (A+)';
      } else if (op === 'OPTIONAL') {
        resNFA = NFAOperations.optional(inputA);
        opName = 'Optional NFA (A?)';
      } else if (op === 'REVERSE_B') {
        resNFA = NFAOperations.reverse(targetNFAB);
        opName = 'Reverse NFA B (B^R)';
      } else {
        resNFA = NFAOperations.reverse(inputA);
        opName = 'Reverse NFA A (A^R)';
      }

      const newGraph = nfaToAutomatonGraph(resNFA, `${graph.name} [${opName}]`);
      pushOperation(opName, `Executed ${opName}`, newGraph);
    } catch (e) {
      console.error(e);
    }
  };

  const triggerNFAOpWithChoice = (op: NFAOpType) => {
    const titles: Record<NFAOpType, string> = {
      UNION: 'NFA Union Operation (A ∪ B)',
      CONCAT: 'NFA Concatenation Operation (A · B)',
      STAR: 'Kleene Star Operation (A*)',
      PLUS: 'Kleene Plus Operation (A+)',
      OPTIONAL: 'Optional Operator (A?)',
      REVERSE_A: 'Reverse NFA A (A^R)',
      REVERSE_B: 'Reverse NFA B (B^R)',
    };
    const descriptions: Record<NFAOpType, string> = {
      UNION: 'Creates a start state with ε-transitions to NFA A and NFA B.',
      CONCAT: 'Connects accept states of NFA A to the start state of NFA B via ε-transitions.',
      STAR: 'Adds ε-transitions to loop back from accept states and allow zero occurrences.',
      PLUS: 'Adds ε-transitions to loop back from accept states (requires at least one match).',
      OPTIONAL: 'Adds an ε-transition directly from start to accept state.',
      REVERSE_A: 'Inverts all transition arrows and swaps start and accept states of NFA A.',
      REVERSE_B: 'Inverts all transition arrows and swaps start and accept states of NFA B.',
    };

    // Save base NFA A if not saved already
    if (!savedBaseNFAA) {
      setSavedBaseNFAA(currentNFAA);
    }

    // 1. Check if NFA A is empty
    if (!effectiveNFAA || effectiveNFAA.states.length === 0) {
      setWarningModalConfig({
        title: '⚠️ Missing Input Automaton (NFA A)',
        message: `The operation "${titles[op]}" requires a valid input NFA A. Please create or load an NFA A first.`,
      });
      return;
    }

    // 2. Check if NFA B is required but empty/unconfigured
    const requiresNFAB = op === 'UNION' || op === 'CONCAT' || op === 'REVERSE_B';
    const isNFABEmpty = !targetNFAB || targetNFAB.states.length === 0 || !targetBQuery.trim();

    if (requiresNFAB && isNFABEmpty) {
      setWarningModalConfig({
        title: '⚠️ Target Automaton (NFA B) Required',
        message: `The operation "${titles[op]}" requires both NFA A and NFA B. Please select or type a target NFA B in the "TARGET AUTOMATON (NFA B)" section above.`,
      });
      return;
    }

    setChoiceModalConfig({
      title: titles[op],
      description: descriptions[op],
      onInstant: () => handleRunNFAOp(op),
      onAnimate: () => {
        const modalOpMap: Record<NFAOpType, NFAOperationType> = {
          UNION: 'UNION',
          CONCAT: 'CONCAT',
          STAR: 'STAR',
          PLUS: 'PLUS',
          OPTIONAL: 'OPTIONAL',
          REVERSE_A: 'REV_A',
          REVERSE_B: 'REV_B',
        };
        setNfaOpModalConfig({
          operation: modalOpMap[op],
        });
      },
    });
  };

  // Conversion Tools
  const handleEpsilonRemoval = () => {
    try {
      const res = removeEpsilonTransitions(currentNFAA);
      const newGraph = nfaToAutomatonGraph(res.equivalentNFA, `${graph.name} (No ε)`);
      pushOperation('ε Removal Algorithm', `Eliminated ${res.removedEpsilonTransitions.length} ε-transitions`, newGraph);
    } catch (e) {
      console.error(e);
    }
  };

  const handleRenameStates = () => {
    try {
      const renamed = NFAOperations.renameStates(currentNFAA);
      const newGraph = nfaToAutomatonGraph(renamed, `${graph.name} (Renamed)`);
      pushOperation('Rename States', 'Renamed states into canonical q0, q1, q2 order', newGraph);
    } catch (e) {
      console.error(e);
    }
  };

  const handleRemoveUnreachable = () => {
    try {
      const cleaned = NFAOperations.removeUnreachableStates(currentNFAA);
      const newGraph = nfaToAutomatonGraph(cleaned, `${graph.name} (Cleaned)`);
      pushOperation('Remove Unreachable States', 'Pruned unreachable states from NFA', newGraph);
    } catch (e) {
      console.error(e);
    }
  };

  const handleAIExplain = (topic: string) => {
    setSidebarAiExplanation(null);
    setTimeout(() => {
      let exp = `### Deterministic AI Explanation: ${topic}\n\n`;
      exp += `**Engine Facts for current NFA (${graph.name}):**\n`;
      exp += `- Total States: ${quickAnalysis.statesCount}\n`;
      exp += `- Total Transitions: ${quickAnalysis.totalTransitions}\n`;
      exp += `- ε-Transitions: ${quickAnalysis.epsCount}\n`;
      exp += `- Branching States: ${quickAnalysis.branchingStates}\n\n`;

      if (sidebarAiStyle === 'exam') {
        exp += `**Exam Tip:** In NFA problem solving, always compute the ε-closure $ECLOSE(q)$ first before evaluating symbol transitions. Computation succeeds if ANY branch reaches an accept state!`;
      } else if (sidebarAiStyle === 'technical') {
        exp += `**Technical Formal Definition:** An NFA is a 5-tuple $M = (Q, \\Sigma, \\delta, q_0, F)$ where $\\delta: Q \\times (\\Sigma \\cup \\{\\epsilon\\}) \\rightarrow P(Q)$. Unlike DFAs, $\\delta$ maps to subsets in the powerset $P(Q)$.`;
      } else if (sidebarAiStyle === 'analogy') {
        exp += `**Real-World Analogy:** Think of an NFA like parallel process threads in a computer. At every decision point, instead of picking one route, it forks clone processes down every available branch simultaneously!`;
      } else {
        exp += `**Memory Trick:** NFA = **N**ever **F**ails **A**lone. If even 1 branch succeeds out of 100 dead branches, the entire NFA accepts!`;
      }

      setSidebarAiExplanation(exp);
    }, 300);
  };

  return (
    <div className="flex-1 min-h-0 h-full w-full bg-slate-950 text-slate-100 flex flex-col overflow-hidden select-none font-sans">
      {/* ── MAIN IDE WORKSPACE LAYOUT ── */}
      <div className="flex-1 min-h-0 flex flex-col lg:flex-row overflow-hidden relative">
        {/* ── LEFT SIDEBAR: ADVANCED NFA LABORATORY (Width: 300px) ── */}
        <div className="w-full lg:w-76 bg-slate-900/95 border-r border-slate-800 flex flex-col shrink-0 overflow-y-auto p-3 space-y-3 font-mono">
          {/* Saved States & Projects Dropdown */}
          <SavedStatesDropdown />

          {/* Educational Assistance Card */}
          <div className="p-2.5 bg-slate-950/80 border border-slate-800 rounded-2xl space-y-1.5 font-sans">
            <label className="text-[10px] font-bold text-sky-400 uppercase tracking-wider block flex items-center gap-1.5">
              <Lightbulb className="w-3.5 h-3.5 text-sky-400" /> Educational Assistance:
            </label>
            <button
              onClick={() => {
                const next = !educationalMode;
                setEducationalMode(next);
                localStorage.setItem('educational_mode_nfa_enabled', String(next));
              }}
              className={`w-full py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-between border cursor-pointer ${educationalMode
                  ? 'bg-sky-950/90 border-sky-500/50 text-sky-300 shadow-md'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
            >
              <span>{educationalMode ? 'Edu Mode: ON' : 'Edu Mode: OFF'}</span>
              <span className={`w-2 h-2 rounded-full ${educationalMode ? 'bg-sky-400 animate-pulse' : 'bg-slate-600'}`} />
            </button>
          </div>

          {/* Input Automaton (NFA A) Card */}
          <div className="p-2.5 bg-slate-950/80 border border-slate-800 rounded-2xl space-y-1.5 font-sans relative">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-bold text-sky-400 uppercase tracking-wider block">
                INPUT AUTOMATON (NFA A):
              </label>
              <span className="text-[9px] font-mono font-bold text-sky-300 bg-sky-950/60 px-1.5 py-0.5 rounded border border-sky-500/30">
                NFA
              </span>
            </div>
            <div className="relative flex items-center">
              <input
                type="text"
                value={promptInput}
                onChange={(e) => {
                  setPromptInput(e.target.value);
                  setSavedBaseNFAA(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    setSavedBaseNFAA(null);
                    generateNFAFromPrompt(promptInput);
                  }
                }}
                placeholder="Type NFA pattern..."
                className="w-full py-2 pl-3 pr-8 bg-slate-900 border border-slate-700 rounded-xl text-xs text-slate-200 font-semibold focus:outline-none focus:border-sky-500 transition font-sans"
              />
              <button
                type="button"
                onClick={() => setInputADropdownOpen((prev) => !prev)}
                className="absolute right-2 text-slate-400 hover:text-white cursor-pointer focus:outline-none p-1"
              >
                <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${inputADropdownOpen ? 'rotate-180' : ''}`} />
              </button>
            </div>

            {savedBaseNFAA && (
              <button
                type="button"
                onClick={() => {
                  const baseGraph = nfaToAutomatonGraph(savedBaseNFAA, `Input NFA A (${savedBaseNFAA.states.length} states)`);
                  setGraph(baseGraph);
                  setSavedBaseNFAA(null);
                }}
                className="w-full py-1 px-2 bg-sky-950/70 hover:bg-sky-900/90 text-sky-300 border border-sky-500/40 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 transition cursor-pointer"
                title="Restore original un-operated input NFA A onto the canvas"
              >
                <Undo2 className="w-3 h-3 text-sky-400" /> Restore Base NFA A Canvas
              </button>
            )}

            {inputADropdownOpen && (
              <div className="absolute left-0 right-0 top-full mt-1 z-50 max-h-56 overflow-y-auto bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-1 space-y-1 custom-scrollbar animate-in fade-in zoom-in-95">
                {ALL_AUTOMATA_PROMPTS.map((p, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setPromptInput(p.prompt);
                      setSavedBaseNFAA(null);
                      generateNFAFromPrompt(p.prompt);
                      setInputADropdownOpen(false);
                    }}
                    className="w-full px-2.5 py-1.5 text-left text-xs rounded-lg hover:bg-sky-600/30 hover:text-sky-200 transition flex items-center justify-between group cursor-pointer"
                  >
                    <span className="font-semibold text-slate-200 group-hover:text-white">{p.label}</span>
                    <span className="text-[10px] text-slate-400 group-hover:text-sky-300 font-mono">{p.category}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Target Automaton (NFA B - Optional) Card */}
          <div className="p-2.5 bg-slate-950/80 border border-slate-800 rounded-2xl space-y-1.5 font-sans relative">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-bold text-purple-400 uppercase tracking-wider block">
                TARGET AUTOMATON (NFA B):
              </label>
              <span className="text-[9px] font-mono font-bold text-purple-300 bg-purple-950/60 px-1.5 py-0.5 rounded border border-purple-500/30">
                COMPARISON
              </span>
            </div>
            <div className="relative flex items-center">
              <input
                type="text"
                value={targetBQuery}
                onChange={(e) => setTargetBQuery(e.target.value)}
                placeholder="Target NFA prompt..."
                className="w-full py-2 pl-3 pr-8 bg-slate-900 border border-slate-700 rounded-xl text-xs text-slate-200 font-semibold focus:outline-none focus:border-purple-500 transition"
              />
              <button
                type="button"
                onClick={() => setTargetDropdownOpen((prev) => !prev)}
                className="absolute right-2 text-slate-400 hover:text-white cursor-pointer focus:outline-none p-1"
              >
                <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${targetDropdownOpen ? 'rotate-180' : ''}`} />
              </button>
            </div>

            {targetDropdownOpen && (
              <div className="absolute left-0 right-0 top-full mt-1 z-50 max-h-56 overflow-y-auto bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-1 space-y-1 custom-scrollbar animate-in fade-in zoom-in-95">
                {ALL_AUTOMATA_PROMPTS.map((p, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setTargetBQuery(p.prompt);
                      setTargetDropdownOpen(false);
                    }}
                    className="w-full px-2.5 py-1.5 text-left text-xs rounded-lg hover:bg-purple-600/30 hover:text-purple-200 transition flex items-center justify-between group cursor-pointer"
                  >
                    <span className="font-semibold text-slate-200 group-hover:text-white">{p.label}</span>
                    <span className="text-[10px] text-slate-400 group-hover:text-purple-300 font-mono">{p.category}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* NFA Operations Group */}
          <div className="border border-slate-800/80 bg-slate-950/80 rounded-2xl font-sans">
            <button
              onClick={() => toggleSection('nfaOps')}
              className="w-full p-3 flex items-center justify-between font-bold text-xs text-slate-200 hover:text-sky-300 transition cursor-pointer"
            >
              <span className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-sky-400" /> NFA Operations
              </span>
              {expandedSections.nfaOps ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
            </button>

            {expandedSections.nfaOps && (
              <div className="p-2.5 pt-0 space-y-2">
                {[
                  { op: 'UNION' as const, label: 'Union (A ∪ B)', tag: 'UNION' },
                  { op: 'CONCAT' as const, label: 'Concatenation (A · B)', tag: 'CONCAT' },
                  { op: 'STAR' as const, label: 'Kleene Star (A*)', tag: 'STAR' },
                  { op: 'PLUS' as const, label: 'Kleene Plus (A+)', tag: 'PLUS' },
                  { op: 'OPTIONAL' as const, label: 'Optional (A?)', tag: 'OPTIONAL' },
                  { op: 'REVERSE_A' as const, label: 'Reverse A (A^R)', tag: 'REV A' },
                  { op: 'REVERSE_B' as const, label: 'Reverse B (B^R)', tag: 'REV B' },
                ].map((item) => (
                  <button
                    key={item.op}
                    onClick={() => triggerNFAOpWithChoice(item.op)}
                    className="w-full py-2 px-3 bg-slate-900 hover:bg-sky-600/30 text-slate-200 hover:text-white rounded-xl border border-slate-800 hover:border-sky-400 hover:ring-1 hover:ring-sky-400/60 hover:shadow-[0_0_15px_rgba(56,189,248,0.35)] transition-all duration-200 ease-out transform hover:-translate-y-0.5 hover:scale-[1.02] active:scale-95 text-xs font-bold text-left flex items-center justify-between group cursor-pointer"
                  >
                    <span className="flex items-center gap-1.5">
                      <Play className="w-3 h-3 text-sky-400 group-hover:text-white fill-current" />
                      {item.label}
                    </span>
                    <span className="text-[10px] text-slate-400 group-hover:text-sky-200 font-mono font-bold">
                      {item.tag}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Conversion Tools Group */}
          <div className="border border-slate-800/80 bg-slate-950/80 rounded-2xl font-sans">
            <button
              onClick={() => toggleSection('conversionTools')}
              className="w-full p-3 flex items-center justify-between font-bold text-xs text-indigo-300 hover:text-indigo-200 transition cursor-pointer"
            >
              <span className="flex items-center gap-2">
                <Cpu className="w-4 h-4 text-indigo-400" /> Conversion Tools
              </span>
              {expandedSections.conversionTools ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
            </button>

            {expandedSections.conversionTools && (
              <div className="p-2.5 pt-0 space-y-2 text-xs font-bold">
                <button
                  onClick={() => setActiveCenterView('epsilon_closure')}
                  className={`w-full py-2 px-3 rounded-xl border transition-all duration-200 ease-out transform hover:-translate-y-0.5 hover:scale-[1.02] hover:ring-1 hover:ring-purple-400/60 hover:shadow-[0_0_15px_rgba(192,132,252,0.35)] active:scale-95 text-left flex items-center justify-between text-xs font-bold cursor-pointer ${activeCenterView === 'epsilon_closure'
                      ? 'bg-purple-600 border-purple-400 text-white shadow-lg shadow-purple-600/30'
                      : 'bg-slate-900 border-slate-800 text-slate-200 hover:bg-slate-800 hover:text-white'
                    }`}
                >
                  <span className="flex items-center gap-2">
                    <Zap className="w-3.5 h-3.5 text-amber-400" /> ⚡ ε-Closure Explorer
                  </span>
                </button>
                <button
                  onClick={() => setActiveCenterView('epsilon_elimination')}
                  className={`w-full py-2 px-3 rounded-xl border transition-all duration-200 ease-out transform hover:-translate-y-0.5 hover:scale-[1.02] hover:ring-1 hover:ring-purple-400/60 hover:shadow-[0_0_15px_rgba(192,132,252,0.35)] active:scale-95 text-left flex items-center justify-between text-xs font-bold cursor-pointer ${activeCenterView === 'epsilon_elimination'
                      ? 'bg-purple-600 border-purple-400 text-white shadow-lg shadow-purple-600/30'
                      : 'bg-slate-900 border-slate-800 text-slate-200 hover:bg-slate-800 hover:text-white'
                    }`}
                >
                  <span className="flex items-center gap-2">
                    <Zap className="w-3.5 h-3.5 text-purple-400" /> Eliminate ε-Transitions
                  </span>
                </button>
              </div>
            )}
          </div>

          {/* ── NEW EDUCATIONAL COMPARISON LABORATORY MENU ── */}
          <div className="border border-slate-800/80 bg-slate-950/80 rounded-2xl font-sans">
            <button
              onClick={() => toggleSection('comparison')}
              className="w-full p-3 flex items-center justify-between font-bold text-xs text-purple-300 hover:text-purple-200 transition cursor-pointer"
            >
              <span className="flex items-center gap-2">
                <Columns className="w-4 h-4 text-purple-400" /> Comparison Laboratory
              </span>
              {expandedSections.comparison ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
            </button>

            {expandedSections.comparison && (
              <div className="p-2.5 pt-0 space-y-1.5 text-xs font-bold">
                {[
                  { id: 'nfa_vs_dfa' as const, label: '📊 NFA vs DFA Comparison', icon: Columns },
                  { id: 'branch_tree' as const, label: '🌳 Branch Tree Explorer', icon: GitFork },
                ].map((item) => {
                  const isAct = activeCenterView === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => setActiveCenterView(item.id)}
                      className={`w-full py-2 px-2.5 rounded-xl border transition-all duration-200 ease-out transform hover:-translate-y-0.5 hover:scale-[1.02] hover:ring-1 hover:ring-purple-400/60 hover:shadow-[0_0_15px_rgba(192,132,252,0.35)] active:scale-95 text-left flex items-center justify-between text-[11px] font-bold cursor-pointer ${isAct
                          ? 'bg-purple-600 border-purple-400 text-white shadow-lg shadow-purple-600/30'
                          : 'bg-slate-900 border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800'
                        }`}
                    >
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Quick Analysis Card (Engine Computed) */}
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
                {/* ── NFA A ANALYSIS ── */}
                {quickAnalysis.statesCount > 0 && (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-[10px] font-sans font-bold text-sky-400">
                      <span>NFA A (Input A)</span>
                      <span className="px-1.5 py-0.5 bg-sky-950 text-sky-300 rounded border border-sky-500/30 text-[9px]">
                        {quickAnalysis.statesCount} States
                      </span>
                    </div>
                    <div className="p-2.5 bg-slate-900/90 rounded-xl border border-slate-800 grid grid-cols-2 gap-2">
                      <div>
                        <span className="text-[8.5px] text-slate-400 uppercase font-sans font-bold block">States</span>
                        <span className="text-slate-200 font-bold">{quickAnalysis.statesCount}</span>
                      </div>
                      <div>
                        <span className="text-[8.5px] text-slate-400 uppercase font-sans font-bold block">Transitions</span>
                        <span className="text-slate-200 font-bold">{quickAnalysis.totalTransitions}</span>
                      </div>
                      <div>
                        <span className="text-[8.5px] text-purple-400 uppercase font-sans font-bold block">ε-Transitions</span>
                        <span className="text-purple-300 font-bold">{quickAnalysis.epsCount}</span>
                      </div>
                      <div>
                        <span className="text-[8.5px] text-amber-400 uppercase font-sans font-bold block">Branching</span>
                        <span className="text-amber-300 font-bold">{quickAnalysis.branchingStates}</span>
                      </div>
                      <div>
                        <span className="text-[8.5px] text-sky-400 uppercase font-sans font-bold block">Max Branch</span>
                        <span className="text-sky-300 font-bold">{quickAnalysis.maxBranch}</span>
                      </div>
                      <div>
                        <span className="text-[8.5px] text-slate-400 uppercase font-sans font-bold block">Avg Branch</span>
                        <span className="text-slate-200 font-bold">{quickAnalysis.avgBranch}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* ── NFA B ANALYSIS (Shown ONLY if NFA B is loaded & non-empty) ── */}
                {quickAnalysisB && (
                  <div className="space-y-1.5 pt-2 border-t border-slate-800/80">
                    <div className="flex items-center justify-between text-[10px] font-sans font-bold text-purple-400">
                      <span>NFA B (Target B)</span>
                      <span className="px-1.5 py-0.5 bg-purple-950 text-purple-300 rounded border border-purple-500/30 text-[9px]">
                        {quickAnalysisB.statesCount} States
                      </span>
                    </div>
                    <div className="p-2.5 bg-slate-900/90 rounded-xl border border-slate-800 grid grid-cols-2 gap-2">
                      <div>
                        <span className="text-[8.5px] text-slate-400 uppercase font-sans font-bold block">States</span>
                        <span className="text-slate-200 font-bold">{quickAnalysisB.statesCount}</span>
                      </div>
                      <div>
                        <span className="text-[8.5px] text-slate-400 uppercase font-sans font-bold block">Transitions</span>
                        <span className="text-slate-200 font-bold">{quickAnalysisB.totalTransitions}</span>
                      </div>
                      <div>
                        <span className="text-[8.5px] text-purple-400 uppercase font-sans font-bold block">ε-Transitions</span>
                        <span className="text-purple-300 font-bold">{quickAnalysisB.epsCount}</span>
                      </div>
                      <div>
                        <span className="text-[8.5px] text-amber-400 uppercase font-sans font-bold block">Branching</span>
                        <span className="text-amber-300 font-bold">{quickAnalysisB.branchingStates}</span>
                      </div>
                      <div>
                        <span className="text-[8.5px] text-purple-400 uppercase font-sans font-bold block">Max Branch</span>
                        <span className="text-purple-300 font-bold">{quickAnalysisB.maxBranch}</span>
                      </div>
                      <div>
                        <span className="text-[8.5px] text-slate-400 uppercase font-sans font-bold block">Avg Branch</span>
                        <span className="text-slate-200 font-bold">{quickAnalysisB.avgBranch}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* AI Laboratory Assistant Card */}
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
                <div className="grid grid-cols-2 gap-1 font-bold text-[10px]">
                  {[
                    { id: 'exam' as const, label: 'Exam Tip' },
                    { id: 'technical' as const, label: 'Technical' },
                    { id: 'analogy' as const, label: 'Analogy' },
                    { id: 'trick' as const, label: 'Memory Trick' },
                  ].map((s) => (
                    <button
                      key={s.id}
                      onClick={() => setSidebarAiStyle(s.id)}
                      className={`py-1 px-2 rounded-lg border transition text-center cursor-pointer ${sidebarAiStyle === s.id
                          ? 'bg-purple-600 border-purple-400 text-white shadow'
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                        }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>

                <div className="space-y-1 font-bold">
                  {[
                    'Explain ε-Closure',
                    'Explain Thompson Construction',
                    'Explain Subset Construction',
                    'Explain Active States & Branching',
                  ].map((topic) => (
                    <button
                      key={topic}
                      onClick={() => handleAIExplain(topic)}
                      className="w-full py-1.5 px-2.5 bg-slate-900 hover:bg-purple-950/60 text-slate-200 hover:text-purple-200 rounded-xl border border-slate-800 hover:border-purple-500/40 transition-all duration-200 ease-out transform hover:-translate-y-0.5 hover:scale-[1.02] hover:shadow-md active:scale-95 text-left text-[11px] flex items-center justify-between cursor-pointer"
                    >
                      <span>{topic}</span>
                      <Sparkles className="w-3 h-3 text-purple-400 shrink-0" />
                    </button>
                  ))}
                </div>

                {sidebarAiExplanation && (
                  <div className="p-3 bg-slate-950 rounded-xl border border-purple-500/30 text-slate-200 text-xs leading-relaxed space-y-1 font-sans">
                    <div className="font-bold text-purple-300 text-[11px]">AI Laboratory Explanation:</div>
                    <div className="whitespace-pre-wrap">{sidebarAiExplanation}</div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ── CENTER CANVAS & WORKSPACE AREA ── */}
        <div className="flex-1 relative flex flex-col overflow-hidden bg-slate-950">
          {/* Sleek Integrated IDE Workspace Header Bar */}
          <div className="px-3.5 py-2 bg-slate-950 border-b border-slate-800 flex items-center justify-between gap-3 shrink-0 font-sans select-none overflow-x-auto scrollbar-none">
            {/* Left: Active Graph Title & Metadata Pill */}
            <div className="flex items-center gap-2.5 min-w-0 shrink-0">
              <div className="p-1 bg-indigo-500/10 border border-indigo-500/20 rounded-lg text-indigo-400 shrink-0">
                <Activity className="w-4 h-4" />
              </div>
              <div className="flex items-center gap-2 truncate">
                <span className="text-xs text-slate-400 font-medium shrink-0">Active Graph:</span>
                <span className="text-xs font-bold text-white font-mono truncate max-w-[260px]" title={graph.name || 'Current NFA'}>
                  {graph.name || 'Current NFA'}
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

              {/* View Switcher: Canvas vs Active Lab View */}
              <div className="flex items-center gap-1.5">
                {activeCenterView !== 'canvas' && (
                  <button
                    onClick={() => setActiveCenterView('canvas')}
                    className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-sm border border-slate-700"
                  >
                    Return to Canvas
                  </button>
                )}

                {activeCenterView === 'canvas' && (
                  <span className="text-slate-400 font-mono text-[11px] flex items-center gap-1">
                    <span>View:</span>
                    <span className="text-indigo-300 font-bold">Interactive Graph</span>
                  </span>
                )}
              </div>

              {/* Dual View Option Toggle */}
              <button
                onClick={() => setIsDualCanvas((prev) => !prev)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition border flex items-center gap-1.5 cursor-pointer shadow ${isDualCanvas
                    ? 'bg-purple-600 border-purple-400 text-white shadow-purple-600/30'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                title="Toggle side-by-side Dual View (NFA A & NFA B)"
              >
                <Columns className="w-3.5 h-3.5" />
                <span>Dual View</span>
              </button>
            </div>
          </div>

          {/* Center Display Container */}
          <div className="flex-1 relative overflow-hidden">
            {activeCenterView === 'canvas' && (
              isDualCanvas ? (
                <div className="w-full h-full p-4 bg-slate-950 flex flex-col">
                  <div className="flex-1 bg-slate-900 border border-slate-800 rounded-2xl p-3 shadow-2xl flex flex-col min-h-[500px]">
                    <MiniAutomataGraph
                      graph={dualMergedGraph}
                      title="Dual View Canvas (NFA A & NFA B on Same Canvas)"
                      accentColor="#a855f7"
                      svgH={560}
                    />
                  </div>
                </div>
              ) : (
                <AutomataCanvas />
              )
            )}

            {activeCenterView === 'nfa_vs_dfa' && (
              <div className="p-6 h-full overflow-y-auto">
                <NFADFAEquivalenceComparison nfa={currentNFAA} />
              </div>
            )}

            {activeCenterView === 'branch_tree' && (
              <div className="p-6 h-full overflow-y-auto">
                <NFABranchTreeLabView nfa={currentNFAA} />
              </div>
            )}

            {activeCenterView === 'subset_construction' && (
              <div className="p-6 h-full overflow-y-auto">
                <NFASubsetConstructionLabView nfa={currentNFAA} />
              </div>
            )}

            {activeCenterView === 'thompson_construction' && (
              <div className="p-6 h-full overflow-y-auto">
                <NFAThompsonConstructionLabView nfa={currentNFAA} regexStr={promptInput || '(a|b)*abb'} />
              </div>
            )}

            {activeCenterView === 'epsilon_closure' && (
              <div className="p-6 h-full overflow-y-auto">
                <NFAEpsilonClosureLabView nfa={currentNFAA} />
              </div>
            )}

            {activeCenterView === 'epsilon_elimination' && (
              <div className="p-6 h-full overflow-y-auto">
                <NFAEpsilonEliminationLabView nfa={currentNFAA} nfaB={targetNFAB} />
              </div>
            )}
          </div>
        </div>

        {/* ── RIGHT INSPECTOR PANEL (Wider & Resizable) ── */}
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
          className="w-full lg:w-auto bg-slate-900/90 border-l border-slate-800 shrink-0 flex flex-col overflow-hidden"
        >
          <NFAInspectorPanel
            nfa={currentNFAA}
            graph={graph}
            promptDescription={promptInput}
            activeTab={rightTab}
            onTabChange={(t) => setRightTab(t)}
          />
        </div>
      </div>

      {/* Choice Modal */}
      {choiceModalConfig && (
        <AlgorithmChoiceModal
          title={choiceModalConfig.title}
          description={choiceModalConfig.description}
          onClose={() => setChoiceModalConfig(null)}
          onBuildInstantly={() => {
            choiceModalConfig.onInstant();
            setChoiceModalConfig(null);
          }}
          onAnimateAndLearn={() => {
            choiceModalConfig.onAnimate();
            setChoiceModalConfig(null);
          }}
        />
      )}

      {/* Interactive NFA Operation Visualizer Modal (Animate & Learn) */}
      {nfaOpModalConfig && (
        <AnimatedNFAOperationModal
          nfaA={effectiveNFAA}
          nfaB={targetNFAB}
          operation={nfaOpModalConfig.operation}
          onClose={() => setNfaOpModalConfig(null)}
          onApplyResult={(resGraph) => {
            pushOperation('NFA Operation Algorithm', 'Loaded algorithm result onto main canvas', resGraph);
            setNfaOpModalConfig(null);
          }}
        />
      )}

      {/* Warning Modal for Missing Automaton Requirement */}
      {warningModalConfig && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-amber-500/40 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 font-sans animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-amber-500/20 text-amber-400 rounded-2xl border border-amber-500/30 shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-white">{warningModalConfig.title}</h3>
                <p className="text-xs text-amber-300 font-medium">Action Requires Target NFA B</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed bg-slate-950/70 p-3.5 rounded-2xl border border-slate-800 font-mono">
              {warningModalConfig.message}
            </p>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setWarningModalConfig(null)}
                className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl transition cursor-pointer shadow-lg shadow-amber-500/20"
              >
                Got It, Thanks
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdvancedNFAView;
