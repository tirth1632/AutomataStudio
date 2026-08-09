import React from 'react';
import { Activity, CheckCircle2, XCircle, ShieldCheck, AlertCircle } from 'lucide-react';
import type { AutomatonGraph } from '../../types/automata';
import { graphToDFA } from '../../utils/dfaAdapter';
import { DFAOperations } from '../../algorithms/DFAOperations/DFAOperations';

interface DFAStatisticsPanelProps {
  graph: AutomatonGraph;
}

export const DFAStatisticsPanel: React.FC<DFAStatisticsPanelProps> = ({ graph }) => {
  const pureDFA = graphToDFA(graph);

  const totalStates = graph.states.length;
  const alphabetSize = graph.alphabet.length;
  const totalTransitions = graph.transitions.reduce((acc, t) => acc + t.symbols.length, 0);
  const acceptCount = graph.states.filter((s) => s.isAccept).length;

  // Reachable states analysis via BFS from start state
  const startStateId = graph.states.find((s) => s.isStart)?.id || graph.states[0]?.id;
  const visited = new Set<string>();

  if (startStateId) {
    const queue = [startStateId];
    visited.add(startStateId);

    while (queue.length > 0) {
      const curr = queue.shift()!;
      graph.transitions.forEach((t) => {
        if (t.source === curr && !visited.has(t.target)) {
          visited.add(t.target);
          queue.push(t.target);
        }
      });
    }
  }

  const reachableCount = visited.size;
  const unreachableStates = graph.states.filter((s) => !visited.has(s.id));

  // Trap / Dead State identification
  const trapStates = graph.states.filter((s) => {
    if (s.isAccept) return false;
    const outgoing = graph.transitions.filter((t) => t.source === s.id);
    // State transitions only to itself
    return outgoing.every((t) => t.target === s.id);
  });

  const deadStates = graph.states.filter((s) => {
    // Cannot reach any accept state
    const acceptVisited = new Set<string>();
    const q = [s.id];
    acceptVisited.add(s.id);
    let canReachAccept = false;

    while (q.length > 0) {
      const current = q.shift()!;
      if (graph.states.find((st) => st.id === current)?.isAccept) {
        canReachAccept = true;
        break;
      }
      graph.transitions.forEach((t) => {
        if (t.source === current && !acceptVisited.has(t.target)) {
          acceptVisited.add(t.target);
          q.push(t.target);
        }
      });
    }

    return !canReachAccept;
  });

  // Check completeness: total transitions must equal states × alphabet
  const expectedTransitions = totalStates * alphabetSize;
  const isComplete = totalTransitions === expectedTransitions;

  // Check minimality
  const minDFA = DFAOperations.minimize(pureDFA);
  const isMinimal = minDFA.states.length === totalStates;

  const isConnected = unreachableStates.length === 0;

  return (
    <div className="p-4 sm:p-5 space-y-4 bg-slate-900/95 text-slate-100 rounded-2xl border border-slate-800 text-sm shadow-xl">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2.5 font-bold text-base text-indigo-300">
          <Activity className="w-5 h-5 text-indigo-400 shrink-0" />
          DFA Statistics & Graph Verification
        </div>
        <span className="text-xs font-mono font-bold text-indigo-300 bg-indigo-950/80 px-2.5 py-1 rounded-lg border border-indigo-500/30">
          Formal Verification
        </span>
      </div>

      {/* Graph Properties Check Badges (Section 7) */}
      <div className="p-4 bg-slate-950/90 rounded-xl border border-slate-800 space-y-2.5">
        <div className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-400" /> Formal Graph Property Checks
        </div>
        <div className="flex flex-wrap gap-2 pt-1">
          <div className="px-3 py-1.5 rounded-lg border text-xs font-bold flex items-center gap-1.5 bg-emerald-950/40 border-emerald-500/40 text-emerald-300">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Deterministic
          </div>

          <div
            className={`px-3 py-1.5 rounded-lg border text-xs font-bold flex items-center gap-1.5 ${
              isComplete
                ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                : 'bg-amber-950/40 border-amber-500/40 text-amber-300'
            }`}
          >
            {isComplete ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <AlertCircle className="w-4 h-4 text-amber-400" />}
            {isComplete ? 'Complete DFA' : 'Incomplete (Needs Trap)'}
          </div>

          <div
            className={`px-3 py-1.5 rounded-lg border text-xs font-bold flex items-center gap-1.5 ${
              isConnected
                ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                : 'bg-rose-950/40 border-rose-500/40 text-rose-300'
            }`}
          >
            {isConnected ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <XCircle className="w-4 h-4 text-rose-400" />}
            {isConnected ? 'Reachable / Connected' : `${unreachableStates.length} Unreachable State(s)`}
          </div>

          <div
            className={`px-3 py-1.5 rounded-lg border text-xs font-bold flex items-center gap-1.5 ${
              isMinimal
                ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                : 'bg-purple-950/40 border-purple-500/40 text-purple-300'
            }`}
          >
            {isMinimal ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <Activity className="w-4 h-4 text-purple-400" />}
            {isMinimal ? 'Canonical Minimal' : 'Can Be Minimized'}
          </div>
        </div>
      </div>

      {/* Numerical Statistics Table Grid (Section 3) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 font-mono">
        <div className="p-3.5 bg-slate-950/90 rounded-xl border border-slate-800 space-y-1">
          <div className="text-xs font-bold text-slate-400 font-sans">Total States</div>
          <div className="text-xl font-bold text-indigo-300">{totalStates}</div>
        </div>

        <div className="p-3.5 bg-slate-950/90 rounded-xl border border-slate-800 space-y-1">
          <div className="text-xs font-bold text-slate-400 font-sans">Alphabet Size</div>
          <div className="text-xl font-bold text-sky-300">{alphabetSize} ({`{${graph.alphabet.join(',')}}`})</div>
        </div>

        <div className="p-3.5 bg-slate-950/90 rounded-xl border border-slate-800 space-y-1">
          <div className="text-xs font-bold text-slate-400 font-sans">Total Transitions</div>
          <div className="text-xl font-bold text-purple-300">{totalTransitions}</div>
        </div>

        <div className="p-3.5 bg-slate-950/90 rounded-xl border border-slate-800 space-y-1">
          <div className="text-xs font-bold text-slate-400 font-sans">Accept States</div>
          <div className="text-xl font-bold text-emerald-300">{acceptCount}</div>
        </div>

        <div className="p-3.5 bg-slate-950/90 rounded-xl border border-slate-800 space-y-1">
          <div className="text-xs font-bold text-slate-400 font-sans">Trap / Sink States</div>
          <div className="text-lg font-bold text-amber-300">
            {trapStates.length > 0 ? `Yes (${trapStates.map((s) => s.id).join(',')})` : 'No Trap State'}
          </div>
        </div>

        <div className="p-3.5 bg-slate-950/90 rounded-xl border border-slate-800 space-y-1">
          <div className="text-xs font-bold text-slate-400 font-sans">Reachable States</div>
          <div className="text-lg font-bold text-emerald-300">{reachableCount} / {totalStates}</div>
        </div>

        <div className="p-3.5 bg-slate-950/90 rounded-xl border border-slate-800 space-y-1">
          <div className="text-xs font-bold text-slate-400 font-sans">Dead States</div>
          <div className="text-lg font-bold text-rose-300">
            {deadStates.length > 0 ? `${deadStates.length} (${deadStates.map((s) => s.id).join(',')})` : 'None'}
          </div>
        </div>

        <div className="p-3.5 bg-slate-950/90 rounded-xl border border-slate-800 space-y-1">
          <div className="text-xs font-bold text-slate-400 font-sans">Minimal State Count</div>
          <div className="text-lg font-bold text-indigo-300">{minDFA.states.length} States</div>
        </div>
      </div>
    </div>
  );
};
