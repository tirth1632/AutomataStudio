import React, { useState, useMemo } from 'react';
import {
  GraduationCap,
  Code,
  Copy,
  FileText,
  Download,
  Check,
  Zap,
  Activity,
  Layers,
  CheckCircle2,
  AlertTriangle,
  Cpu,
  ChevronDown,
  ChevronUp,
  FileJson,
  Share2,
  Sparkles,
  HelpCircle,
  BookOpen,
  Target,
  ArrowRight,
} from 'lucide-react';
import type { AutomatonGraph } from '../../types/automata';
import { useAutomata } from '../../context/AutomataContext';
import {
  copyToClipboard,
  exportToLaTeX,
  exportToText,
  generateAcademicPDFReport,
  downloadFile,
} from '../../utils/exportUtils';
import { getEpsilonClosureSingle } from '../../algorithms/epsilonClosure';

interface NFAFormalDefinitionPanelProps {
  nfa?: any;
  graph?: AutomatonGraph;
  promptDescription?: string;
  onSelectState?: (stateId: string | null) => void;
}

export const NFAFormalDefinitionPanel: React.FC<NFAFormalDefinitionPanelProps> = ({
  nfa,
  graph: graphProp,
  promptDescription,
  onSelectState,
}) => {
  const { graph: globalGraph } = useAutomata();
  const graph: AutomatonGraph = graphProp || globalGraph;
  const [copiedType, setCopiedType] = useState<string | null>(null);

  // Active Tab for Theory Section
  const [activeTab, setActiveTab] = useState<
    | 'overview'
    | 'formal'
    | 'properties'
    | 'transition'
    | 'powerset'
    | 'dfa_comparison'
    | 'complexity'
    | 'applications'
    | 'exam_notes'
    | 'common_mistakes'
    | 'ai_tutor'
  >('overview');

  // Selected State / Symbol for Transition Function Explorer
  const [evalState, setEvalState] = useState<string>('');
  const [evalSymbol, setEvalSymbol] = useState<string>('0');
  const [activeSection, setActiveSection] = useState<string | null>(null);

  // Extract 5-tuple parameters deterministically from nfa or graph object
  const states: string[] = useMemo(() => {
    if (nfa?.states && nfa.states.length > 0) return nfa.states;
    if (graph?.states && graph.states.length > 0) return graph.states.map((s) => s.id);
    return ['q0'];
  }, [nfa, graph]);

  const alphabet: string[] = useMemo(() => {
    if (nfa?.alphabet && nfa.alphabet.length > 0) return nfa.alphabet.filter((s: string) => s !== 'ε' && s !== 'epsilon');
    if (graph?.alphabet && graph.alphabet.length > 0) return graph.alphabet.filter((s: string) => s !== 'ε' && s !== 'epsilon');
    return ['0', '1'];
  }, [nfa, graph]);

  const startState: string = useMemo(() => {
    if (nfa?.startState) return nfa.startState;
    if (graph?.states) return graph.states.find((s) => s.isStart)?.id || states[0];
    return states[0] || 'q0';
  }, [nfa, graph, states]);

  const acceptStates: string[] = useMemo(() => {
    if (nfa?.acceptStates) return nfa.acceptStates;
    if (graph?.states) return graph.states.filter((s) => s.isAccept).map((s) => s.id);
    return [];
  }, [nfa, graph]);

  // Sync evalState default
  React.useEffect(() => {
    if (states.length > 0 && !states.includes(evalState)) {
      setEvalState(states[0]);
    }
  }, [states, evalState]);

  // Compute transition mapping table δ(q, a) -> set of states
  const transitionMap = useMemo(() => {
    const map: Record<string, Record<string, string[]>> = {};
    states.forEach((st) => {
      map[st] = {};
    });

    if (nfa?.transitions) {
      Object.entries(nfa.transitions).forEach(([src, symMap]: [string, any]) => {
        if (!map[src]) map[src] = {};
        Object.entries(symMap).forEach(([sym, tgts]: [string, any]) => {
          map[src][sym] = Array.isArray(tgts) ? tgts : [tgts];
        });
      });
    } else if (graph?.transitions) {
      graph.transitions.forEach((t) => {
        if (!map[t.source]) map[t.source] = {};
        t.symbols.forEach((sym) => {
          if (!map[t.source][sym]) map[t.source][sym] = [];
          if (!map[t.source][sym].includes(t.target)) {
            map[t.source][sym].push(t.target);
          }
        });
      });
    }
    return map;
  }, [nfa, graph, states]);

  // Count total transitions & ε-transitions
  const { totalTransitionsCount, epsilonEdgesCount, isNondeterministic } = useMemo(() => {
    let total = 0;
    let eps = 0;
    let isND = false;

    Object.entries(transitionMap).forEach(([_, symMap]) => {
      Object.entries(symMap).forEach(([sym, tgts]) => {
        total += tgts.length;
        if (sym === 'ε' || sym === 'epsilon' || sym === 'e' || sym === '') {
          eps += tgts.length;
          isND = true;
        }
        if (tgts.length > 1) {
          isND = true;
        }
      });
    });

    return {
      totalTransitionsCount: total,
      epsilonEdgesCount: eps,
      isNondeterministic: isND || eps > 0,
    };
  }, [transitionMap]);

  // Reachable states via BFS
  const reachableStates = useMemo(() => {
    const visited = new Set<string>([startState]);
    const queue = [startState];

    while (queue.length > 0) {
      const curr = queue.shift()!;
      const symMap = transitionMap[curr] || {};
      Object.values(symMap).forEach((tgts) => {
        tgts.forEach((tgt) => {
          if (!visited.has(tgt)) {
            visited.add(tgt);
            queue.push(tgt);
          }
        });
      });
    }
    return Array.from(visited);
  }, [startState, transitionMap]);

  const reachablePercent = Math.round((reachableStates.length / Math.max(1, states.length)) * 100);

  // Deterministic Insights List
  const insights = useMemo(() => {
    const list: string[] = [];
    if (epsilonEdgesCount > 0) {
      list.push(`Machine contains ${epsilonEdgesCount} ε-transition(s) (Nondeterministic ε-NFA).`);
    } else {
      list.push('Machine contains zero ε-transitions (ε-Free NFA).');
    }

    if (isNondeterministic) {
      list.push('Nondeterministic branching detected (spontaneous or multi-target hops).');
    } else {
      list.push('Single deterministic path per symbol.');
    }

    if (reachableStates.length === states.length) {
      list.push('100% of states are reachable from initial start state.');
    } else {
      const unreachableCount = states.length - reachableStates.length;
      list.push(`${unreachableCount} unreachable state(s) detected.`);
    }

    const acceptReachable = acceptStates.filter((s) => reachableStates.includes(s));
    if (acceptReachable.length === acceptStates.length && acceptStates.length > 0) {
      list.push('All accept states are reachable from start state.');
    } else if (acceptStates.length === 0) {
      list.push('No accept states configured in automaton.');
    }

    const avgBranching = (totalTransitionsCount / Math.max(1, states.length)).toFixed(2);
    list.push(`Average branching factor = ${avgBranching} transitions per state.`);

    return list;
  }, [epsilonEdgesCount, isNondeterministic, reachableStates, states, acceptStates, totalTransitionsCount]);

  // Export Functions
  const handleCopyText = async () => {
    const txt = exportToText(graph);
    const success = await copyToClipboard(txt);
    if (success) {
      setCopiedType('text');
      setTimeout(() => setCopiedType(null), 2000);
    }
  };

  const handleCopyLaTeX = async () => {
    const latex = exportToLaTeX(graph, promptDescription || graph?.name);
    const success = await copyToClipboard(latex);
    if (success) {
      setCopiedType('latex');
      setTimeout(() => setCopiedType(null), 2000);
    }
  };

  const handleDownloadPDF = () => {
    generateAcademicPDFReport(graph, promptDescription || graph?.name);
  };

  const handleDownloadJSON = () => {
    const specData = {
      automaton: graph?.name || 'NFA Machine Spec',
      tuple: {
        Q: states,
        Sigma: alphabet,
        startState,
        F: acceptStates,
      },
      transitions: transitionMap,
      statistics: {
        totalStates: states.length,
        alphabetSize: alphabet.length,
        totalTransitions: totalTransitionsCount,
        epsilonTransitions: epsilonEdgesCount,
        isNondeterministic,
        reachablePercent: `${reachablePercent}%`,
      },
    };
    downloadFile(`nfa-machine-spec.json`, JSON.stringify(specData, null, 2), 'application/json');
  };

  // Evaluated Target States for Transition Explorer
  const evaluatedTargets = useMemo(() => {
    if (!evalState) return [];
    return transitionMap[evalState]?.[evalSymbol] || [];
  }, [evalState, evalSymbol, transitionMap]);

  return (
    <div className="p-4 sm:p-5 space-y-4 bg-slate-900/95 text-slate-100 rounded-2xl border border-slate-800 text-sm shadow-xl font-sans select-none">
      {/* ────────────────────────────────────────────────────────────────── */}
      {/* 1. MACHINE SUMMARY DASHBOARD (STATISTICS CARDS)                     */}
      {/* ────────────────────────────────────────────────────────────────── */}
      <div className="space-y-2">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2.5 flex-wrap gap-2">
          <div className="flex items-center gap-2 font-bold text-base text-purple-300">
            <GraduationCap className="w-5 h-5 text-purple-400 shrink-0" />
            Machine Specification Laboratory
          </div>

          {/* Export Toolbar */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              onClick={handleCopyText}
              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold flex items-center gap-1 transition border border-slate-700 cursor-pointer"
              title="Copy 5-tuple as plain text"
            >
              {copiedType === 'text' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              Text
            </button>
            <button
              onClick={handleCopyLaTeX}
              className="px-2.5 py-1 bg-purple-950 hover:bg-purple-900 text-purple-200 rounded-lg text-xs font-semibold flex items-center gap-1 transition border border-purple-500/40 cursor-pointer"
              title="Copy 5-tuple as LaTeX equation"
            >
              {copiedType === 'latex' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <FileText className="w-3.5 h-3.5" />}
              LaTeX
            </button>
            <button
              onClick={handleDownloadJSON}
              className="px-2.5 py-1 bg-slate-950 hover:bg-slate-800 text-slate-300 rounded-lg text-xs font-semibold flex items-center gap-1 transition border border-slate-800 cursor-pointer"
              title="Export Machine Spec JSON"
            >
              <FileJson className="w-3.5 h-3.5 text-purple-400" />
              JSON
            </button>
            <button
              onClick={handleDownloadPDF}
              className="px-2.5 py-1 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-lg text-xs font-bold flex items-center gap-1 transition shadow cursor-pointer"
              title="Generate PDF Report"
            >
              <Download className="w-3.5 h-3.5" />
              PDF Report
            </button>
          </div>
        </div>

        {/* Compact Metric Cards Grid (2 rows x 4 columns for perfect sidebar readability) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono text-xs pt-1">
          <div className="p-2.5 bg-slate-950/80 rounded-xl border border-slate-800 flex flex-col items-center justify-center min-w-0 shadow-sm">
            <span className="text-[9.5px] text-slate-400 font-sans font-extrabold uppercase tracking-wider block truncate w-full text-center">
              States |Q|
            </span>
            <span className="text-sm font-extrabold text-white font-mono mt-0.5">{states.length}</span>
          </div>
          <div className="p-2.5 bg-slate-950/80 rounded-xl border border-slate-800 flex flex-col items-center justify-center min-w-0 shadow-sm">
            <span className="text-[9.5px] text-slate-400 font-sans font-extrabold uppercase tracking-wider block truncate w-full text-center">
              Alphabet |Σ|
            </span>
            <span className="text-sm font-extrabold text-sky-400 font-mono mt-0.5">{alphabet.length}</span>
          </div>
          <div className="p-2.5 bg-slate-950/80 rounded-xl border border-slate-800 flex flex-col items-center justify-center min-w-0 shadow-sm">
            <span className="text-[9.5px] text-slate-400 font-sans font-extrabold uppercase tracking-wider block truncate w-full text-center">
              Transitions
            </span>
            <span className="text-sm font-extrabold text-purple-300 font-mono mt-0.5">{totalTransitionsCount}</span>
          </div>
          <div className="p-2.5 bg-slate-950/80 rounded-xl border border-slate-800 flex flex-col items-center justify-center min-w-0 shadow-sm">
            <span className="text-[9.5px] text-slate-400 font-sans font-extrabold uppercase tracking-wider block truncate w-full text-center">
              ε Edges
            </span>
            <span className="text-sm font-extrabold text-amber-400 font-mono mt-0.5">{epsilonEdgesCount}</span>
          </div>
          <div className="p-2.5 bg-slate-950/80 rounded-xl border border-slate-800 flex flex-col items-center justify-center min-w-0 shadow-sm">
            <span className="text-[9.5px] text-slate-400 font-sans font-extrabold uppercase tracking-wider block truncate w-full text-center">
              Reachable
            </span>
            <span className="text-sm font-extrabold text-emerald-400 font-mono mt-0.5">{reachablePercent}%</span>
          </div>
          <div className="p-2.5 bg-slate-950/80 rounded-xl border border-slate-800 flex flex-col items-center justify-center min-w-0 shadow-sm">
            <span className="text-[9.5px] text-slate-400 font-sans font-extrabold uppercase tracking-wider block truncate w-full text-center">
              Deterministic
            </span>
            <span className={`text-sm font-extrabold font-mono mt-0.5 ${isNondeterministic ? 'text-amber-400' : 'text-emerald-400'}`}>
              {isNondeterministic ? 'No' : 'Yes'}
            </span>
          </div>
          <div className="p-2.5 bg-slate-950/80 rounded-xl border border-slate-800 flex flex-col items-center justify-center min-w-0 shadow-sm">
            <span className="text-[9.5px] text-slate-400 font-sans font-extrabold uppercase tracking-wider block truncate w-full text-center">
              Accept |F|
            </span>
            <span className="text-sm font-extrabold text-emerald-400 font-mono mt-0.5">{acceptStates.length}</span>
          </div>
          <div className="p-2.5 bg-slate-950/80 rounded-xl border border-slate-800 flex flex-col items-center justify-center min-w-0 shadow-sm">
            <span className="text-[9.5px] text-slate-400 font-sans font-extrabold uppercase tracking-wider block truncate w-full text-center">
              Type
            </span>
            <span className="text-sm font-extrabold text-indigo-300 font-mono mt-0.5">{epsilonEdgesCount > 0 ? 'ε-NFA' : 'NFA'}</span>
          </div>
        </div>
      </div>

      {/* ────────────────────────────────────────────────────────────────── */}
      {/* 2. FORMAL 5-TUPLE INTERACTIVE EXPLORER EQUATION                     */}
      {/* ────────────────────────────────────────────────────────────────── */}
      <div className="p-3.5 bg-purple-950/40 border border-purple-500/30 rounded-xl font-mono text-center text-sm sm:text-base font-bold text-purple-200 flex items-center justify-center gap-2 flex-wrap">
        <span className="text-white">M = (</span>
        <button
          onClick={() => {
            setActiveSection(activeSection === 'Q' ? null : 'Q');
            setActiveTab('formal');
          }}
          className="px-2 py-0.5 bg-indigo-900/80 hover:bg-indigo-700 text-indigo-200 border border-indigo-500/50 rounded cursor-pointer transition"
          title="Click to inspect States Set Q"
        >
          Q
        </button>
        <span>,</span>
        <button
          onClick={() => {
            setActiveSection(activeSection === 'Sigma' ? null : 'Sigma');
            setActiveTab('formal');
          }}
          className="px-2 py-0.5 bg-sky-900/80 hover:bg-sky-700 text-sky-200 border border-sky-500/50 rounded cursor-pointer transition"
          title="Click to inspect Input Alphabet Σ"
        >
          Σ
        </button>
        <span>,</span>
        <button
          onClick={() => {
            setActiveSection(activeSection === 'delta' ? null : 'delta');
            setActiveTab('transition');
          }}
          className="px-2 py-0.5 bg-purple-900/80 hover:bg-purple-700 text-purple-200 border border-purple-500/50 rounded cursor-pointer transition"
          title="Click to inspect Transition Mapping Function δ"
        >
          δ
        </button>
        <span>,</span>
        <button
          onClick={() => {
            setActiveSection(activeSection === 'q0' ? null : 'q0');
            onSelectState?.(startState);
          }}
          className="px-2 py-0.5 bg-amber-900/80 hover:bg-amber-700 text-amber-200 border border-amber-500/50 rounded cursor-pointer transition"
          title="Click to highlight Initial Start State q₀"
        >
          q₀
        </button>
        <span>,</span>
        <button
          onClick={() => {
            setActiveSection(activeSection === 'F' ? null : 'F');
            if (acceptStates.length > 0) onSelectState?.(acceptStates[0]);
          }}
          className="px-2 py-0.5 bg-emerald-900/80 hover:bg-emerald-700 text-emerald-200 border border-emerald-500/50 rounded cursor-pointer transition"
          title="Click to inspect Accepting States F"
        >
          F
        </button>
        <span className="text-white">)</span>
      </div>

      {/* ────────────────────────────────────────────────────────────────── */}
      {/* 3. INTERACTIVE COMPONENT CARDS WITH SET CHIPS                       */}
      {/* ────────────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 font-mono text-sm">
        {/* Q Card */}
        <div className="p-3.5 bg-slate-950/90 rounded-xl border border-slate-800 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider">Q (STATES SET)</span>
            <span className="text-[10px] text-slate-400 font-sans">{states.length} total states</span>
          </div>
          <div className="flex flex-wrap gap-1.5 pt-1">
            {states.map((st) => {
              const isStart = st === startState;
              const isAcc = acceptStates.includes(st);
              return (
                <button
                  key={st}
                  onClick={() => onSelectState?.(st)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition cursor-pointer border ${
                    isStart && isAcc
                      ? 'bg-gradient-to-r from-indigo-900 to-emerald-900 border-indigo-400 text-white shadow'
                      : isStart
                      ? 'bg-indigo-950 border-indigo-500/50 text-indigo-300 shadow'
                      : isAcc
                      ? 'bg-emerald-950 border-emerald-500/50 text-emerald-300 shadow'
                      : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
                  }`}
                  title={`State ${st} (Click to inspect)`}
                >
                  {st}
                  {isStart && <span className="ml-1 text-[9px] text-indigo-400">⚡</span>}
                  {isAcc && <span className="ml-1 text-[9px] text-emerald-400">★</span>}
                </button>
              );
            })}
          </div>
        </div>

        {/* Σ Card */}
        <div className="p-3.5 bg-slate-950/90 rounded-xl border border-slate-800 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-sky-400 uppercase tracking-wider">Σ (INPUT ALPHABET)</span>
            <span className="text-[10px] text-slate-400 font-sans">{alphabet.length} symbols</span>
          </div>
          <div className="flex flex-wrap gap-1.5 pt-1">
            {alphabet.map((sym) => (
              <span key={sym} className="px-2.5 py-1 bg-sky-950/80 border border-sky-500/40 text-sky-300 rounded-lg text-xs font-mono font-bold">
                '{sym}'
              </span>
            ))}
            {epsilonEdgesCount > 0 && (
              <span className="px-2.5 py-1 bg-amber-950/80 border border-amber-500/40 text-amber-300 rounded-lg text-xs font-mono font-bold" title="Spontaneous ε-transitions present">
                'ε' (Spontaneous)
              </span>
            )}
          </div>
        </div>

        {/* q0 Card */}
        <div className="p-3.5 bg-slate-950/90 rounded-xl border border-slate-800 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">q₀ (INITIAL START STATE)</span>
            <span className="text-[10px] text-indigo-400 font-sans">Start Node</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onSelectState?.(startState)}
              className="px-3 py-1 bg-amber-950 border border-amber-500/50 text-amber-300 rounded-lg font-mono font-bold text-xs cursor-pointer hover:bg-amber-900 transition"
            >
              q₀ = {startState}
            </button>
            <span className="text-slate-400 text-xs font-sans">
              Outgoing: {Object.values(transitionMap[startState] || {}).flat().length} edges
            </span>
          </div>
        </div>

        {/* F Card */}
        <div className="p-3.5 bg-slate-950/90 rounded-xl border border-slate-800 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">F (ACCEPTING STATES)</span>
            <span className="text-[10px] text-emerald-400 font-sans">{acceptStates.length} accepting</span>
          </div>
          <div className="flex flex-wrap gap-1.5 pt-1">
            {acceptStates.length === 0 ? (
              <span className="text-slate-500 text-xs italic font-sans">None (No accept states)</span>
            ) : (
              acceptStates.map((st) => (
                <button
                  key={st}
                  onClick={() => onSelectState?.(st)}
                  className="px-2.5 py-1 bg-emerald-950/90 border border-emerald-500/50 text-emerald-300 rounded-lg text-xs font-mono font-bold cursor-pointer hover:bg-emerald-900 transition"
                >
                  {st} ★
                </button>
              ))
            )}
          </div>
        </div>
      </div>

      {/* ────────────────────────────────────────────────────────────────── */}
      {/* 4. TRANSITION FUNCTION EXPLORER & LIVE MATRIX                      */}
      {/* ────────────────────────────────────────────────────────────────── */}
      <div className="p-4 bg-slate-950/90 rounded-xl border border-slate-800 space-y-3 font-mono">
        <div className="flex items-center justify-between flex-wrap gap-2 border-b border-slate-800 pb-2">
          <div className="flex items-center gap-2 text-xs font-bold text-purple-300 uppercase tracking-wider">
            <Code className="w-4 h-4 text-purple-400" />
            δ Transition Function Evaluator: Q × (Σ ∪ &#123;ε&#125;) ➔ P(Q)
          </div>
        </div>

        {/* Interactive Evaluator Dropdowns */}
        <div className="flex items-center gap-3 flex-wrap bg-slate-900 p-3 rounded-xl border border-slate-800 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400 font-sans font-bold">δ(</span>
            <select
              value={evalState}
              onChange={(e) => setEvalState(e.target.value)}
              className="bg-slate-950 border border-slate-800 text-purple-300 rounded-lg px-2.5 py-1 font-mono font-bold focus:outline-none focus:border-purple-500"
            >
              {states.map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </select>
            <span className="text-slate-400 font-sans font-bold">,</span>
          </div>

          <div className="flex items-center gap-1.5">
            <select
              value={evalSymbol}
              onChange={(e) => setEvalSymbol(e.target.value)}
              className="bg-slate-950 border border-slate-800 text-sky-300 rounded-lg px-2.5 py-1 font-mono font-bold focus:outline-none focus:border-purple-500"
            >
              {alphabet.map((sym) => (
                <option key={sym} value={sym}>
                  '{sym}'
                </option>
              ))}
              {epsilonEdgesCount > 0 && <option value="ε">'ε'</option>}
            </select>
            <span className="text-slate-400 font-sans font-bold">) =</span>
          </div>

          <div className="px-3 py-1.5 bg-slate-950 border border-purple-500/40 rounded-xl text-emerald-300 font-bold font-mono">
            &#123;{evaluatedTargets.length > 0 ? evaluatedTargets.join(', ') : '∅'}&#125;
          </div>

          <span className="text-slate-400 font-sans text-xs ml-auto">
            {evaluatedTargets.length > 1
              ? '⚡ Nondeterministic branch into multiple target states!'
              : evaluatedTargets.length === 1
              ? 'Deterministic transition'
              : 'Dead/Trap transition (Empty set ∅)'}
          </span>
        </div>

        {/* Live Transition Matrix Table */}
        <div className="overflow-x-auto max-h-[240px] overflow-y-auto border border-slate-800 rounded-xl pt-1">
          <table className="w-full text-left text-xs border-collapse font-mono">
            <thead className="bg-slate-950 text-slate-400 sticky top-0 border-b border-slate-800">
              <tr>
                <th className="p-2.5">State q</th>
                {alphabet.map((sym) => (
                  <th key={sym} className="p-2.5 text-center">
                    '{sym}'
                  </th>
                ))}
                {epsilonEdgesCount > 0 && <th className="p-2.5 text-center text-amber-400">'ε'</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {states.map((st) => (
                <tr
                  key={st}
                  onClick={() => onSelectState?.(st)}
                  className={`cursor-pointer transition ${
                    evalState === st ? 'bg-purple-950/60 border-l-4 border-l-purple-500 font-bold' : 'hover:bg-slate-900/80'
                  }`}
                >
                  <td className="p-2.5 font-bold text-purple-300">{st}</td>
                  {alphabet.map((sym) => {
                    const tgts = transitionMap[st]?.[sym] || [];
                    return (
                      <td key={sym} className="p-2.5 text-center">
                        {tgts.length > 0 ? (
                          <span className="px-2 py-0.5 bg-slate-900 border border-slate-800 rounded text-emerald-300 font-bold">
                            &#123;{tgts.join(', ')}&#125;
                          </span>
                        ) : (
                          <span className="text-slate-600">∅</span>
                        )}
                      </td>
                    );
                  })}
                  {epsilonEdgesCount > 0 && (
                    <td className="p-2.5 text-center">
                      {(transitionMap[st]?.['ε'] || transitionMap[st]?.['epsilon'] || []).length > 0 ? (
                        <span className="px-2 py-0.5 bg-amber-950 border border-amber-500/40 text-amber-300 rounded font-bold">
                          &#123;{(transitionMap[st]?.['ε'] || transitionMap[st]?.['epsilon']).join(', ')}&#125;
                        </span>
                      ) : (
                        <span className="text-slate-600">∅</span>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ────────────────────────────────────────────────────────────────── */}
      {/* 5. DETERMINISTIC MACHINE INSIGHTS                                  */}
      {/* ────────────────────────────────────────────────────────────────── */}
      <div className="p-4 bg-slate-950/90 rounded-xl border border-slate-800 space-y-2">
        <span className="text-xs font-bold text-sky-400 uppercase tracking-wider block flex items-center gap-1.5 font-sans">
          <Sparkles className="w-4 h-4 text-sky-400" /> Machine Insights & Automata Diagnostics
        </span>
        <ul className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs font-sans text-slate-300">
          {insights.map((ins, idx) => (
            <li key={idx} className="flex items-center gap-2 p-2 bg-slate-900/70 border border-slate-800/80 rounded-lg">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>{ins}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* ────────────────────────────────────────────────────────────────── */}
      {/* 6. BOTTOM THEORY TABS (FORMAL DEFINITIONS, POWERSET, EXAM NOTES)   */}
      {/* ────────────────────────────────────────────────────────────────── */}
      <div className="space-y-3 pt-2">
        {/* Navigation Tabs Bar */}
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar border-b border-slate-800 pb-2 text-xs font-bold">
          {[
            { id: 'overview' as const, label: '📖 Overview' },
            { id: 'formal' as const, label: '∑ 5-Tuple Definition' },
            { id: 'properties' as const, label: '📊 Properties' },
            { id: 'transition' as const, label: 'δ Function' },
            { id: 'powerset' as const, label: '⚡ Power Set P(Q)' },
            { id: 'dfa_comparison' as const, label: '⚖️ vs DFA' },
            { id: 'complexity' as const, label: '⏱️ Complexity' },
            { id: 'applications' as const, label: '🚀 Applications' },
            { id: 'exam_notes' as const, label: '🎓 Exam Notes' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-1.5 rounded-xl border transition shrink-0 cursor-pointer ${
                activeTab === tab.id
                  ? 'bg-purple-600 border-purple-400 text-white shadow-md shadow-purple-600/30'
                  : 'bg-slate-950/80 border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Body */}
        <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-xl text-xs space-y-3 leading-relaxed text-slate-300 font-sans">
          {activeTab === 'overview' && (
            <div className="space-y-2">
              <h4 className="font-bold text-white text-sm">Non-Deterministic Finite Automaton (NFA) Overview</h4>
              <p>
                An NFA is a 5-tuple theoretical machine that can exist in multiple states simultaneously by following nondeterministic computational branches or spontaneous ε-transitions.
              </p>
            </div>
          )}

          {activeTab === 'formal' && (
            <div className="space-y-2 font-mono">
              <h4 className="font-bold text-purple-300 text-sm font-sans">Formal 5-Tuple Definition</h4>
              <p className="font-sans">
                Formally defined as <strong>M = (Q, Σ, δ, q₀, F)</strong> where:
              </p>
              <ul className="list-disc list-inside space-y-1 text-slate-300">
                <li><strong>Q:</strong> Finite set of states = &#123;{states.join(', ')}&#125;</li>
                <li><strong>Σ:</strong> Finite input alphabet = &#123;{alphabet.join(', ')}&#125;</li>
                <li><strong>δ:</strong> Transition function mapping Q × (Σ ∪ &#123;ε&#125;) ➔ P(Q)</li>
                <li><strong>q₀:</strong> Initial start state = {startState}</li>
                <li><strong>F:</strong> Set of final accept states = &#123;{acceptStates.join(', ')}&#125;</li>
              </ul>
            </div>
          )}

          {activeTab === 'powerset' && (
            <div className="space-y-2">
              <h4 className="font-bold text-purple-300 text-sm">Power Set P(Q) & Nondeterminism</h4>
              <p>
                The power set <strong>P(Q)</strong> contains all subsets of states Q, totaling <strong>2<sup>|Q|</sup> = 2<sup>{states.length}</sup> = {Math.pow(2, states.length)}</strong> possible subsets. Unlike a DFA which transitions to a single state in Q, an NFA transition returns a subset in P(Q).
              </p>
            </div>
          )}

          {activeTab === 'dfa_comparison' && (
            <div className="space-y-2">
              <h4 className="font-bold text-sky-300 text-sm">NFA vs DFA Key Differences</h4>
              <table className="w-full text-left border-collapse font-mono text-[11px]">
                <thead className="bg-slate-900 text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="p-2">Feature</th>
                    <th className="p-2">NFA</th>
                    <th className="p-2">DFA</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  <tr>
                    <td className="p-2 font-bold text-purple-300">Transition Target</td>
                    <td className="p-2">Subset P(Q)</td>
                    <td className="p-2">Single state q ∈ Q</td>
                  </tr>
                  <tr>
                    <td className="p-2 font-bold text-purple-300">ε-Transitions</td>
                    <td className="p-2 text-emerald-400">Allowed</td>
                    <td className="p-2 text-rose-400">Not Allowed</td>
                  </tr>
                  <tr>
                    <td className="p-2 font-bold text-purple-300">Language Power</td>
                    <td className="p-2 text-emerald-400">Regular Languages</td>
                    <td className="p-2 text-emerald-400">Regular Languages (Equivalent!)</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'exam_notes' && (
            <div className="space-y-2">
              <h4 className="font-bold text-amber-300 text-sm">Exam Cheat Sheet & Theorems</h4>
              <ul className="list-disc list-inside space-y-1 text-slate-300 font-sans">
                <li><strong>Equivalence:</strong> L(NFA) = L(DFA). Every NFA can be converted to an equivalent DFA via Subset Construction.</li>
                <li><strong>State Explosion:</strong> An NFA with n states converts to a DFA with at most 2ⁿ states in worst-case.</li>
                <li><strong>Empty String Acceptance:</strong> An NFA accepts ε if and only if ECLOSE(q₀) ∩ F ≠ ∅.</li>
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
