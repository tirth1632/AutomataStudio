import React, { useState } from 'react';
import {
  BookOpen,
  GitFork,
  Table,
  Layers,
  Activity,
  CheckCircle2,
  Clock,
  Sparkles,
} from 'lucide-react';
import type { AutomatonGraph } from '../../../types/automata';
import type { MinimizationResult } from '../../../algorithms/hopcroftMinimization';
import { TransitionComparisonTable } from './TransitionComparisonTable';
import { PartitionEvolutionTree } from './PartitionEvolutionTree';

interface MinimizationBottomPanelsProps {
  result: MinimizationResult;
  originalGraph: AutomatonGraph;
  currentStepIndex: number;
  onStepSelect: (idx: number) => void;
  highlightStateId?: string | null;
  onHighlightState: (id: string | null) => void;
}

export const MinimizationBottomPanels: React.FC<MinimizationBottomPanelsProps> = ({
  result,
  originalGraph,
  currentStepIndex,
  onStepSelect,
  highlightStateId,
  onHighlightState,
}) => {
  const [activeTab, setActiveTab] = useState<
    'theory' | 'construction' | 'transitions' | 'partition' | 'complexity' | 'examples'
  >('theory');

  const { steps, mergedPairs, rejectedMerges, executionTimeMs, testStrings } = result;
  const currentStep = steps[currentStepIndex] || steps[0];

  const tabs: Array<{ id: typeof activeTab; label: string; icon: any }> = [
    { id: 'theory', label: 'Theory & Foundations', icon: BookOpen },
    { id: 'construction', label: 'Partition Construction', icon: GitFork },
    { id: 'transitions', label: 'Transition Comparison', icon: Table },
    { id: 'partition', label: 'Current Partition State', icon: Layers },
    { id: 'complexity', label: 'Complexity & Stats', icon: Activity },
    { id: 'examples', label: 'Equivalent Examples', icon: CheckCircle2 },
  ];

  return (
    <div className="bg-slate-950/90 border border-slate-800 rounded-2xl flex flex-col overflow-hidden shadow-2xl backdrop-blur-xl">
      {/* Tab Header */}
      <div className="flex items-center gap-1 bg-slate-900/90 border-b border-slate-800 p-1.5 overflow-x-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Body */}
      <div className="p-5 max-h-80 overflow-y-auto space-y-4">
        {/* THEORY TAB */}
        {activeTab === 'theory' && (
          <div className="space-y-4 text-xs leading-relaxed text-slate-300">
            <div className="p-4 bg-indigo-950/30 border border-indigo-500/30 rounded-xl space-y-2">
              <h4 className="font-bold text-indigo-300 text-sm flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-400" />
                Why DFA Minimization Works (Myhill-Nerode Theorem)
              </h4>
              <p>
                Every regular language L has a unique canonical minimal DFA with the minimum number of states.
                Two states p and q in a DFA are <strong>indistinguishable (equivalent)</strong> if for all possible input strings w ∈ Σ*,
                δ*(p, w) ∈ F ⇔ δ*(q, w) ∈ F.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 font-sans">
              <div className="p-3.5 bg-slate-900 border border-slate-800 rounded-xl space-y-1.5">
                <h5 className="font-bold text-emerald-400 text-xs">1. Accepting vs Non-Accepting Separation</h5>
                <p className="text-slate-400">
                  Accepting states ($F$) and non-accepting states ($Q \setminus F$) produce different acceptance outcomes on the empty string $\epsilon$. Thus, they can never be equivalent and are placed in separate initial partitions.
                </p>
              </div>

              <div className="p-3.5 bg-slate-900 border border-slate-800 rounded-xl space-y-1.5">
                <h5 className="font-bold text-amber-400 text-xs">2. Partition Refinement (Distinguishability)</h5>
                <p className="text-slate-400">
                  If two states $p, q$ in the same group transition to different partition groups on symbol $a$, they are 1-step distinguishable and must be split into separate partition groups.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* CONSTRUCTION TAB */}
        {activeTab === 'construction' && (
          <PartitionEvolutionTree
            steps={steps}
            currentStepIndex={currentStepIndex}
            onStepSelect={onStepSelect}
          />
        )}

        {/* TRANSITION COMPARISON TAB */}
        {activeTab === 'transitions' && (
          <TransitionComparisonTable
            originalGraph={originalGraph}
            minimizedGraph={result.minimizedGraph}
            currentStepRows={currentStep.transitionTable}
            alphabet={originalGraph.alphabet || ['0', '1']}
            splitSymbol={currentStep.splitBySymbol}
            highlightStateId={highlightStateId}
          />
        )}

        {/* CURRENT PARTITION TAB */}
        {activeTab === 'partition' && (
          <div className="space-y-3">
            <h4 className="font-bold text-white text-xs uppercase tracking-wider">
              Step {currentStep.stepIndex} Equivalence Groups ({currentStep.partitions.length} groups)
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {currentStep.partitions.map((group, idx) => {
                const realIds = group.filter((id) => id !== '__TRAP__');
                const memberStates = originalGraph.states.filter((s) => realIds.includes(s.id));
                const repState = memberStates[0] || { id: realIds[0] || 'Ø' };
                const isAccept = memberStates.some((s) => s.isAccept);

                return (
                  <div
                    key={idx}
                    className={`p-4 rounded-xl border transition ${
                      isAccept
                        ? 'bg-emerald-950/20 border-emerald-500/40 text-emerald-100'
                        : 'bg-slate-900/80 border-slate-800 text-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-mono font-bold text-xs text-indigo-300">
                        Equivalence Class P{idx + 1} → State m{idx}
                      </span>
                      {isAccept && (
                        <span className="text-[10px] bg-emerald-600/30 text-emerald-300 px-2 py-0.5 rounded border border-emerald-500/40 font-bold uppercase">
                          Accepting Group
                        </span>
                      )}
                    </div>

                    <div className="space-y-1 text-xs">
                      <div>
                        <span className="text-slate-400">Members: </span>
                        <span className="font-mono font-bold text-white">
                          {`{ ${realIds.join(', ') || 'Ø'} }`}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400">Representative: </span>
                        <span className="font-mono text-emerald-400 font-bold">{repState.id}</span>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-1.5 pt-2">
                      {realIds.map((id) => (
                        <button
                          key={id}
                          onClick={() => onHighlightState(id === highlightStateId ? null : id)}
                          className={`px-2 py-0.5 rounded font-mono text-xs border transition ${
                            id === highlightStateId
                              ? 'bg-indigo-600 text-white border-indigo-400 font-bold'
                              : 'bg-slate-950 text-slate-300 border-slate-700 hover:bg-slate-800'
                          }`}
                        >
                          {id}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* COMPLEXITY TAB */}
        {activeTab === 'complexity' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
              <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl">
                <div className="text-[10px] text-slate-400 uppercase font-bold">Time Complexity</div>
                <div className="text-lg font-extrabold text-indigo-400 font-mono">O(n log n)</div>
              </div>
              <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl">
                <div className="text-[10px] text-slate-400 uppercase font-bold">Space Complexity</div>
                <div className="text-lg font-extrabold text-indigo-400 font-mono">O(n)</div>
              </div>
              <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl">
                <div className="text-[10px] text-slate-400 uppercase font-bold">Total Iterations</div>
                <div className="text-lg font-extrabold text-emerald-400 font-mono">{steps.length}</div>
              </div>
              <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl">
                <div className="text-[10px] text-slate-400 uppercase font-bold">Execution Time</div>
                <div className="text-lg font-extrabold text-emerald-400 font-mono">{executionTimeMs} ms</div>
              </div>
            </div>

            <div className="p-3.5 bg-slate-900/80 border border-slate-800 rounded-xl space-y-2 text-xs text-slate-300">
              <div className="font-bold text-white flex items-center gap-2">
                <Clock className="w-4 h-4 text-indigo-400" />
                Hopcroft's Algorithm Complexity Rationale
              </div>
              <p>
                By maintaining a worklist of active splitters and always splitting by the smaller partition half ($|S'| \le |S|/2$), Hopcroft's algorithm guarantees that each state is processed in at most $O(\log n)$ partition refinements. Across all $|\Sigma|$ alphabet symbols, the total time bound is $O(|\Sigma| \cdot n \log n)$.
              </p>
            </div>
          </div>
        )}

        {/* EXAMPLES TAB */}
        {activeTab === 'examples' && (
          <div className="space-y-4 text-xs">
            <div className="space-y-2">
              <h5 className="font-bold text-emerald-400 uppercase tracking-wider text-[11px]">
                Merged Equivalent State Pairs ({mergedPairs.length} states)
              </h5>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {mergedPairs.map((pair) => (
                  <div key={pair.newId} className="p-2.5 bg-slate-900 border border-slate-800 rounded-xl font-mono flex items-center justify-between">
                    <span className="font-bold text-emerald-300">{pair.newId}</span>
                    <span className="text-slate-400">Merges: {`{ ${pair.oldIds.join(', ')} }`}</span>
                  </div>
                ))}
              </div>
            </div>

            {rejectedMerges.length > 0 && (
              <div className="space-y-2">
                <h5 className="font-bold text-amber-400 uppercase tracking-wider text-[11px]">
                  Rejected Merges / Split Rationales ({rejectedMerges.length} pairs)
                </h5>
                <div className="space-y-1.5 max-h-40 overflow-y-auto font-mono text-[11px]">
                  {rejectedMerges.map((rm, idx) => (
                    <div key={idx} className="p-2 bg-amber-950/20 border border-amber-500/30 rounded-lg text-amber-200">
                      <span className="font-bold">{rm.stateA} vs {rm.stateB}: </span>
                      <span className="text-slate-300">{rm.splitReason}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-2">
              <h5 className="font-bold text-indigo-400 uppercase tracking-wider text-[11px]">
                Behavioral Equivalence Test Strings
              </h5>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {testStrings.map((ts, idx) => (
                  <div key={idx} className="p-2 bg-slate-900 border border-slate-800 rounded-lg font-mono flex items-center justify-between">
                    <span className="text-slate-300">"{ts.input || 'ε'}"</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${ts.originalAccepted ? 'bg-emerald-600/30 text-emerald-300' : 'bg-slate-800 text-slate-400'}`}>
                      {ts.originalAccepted ? 'ACCEPT' : 'REJECT'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
