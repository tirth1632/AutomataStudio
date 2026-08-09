import React, { useState } from 'react';
import {
  Sparkles,
  Play,
  Table,
  Activity,
  BookOpen,
  HelpCircle,
  Scissors,
  CheckCircle2,
  Download,
  Layers,
  Wand2,
  Bot,
  Loader2,
  Search,
  Terminal,
  FileText,
  Code,
  FileSpreadsheet,
} from 'lucide-react';
import { useAutomata } from '../../context/AutomataContext';
import { AutomataCanvas } from '../canvas/AutomataCanvas';
import { DFAFormalDefinitionPanel } from '../dfa/DFAFormalDefinitionPanel';
import { DFATransitionTablePanel } from '../dfa/DFATransitionTablePanel';
import { DFAStatisticsPanel } from '../dfa/DFAStatisticsPanel';
import { DFAStringTesterPanel } from '../dfa/DFAStringTesterPanel';
import { DFAStateInspectorPanel } from '../dfa/DFAStateInspectorPanel';
import { DFADebugPanel } from '../dfa/DFADebugPanel';
import { DFALanguageExplanationPanel } from '../dfa/DFALanguageExplanationPanel';
import { DFAHelpPanel } from '../dfa/DFAHelpPanel';
import { DFAMinimizationModal } from '../dfa/DFAMinimizationModal';
import { ProviderSelector } from '../ai/ProviderSelector';
import { ResizableBottomPanel } from '../common/ResizableBottomPanel';
import { ScrollablePromptRow } from '../common/ScrollablePromptRow';
import { SavedStatesDropdown } from '../common/SavedStatesDropdown';
import { NFALanguageAnalysisPanel } from '../nfa/NFALanguageAnalysisPanel';
import { PRESET_EXAMPLES } from '../../data/presetAutomata';
import { TrapStateGenerator } from '../../algorithms/AutomataEngine/DFAGenerators/TrapStateGenerator';
import { graphToDFA, dfaToGraph } from '../../utils/dfaAdapter';
import type { NFA } from '../../algorithms/nfa/NFA';
import {
  generateAcademicPDFReport,
  exportToLaTeX,
  exportToCSV,
  exportToJSON,
  exportToJFLAP,
  downloadFile,
} from '../../utils/exportUtils';

type DFATabId =
  | 'formal-def'
  | 'transition-table'
  | 'string-tester'
  | 'state-inspector'
  | 'language-analysis'
  | 'statistics'
  | 'debug'
  | 'explanation'
  | 'help';

import { ALL_AUTOMATA_PROMPTS } from '../../data/allAutomataPrompts';

const DFA_EXAMPLES = [
  { label: 'Even 0s', prompt: 'Even number of 0s', desc: 'Accepts strings with even number of 0s', presetIdx: 0 },
  { label: 'Even 1s', prompt: 'Even number of 1s', desc: 'Accepts strings with even number of 1s', presetIdx: 0 },
  { label: 'Ends 101', prompt: 'Binary strings ending with 101', desc: 'Suffix 101 pattern matching', presetIdx: 1 },
  { label: 'Starts 001', prompt: 'Binary strings starting with 001', desc: 'Prefix 001 matching', presetIdx: 2 },
  { label: 'Contains 110', prompt: 'Strings containing 110', desc: 'Substring 110 detector', presetIdx: 2 },
  { label: 'Div by 3', prompt: 'Binary numbers divisible by 3', desc: 'Modulo 3 arithmetic DFA', presetIdx: 3 },
  { label: 'Length = 4', prompt: 'Binary strings of length exactly 4', desc: 'Fixed length constraint', presetIdx: 0 },
  { label: '2nd Last 1', prompt: 'Second last symbol is 1', desc: 'Memory of last 2 symbols', presetIdx: 1 },
];

export const DFAWorkspace: React.FC = () => {
  const {
    graph,
    setGraph,
    promptInput,
    setPromptInput,
    simulationSteps,
    currentStepIndex,
    isGenerating,
    generateFromPrompt,
  } = useAutomata();

  const [activeTab, setActiveTab] = useState<DFATabId>('formal-def');
  const [currentPrompt, setCurrentPrompt] = useState<string>('Even number of 0s');

  // Hopcroft Minimization Interactive Modal State
  const [showMinimizationModal, setShowMinimizationModal] = useState<boolean>(false);

  // Multi-Format Export Menu State
  const [showExportMenu, setShowExportMenu] = useState<boolean>(false);

  // Convert graph state to NFA structure for Language Analysis
  const currentNFA: NFA = React.useMemo(() => {
    const pureDFA = graphToDFA(graph);
    return {
      alphabet: pureDFA.alphabet,
      states: pureDFA.states,
      startState: pureDFA.startState,
      acceptStates: pureDFA.acceptStates,
      transitions: Object.fromEntries(
        Object.entries(pureDFA.transitions).map(([src, map]) => [
          src,
          Object.fromEntries(Object.entries(map).map(([sym, target]) => [sym, target ? [target] : []])),
        ])
      ),
    };
  }, [graph]);

  const handleGenerate = (promptToUse?: string) => {
    const prompt = promptToUse || promptInput;
    if (!prompt.trim()) return;
    setPromptInput(prompt);
    setCurrentPrompt(prompt);
    generateFromPrompt(prompt);
  };

  const handleLoadExample = (ex: (typeof DFA_EXAMPLES)[0]) => {
    setPromptInput(ex.prompt);
    setCurrentPrompt(ex.prompt);
    if (PRESET_EXAMPLES[ex.presetIdx]) {
      setGraph(PRESET_EXAMPLES[ex.presetIdx].graph);
    } else {
      generateFromPrompt(ex.prompt);
    }
  };

  const handleOpenMinimizationModal = () => {
    setShowMinimizationModal(true);
  };

  const handleCompleteDFA = () => {
    try {
      const pureDFA = graphToDFA(graph);
      const completeDFA = TrapStateGenerator.completeDFA(pureDFA);
      const adapted = dfaToGraph(completeDFA, `${graph.name} (Completed)`);
      setGraph(adapted);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-950 text-slate-100 overflow-hidden select-none">
      {/* ── Split Body Layout ── */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden relative">
        {/* Left Control Drawer: Quick Examples, AI Generator & Operations */}
        <div className="w-full lg:w-96 bg-slate-900/90 border-r border-slate-800 overflow-y-auto p-4 space-y-4 shrink-0">
          {/* AI Provider Config */}
          <div className="bg-slate-950/60 border border-slate-800/60 rounded-2xl p-3 space-y-2">
            <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" /> AI Provider
            </div>
            <ProviderSelector />
          </div>

          {/* AI DFA Generator Card */}
          <div className="bg-slate-950/60 border border-slate-800/60 rounded-2xl p-3 space-y-2 relative">
            <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              <Wand2 className="w-3.5 h-3.5 text-indigo-400" /> Generate DFA with AI
            </div>

            {/* Horizontal Scrollable Question Prompts by DFA Concept */}
            <ScrollablePromptRow
              prompts={ALL_AUTOMATA_PROMPTS}
              onSelectPrompt={handleGenerate}
              accentColor="indigo"
            />

            <textarea
              rows={3}
              value={promptInput}
              onChange={(e) => setPromptInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleGenerate(promptInput);
              }}
              placeholder="Generate a DFA for binary strings ending with 101..."
              className="w-full p-2.5 bg-slate-900 border border-slate-700/60 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 resize-none overflow-hidden font-medium leading-relaxed"
            />
            <button
              onClick={() => handleGenerate(promptInput)}
              disabled={isGenerating || !promptInput.trim()}
              className="w-full py-2.5 bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold rounded-xl text-xs shadow-lg hover:shadow-indigo-500/25 hover:-translate-y-0.5 hover:scale-[1.02] transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 active:scale-[0.98]"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-indigo-200" />
                  <span>Synthesizing Automaton...</span>
                </>
              ) : (
                <>
                  <Bot className="w-4 h-4 text-indigo-200" />
                  <span>Generate DFA</span>
                </>
              )}
            </button>
          </div>

          {/* DFA Quick Operations & Export Toolbar */}
          <div className="bg-slate-950/60 border border-slate-800/60 rounded-2xl p-3 space-y-2 relative">
            <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              <span className="flex items-center gap-1.5">
                <Layers className="w-3 h-3 text-indigo-400" /> DFA Operations & Export
              </span>
            </div>

            <div className="grid grid-cols-2 gap-1.5 text-xs font-bold">
              <button
                onClick={handleOpenMinimizationModal}
                className="px-2.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl shadow-lg shadow-indigo-600/30 hover:shadow-indigo-500/40 hover:-translate-y-0.5 hover:scale-[1.04] transition-all duration-200 flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer"
              >
                <Scissors className="w-3.5 h-3.5" /> Minimize DFA
              </button>

              <button
                onClick={handleCompleteDFA}
                className="px-2.5 py-2 bg-slate-800/90 hover:bg-emerald-600 hover:text-white border border-slate-700/60 hover:border-emerald-400 text-slate-200 rounded-xl shadow hover:shadow-emerald-500/25 hover:-translate-y-0.5 hover:scale-[1.04] transition-all duration-200 flex items-center justify-center gap-1.5 active:scale-95 group cursor-pointer"
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 group-hover:text-white transition-colors" /> Add Trap State
              </button>
            </div>

            {/* Export Report Multi-Format Button */}
            <div className="relative pt-1">
              <button
                onClick={() => setShowExportMenu((prev) => !prev)}
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
                    className="w-full p-2 hover:bg-indigo-950 hover:text-indigo-300 text-left rounded-lg transition flex items-center gap-2 text-slate-200 font-bold cursor-pointer"
                  >
                    <FileText className="w-4 h-4 text-emerald-400" /> Academic PDF Report
                  </button>

                  <button
                    onClick={() => {
                      const latexCode = exportToLaTeX(graph);
                      downloadFile(latexCode, `${graph.name}_tikz.tex`, 'text/plain');
                      setShowExportMenu(false);
                    }}
                    className="w-full p-2 hover:bg-indigo-950 hover:text-indigo-300 text-left rounded-lg transition flex items-center gap-2 text-slate-200 font-bold cursor-pointer"
                  >
                    <Code className="w-4 h-4 text-sky-400" /> LaTeX TikZ Code (.tex)
                  </button>

                  <button
                    onClick={() => {
                      const csvCode = exportToCSV(graph);
                      downloadFile(csvCode, `${graph.name}_transition_matrix.csv`, 'text/csv');
                      setShowExportMenu(false);
                    }}
                    className="w-full p-2 hover:bg-indigo-950 hover:text-indigo-300 text-left rounded-lg transition flex items-center gap-2 text-slate-200 font-bold cursor-pointer"
                  >
                    <FileSpreadsheet className="w-4 h-4 text-purple-400" /> CSV Transition Matrix (.csv)
                  </button>

                  <button
                    onClick={() => {
                      const jsonCode = exportToJSON(graph);
                      downloadFile(jsonCode, `${graph.name}_dfa.json`, 'application/json');
                      setShowExportMenu(false);
                    }}
                    className="w-full p-2 hover:bg-indigo-950 hover:text-indigo-300 text-left rounded-lg transition flex items-center gap-2 text-slate-200 font-bold cursor-pointer"
                  >
                    <Code className="w-4 h-4 text-amber-400" /> Standard JSON (.json)
                  </button>

                  <button
                    onClick={() => {
                      const jflapCode = exportToJFLAP(graph);
                      downloadFile(jflapCode, `${graph.name}_jflap.jff`, 'application/xml');
                      setShowExportMenu(false);
                    }}
                    className="w-full p-2 hover:bg-indigo-950 hover:text-indigo-300 text-left rounded-lg transition flex items-center gap-2 text-slate-200 font-bold cursor-pointer"
                  >
                    <FileText className="w-4 h-4 text-rose-400" /> JFLAP XML (.jff)
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* DFA Quick Examples */}
          <div className="space-y-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              DFA Coursework Examples:
            </span>
            <div className="grid grid-cols-2 gap-1.5">
              {DFA_EXAMPLES.map((ex, idx) => (
                <button
                  key={idx}
                  onClick={() => handleLoadExample(ex)}
                  className="px-2.5 py-2 bg-slate-950/80 hover:bg-indigo-950/80 border border-slate-800/80 hover:border-indigo-500/60 text-left rounded-xl transition-all duration-200 hover:-translate-y-0.5 hover:scale-[1.03] hover:shadow-md hover:shadow-indigo-500/10 group cursor-pointer active:scale-95"
                >
                  <span className="block font-bold text-indigo-300 text-[11px] group-hover:text-white transition-colors">
                    {ex.label}
                  </span>
                  <span className="block text-[10px] text-slate-500 group-hover:text-slate-300 truncate transition-colors">{ex.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Saved States & Diagrams Dropdown Repository */}
          <SavedStatesDropdown />

          {/* Educational DFA Note */}
          <div className="p-3 bg-indigo-950/30 border border-indigo-500/30 rounded-2xl space-y-1.5 text-indigo-200 text-xs">
            <div className="flex items-center gap-1.5 font-bold text-indigo-300">
              <HelpCircle className="w-4 h-4 text-indigo-400 shrink-0" />
              Determinism Explained
            </div>
            <p className="text-[11px] text-indigo-200/90 leading-relaxed">
              In a DFA, every state has exactly one transition for each symbol in the alphabet. Execution is 100% deterministic with no branching or guessing paths.
            </p>
          </div>
        </div>

        {/* Right Main Content Panel: Canvas + Resizable Bottom Drawer */}
        <div className="flex-1 relative flex flex-col overflow-hidden bg-slate-950">
          <div className="flex-1 relative">
            <AutomataCanvas />
          </div>

          {/* ── Dynamic Resizable Bottom Panel ── */}
          <ResizableBottomPanel
            defaultHeight={440}
            minHeight={120}
            maxHeightRatio={0.85}
            storageKey="dfa_workspace_panel_height"
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
                      onClick={() => setActiveTab(tab.id as DFATabId)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all duration-200 flex items-center gap-1.5 shrink-0 hover:-translate-y-0.5 hover:scale-105 active:scale-95 ${
                        isSel
                          ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                          : 'text-slate-400 hover:text-slate-100 hover:bg-indigo-950/60 hover:border-indigo-500/40 border border-transparent'
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
            {activeTab === 'formal-def' && <DFAFormalDefinitionPanel graph={graph} promptDescription={currentPrompt} />}
            {activeTab === 'transition-table' && (
              <DFATransitionTablePanel
                graph={graph}
                currentStateId={simulationSteps[currentStepIndex]?.currentStateIds[0]}
              />
            )}
            {activeTab === 'string-tester' && (
              <DFAStringTesterPanel graph={graph} promptDescription={currentPrompt} />
            )}
            {activeTab === 'state-inspector' && (
              <DFAStateInspectorPanel graph={graph} />
            )}
            {activeTab === 'language-analysis' && <NFALanguageAnalysisPanel nfa={currentNFA} />}
            {activeTab === 'statistics' && <DFAStatisticsPanel graph={graph} />}
            {activeTab === 'debug' && <DFADebugPanel graph={graph} promptDescription={currentPrompt} />}
            {activeTab === 'explanation' && (
              <DFALanguageExplanationPanel graph={graph} promptDescription={currentPrompt} />
            )}
            {activeTab === 'help' && <DFAHelpPanel />}
          </ResizableBottomPanel>
        </div>
      </div>

      {/* ── Hopcroft Minimization Interactive Modal ── */}
      {showMinimizationModal && (
        <DFAMinimizationModal
          graph={graph}
          isOpen={showMinimizationModal}
          onClose={() => setShowMinimizationModal(false)}
          onApplyMinimized={(minimizedGraph: any) => {
            setGraph(minimizedGraph);
            setShowMinimizationModal(false);
          }}
        />
      )}
    </div>
  );
};
