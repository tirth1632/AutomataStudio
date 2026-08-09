import React, { useMemo } from 'react';
import { Sparkles, ArrowRight, Table, CheckCircle2 } from 'lucide-react';
import { useAutomata } from '../../context/AutomataContext';
import { convertNfaToDfa } from '../../algorithms/subsetConstruction';

export const NfaToDfaView: React.FC = () => {
  const { graph, setGraph, setActivePage } = useAutomata();

  const conversionResult = useMemo(() => {
    return convertNfaToDfa(graph);
  }, [graph]);

  const { steps, dfaGraph } = conversionResult;

  const handleApplyDfa = () => {
    setGraph(dfaGraph);
    setActivePage('dfa');
  };

  return (
    <div className="w-full h-full p-6 bg-slate-950 text-slate-100 overflow-y-auto">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header Banner */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 bg-gradient-to-r from-indigo-950/80 via-slate-900 to-slate-900 border border-indigo-500/30 rounded-3xl shadow-2xl backdrop-blur-xl">
          <div>
            <div className="flex items-center gap-2 text-indigo-400 font-semibold text-xs uppercase tracking-wider mb-1">
              <Sparkles className="w-4 h-4" /> Algorithm Visualizer
            </div>
            <h2 className="text-2xl font-bold text-white">NFA → DFA Subset Construction</h2>
            <p className="text-sm text-slate-400 mt-1">
              Converts non-deterministic finite automata into equivalent deterministic finite automata by computing power sets of reachable NFA state sets.
            </p>
          </div>

          <button
            onClick={handleApplyDfa}
            className="flex items-center gap-2 px-5 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-2xl shadow-xl shadow-indigo-600/30 transition active:scale-95 shrink-0"
          >
            Load Converted DFA into Canvas
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* Step Stepper Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-slate-900/90 border border-slate-800 rounded-2xl">
            <span className="text-xs text-slate-400">Input NFA States</span>
            <p className="text-xl font-bold text-white mt-1">{graph.states.length} states</p>
          </div>
          <div className="p-4 bg-slate-900/90 border border-slate-800 rounded-2xl">
            <span className="text-xs text-slate-400">Discovered DFA Subsets</span>
            <p className="text-xl font-bold text-indigo-400 mt-1">{dfaGraph.states.length} states</p>
          </div>
          <div className="p-4 bg-slate-900/90 border border-slate-800 rounded-2xl">
            <span className="text-xs text-slate-400">Alphabet</span>
            <p className="text-xl font-bold text-emerald-400 mt-1">{`{ ${dfaGraph.alphabet.join(', ')} }`}</p>
          </div>
        </div>

        {/* Subset Construction Step Table */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-2xl">
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <Table className="w-5 h-5 text-indigo-400" />
            Transition Subset Table
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm font-mono border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 text-xs">
                  <th className="py-3 px-4">Step</th>
                  <th className="py-3 px-4">DFA State</th>
                  <th className="py-3 px-4">NFA Subset</th>
                  <th className="py-3 px-4">Symbol Read</th>
                  <th className="py-3 px-4">Moves To DFA State</th>
                  <th className="py-3 px-4">Is Accepting?</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {steps.map((step, idx) => (
                  <tr key={idx} className="hover:bg-slate-800/50 transition">
                    <td className="py-3 px-4 text-slate-500">{step.stepIndex}</td>
                    <td className="py-3 px-4 font-bold text-indigo-300">{step.fromDfaState}</td>
                    <td className="py-3 px-4 text-slate-200">{step.tableRow.nfaStatesStr}</td>
                    <td className="py-3 px-4 font-bold text-sky-400">{step.symbol}</td>
                    <td className="py-3 px-4 font-bold text-purple-300">
                      {step.toDfaState}
                      {step.isNewStateDiscovered && (
                        <span className="ml-2 text-[10px] font-sans bg-indigo-950 text-indigo-300 border border-indigo-500/40 px-1.5 py-0.5 rounded">
                          New!
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {step.tableRow.isAccepting ? (
                        <span className="text-emerald-400 flex items-center gap-1 text-xs">
                          <CheckCircle2 className="w-4 h-4" /> Accept
                        </span>
                      ) : (
                        <span className="text-slate-500 text-xs">Normal</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
