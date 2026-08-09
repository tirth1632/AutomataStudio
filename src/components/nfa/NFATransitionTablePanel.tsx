import { Table } from 'lucide-react';
import type { NFA } from '../../algorithms/nfa/NFA';

interface NFATransitionTablePanelProps {
  nfa: NFA;
  activeStates?: string[];
}

export const NFATransitionTablePanel: React.FC<NFATransitionTablePanelProps> = ({
  nfa,
  activeStates = [],
}) => {
  const activeSet = new Set(activeStates);
  const alphabetWithEps = [...nfa.alphabet];
  if (
    Object.values(nfa.transitions).some((symMap) => symMap['ε'] && symMap['ε'].length > 0) &&
    !alphabetWithEps.includes('ε')
  ) {
    alphabetWithEps.push('ε');
  }

  return (
    <div className="p-4 space-y-3 bg-slate-900/90 text-slate-100 rounded-2xl border border-slate-800 text-xs">
      <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
        <div className="flex items-center gap-2 font-bold text-sm text-amber-300">
          <Table className="w-4 h-4 text-amber-400" />
          NFA Multi-Target Transition Table δ(q, σ)
        </div>
        <span className="text-[10px] text-slate-400 font-mono">
          Cells display power set subsets P(Q)
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full font-mono text-xs border-collapse">
          <thead>
            <tr className="border-b border-slate-800 text-slate-400 text-[11px]">
              <th className="text-left py-2 px-3">State</th>
              {alphabetWithEps.map((sym) => (
                <th key={sym} className="py-2 px-3 text-center text-indigo-300 font-bold">
                  '{sym}'
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {nfa.states.map((stateId) => {
              const isStart = stateId === nfa.startState;
              const isAccept = nfa.acceptStates.includes(stateId);
              const isActive = activeSet.has(stateId);

              return (
                <tr
                  key={stateId}
                  className={`transition ${
                    isActive
                      ? 'bg-sky-950/60 font-bold border-l-2 border-sky-400'
                      : 'hover:bg-slate-950/50'
                  }`}
                >
                  <td className="py-2 px-3 font-bold flex items-center gap-1.5">
                    {isStart && <span className="text-amber-400 text-[10px]" title="Start State">➔</span>}
                    {isAccept && <span className="text-emerald-400 text-[10px]" title="Accept State">★</span>}
                    <span className={isActive ? 'text-sky-300' : 'text-white'}>{stateId}</span>
                    {isActive && (
                      <span className="ml-1.5 text-[9px] bg-sky-900/80 text-sky-200 px-1.5 py-0.5 rounded-full border border-sky-500/40 font-sans">
                        Active
                      </span>
                    )}
                  </td>

                  {alphabetWithEps.map((sym) => {
                    const targets = nfa.transitions[stateId]?.[sym] || [];
                    const hasTargets = targets.length > 0;

                    return (
                      <td key={sym} className="py-2 px-3 text-center">
                        {hasTargets ? (
                          <span
                            className={`px-2 py-0.5 rounded border text-[11px] font-bold ${
                              targets.length > 1
                                ? 'bg-indigo-950/80 text-indigo-300 border-indigo-500/40 shadow-inner'
                                : 'bg-slate-950/80 text-slate-200 border-slate-800'
                            }`}
                          >
                            {`{${targets.join(', ')}}`}
                          </span>
                        ) : (
                          <span className="text-slate-600 text-[11px]">∅</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
