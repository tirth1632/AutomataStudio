import React from 'react';
import { Activity, CheckCircle2, XCircle, AlertTriangle, Info } from 'lucide-react';
import type { NFA } from '../../algorithms/nfa/NFA';
import { analyzeNFALanguage } from '../../algorithms/nfa/analysis/NFALanguageAnalysis';

interface NFALanguageAnalysisPanelProps {
  nfa: NFA;
}

export const NFALanguageAnalysisPanel: React.FC<NFALanguageAnalysisPanelProps> = ({ nfa }) => {
  const analysis = React.useMemo(() => analyzeNFALanguage(nfa), [nfa]);

  return (
    <div className="p-4 bg-slate-900/95 border border-slate-800 rounded-2xl space-y-5 text-slate-100 text-xs font-sans shadow-xl max-h-[70vh] overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-sky-600/20 border border-sky-500/40 text-sky-400 rounded-xl">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-slate-100">Formal NFA Language Analysis</h3>
            <p className="text-[11px] text-sky-400 font-medium">Algorithmic property evaluation of language L(M)</p>
          </div>
        </div>
      </div>

      {/* Top Cards: Emptiness & Finiteness */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 font-mono">
        <div className="p-3.5 bg-slate-950/90 border border-slate-800 rounded-xl space-y-1">
          <div className="text-[10px] text-slate-400 uppercase font-bold">Language Emptiness</div>
          <div className="flex items-center justify-between">
            <span className="font-bold text-sm">{analysis.isEmpty ? 'EMPTY L(M) = ∅' : 'NON-EMPTY'}</span>
            {analysis.isEmpty ? <XCircle className="w-4 h-4 text-rose-400" /> : <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
          </div>
        </div>

        <div className="p-3.5 bg-slate-950/90 border border-slate-800 rounded-xl space-y-1">
          <div className="text-[10px] text-slate-400 uppercase font-bold">Language Cardinality</div>
          <div className="flex items-center justify-between">
            <span className="font-bold text-sm">{analysis.hasCycle ? 'INFINITE' : 'FINITE'}</span>
            {analysis.hasCycle ? <Info className="w-4 h-4 text-purple-400" /> : <CheckCircle2 className="w-4 h-4 text-sky-400" />}
          </div>
        </div>

        <div className="p-3.5 bg-slate-950/90 border border-slate-800 rounded-xl space-y-1">
          <div className="text-[10px] text-slate-400 uppercase font-bold">Cycle Detection</div>
          <div className="flex items-center justify-between">
            <span className="font-bold text-sm">{analysis.hasCycle ? 'CYCLE DETECTED' : 'NO CYCLES'}</span>
            {analysis.hasCycle ? <AlertTriangle className="w-4 h-4 text-amber-400" /> : <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
          </div>
        </div>

        <div className="p-3.5 bg-slate-950/90 border border-slate-800 rounded-xl space-y-1">
          <div className="text-[10px] text-slate-400 uppercase font-bold">Accepting States</div>
          <div className="font-bold text-sm text-emerald-300">
            {`{ ${analysis.acceptingStates.join(', ')} }`}
          </div>
        </div>
      </div>

      {/* Structural Breakdown & Shortest Test Vectors */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-mono">
        {/* State Classification */}
        <div className="p-4 bg-slate-950/90 border border-slate-800 rounded-xl space-y-2">
          <div className="text-xs font-bold text-sky-400 uppercase border-b border-slate-800 pb-2">
            State Classification & Connectivity
          </div>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-400">Reachable States:</span>
              <span className="text-emerald-300 font-bold">{`{ ${analysis.reachableStates.join(', ')} }`}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Unreachable States:</span>
              <span className="text-rose-300 font-bold">
                {analysis.unreachableStates.length > 0 ? `{ ${analysis.unreachableStates.join(', ')} }` : 'None'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Dead / Trap States:</span>
              <span className="text-amber-300 font-bold">
                {analysis.deadStates.length > 0 ? `{ ${analysis.deadStates.join(', ')} }` : 'None'}
              </span>
            </div>
          </div>
        </div>

        {/* Test Vectors */}
        <div className="p-4 bg-slate-950/90 border border-slate-800 rounded-xl space-y-2">
          <div className="text-xs font-bold text-emerald-400 uppercase border-b border-slate-800 pb-2">
            Shortest String Test Vectors (BFS)
          </div>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Shortest Accepted String:</span>
              <code className="bg-emerald-950 px-2 py-0.5 rounded border border-emerald-500/40 font-bold text-emerald-300">
                {analysis.shortestAccepted}
              </code>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Shortest Rejected String:</span>
              <code className="bg-rose-950 px-2 py-0.5 rounded border border-rose-500/40 font-bold text-rose-300">
                {analysis.shortestRejected}
              </code>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
