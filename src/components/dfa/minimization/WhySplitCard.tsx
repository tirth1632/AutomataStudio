import React from 'react';
import { Split, AlertCircle, ArrowRight, CheckCircle2 } from 'lucide-react';
import type { SplitDetail } from '../../../types/automata';

interface WhySplitCardProps {
  splitDetail?: SplitDetail;
  stepIndex: number;
}

export const WhySplitCard: React.FC<WhySplitCardProps> = ({ splitDetail, stepIndex }) => {
  if (!splitDetail) {
    return (
      <div className="p-4 bg-slate-950/80 border border-slate-800/80 rounded-2xl flex items-center gap-3 text-slate-400">
        <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
        <div className="text-xs">
          <span className="font-bold text-slate-200">No Split in this Step</span>: All states within each active partition group transition into equivalent target sets for all symbols.
        </div>
      </div>
    );
  }

  const { splitGroupMembers, splitSymbol, subGroups, explanation } = splitDetail;

  return (
    <div className="p-4 bg-gradient-to-r from-amber-950/30 via-slate-900 to-slate-900 border border-amber-500/40 rounded-2xl space-y-3 shadow-xl relative overflow-hidden">
      {/* Top Tag */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs font-bold text-amber-400 uppercase tracking-wider">
          <Split className="w-4 h-4 text-amber-400" />
          Why Did This Partition Split? (Iteration P{stepIndex})
        </div>
        <span className="px-2.5 py-0.5 bg-amber-500/20 border border-amber-500/40 text-amber-300 font-mono text-[11px] font-bold rounded-lg">
          Distinguishing Symbol: '{splitSymbol}'
        </span>
      </div>

      <p className="text-xs text-slate-300 leading-relaxed font-sans">
        {explanation}
      </p>

      {/* Split Rationale Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-1">
        {subGroups.map((sg, idx) => (
          <div
            key={idx}
            className="p-3 bg-slate-950/90 border border-slate-800 rounded-xl flex items-center justify-between text-xs font-mono"
          >
            <div>
              <div className="text-slate-400 text-[10px]">Sub-Group {idx + 1}</div>
              <div className="font-bold text-amber-300">
                {`{ ${sg.subGroupMembers.join(', ')} }`}
              </div>
            </div>

            <ArrowRight className="w-3.5 h-3.5 text-slate-600 shrink-0" />

            <div className="text-right">
              <div className="text-slate-400 text-[10px]">Transitions on '{splitSymbol}' to</div>
              <div className="font-bold text-indigo-300">{sg.targetGroupLabel}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-1.5 text-[11px] text-amber-200/80 bg-amber-950/40 border border-amber-500/20 p-2 rounded-lg font-mono">
        <AlertCircle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
        Since states in group {'{'}{splitGroupMembers.join(', ')}{'}'} land in different target sets on '{splitSymbol}', they cannot be merged.
      </div>
    </div>
  );
};
