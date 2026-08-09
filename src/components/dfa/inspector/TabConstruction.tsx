import React from 'react';
import { Cpu, Layers, HardDrive, Zap, Compass, Clock, Database } from 'lucide-react';
import type { DFAInspectorData } from '../../../utils/dfaInspectorEngine';

interface TabConstructionProps {
  data: DFAInspectorData;
}

export const TabConstruction: React.FC<TabConstructionProps> = ({ data }) => {
  const { constructionInfo, semanticsMap, graph } = data;

  return (
    <div className="space-y-3.5 font-sans text-xs">
      {/* Header Info */}
      <div className="p-3.5 bg-gradient-to-br from-indigo-950/80 via-slate-950 to-slate-900 border border-indigo-500/30 rounded-xl space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider block flex items-center gap-1">
            <Cpu className="w-3.5 h-3.5" /> Construction Engine & Theory
          </span>
          <span className="px-2 py-0.5 bg-indigo-950 text-indigo-300 border border-indigo-500/30 text-[10px] font-bold rounded-md">
            {constructionInfo.patternType}
          </span>
        </div>
        <h3 className="font-bold text-white text-sm">{constructionInfo.generatorName}</h3>
        <p className="text-slate-300 text-xs leading-relaxed">{constructionInfo.algorithmUsed}</p>
      </div>

      {/* Grid of Construction Details */}
      <div className="space-y-2">
        {/* Construction Strategy */}
        <div className="p-3 bg-slate-950/90 border border-slate-800 rounded-xl space-y-1">
          <span className="text-indigo-400 font-bold text-[10px] uppercase tracking-wider block flex items-center gap-1">
            <Compass className="w-3 h-3" /> Construction Strategy
          </span>
          <p className="text-slate-200 text-xs leading-relaxed">{constructionInfo.constructionStrategy}</p>
        </div>

        {/* Memory Concept */}
        <div className="p-3 bg-slate-950/90 border border-slate-800 rounded-xl space-y-1">
          <span className="text-cyan-400 font-bold text-[10px] uppercase tracking-wider block flex items-center gap-1">
            <HardDrive className="w-3 h-3" /> Memory Concept
          </span>
          <p className="text-slate-200 text-xs leading-relaxed">{constructionInfo.memoryConcept}</p>
        </div>

        {/* Pattern Detection Method */}
        <div className="p-3 bg-slate-950/90 border border-slate-800 rounded-xl space-y-1">
          <span className="text-amber-400 font-bold text-[10px] uppercase tracking-wider block flex items-center gap-1">
            <Zap className="w-3 h-3" /> Pattern Detection Method
          </span>
          <p className="text-slate-200 text-xs leading-relaxed">{constructionInfo.patternDetectionMethod}</p>
        </div>

        {/* Time & Space Complexity */}
        <div className="grid grid-cols-2 gap-2 font-mono text-xs">
          <div className="p-2.5 bg-slate-950/90 border border-slate-800 rounded-xl space-y-0.5">
            <span className="text-[10px] text-slate-400 font-sans block flex items-center gap-1">
              <Clock className="w-3 h-3 text-emerald-400" /> Time Complexity
            </span>
            <span className="font-bold text-emerald-400 text-[11px]">{constructionInfo.timeComplexity}</span>
          </div>

          <div className="p-2.5 bg-slate-950/90 border border-slate-800 rounded-xl space-y-0.5">
            <span className="text-[10px] text-slate-400 font-sans block flex items-center gap-1">
              <Database className="w-3 h-3 text-purple-400" /> Space Complexity
            </span>
            <span className="font-bold text-purple-300 text-[11px]">{constructionInfo.spaceComplexity}</span>
          </div>
        </div>
      </div>

      {/* State Meaning Construction Breakdown */}
      <div className="p-3 bg-slate-950/90 border border-slate-800 rounded-xl space-y-2">
        <span className="font-sans font-bold text-indigo-300 text-[11px] block flex items-center gap-1.5">
          <Layers className="w-3.5 h-3.5 text-indigo-400" /> State Semantics Breakdown
        </span>

        <div className="space-y-1.5 font-mono text-xs">
          {graph.states.map((s) => {
            const sem = semanticsMap[s.id];
            return (
              <div key={s.id} className="p-2 bg-slate-900/80 border border-slate-800/80 rounded-lg space-y-0.5">
                <div className="flex items-center justify-between font-bold">
                  <span className="text-indigo-400">{s.id}</span>
                  <span className="text-[10px] text-slate-400 font-sans">{s.isAccept ? 'Accept State' : s.isStart ? 'Start State' : 'Intermediate State'}</span>
                </div>
                <p className="text-[11px] text-slate-300 font-sans leading-snug">{sem?.meaning || s.label}</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
