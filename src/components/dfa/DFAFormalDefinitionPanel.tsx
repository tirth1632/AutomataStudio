import React, { useState } from 'react';
import { GraduationCap, Code, Copy, FileText, Download, Check } from 'lucide-react';
import type { AutomatonGraph } from '../../types/automata';
import {
  copyToClipboard,
  exportToLaTeX,
  exportToText,
  generateAcademicPDFReport,
} from '../../utils/exportUtils';

interface DFAFormalDefinitionPanelProps {
  graph: AutomatonGraph;
  promptDescription?: string;
}

export const DFAFormalDefinitionPanel: React.FC<DFAFormalDefinitionPanelProps> = ({
  graph,
  promptDescription,
}) => {
  const [copiedType, setCopiedType] = useState<string | null>(null);

  const states = graph.states.map((s) => s.id);
  const alphabet = graph.alphabet && graph.alphabet.length > 0 ? graph.alphabet : ['0', '1'];
  const startState = graph.states.find((s) => s.isStart)?.id || states[0] || 'q0';
  const acceptStates = graph.states.filter((s) => s.isAccept).map((s) => s.id);

  const handleCopyText = async () => {
    const txt = exportToText(graph);
    const success = await copyToClipboard(txt);
    if (success) {
      setCopiedType('text');
      setTimeout(() => setCopiedType(null), 2000);
    }
  };

  const handleCopyLaTeX = async () => {
    const latex = exportToLaTeX(graph, promptDescription || graph.name);
    const success = await copyToClipboard(latex);
    if (success) {
      setCopiedType('latex');
      setTimeout(() => setCopiedType(null), 2000);
    }
  };

  const handleDownloadPDF = () => {
    generateAcademicPDFReport(graph, promptDescription || graph.name);
  };

  return (
    <div className="p-4 sm:p-5 space-y-4 bg-slate-900/95 text-slate-100 rounded-2xl border border-slate-800 text-sm shadow-xl">
      <div className="flex items-center justify-between border-b border-slate-800 pb-3 gap-2 flex-wrap">
        <div className="flex items-center gap-2.5 font-bold text-base text-indigo-300">
          <GraduationCap className="w-5 h-5 text-indigo-400 shrink-0" />
          Formal 5-Tuple Definition
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleCopyText}
            className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition border border-slate-700"
          >
            {copiedType === 'text' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            Copy as Text
          </button>
          <button
            onClick={handleCopyLaTeX}
            className="px-2.5 py-1 bg-indigo-950 hover:bg-indigo-900 text-indigo-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition border border-indigo-500/40"
          >
            {copiedType === 'latex' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <FileText className="w-3.5 h-3.5" />}
            Copy as LaTeX
          </button>
          <button
            onClick={handleDownloadPDF}
            className="px-2.5 py-1 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition shadow"
          >
            <Download className="w-3.5 h-3.5" />
            Download PDF Report
          </button>
        </div>
      </div>

      <div className="p-3 bg-indigo-950/40 border border-indigo-500/30 rounded-xl font-mono text-center text-sm sm:text-base font-bold text-indigo-200">
        M = (Q, Σ, δ, q₀, F)
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 font-mono text-sm">
        <div className="p-3.5 bg-slate-950/90 rounded-xl border border-slate-800 space-y-1">
          <div className="text-xs font-bold text-indigo-400 uppercase tracking-wider">Q (States Set)</div>
          <div className="text-slate-100 font-bold">
            {`Q = { ${states.join(', ')} }`}
          </div>
        </div>

        <div className="p-3.5 bg-slate-950/90 rounded-xl border border-slate-800 space-y-1">
          <div className="text-xs font-bold text-sky-400 uppercase tracking-wider">Σ (Input Alphabet)</div>
          <div className="text-slate-100 font-bold">
            {`Σ = { ${alphabet.join(', ')} }`}
          </div>
        </div>

        <div className="p-3.5 bg-slate-950/90 rounded-xl border border-slate-800 space-y-1">
          <div className="text-xs font-bold text-amber-400 uppercase tracking-wider">q₀ (Initial Start State)</div>
          <div className="text-slate-100 font-bold">
            {`q₀ = ${startState}`}
          </div>
        </div>

        <div className="p-3.5 bg-slate-950/90 rounded-xl border border-slate-800 space-y-1">
          <div className="text-xs font-bold text-emerald-400 uppercase tracking-wider">F (Accept Final States)</div>
          <div className="text-slate-100 font-bold">
            {`F = { ${acceptStates.join(', ')} }`}
          </div>
        </div>
      </div>

      <div className="p-3.5 bg-slate-950/90 rounded-xl border border-slate-800 space-y-2">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-300 uppercase tracking-wider">
          <Code className="w-4 h-4 text-indigo-400" />
          δ (Deterministic Transition Mapping Function: Q × Σ → Q)
        </div>
        <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-sans font-medium">
          For every state q ∈ Q and input symbol σ ∈ Σ, the transition function δ(q, σ) specifies exactly one unique next state q' ∈ Q.
        </p>
      </div>
    </div>
  );
};
