import React from 'react';
import {
  Sparkles,
  Wand2,
  AlertTriangle,
  Zap,
  Loader2,
} from 'lucide-react';
import { useAutomata } from '../../context/AutomataContext';
import { ProviderSelector } from './ProviderSelector';
import { PRESET_EXAMPLES } from '../../data/presetAutomata';
import { ScrollablePromptRow } from '../common/ScrollablePromptRow';

import { ALL_AUTOMATA_PROMPTS } from '../../data/allAutomataPrompts';

export const AIGeneratorPanel: React.FC = () => {
  const {
    promptInput,
    setPromptInput,
    isGenerating,
    generationError,
    generatedInfo,
    generateFromPrompt,
    apiKeys,
    setInputString,
    setGraph,
  } = useAutomata();

  const hasAnyKey = !!(apiKeys.openrouter || apiKeys.groq || apiKeys.gemini);

  const handleGenerate = (pStr: string) => {
    setPromptInput(pStr);
    generateFromPrompt(pStr);
  };

  const handleLoadPreset = (idx: number) => {
    const preset = PRESET_EXAMPLES[idx];
    setGraph(preset.graph);
    setInputString(preset.defaultInput);
  };

  return (
    <div className="w-full h-full bg-slate-900/95 border-r border-slate-800/80 flex flex-col gap-0 overflow-hidden text-slate-100 select-none">
      {/* ── Scrollable content ─────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {/* ── Quick Example Presets ────────────────────────────────── */}
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            <Zap className="w-3 h-3 text-amber-400" />
            Quick Examples — Click to Load Instantly
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            {PRESET_EXAMPLES.map((ex, idx) => (
              <button
                key={ex.label}
                onClick={() => handleLoadPreset(idx)}
                title={ex.description}
                className="px-2.5 py-2 bg-slate-800/80 hover:bg-slate-700 border border-slate-700/60 hover:border-indigo-500/50 text-[11px] font-semibold text-slate-300 hover:text-white rounded-xl transition text-left leading-tight"
              >
                <span className="block font-bold text-indigo-300">{ex.label}</span>
                <span className="block text-[10px] text-slate-400 truncate mt-0.5">{ex.description}</span>
              </button>
            ))}
          </div>
        </div>

        {/* ── AI Provider Selection ──────────────────────────────── */}
        <div className="space-y-1.5">
          <ProviderSelector />
          {!hasAnyKey && (
            <div className="p-2.5 bg-amber-950/40 border border-amber-500/30 rounded-xl text-[11px] text-amber-300 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <strong>No API Key Configured:</strong> Standard fallback engine will generate DFAs algorithmically. Add key in Settings for AI enhancement.
              </div>
            </div>
          )}
        </div>

        {/* ── Prompt Input Box ────────────────────────────────────── */}
        <div className="space-y-2 bg-slate-950/60 p-3 rounded-2xl border border-slate-800/60">
          <label className="flex items-center gap-1.5 text-xs font-bold text-slate-300">
            <Wand2 className="w-3.5 h-3.5 text-indigo-400" />
            Describe the Language
          </label>

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
            placeholder="e.g. Generate a DFA for binary strings with even number of 1s..."
            className="w-full p-3 bg-slate-900 border border-slate-700/60 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 resize-none overflow-hidden font-medium leading-relaxed"
          />

          <button
            onClick={() => handleGenerate(promptInput)}
            disabled={isGenerating || !promptInput.trim()}
            className="w-full py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold rounded-xl text-xs shadow-lg shadow-indigo-600/30 transition flex items-center justify-center gap-2 disabled:opacity-50 active:scale-[0.98]"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-white" />
                Generating Automaton...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Generate Automaton
              </>
            )}
          </button>

          {generationError && (
            <div className="p-2.5 bg-rose-950/60 border border-rose-500/40 rounded-xl text-xs text-rose-300 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div>{generationError}</div>
            </div>
          )}

          {generatedInfo && (
            <div className="p-2.5 bg-emerald-950/40 border border-emerald-500/40 rounded-xl text-xs text-emerald-300">
              <strong className="block text-emerald-400">Generated: {generatedInfo.graph.name}</strong>
              <p className="text-[11px] text-emerald-200/90 mt-0.5 leading-tight">
                {generatedInfo.explanation}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
