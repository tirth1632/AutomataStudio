import React, { useState, useEffect, useCallback } from 'react';
import { BookOpen, Sparkles, CheckCircle2, Loader2, RefreshCw, Check, X, ChevronDown } from 'lucide-react';
import type { AutomatonGraph, AIProvider } from '../../types/automata';
import { useAutomata } from '../../context/AutomataContext';
import {
  fetchAIQuestionExplanation,
  generateDeterministicQuestionExplanation,
  type QuestionAIExplanation,
} from '../../services/aiExplanationService';

interface DFALanguageExplanationPanelProps {
  graph: AutomatonGraph;
  promptDescription?: string;
}

const MODEL_OPTIONS: Array<{ id: AIProvider; label: string }> = [
  { id: 'GROQ', label: 'Groq Llama 3.3 70B' },
  { id: 'GEMINI', label: 'Gemini 1.5 Flash' },
  { id: 'OPENAI', label: 'OpenAI (GPT-4o)' },
  { id: 'CLAUDE', label: 'Claude 3.5 Sonnet' },
  { id: 'openrouter', label: 'OpenRouter (GPT-4o Mini)' },
  { id: 'AUTO', label: 'Auto (Fallback Chain)' },
];

export const DFALanguageExplanationPanel: React.FC<DFALanguageExplanationPanelProps> = ({
  graph,
  promptDescription,
}) => {
  const { apiKeys, aiProvider, setAIProvider } = useAutomata();
  const question = promptDescription || graph.name || 'Binary strings with specific pattern matching invariants';

  const [explanation, setExplanation] = useState<QuestionAIExplanation>(() =>
    generateDeterministicQuestionExplanation(question, graph)
  );
  const [isAiLoading, setIsAiLoading] = useState<boolean>(false);
  const [showModelMenu, setShowModelMenu] = useState<boolean>(false);

  const loadExplanation = useCallback(
    async (overrideProvider?: AIProvider) => {
      if (!question) return;

      const targetProvider = overrideProvider || aiProvider;
      const initialExp = generateDeterministicQuestionExplanation(question, graph);
      setExplanation(initialExp);

      const hasAnyApiKey = Boolean(apiKeys.gemini || apiKeys.groq || apiKeys.openrouter || apiKeys.openai || apiKeys.claude);

      if (hasAnyApiKey) {
        setIsAiLoading(true);
        try {
          const aiExp = await fetchAIQuestionExplanation(question, graph, apiKeys, targetProvider);
          setExplanation(aiExp);
        } catch (err) {
          console.warn('[DFALanguageExplanationPanel] AI explanation fetch error:', err);
        } finally {
          setIsAiLoading(false);
        }
      }
    },
    [question, graph, apiKeys, aiProvider]
  );

  useEffect(() => {
    loadExplanation();
  }, [loadExplanation]);

  const handleModelChange = (newProvider: AIProvider) => {
    setAIProvider(newProvider);
    loadExplanation(newProvider);
  };

  return (
    <div className="p-5 sm:p-6 space-y-5 bg-slate-900/95 text-slate-100 rounded-2xl border border-slate-800 text-sm sm:text-base shadow-xl">
      {/* Header with Title & Interactive AI Model Badge */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3.5 gap-3 flex-wrap">
        <div className="flex items-center gap-2.5 font-bold text-base sm:text-lg text-indigo-300">
          <BookOpen className="w-5 h-5 text-indigo-400 shrink-0" />
          DFA Language Explanation & Question Invariants
        </div>

        {/* Interactive Model Selector Pill */}
        <div className="relative">
          <button
            onClick={() => setShowModelMenu((v) => !v)}
            className="px-3.5 py-1.5 bg-indigo-950/90 hover:bg-indigo-900/90 border border-indigo-500/40 text-indigo-200 rounded-full text-xs font-bold flex items-center gap-2 shadow-sm transition cursor-pointer"
            title="Click to select AI Model"
          >
            {isAiLoading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin text-purple-400" />
                Generating AI...
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                <span>{explanation.aiModelUsed || MODEL_OPTIONS.find((m) => m.id === aiProvider)?.label || 'Groq Llama 3.3 70B'}</span>
                <ChevronDown className="w-3 h-3 text-indigo-300 ml-0.5" />
              </>
            )}
          </button>

          {/* Model Selection Dropdown Menu */}
          {showModelMenu && (
            <div className="absolute right-0 top-full mt-1.5 w-60 bg-slate-950 border border-slate-800 rounded-2xl shadow-2xl z-50 p-1.5 text-xs space-y-1 animate-in fade-in duration-150">
              <div className="px-2.5 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-800">
                Switch AI Model
              </div>
              {MODEL_OPTIONS.map((m) => (
                <button
                  key={m.id}
                  onClick={() => {
                    setShowModelMenu(false);
                    handleModelChange(m.id);
                  }}
                  className={`w-full text-left px-2.5 py-2 rounded-xl transition flex items-center justify-between ${
                    aiProvider === m.id
                      ? 'bg-indigo-950 border border-indigo-500/40 text-indigo-200 font-bold'
                      : 'hover:bg-slate-900 text-slate-300 font-medium'
                  }`}
                >
                  <span>{m.label}</span>
                  {aiProvider === m.id && <Check className="w-3.5 h-3.5 text-indigo-400" />}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Target Question Box */}
      <div className="p-4 bg-slate-950/90 border border-slate-800 rounded-xl space-y-2">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Target Problem / Question</div>
          <button
            onClick={() => loadExplanation()}
            disabled={isAiLoading}
            className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition border border-slate-700 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isAiLoading ? 'animate-spin text-purple-400' : ''}`} />
            Re-generate with AI
          </button>
        </div>
        <div className="text-indigo-200 text-sm sm:text-base font-bold font-mono">
          "{question}"
        </div>
      </div>

      {/* Accepted & Rejected Example Strings */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Accepted */}
        <div className="p-4 bg-emerald-950/30 border border-emerald-500/30 rounded-xl space-y-2">
          <div className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Accepted Example Strings (L)
          </div>
          <div className="flex flex-wrap gap-2 pt-1 font-mono">
            {explanation.acceptedExamples.map((str, idx) => (
              <span key={idx} className="px-3 py-1 bg-emerald-950 border border-emerald-500/40 text-emerald-300 rounded-lg text-xs font-bold shadow-sm">
                "{str}"
              </span>
            ))}
          </div>
        </div>

        {/* Rejected */}
        <div className="p-4 bg-rose-950/30 border border-rose-500/30 rounded-xl space-y-2">
          <div className="text-xs font-bold text-rose-400 uppercase tracking-wider flex items-center gap-1.5">
            <X className="w-4 h-4 text-rose-400" /> Rejected Example Strings (Σ* \ L)
          </div>
          <div className="flex flex-wrap gap-2 pt-1 font-mono">
            {explanation.rejectedExamples.map((str, idx) => (
              <span key={idx} className="px-3 py-1 bg-rose-950 border border-rose-500/40 text-rose-300 rounded-lg text-xs font-bold shadow-sm">
                "{str}"
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Informal Summary Description */}
      <div className="p-4 bg-slate-950/90 border border-slate-800 rounded-xl space-y-1.5">
        <div className="text-xs font-bold text-indigo-400 uppercase tracking-wider">Formal Language Definition (L)</div>
        <div className="text-slate-200 text-sm font-semibold leading-relaxed">
          {explanation.languageDescription}
        </div>
        <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-sans pt-1">
          {explanation.summary}
        </p>
      </div>

      {/* State-by-State Invariants */}
      <div className="space-y-3">
        <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
          State-by-State Invariants & Structural Meanings
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {explanation.stateInvariants.map((inv) => {
            const isAccepting = graph.states.find((s) => s.id === inv.stateId)?.isAccept;

            return (
              <div
                key={inv.stateId}
                className={`p-3.5 rounded-xl border transition ${
                  isAccepting
                    ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-100'
                    : 'bg-slate-950/90 border-slate-800 text-slate-200'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-mono font-bold text-xs text-indigo-300">
                    State {inv.stateId}
                  </span>
                  {isAccepting && (
                    <span className="text-[10px] bg-emerald-600/30 text-emerald-300 px-2 py-0.5 rounded border border-emerald-500/40 font-bold uppercase">
                      ★ Accept State
                    </span>
                  )}
                </div>
                <div className="text-xs sm:text-sm font-sans text-slate-300 leading-normal">
                  {inv.meaning}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
