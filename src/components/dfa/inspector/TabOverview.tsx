import React from 'react';
import { BookOpen, Cpu, Binary, Layers } from 'lucide-react';
import type { DFAInspectorData } from '../../../utils/dfaInspectorEngine';

interface TabOverviewProps {
  data: DFAInspectorData;
}

export const TabOverview: React.FC<TabOverviewProps> = ({ data }) => {
  const { languageInfo, constructionInfo, alphabet, isBinary, statistics, graph } = data;
  const startState = graph.states.find((s) => s.isStart)?.id || 'q0';
  const acceptStates = graph.states.filter((s) => s.isAccept).map((s) => s.id);
  const rejectStates = graph.states.filter((s) => !s.isAccept).map((s) => s.id);

  return (
    <div className="space-y-3.5 text-xs font-sans">
      {/* ── 1. LANGUAGE SECTION ── */}
      <div className="p-3 bg-slate-950/90 border border-slate-800 rounded-xl space-y-2">
        <div className="flex items-center gap-1.5 text-indigo-400 font-bold text-[11px] uppercase tracking-wider">
          <BookOpen className="w-3.5 h-3.5" /> Language
        </div>

        <div className="space-y-1.5">
          <div>
            <span className="text-[10px] text-slate-400 block font-medium">Language Name</span>
            <p className="font-bold text-white text-sm">{languageInfo.name}</p>
          </div>

          <div>
            <span className="text-[10px] text-slate-400 block font-medium">Natural Language Description</span>
            <p className="text-slate-300 leading-relaxed text-xs">{languageInfo.description}</p>
          </div>

          <div>
            <span className="text-[10px] text-slate-400 block font-medium">Examples</span>
            <p className="text-indigo-300 font-medium text-xs bg-indigo-950/50 border border-indigo-500/20 px-2 py-1 rounded-md">
              {languageInfo.examplesSummary}
            </p>
          </div>
        </div>
      </div>

      {/* ── 2. CONSTRUCTION INFORMATION SECTION ── */}
      <div className="p-3 bg-slate-950/90 border border-slate-800 rounded-xl space-y-2">
        <div className="flex items-center gap-1.5 text-emerald-400 font-bold text-[11px] uppercase tracking-wider">
          <Cpu className="w-3.5 h-3.5" /> Construction Information
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="bg-slate-900/80 p-2 rounded-lg border border-slate-800/80">
            <span className="text-[10px] text-slate-400 block">Generator Used</span>
            <span className="font-mono font-bold text-white text-[11px]">{constructionInfo.generatorName}</span>
          </div>

          <div className="bg-slate-900/80 p-2 rounded-lg border border-slate-800/80">
            <span className="text-[10px] text-slate-400 block">Algorithm</span>
            <span className="font-semibold text-slate-200 text-[11px]">{constructionInfo.algorithmUsed}</span>
          </div>

          <div className="bg-slate-900/80 p-2 rounded-lg border border-slate-800/80">
            <span className="text-[10px] text-slate-400 block">Pattern Type</span>
            <span className="font-semibold text-indigo-300 text-[11px]">{constructionInfo.patternType}</span>
          </div>

          <div className="bg-slate-900/80 p-2 rounded-lg border border-slate-800/80 flex items-center justify-between">
            <div>
              <span className="text-[10px] text-slate-400 block">Difficulty</span>
              <span className="font-bold text-amber-300 text-[11px]">{constructionInfo.difficulty}</span>
            </div>
            <span className="text-[9px] bg-slate-800 px-1.5 py-0.5 rounded text-slate-300 font-mono">
              {constructionInfo.creationSource}
            </span>
          </div>
        </div>
      </div>

      {/* ── 3. ALPHABET SECTION ── */}
      <div className="p-3 bg-slate-950/90 border border-slate-800 rounded-xl space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-cyan-400 font-bold text-[11px] uppercase tracking-wider">
            <Binary className="w-3.5 h-3.5" /> Alphabet Σ
          </div>
          <span className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono ${isBinary ? 'bg-cyan-950 text-cyan-300 border border-cyan-500/30' : 'bg-slate-800 text-slate-300'}`}>
            Binary: {isBinary ? 'Yes' : 'No'}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex flex-wrap gap-1 font-mono font-bold">
            {alphabet.map((sym) => (
              <span key={sym} className="px-2.5 py-1 bg-slate-900 border border-slate-700 text-indigo-300 rounded-md text-xs">
                '{sym}'
              </span>
            ))}
          </div>

          <div className="text-right">
            <span className="text-[10px] text-slate-400 block">Number of Symbols</span>
            <span className="font-mono font-bold text-white text-sm">{alphabet.length}</span>
          </div>
        </div>
      </div>

      {/* ── 4. AUTOMATA SUMMARY SECTION ── */}
      <div className="p-3 bg-slate-950/90 border border-slate-800 rounded-xl space-y-2">
        <div className="flex items-center gap-1.5 text-amber-400 font-bold text-[11px] uppercase tracking-wider">
          <Layers className="w-3.5 h-3.5" /> Automata Summary
        </div>

        <div className="grid grid-cols-2 gap-2 font-mono text-xs">
          <div className="p-2 bg-slate-900/80 border border-slate-800/80 rounded-lg">
            <span className="text-[10px] text-slate-400 font-sans block">Start State</span>
            <span className="font-bold text-indigo-400">{startState}</span>
          </div>

          <div className="p-2 bg-slate-900/80 border border-slate-800/80 rounded-lg">
            <span className="text-[10px] text-slate-400 font-sans block">Total States</span>
            <span className="font-bold text-white text-sm">{statistics.totalStates}</span>
          </div>

          <div className="p-2 bg-slate-900/80 border border-slate-800/80 rounded-lg">
            <span className="text-[10px] text-slate-400 font-sans block">Accept States ({acceptStates.length})</span>
            <span className="font-bold text-emerald-400">
              {acceptStates.length > 0 ? `{ ${acceptStates.join(', ')} }` : 'None'}
            </span>
          </div>

          <div className="p-2 bg-slate-900/80 border border-slate-800/80 rounded-lg">
            <span className="text-[10px] text-slate-400 font-sans block">Reject States ({rejectStates.length})</span>
            <span className="font-bold text-rose-400">
              {rejectStates.length > 0 ? `{ ${rejectStates.join(', ')} }` : 'None'}
            </span>
          </div>

          <div className="p-2 bg-slate-900/80 border border-slate-800/80 rounded-lg">
            <span className="text-[10px] text-slate-400 font-sans block">Transitions</span>
            <span className="font-bold text-cyan-300">{statistics.totalTransitions}</span>
          </div>

          <div className="p-2 bg-slate-900/80 border border-slate-800/80 rounded-lg">
            <span className="text-[10px] text-slate-400 font-sans block">Trap State</span>
            <span className="font-bold text-amber-400">
              {statistics.trapStates.length > 0 ? statistics.trapStates.join(', ') : 'None'}
            </span>
          </div>

          <div className="p-2 bg-slate-900/80 border border-slate-800/80 rounded-lg">
            <span className="text-[10px] text-slate-400 font-sans block">Reachable States</span>
            <span className="font-bold text-emerald-400">
              {statistics.reachableStates.length} / {statistics.totalStates}
            </span>
          </div>

          <div className="p-2 bg-slate-900/80 border border-slate-800/80 rounded-lg">
            <span className="text-[10px] text-slate-400 font-sans block">Dead States</span>
            <span className="font-bold text-rose-400">{statistics.deadStates.length}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
