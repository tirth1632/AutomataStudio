import React, { useState } from 'react';
import {
  Sparkles,
  Play,
  Table,
  Activity,
  BookOpen,
  HelpCircle,
  Wand2,
  Bot,
  Loader2,
  Search,
  Terminal,
  Layers,
  ArrowRightLeft,
  ShieldCheck,
  Download,
  FileText,
  Code,
  FileSpreadsheet,
  Copy,
  CheckCircle2,
  AlertTriangle,
  X,
  GraduationCap,
} from 'lucide-react';
import { useAutomata } from '../../context/AutomataContext';
import { AutomataCanvas } from '../canvas/AutomataCanvas';
import { NFAFormalDefinitionPanel } from '../nfa/NFAFormalDefinitionPanel';
import { NFATransitionTablePanel } from '../nfa/NFATransitionTablePanel';
import { NFALanguageExplanationPanel } from '../nfa/NFALanguageExplanationPanel';
import { NFAStringTesterPanel } from '../nfa/NFAStringTesterPanel';
import { DFAStatisticsPanel } from '../dfa/DFAStatisticsPanel';
import { DFAStateInspectorPanel } from '../dfa/DFAStateInspectorPanel';
import { DFADebugPanel } from '../dfa/DFADebugPanel';
import { DFAHelpPanel } from '../dfa/DFAHelpPanel';
import { ProviderSelector } from '../ai/ProviderSelector';
import { ResizableBottomPanel } from '../common/ResizableBottomPanel';
import { ScrollablePromptRow } from '../common/ScrollablePromptRow';
import { SavedStatesDropdown } from '../common/SavedStatesDropdown';
import { NFALanguageAnalysisPanel } from '../nfa/NFALanguageAnalysisPanel';
import { NFAToDFAStepByStepModal } from '../nfa/NFAToDFAStepByStepModal';
import type { NFA } from '../../algorithms/nfa/NFA';
import type { AutomatonGraph } from '../../types/automata';
import { convertNfaToDfa } from '../../algorithms/subsetConstruction';
import { applyDagreLayout } from '../../services/layoutEngine';
import { ALL_AUTOMATA_PROMPTS } from '../../data/allAutomataPrompts';
import {
  generateAcademicPDFReport,
  exportToLaTeX,
  exportToCSV,
  exportToJSON,
  exportToJFLAP,
  downloadFile,
} from '../../utils/exportUtils';

type NFATabId =
  | 'formal-def'
  | 'transition-table'
  | 'string-tester'
  | 'state-inspector'
  | 'language-analysis'
  | 'statistics'
  | 'debug'
  | 'explanation'
  | 'help';

interface NFAValidationReport {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

function validateNFAStructure(graph: AutomatonGraph): NFAValidationReport {
  const errors: string[] = [];
  const warnings: string[] = [];

  const stateIds = new Set(graph.states.map((s) => s.id));
  const startStates = graph.states.filter((s) => s.isStart);
  const acceptStates = graph.states.filter((s) => s.isAccept);

  // 1. Valid start state
  if (startStates.length === 0) {
    errors.push('No start state defined. Please mark at least one state as Start.');
  }

  // 2. At least one accept state
  if (acceptStates.length === 0) {
    warnings.push('No accept states defined. The NFA will reject all input strings.');
  }

  // 3. Duplicate state detection & missing labels
  const seenLabels = new Set<string>();
  for (const s of graph.states) {
    if (!s.label || !s.label.trim()) {
      warnings.push(`State '${s.id}' is missing a human-readable label.`);
    }
    if (seenLabels.has(s.id)) {
      errors.push(`Duplicate state ID detected: '${s.id}'.`);
    }
    seenLabels.add(s.id);
  }

  // 4. Transitions reference existing states & valid symbols
  for (const t of graph.transitions) {
    if (!stateIds.has(t.source)) {
      errors.push(`Transition references missing source state '${t.source}'.`);
    }
    if (!stateIds.has(t.target)) {
      errors.push(`Transition references missing target state '${t.target}'.`);
    }
    if (!t.symbols || t.symbols.length === 0) {
      warnings.push(`Transition between '${t.source}' and '${t.target}' has no symbol label.`);
    }
  }

  // 5. Unreachable states (BFS from start state)
  const reachable = new Set<string>();
  const queue = startStates.map((s) => s.id);
  queue.forEach((id) => reachable.add(id));

  while (queue.length > 0) {
    const current = queue.shift()!;
    const outgoing = graph.transitions.filter((t) => t.source === current);
    for (const edge of outgoing) {
      if (!reachable.has(edge.target) && stateIds.has(edge.target)) {
        reachable.add(edge.target);
        queue.push(edge.target);
      }
    }
  }

  for (const s of graph.states) {
    if (!reachable.has(s.id)) {
      warnings.push(`State '${s.label || s.id}' is unreachable from start state.`);
    }
  }

  // 6. Dead states (cannot reach any accept state)
  const canReachAccept = new Set<string>(acceptStates.map((s) => s.id));
  let added = true;
  while (added) {
    added = false;
    for (const t of graph.transitions) {
      if (canReachAccept.has(t.target) && !canReachAccept.has(t.source)) {
        canReachAccept.add(t.source);
        added = true;
      }
    }
  }

  for (const s of graph.states) {
    if (reachable.has(s.id) && !canReachAccept.has(s.id)) {
      warnings.push(`State '${s.label || s.id}' is a dead state (cannot reach accept state).`);
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

const NFA_EXAMPLES = [
  { label: 'Contains 110', intent: { type: 'CONTAINS', pattern: '110' }, desc: 'Substring 110 detector' },
  { label: 'Ends 101', intent: { type: 'ENDS_WITH', pattern: '101' }, desc: 'Suffix 101 pattern' },
  { label: 'Starts 01', intent: { type: 'STARTS_WITH', pattern: '01' }, desc: 'Prefix 01 pattern' },
  { label: 'Contains 111', intent: { type: 'CONTAINS', pattern: '111' }, desc: 'Consecutive 111s' },
  { label: 'Regex (0|1)*101', intent: { type: 'REGEX', regexStr: '(0|1)*101' }, desc: 'Kleene star NFA' },
  { label: 'Regex 0*1*', intent: { type: 'REGEX', regexStr: '0*1*' }, desc: 'ε-NFA sequence' },
  { label: 'Regex (a|b)*abb', intent: { type: 'REGEX', regexStr: '(a|b)*abb' }, desc: 'Branching NFA' },
  { label: 'Finite Set', intent: { type: 'FINITE_LANGUAGE', patterns: ['101', '111', '001'] }, desc: 'Multiple accept states' },
];

export const NFAWorkspace: React.FC = () => {
  const {
    graph,
    setGraph,
    promptInput,
    setPromptInput,
    simulationSteps,
    currentStepIndex,
    isGenerating,
    generateNFAFromPrompt,
  } = useAutomata();

  const [activeTab, setActiveTab] = useState<NFATabId>('formal-def');
  const [currentPrompt, setCurrentPrompt] = useState<string>('Binary strings containing 101');

  // Export Menu State
  const [showExportMenu, setShowExportMenu] = useState<boolean>(false);

  // Validation Report Modal State
  const [validationReport, setValidationReport] = useState<NFAValidationReport | null>(null);

  // Step-by-Step Conversion Modal State
  const [showStepByStepModal, setShowStepByStepModal] = useState<boolean>(false);

  // Reconstruct structural NFA object from graph state for panels
  const currentNFA: NFA = React.useMemo(() => {
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

    return {
      alphabet,
      states,
      startState,
      acceptStates,
      transitions,
    };
  }, [graph]);

  const handleGenerate = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!promptInput.trim()) return;
    setCurrentPrompt(promptInput);
    generateNFAFromPrompt(promptInput);
  };

  const handleApplyPreset = (item: (typeof NFA_EXAMPLES)[0]) => {
    setPromptInput(item.label);
    setCurrentPrompt(item.desc);
    generateNFAFromPrompt(item.label);
  };

  const handleConvertToDFA = () => {
    try {
      const { dfaGraph } = convertNfaToDfa(graph);
      const laidOut = applyDagreLayout(dfaGraph);
      setGraph(laidOut);
    } catch (err) {
      console.error('NFA to DFA conversion error:', err);
    }
  };

  const handleValidateNFA = () => {
    const report = validateNFAStructure(graph);
    setValidationReport(report);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-950 text-slate-100 overflow-hidden select-none">
      {/* Workspace Body */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden relative">
        {/* Left Control Drawer / Preset Bar (Width: w-96 matching DFA) */}
        <div className="w-full lg:w-96 bg-slate-900/90 border-r border-slate-800 overflow-y-auto p-4 space-y-4 shrink-0">
          {/* AI Provider selector card */}
          <div className="bg-slate-950/60 border border-slate-800/60 rounded-2xl p-3 space-y-2">
            <div className="flex items-center gap-1.5 text-[10px] font-bold text-sky-400 uppercase tracking-wider">
              <Sparkles className="w-4 h-4" /> NFA AI Generator
            </div>
            <ProviderSelector />
          </div>

          {/* AI Automaton Generator Section */}
          <div className="bg-slate-950/60 border border-slate-800/60 rounded-2xl p-3 space-y-2">
            <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              <Wand2 className="w-3 h-3 text-sky-400" /> Generate NFA with AI
            </div>

            {/* Horizontal Scrollable Question Prompts by NFA Concept */}
            <ScrollablePromptRow
              prompts={ALL_AUTOMATA_PROMPTS}
              onSelectPrompt={(promptStr) => {
                setPromptInput(promptStr);
                setCurrentPrompt(promptStr);
                generateNFAFromPrompt(promptStr);
              }}
              accentColor="sky"
            />

            <textarea
              rows={3}
              value={promptInput}
              onChange={(e) => setPromptInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleGenerate();
                }
              }}
              placeholder="Describe NFA language (e.g. 'Contains 110', 'Ends with 101', 'Regex (0|1)*101')..."
              className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500 transition resize-none overflow-hidden font-mono leading-relaxed"
            />
            <button
              onClick={handleGenerate}
              disabled={isGenerating || !promptInput.trim()}
              className="w-full py-2.5 bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white font-bold rounded-xl text-xs shadow-lg hover:shadow-sky-500/25 hover:-translate-y-0.5 hover:scale-[1.02] transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 active:scale-[0.98]"
            >
              {isGenerating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Bot className="w-3.5 h-3.5" />}
              {isGenerating ? 'Generating NFA...' : 'Generate NFA'}
            </button>
          </div>

          {/* ── NFA Operations & Export Toolbar (Exact match of DFA Operations card) ── */}
          <div className="bg-slate-950/60 border border-slate-800/60 rounded-2xl p-3 space-y-2 relative">
            <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              <span className="flex items-center gap-1.5">
                <Layers className="w-3 h-3 text-sky-400" /> NFA Operations & Export
              </span>
            </div>

            <div className="grid grid-cols-2 gap-1.5 text-xs font-bold">
              <button
                onClick={handleConvertToDFA}
                className="px-2 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-xl shadow-lg shadow-sky-600/30 hover:shadow-sky-500/40 hover:-translate-y-0.5 hover:scale-[1.04] transition-all duration-200 flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer"
                title="Convert NFA to equivalent DFA using Subset Construction"
              >
                <ArrowRightLeft className="w-3.5 h-3.5" /> Convert to DFA
              </button>

              <button
                onClick={() => setShowStepByStepModal(true)}
                className="px-2 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl shadow-lg shadow-indigo-600/30 hover:shadow-indigo-500/40 hover:-translate-y-0.5 hover:scale-[1.04] transition-all duration-200 flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer"
                title="Interactive step-by-step Subset Construction demonstration"
              >
                <GraduationCap className="w-3.5 h-3.5 text-indigo-200" /> Step-by-Step
              </button>
            </div>

            <div className="grid grid-cols-1 gap-1.5 text-xs font-bold pt-0.5">
              <button
                onClick={handleValidateNFA}
                className="w-full py-1.5 bg-slate-800/90 hover:bg-emerald-600 hover:text-white border border-slate-700/60 hover:border-emerald-400 text-slate-200 rounded-xl shadow hover:shadow-emerald-500/25 hover:-translate-y-0.5 hover:scale-[1.02] transition-all duration-200 flex items-center justify-center gap-1.5 active:scale-95 group cursor-pointer"
                title="Verify NFA correctness and check structure"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 group-hover:text-white transition-colors" /> Validate NFA
              </button>
            </div>

            {/* Export Report Multi-Format Button */}
            <div className="relative pt-1">
              <button
                onClick={() => setShowExportMenu((prev: boolean) => !prev)}
                className="w-full py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold rounded-xl text-xs shadow-lg hover:shadow-emerald-500/30 hover:-translate-y-0.5 hover:scale-[1.02] transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" /> Export Report & Formats
              </button>

              {showExportMenu && (
                <div className="absolute left-0 right-0 top-full mt-1 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-2 z-30 space-y-1 font-mono text-xs">
                  <button
                    onClick={() => {
                      generateAcademicPDFReport(graph, currentPrompt);
                      setShowExportMenu(false);
                    }}
                    className="w-full p-2 hover:bg-sky-950 hover:text-sky-300 text-left rounded-lg transition flex items-center gap-2 text-slate-200 font-bold cursor-pointer"
                  >
                    <FileText className="w-4 h-4 text-emerald-400" /> Academic PDF Report
                  </button>

                  <button
                    onClick={() => {
                      const latexCode = exportToLaTeX(graph);
                      downloadFile(latexCode, `${graph.name}_nfa_tikz.tex`, 'text/plain');
                      setShowExportMenu(false);
                    }}
                    className="w-full p-2 hover:bg-sky-950 hover:text-sky-300 text-left rounded-lg transition flex items-center gap-2 text-slate-200 font-bold cursor-pointer"
                  >
                    <Code className="w-4 h-4 text-sky-400" /> LaTeX TikZ Code (.tex)
                  </button>

                  <button
                    onClick={() => {
                      const csvCode = exportToCSV(graph);
                      downloadFile(csvCode, `${graph.name}_transition_matrix.csv`, 'text/csv');
                      setShowExportMenu(false);
                    }}
                    className="w-full p-2 hover:bg-sky-950 hover:text-sky-300 text-left rounded-lg transition flex items-center gap-2 text-slate-200 font-bold cursor-pointer"
                  >
                    <FileSpreadsheet className="w-4 h-4 text-purple-400" /> CSV Transition Matrix (.csv)
                  </button>

                  <button
                    onClick={() => {
                      const jsonCode = exportToJSON(graph);
                      downloadFile(jsonCode, `${graph.name}_nfa.json`, 'application/json');
                      setShowExportMenu(false);
                    }}
                    className="w-full p-2 hover:bg-sky-950 hover:text-sky-300 text-left rounded-lg transition flex items-center gap-2 text-slate-200 font-bold cursor-pointer"
                  >
                    <Code className="w-4 h-4 text-amber-400" /> Standard JSON (.json)
                  </button>

                  <button
                    onClick={() => {
                      const jflapCode = exportToJFLAP(graph);
                      downloadFile(jflapCode, `${graph.name}_jflap.jff`, 'application/xml');
                      setShowExportMenu(false);
                    }}
                    className="w-full p-2 hover:bg-sky-950 hover:text-sky-300 text-left rounded-lg transition flex items-center gap-2 text-slate-200 font-bold cursor-pointer"
                  >
                    <FileText className="w-4 h-4 text-rose-400" /> JFLAP XML (.jff)
                  </button>

                  <button
                    onClick={() => {
                      const formalDef = `NFA M = (Q, Σ, δ, q₀, F)\nQ = {${currentNFA.states.join(', ')}}\nΣ = {${currentNFA.alphabet.join(', ')}}\nq0 = ${currentNFA.startState}\nF = {${currentNFA.acceptStates.join(', ')}}`;
                      navigator.clipboard.writeText(formalDef);
                      setShowExportMenu(false);
                    }}
                    className="w-full p-2 hover:bg-sky-950 hover:text-sky-300 text-left rounded-lg transition flex items-center gap-2 text-slate-200 font-bold cursor-pointer"
                  >
                    <Copy className="w-4 h-4 text-sky-400" /> Copy Formal Definition
                  </button>

                  <button
                    onClick={() => {
                      const csvCode = exportToCSV(graph);
                      navigator.clipboard.writeText(csvCode);
                      setShowExportMenu(false);
                    }}
                    className="w-full p-2 hover:bg-sky-950 hover:text-sky-300 text-left rounded-lg transition flex items-center gap-2 text-slate-200 font-bold cursor-pointer"
                  >
                    <Copy className="w-4 h-4 text-teal-400" /> Copy Transition Table
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Preset Automata Coursework Examples (2 Columns Grid matching DFA) */}
          <div className="space-y-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              NFA Coursework Examples ({NFA_EXAMPLES.length}):
            </span>
            <div className="grid grid-cols-2 gap-1.5">
              {NFA_EXAMPLES.map((ex, idx) => (
                <button
                  key={idx}
                  onClick={() => handleApplyPreset(ex)}
                  className="px-2.5 py-2 bg-slate-950/80 hover:bg-sky-950/80 border border-slate-800/80 hover:border-sky-500/60 text-left rounded-xl transition-all duration-200 hover:-translate-y-0.5 hover:scale-[1.03] hover:shadow-md hover:shadow-sky-500/10 group cursor-pointer active:scale-95"
                >
                  <span className="block font-bold text-sky-300 text-[11px] group-hover:text-white transition-colors">
                    {ex.label}
                  </span>
                  <span className="block text-[10px] text-slate-500 group-hover:text-slate-300 truncate transition-colors">
                    {ex.desc}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Saved States & Diagrams Dropdown Repository */}
          <SavedStatesDropdown />

          {/* Educational NFA Note */}
          <div className="p-3 bg-sky-950/30 border border-sky-500/30 rounded-2xl space-y-1.5 text-sky-200 text-xs">
            <div className="flex items-center gap-1.5 font-bold text-sky-300">
              <HelpCircle className="w-4 h-4 text-sky-400 shrink-0" />
              Nondeterminism Explained
            </div>
            <p className="text-[11px] text-sky-200/90 leading-relaxed">
              In an NFA, a state can have multiple transitions for the same symbol or epsilon (ε) transitions. Execution explores concurrent paths simultaneously.
            </p>
          </div>
        </div>

        {/* Center Panel: React Flow Canvas */}
        <div className="flex-1 relative flex flex-col overflow-hidden bg-slate-950">
          <div className="flex-1 relative">
            <AutomataCanvas />
          </div>

          {/* ── Dynamic Resizable Bottom Panel ── */}
          <ResizableBottomPanel
            defaultHeight={420}
            minHeight={120}
            maxHeightRatio={0.85}
            storageKey="nfa_workspace_panel_height"
            tabsHeader={
              <div className="w-full flex items-center justify-start gap-1.5 sm:gap-2 px-3 py-2 bg-slate-950/90 border-b border-slate-800/80 overflow-x-auto shrink-0 no-scrollbar">
                {[
                  { id: 'formal-def', label: 'Formal Definition', icon: BookOpen },
                  { id: 'transition-table', label: 'Transition Table', icon: Table },
                  { id: 'string-tester', label: 'String Tester', icon: Play },
                  { id: 'state-inspector', label: 'State Inspector', icon: Search },
                  { id: 'language-analysis', label: 'Language Analysis', icon: Activity },
                  { id: 'statistics', label: 'Statistics', icon: Activity },
                  { id: 'debug', label: 'Debug & Analysis', icon: Terminal },
                  { id: 'explanation', label: 'Explanation', icon: HelpCircle },
                  { id: 'help', label: 'Theory Guide', icon: BookOpen },
                ].map((tab) => {
                  const Icon = tab.icon;
                  const isSel = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id as NFATabId)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all duration-200 flex items-center gap-1.5 shrink-0 hover:-translate-y-0.5 hover:scale-105 active:scale-95 ${
                        isSel
                          ? 'bg-sky-600 text-white shadow-md shadow-sky-600/30'
                          : 'text-slate-400 hover:text-slate-100 hover:bg-sky-950/60 hover:border-sky-500/40 border border-transparent'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      {tab.label}
                    </button>
                  );
                })}
              </div>
            }
          >
            {activeTab === 'formal-def' && (
              <NFAFormalDefinitionPanel nfa={currentNFA} promptDescription={currentPrompt} />
            )}
            {activeTab === 'transition-table' && (
              <NFATransitionTablePanel
                nfa={currentNFA}
                activeStates={simulationSteps[currentStepIndex]?.currentStateIds || []}
              />
            )}
            {activeTab === 'string-tester' && (
              <NFAStringTesterPanel nfa={currentNFA} promptDescription={currentPrompt} />
            )}
            {activeTab === 'state-inspector' && <DFAStateInspectorPanel graph={graph} />}
            {activeTab === 'language-analysis' && <NFALanguageAnalysisPanel nfa={currentNFA} />}
            {activeTab === 'statistics' && <DFAStatisticsPanel graph={graph} />}
            {activeTab === 'debug' && <DFADebugPanel graph={graph} promptDescription={currentPrompt} />}
            {activeTab === 'explanation' && (
              <NFALanguageExplanationPanel nfa={currentNFA} promptDescription={currentPrompt} />
            )}
            {activeTab === 'help' && <DFAHelpPanel />}
          </ResizableBottomPanel>
        </div>
      </div>

      {/* ── NFA Validation Report Modal ── */}
      {validationReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200 p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl w-[500px] max-w-full text-slate-100 p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                {validationReport.isValid && validationReport.warnings.length === 0 ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-amber-400" />
                )}
                <h3 className="font-bold text-sm">NFA Validation Report</h3>
              </div>
              <button
                onClick={() => setValidationReport(null)}
                className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {validationReport.isValid && validationReport.warnings.length === 0 ? (
              <div className="p-4 bg-emerald-950/40 border border-emerald-500/40 rounded-xl flex items-center gap-3 text-emerald-200 text-xs font-semibold">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                NFA is 100% valid! All structural, start state, accept state, and reachability checks passed cleanly.
              </div>
            ) : (
              <div className="space-y-3 max-h-60 overflow-y-auto font-mono text-xs">
                {validationReport.errors.map((err: string, idx: number) => (
                  <div key={idx} className="p-2.5 bg-rose-950/40 border border-rose-500/40 rounded-xl text-rose-300 flex items-start gap-2">
                    <X className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                    <span>{err}</span>
                  </div>
                ))}
                {validationReport.warnings.map((warn: string, idx: number) => (
                  <div key={idx} className="p-2.5 bg-amber-950/40 border border-amber-500/40 rounded-xl text-amber-300 flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <span>{warn}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setValidationReport(null)}
                className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white font-bold rounded-xl text-xs transition cursor-pointer"
              >
                Close Report
              </button>
            </div>
          </div>
        </div>
      )}
      {/* ── NFA → DFA Interactive Step-by-Step Stepper Modal ── */}
      {showStepByStepModal && (
        <NFAToDFAStepByStepModal
          isOpen={showStepByStepModal}
          nfaGraph={graph}
          onClose={() => setShowStepByStepModal(false)}
          onApplyDFA={(dfaGraph) => {
            setGraph(dfaGraph);
            setShowStepByStepModal(false);
          }}
        />
      )}
    </div>
  );
};
