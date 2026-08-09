import React, { useState } from 'react';
import { Code, CheckCircle, XCircle, Copy, Check, Sparkles, Layers } from 'lucide-react';
import type { DFAInspectorData } from '../../../utils/dfaInspectorEngine';
import { copyToClipboard } from '../../../utils/exportUtils';

interface TabLanguageProps {
  data: DFAInspectorData;
}

export const TabLanguage: React.FC<TabLanguageProps> = ({ data }) => {
  const { languageInfo } = data;
  const [copiedRegex, setCopiedRegex] = useState(false);

  const handleCopyRegex = async () => {
    const success = await copyToClipboard(languageInfo.regex);
    if (success) {
      setCopiedRegex(true);
      setTimeout(() => setCopiedRegex(false), 2000);
    }
  };

  return (
    <div className="space-y-3.5 font-sans text-xs">
      {/* Language Header */}
      <div className="p-3.5 bg-gradient-to-br from-indigo-950/80 via-slate-950 to-slate-900 border border-indigo-500/30 rounded-xl space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider block flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5" /> Language Specification
          </span>
          <span className="px-2 py-0.5 bg-indigo-950 text-indigo-300 border border-indigo-500/30 text-[10px] font-bold rounded-md">
            {languageInfo.patternType}
          </span>
        </div>
        <h3 className="font-bold text-white text-sm">{languageInfo.name}</h3>
        <p className="text-slate-300 text-xs leading-relaxed">{languageInfo.description}</p>
      </div>

      {/* Equivalent Regular Expression */}
      <div className="p-3 bg-slate-950/90 border border-slate-800 rounded-xl space-y-2 font-mono">
        <div className="flex items-center justify-between font-sans">
          <span className="text-[11px] font-bold text-slate-300 flex items-center gap-1.5">
            <Code className="w-3.5 h-3.5 text-cyan-400" /> Equivalent Regular Expression
          </span>
          <button
            onClick={handleCopyRegex}
            className="flex items-center gap-1 text-[10px] text-indigo-400 hover:text-indigo-300 bg-indigo-950/60 border border-indigo-500/30 px-2 py-0.5 rounded transition"
          >
            {copiedRegex ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
            <span>{copiedRegex ? 'Copied' : 'Copy'}</span>
          </button>
        </div>

        <div className="p-2.5 bg-slate-900 border border-slate-800 rounded-lg text-emerald-400 font-bold text-sm overflow-x-auto text-center select-all">
          {languageInfo.regex}
        </div>
      </div>

      {/* Accepted & Rejected Strings Grid */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        {/* Accepted Examples */}
        <div className="p-3 bg-slate-950/90 border border-slate-800 rounded-xl space-y-2">
          <div className="flex items-center gap-1 text-emerald-400 font-bold text-[11px]">
            <CheckCircle className="w-3.5 h-3.5" /> Accepted Examples
          </div>
          <div className="flex flex-wrap gap-1 font-mono">
            {languageInfo.acceptedExamples.length > 0 ? (
              languageInfo.acceptedExamples.map((ex, i) => (
                <span key={i} className="px-2 py-0.5 bg-emerald-950/70 border border-emerald-500/30 text-emerald-300 rounded text-[11px] font-bold">
                  {ex}
                </span>
              ))
            ) : (
              <span className="text-slate-500 italic text-[10px]">None</span>
            )}
          </div>
        </div>

        {/* Rejected Examples */}
        <div className="p-3 bg-slate-950/90 border border-slate-800 rounded-xl space-y-2">
          <div className="flex items-center gap-1 text-rose-400 font-bold text-[11px]">
            <XCircle className="w-3.5 h-3.5" /> Rejected Examples
          </div>
          <div className="flex flex-wrap gap-1 font-mono">
            {languageInfo.rejectedExamples.length > 0 ? (
              languageInfo.rejectedExamples.map((ex, i) => (
                <span key={i} className="px-2 py-0.5 bg-rose-950/70 border border-rose-500/30 text-rose-300 rounded text-[11px] font-bold">
                  {ex}
                </span>
              ))
            ) : (
              <span className="text-slate-500 italic text-[10px]">None</span>
            )}
          </div>
        </div>
      </div>

      {/* Shortest Accepted & Shortest Rejected */}
      <div className="grid grid-cols-2 gap-2 font-mono text-xs">
        <div className="p-2.5 bg-slate-950/90 border border-slate-800 rounded-xl">
          <span className="text-[10px] font-sans text-slate-400 block">Shortest Accepted String</span>
          <span className="font-bold text-emerald-400 text-sm">{languageInfo.shortestAccepted}</span>
        </div>

        <div className="p-2.5 bg-slate-950/90 border border-slate-800 rounded-xl">
          <span className="text-[10px] font-sans text-slate-400 block">Shortest Rejected String</span>
          <span className="font-bold text-rose-400 text-sm">{languageInfo.shortestRejected}</span>
        </div>
      </div>

      {/* Language Classification Metadata Cards */}
      <div className="space-y-2 font-sans text-xs">
        <div className="p-3 bg-slate-950/90 border border-slate-800 rounded-xl flex items-center justify-between">
          <span className="text-slate-400 text-[11px] font-medium">Infinite or Finite Language</span>
          <span className={`px-2.5 py-0.5 rounded text-[11px] font-bold font-mono ${languageInfo.isInfinite ? 'bg-indigo-950 text-indigo-300 border border-indigo-500/30' : 'bg-amber-950 text-amber-300 border border-amber-500/30'}`}>
            {languageInfo.isInfinite ? 'Infinite Language' : 'Finite Language'}
          </span>
        </div>

        <div className="p-3 bg-slate-950/90 border border-slate-800 rounded-xl space-y-1">
          <span className="text-slate-400 text-[10px] block">Language Family</span>
          <span className="font-bold text-white text-[11px] flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-indigo-400" />
            {languageInfo.languageFamily}
          </span>
        </div>
      </div>
    </div>
  );
};
