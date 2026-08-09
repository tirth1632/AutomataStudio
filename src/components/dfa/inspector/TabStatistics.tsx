import React from 'react';
import {
  BarChart3,
  Layers,
  CheckCircle2,
  XCircle,
  Network,
  Activity,
  Repeat,
  Share2,
  Grid,
  Zap,
  TrendingUp,
  Compass,
  GitCommit,
} from 'lucide-react';
import type { DFAInspectorData } from '../../../utils/dfaInspectorEngine';

interface TabStatisticsProps {
  data: DFAInspectorData;
}

export const TabStatistics: React.FC<TabStatisticsProps> = ({ data }) => {
  const { statistics, alphabet } = data;

  const densityPercent = Math.round(statistics.transitionDensity * 100);
  const avgOutDegree = statistics.averageOutDegree.toFixed(2);

  return (
    <div className="space-y-3 font-sans text-xs">
      <div className="flex items-center justify-between px-1">
        <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-1">
          <BarChart3 className="w-3.5 h-3.5" /> Quantitative Metrics & Graph Analytics
        </span>
        <span className="text-[10px] text-slate-400 font-mono">DFA Studio Analytics</span>
      </div>

      {/* Grid of Stat Cards */}
      <div className="grid grid-cols-2 gap-2 font-mono">
        {/* Total States */}
        <div className="p-2.5 bg-slate-950/90 border border-slate-800/80 rounded-xl space-y-1 relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-400 text-[10px] font-sans">
            <span>Total States</span>
            <Layers className="w-3.5 h-3.5 text-indigo-400" />
          </div>
          <div className="text-lg font-bold text-white">{statistics.totalStates}</div>
          <div className="text-[9px] text-slate-500 font-sans">Q set size</div>
        </div>

        {/* Accept States */}
        <div className="p-2.5 bg-slate-950/90 border border-slate-800/80 rounded-xl space-y-1 relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-400 text-[10px] font-sans">
            <span>Accept States</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="text-lg font-bold text-emerald-400">{statistics.acceptStatesCount}</div>
          <div className="text-[9px] text-slate-500 font-sans">Final states (F)</div>
        </div>

        {/* Reject States */}
        <div className="p-2.5 bg-slate-950/90 border border-slate-800/80 rounded-xl space-y-1 relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-400 text-[10px] font-sans">
            <span>Reject States</span>
            <XCircle className="w-3.5 h-3.5 text-rose-400" />
          </div>
          <div className="text-lg font-bold text-rose-400">{statistics.rejectStatesCount}</div>
          <div className="text-[9px] text-slate-500 font-sans">Non-final Q \ F</div>
        </div>

        {/* Transitions */}
        <div className="p-2.5 bg-slate-950/90 border border-slate-800/80 rounded-xl space-y-1 relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-400 text-[10px] font-sans">
            <span>Transitions</span>
            <Network className="w-3.5 h-3.5 text-cyan-400" />
          </div>
          <div className="text-lg font-bold text-cyan-300">{statistics.totalTransitions}</div>
          <div className="text-[9px] text-slate-500 font-sans">Total edges in δ</div>
        </div>

        {/* Transition Density */}
        <div className="p-2.5 bg-slate-950/90 border border-slate-800/80 rounded-xl space-y-1 relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-400 text-[10px] font-sans">
            <span>Transition Density</span>
            <Activity className="w-3.5 h-3.5 text-purple-400" />
          </div>
          <div className="text-lg font-bold text-purple-300">{densityPercent}%</div>
          <div className="text-[9px] text-slate-500 font-sans">|δ| / (|Q| × |Σ|)</div>
        </div>

        {/* Average Out Degree */}
        <div className="p-2.5 bg-slate-950/90 border border-slate-800/80 rounded-xl space-y-1 relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-400 text-[10px] font-sans">
            <span>Avg Out Degree</span>
            <Share2 className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div className="text-lg font-bold text-amber-300">{avgOutDegree}</div>
          <div className="text-[9px] text-slate-500 font-sans">Outgoing per node</div>
        </div>

        {/* Reachable States */}
        <div className="p-2.5 bg-slate-950/90 border border-slate-800/80 rounded-xl space-y-1 relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-400 text-[10px] font-sans">
            <span>Reachable States</span>
            <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="text-lg font-bold text-emerald-400">{statistics.reachableStates.length}</div>
          <div className="text-[9px] text-slate-500 font-sans">Path from q0 exists</div>
        </div>

        {/* Dead States */}
        <div className="p-2.5 bg-slate-950/90 border border-slate-800/80 rounded-xl space-y-1 relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-400 text-[10px] font-sans">
            <span>Dead States</span>
            <XCircle className="w-3.5 h-3.5 text-rose-400" />
          </div>
          <div className="text-lg font-bold text-rose-400">{statistics.deadStates.length}</div>
          <div className="text-[9px] text-slate-500 font-sans">Cannot reach F</div>
        </div>

        {/* Trap States */}
        <div className="p-2.5 bg-slate-950/90 border border-slate-800/80 rounded-xl space-y-1 relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-400 text-[10px] font-sans">
            <span>Trap States</span>
            <Grid className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div className="text-lg font-bold text-amber-300">{statistics.trapStates.length}</div>
          <div className="text-[9px] text-slate-500 font-sans">Non-accepting sink</div>
        </div>

        {/* State Utilization */}
        <div className="p-2.5 bg-slate-950/90 border border-slate-800/80 rounded-xl space-y-1 relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-400 text-[10px] font-sans">
            <span>State Utilization</span>
            <Zap className="w-3.5 h-3.5 text-blue-400" />
          </div>
          <div className="text-lg font-bold text-blue-300">{statistics.stateUtilization}%</div>
          <div className="text-[9px] text-slate-500 font-sans">Useful reachable nodes</div>
        </div>
      </div>

      {/* Modern Graph Metric Cards */}
      <div className="space-y-2 pt-1 font-mono text-xs">
        {/* Cycles */}
        <div className="p-3 bg-slate-950/90 border border-slate-800/80 rounded-xl space-y-1">
          <div className="flex items-center justify-between">
            <span className="font-sans text-slate-400 text-[11px] font-bold flex items-center gap-1.5">
              <Repeat className="w-3.5 h-3.5 text-indigo-400" /> Cycles
            </span>
            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${statistics.hasCycle ? 'bg-indigo-950 text-indigo-300 border border-indigo-500/30' : 'bg-slate-800 text-slate-400'}`}>
              {statistics.hasCycle ? 'Yes (Cyclic Graph)' : 'No (Acyclic Graph)'}
            </span>
          </div>
          {statistics.hasCycle && statistics.cycleNodes.length > 0 && (
            <div className="text-[10px] text-slate-300 font-sans pt-1">
              Cycle Path: <span className="font-mono text-indigo-300">{statistics.cycleNodes.join(' → ')}</span>
            </div>
          )}
        </div>

        {/* Strongly Connected Components */}
        <div className="p-3 bg-slate-950/90 border border-slate-800/80 rounded-xl space-y-1">
          <div className="flex items-center justify-between">
            <span className="font-sans text-slate-400 text-[11px] font-bold flex items-center gap-1.5">
              <Share2 className="w-3.5 h-3.5 text-emerald-400" /> Strongly Connected Components
            </span>
            <span className="font-bold text-emerald-400">{statistics.sccs.length}</span>
          </div>
          <div className="text-[10px] text-slate-400 font-sans">
            Components:{' '}
            {statistics.sccs.map((scc, idx) => (
              <span key={idx} className="font-mono text-slate-300 mr-1.5">
                [{scc.join(', ')}]
              </span>
            ))}
          </div>
        </div>

        {/* Connected Components */}
        <div className="p-3 bg-slate-950/90 border border-slate-800/80 rounded-xl flex items-center justify-between">
          <span className="font-sans text-slate-400 text-[11px] font-bold flex items-center gap-1.5">
            <Network className="w-3.5 h-3.5 text-cyan-400" /> Connected Components
          </span>
          <span className="font-bold text-cyan-300">{statistics.connectedComponentsCount}</span>
        </div>

        {/* Graph Diameter */}
        <div className="p-3 bg-slate-950/90 border border-slate-800/80 rounded-xl flex items-center justify-between">
          <span className="font-sans text-slate-400 text-[11px] font-bold flex items-center gap-1.5">
            <Compass className="w-3.5 h-3.5 text-amber-400" /> Graph Diameter
          </span>
          <span className="font-bold text-amber-300">{statistics.graphDiameter}</span>
        </div>

        {/* Longest Simple Path */}
        <div className="p-3 bg-slate-950/90 border border-slate-800/80 rounded-xl space-y-1">
          <div className="flex items-center justify-between">
            <span className="font-sans text-slate-400 text-[11px] font-bold flex items-center gap-1.5">
              <GitCommit className="w-3.5 h-3.5 text-purple-400" /> Longest Simple Path
            </span>
            <span className="font-bold text-purple-300">{statistics.longestSimplePathLength} steps</span>
          </div>
          <div className="text-[10px] text-slate-300 font-mono">
            {statistics.longestSimplePath.join(' → ')}
          </div>
        </div>

        {/* Average Transition Count Per Symbol */}
        <div className="p-3 bg-slate-950/90 border border-slate-800/80 rounded-xl space-y-1.5">
          <span className="font-sans text-slate-400 text-[11px] font-bold block">Average Transition Count per Symbol</span>
          <div className="flex flex-wrap gap-2">
            {alphabet.map((sym) => (
              <div key={sym} className="flex-1 bg-slate-900 border border-slate-800 p-2 rounded-lg text-center">
                <span className="text-[10px] text-slate-400 block font-sans">Symbol '{sym}'</span>
                <span className="font-bold text-indigo-300 text-sm">
                  {statistics.averageTransitionCountPerSymbol[sym] || 0}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
