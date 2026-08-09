import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  X, Play, Pause, ChevronLeft, ChevronRight, RotateCcw, SkipForward,
  Layers, Check, GitMerge, ArrowRight, Zap, BookOpen,
  Table as TableIcon, FlaskConical, BarChart3, GitCompare,
  AlertCircle, Sparkles, RefreshCw, Lightbulb,
  GraduationCap, Brain, Compass, Calculator, ListFilter
} from 'lucide-react';
import type { AutomatonGraph } from '../../types/automata';
import { graphToDFA, dfaToGraph } from '../../utils/dfaAdapter';
import { generateProductConstructionTrace, type ProductConstructionTrace, type ProductStep } from '../../utils/dfaEducationalUtils';
import { fetchAIQuestionExplanation, type QuestionAIExplanation } from '../../services/aiExplanationService';
import { MiniAutomataGraph, computeMiniGraphHeight } from './MiniAutomataGraph';
import {
  fetchAIAcceptExplanation,
  fetchAIAlgorithmInsights,
  getBuiltInAcceptExplanation,
  getBuiltInAlgorithmInsights,
  MODEL_OPTIONS,
  type ProductEducationalInsight,
  type ModelOption,
} from '../../services/productEducationalAI';

/* ─────────────────────────────────────────────────────────
   CONSTANTS & THEME
───────────────────────────────────────────────────────── */

interface Props {
  graphA: AutomatonGraph;
  graphB: AutomatonGraph;
  operation: 'AND' | 'OR' | 'DIFF' | 'XOR';
  onClose: () => void;
  onApplyResult?: (resultGraph: AutomatonGraph) => void;
}

const OP_LABELS: Record<string, string> = { AND: 'Intersection', OR: 'Union', DIFF: 'Difference', XOR: 'Symmetric Diff' };
const OP_SYMBOLS: Record<string, string> = { AND: 'A ∩ B', OR: 'A ∪ B', DIFF: 'A \\ B', XOR: 'A ⊕ B' };

const OP_THEME: Record<string, { accent: string; bg: string; border: string; glow: string; text: string }> = {
  OR:   { accent: '#818cf8', bg: 'rgba(99,102,241,0.10)', border: 'rgba(99,102,241,0.30)', glow: '0 0 20px rgba(99,102,241,0.20)', text: '#c7d2fe' },
  AND:  { accent: '#34d399', bg: 'rgba(52,211,153,0.08)', border: 'rgba(52,211,153,0.28)', glow: '0 0 20px rgba(52,211,153,0.18)', text: '#a7f3d0' },
  DIFF: { accent: '#fb923c', bg: 'rgba(251,146,60,0.09)', border: 'rgba(251,146,60,0.28)', glow: '0 0 20px rgba(251,146,60,0.18)', text: '#fed7aa' },
  XOR:  { accent: '#c084fc', bg: 'rgba(192,132,252,0.09)', border: 'rgba(192,132,252,0.28)', glow: '0 0 20px rgba(192,132,252,0.18)', text: '#e9d5ff' },
};

const PHASE_NAMES = ['', 'Validate DFAs', 'Complete Alphabet', 'Generate Product States', 'Generate Transitions', 'Determine Accept States', 'Optimize DFA', 'Finished'];
const SPEEDS = [0.5, 1, 2, 4];
const SPEED_LABELS = ['0.5×', '1×', '2×', '4×'];
const BASE_INTERVAL_MS = 900;

/* ─────────────────────────────────────────────────────────
   HELPER COMPONENTS
───────────────────────────────────────────────────────── */

const SectionTitle: React.FC<{ icon: React.ElementType; label: string; color?: string }> = ({ icon: Icon, label, color = '#64748b' }) => (
  <div className="flex items-center gap-1.5 mb-2">
    <Icon className="w-3.5 h-3.5 shrink-0" style={{ color }} />
    <span className="text-[9.5px] font-black uppercase tracking-[0.14em]" style={{ color }}>{label}</span>
  </div>
);

const Card: React.FC<{ children: React.ReactNode; className?: string; style?: React.CSSProperties }> = ({ children, className = '', style }) => (
  <div className={`rounded-xl p-3.5 ${className}`}
    style={{ background: 'rgba(8,14,26,0.88)', border: '1px solid rgba(30,41,59,0.7)', ...style }}>
    {children}
  </div>
);

/* ─────────────────────────────────────────────────────────
   1. ACCEPT LOGIC PANEL
───────────────────────────────────────────────────────── */
const AcceptRuleExplainer: React.FC<{
  operation: 'AND' | 'OR' | 'DIFF' | 'XOR';
  q1: string;
  q2: string;
  stateName?: string;
  isAcc1: boolean;
  isAcc2: boolean;
  isAccept: boolean;
  explanation: string;
  theme: typeof OP_THEME['OR'];
}> = ({ operation, q1, q2, stateName, isAcc1, isAcc2, isAccept, explanation, theme }) => {
  const _cond: Record<string, string> = { OR: 'OR', AND: 'AND', DIFF: 'AND NOT', XOR: 'XOR ⊕' };

  const evalStr = useMemo(() => {
    const aStr = isAcc1 ? 'TRUE' : 'FALSE';
    const bStr = isAcc2 ? 'TRUE' : 'FALSE';
    if (operation === 'OR') return `${aStr} OR ${bStr} → ${isAccept ? 'TRUE' : 'FALSE'}`;
    if (operation === 'AND') return `${aStr} AND ${bStr} → ${isAccept ? 'TRUE' : 'FALSE'}`;
    if (operation === 'DIFF') return `${aStr} AND NOT ${bStr} → ${isAccept ? 'TRUE' : 'FALSE'}`;
    if (operation === 'XOR') return `${aStr} ⊕ ${bStr} → ${isAccept ? 'TRUE' : 'FALSE'}`;
    return `${isAccept ? 'TRUE' : 'FALSE'}`;
  }, [operation, isAcc1, isAcc2, isAccept]);

  return (
    <Card>
      <div className="flex items-center justify-between mb-2">
        <SectionTitle icon={Zap} label="Accept Logic" color={theme.accent} />
        <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black border uppercase tracking-wider`}
          style={isAccept
            ? { background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.4)', color: '#34d399' }
            : { background: 'rgba(244,63,94,0.1)', border: '1px solid rgba(244,63,94,0.3)', color: '#fb7185' }}>
          {isAccept ? '✓ ACCEPT' : '✗ REJECT'}
        </span>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between bg-slate-950/80 p-2 rounded-lg border border-slate-800 text-xs">
          <span className="text-slate-400 font-mono text-[10px]">Product State: <strong style={{ color: theme.accent }}>({q1},{q2})</strong> {stateName ? `→ ${stateName}` : ''}</span>
          <span className="font-mono text-[10px] font-bold text-slate-300">
            Eval: <span className={isAccept ? 'text-emerald-400' : 'text-rose-400'}>{evalStr}</span>
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="p-2 rounded-lg bg-slate-900/90 border border-slate-800 flex items-center justify-between text-[10px]">
            <span className="text-indigo-300 font-bold font-mono">DFA A: {q1}</span>
            <span className={`px-1.5 py-0.5 rounded text-[8px] font-black ${isAcc1 ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/40' : 'bg-slate-800 text-slate-400'}`}>
              {isAcc1 ? 'Accept: Yes' : 'Accept: No'}
            </span>
          </div>

          <div className="p-2 rounded-lg bg-slate-900/90 border border-slate-800 flex items-center justify-between text-[10px]">
            <span className="text-purple-300 font-bold font-mono">DFA B: {q2}</span>
            <span className={`px-1.5 py-0.5 rounded text-[8px] font-black ${isAcc2 ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/40' : 'bg-slate-800 text-slate-400'}`}>
              {isAcc2 ? 'Accept: Yes' : 'Accept: No'}
            </span>
          </div>
        </div>

        <div className="p-2 rounded-lg bg-slate-950/90 border border-slate-800 text-[9.5px] text-slate-300 leading-relaxed">
          <span className="font-bold text-white block mb-0.5">Explanation:</span>
          {explanation}
        </div>
      </div>
    </Card>
  );
};

/* ─────────────────────────────────────────────────────────
   2. BFS WORK QUEUE PANEL
───────────────────────────────────────────────────────── */
const QueueViz: React.FC<{
  toProcess: string[];
  processed: string[];
  current: string;
  pairToNameMap: Record<string, string>;
  onSelectPair?: (stateName: string) => void;
}> = ({ toProcess, processed, current, pairToNameMap, onSelectPair }) => {

  const renderChip = (pair: string, variant: 'q' | 'a' | 'd') => {
    const styles: Record<string, React.CSSProperties> = {
      q: { background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.35)', color: '#a5b4fc' },
      a: { background: 'rgba(168,85,247,0.20)', border: '1px solid rgba(168,85,247,0.5)', color: '#e9d5ff', fontWeight: 900 },
      d: { background: 'rgba(30,41,59,0.6)', border: '1px solid rgba(51,65,85,0.3)', color: '#94a3b8' },
    };

    const stateName = pairToNameMap[pair] || '';

    return (
      <button
        key={pair}
        onClick={() => stateName && onSelectPair?.(stateName)}
        title={stateName ? `Click to highlight ${stateName} on graph` : pair}
        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[8.5px] font-mono cursor-pointer transition hover:scale-105"
        style={styles[variant]}
      >
        <span>{pair}</span>
        {stateName && <span className="text-[7.5px] opacity-70">({stateName})</span>}
      </button>
    );
  };

  return (
    <Card>
      <div className="flex items-center justify-between mb-2">
        <SectionTitle icon={ArrowRight} label="BFS Work Queue" />
        <span className="text-[9px] font-mono font-bold text-slate-400">
          Queue Size: <strong className="text-indigo-400">{toProcess.length}</strong> | Done: <strong className="text-emerald-400">{processed.length}</strong>
        </span>
      </div>

      <div className="grid grid-cols-3 gap-2 text-[9px]">
        <div>
          <div className="text-[8px] text-indigo-400 font-black uppercase tracking-wide mb-1">To Process ({toProcess.length})</div>
          <div className="flex flex-wrap gap-1 min-h-[24px]">
            {toProcess.slice(0, 4).map((p) => renderChip(p, 'q'))}
            {toProcess.length > 4 && <span className="text-[8px] text-slate-500 italic">+{toProcess.length - 4} more</span>}
            {toProcess.length === 0 && <span className="text-[8px] text-slate-600 italic">Queue empty</span>}
          </div>
        </div>

        <div className="flex flex-col items-center">
          <div className="text-[8px] text-purple-400 font-black uppercase tracking-wide mb-1">Active Expansion</div>
          {current ? renderChip(current, 'a') : <span className="text-[8px] text-slate-600 italic">—</span>}
        </div>

        <div>
          <div className="text-[8px] text-emerald-400 font-black uppercase tracking-wide mb-1 text-right">Explored ({processed.length})</div>
          <div className="flex flex-wrap gap-1 justify-end min-h-[24px]">
            {processed.slice(-3).map((p) => renderChip(p, 'd'))}
            {processed.length === 0 && <span className="text-[8px] text-slate-600 italic">None yet</span>}
          </div>
        </div>
      </div>
    </Card>
  );
};

/* ─────────────────────────────────────────────────────────
   MAIN COMPONENT
───────────────────────────────────────────────────────── */
export const AnimatedProductConstructionModal: React.FC<Props> = ({ graphA, graphB, operation: initialOp, onClose, onApplyResult }) => {
  const [activeOp, setActiveOp] = useState<'AND' | 'OR' | 'DIFF' | 'XOR'>(() => initialOp || 'OR');
  const dfaA = useMemo(() => graphToDFA(graphA), [graphA]);
  const dfaB = useMemo(() => graphToDFA(graphB), [graphB]);
  const trace = useMemo<ProductConstructionTrace>(() => generateProductConstructionTrace(dfaA, dfaB, activeOp), [dfaA, dfaB, activeOp]);
  const theme = OP_THEME[activeOp] ?? OP_THEME.OR;

  const [stepIdx, setStepIdx] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speedIdx, setSpeedIdx] = useState(1);
  const [selectedStateName, setSelectedStateName] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'theory' | 'construction' | 'formula' | 'derivation' | 'complexity' | 'examples'>('theory');

  // AI & Educational Explanation State
  const [aiExplanation, setAiExplanation] = useState<QuestionAIExplanation | null>(null);
  const [acceptExplanation, setAcceptExplanation] = useState<string>('');
  const [insights, setInsights] = useState<ProductEducationalInsight>(() => getBuiltInAlgorithmInsights(activeOp));
  const [loadingAI, setLoadingAI] = useState<boolean>(false);
  const [insightsLoading, setInsightsLoading] = useState<boolean>(false);
  const [insightsError, setInsightsError] = useState<string | null>(null);
  const [selectedModel, setSelectedModel] = useState<ModelOption>(MODEL_OPTIONS[0]);

  const questionPrompt = useMemo(() => {
    return `Construct a DFA for ${OP_LABELS[activeOp]} of L(DFA A) and L(DFA B)`;
  }, [activeOp]);

  const loadAIExplanation = useCallback(async () => {
    setLoadingAI(true);
    try {
      const resGraph = dfaToGraph(trace.resultDFA, `Product (${activeOp}) DFA`);
      const expl = await fetchAIQuestionExplanation(questionPrompt, resGraph);
      setAiExplanation(expl);
    } catch (e) {
      console.warn('AI Explanation failed', e);
    } finally {
      setLoadingAI(false);
    }
  }, [trace.resultDFA, activeOp, questionPrompt]);

  useEffect(() => {
    loadAIExplanation();
  }, [loadAIExplanation]);

  // Load Algorithm Insights via AI API
  useEffect(() => {
    setInsightsLoading(true);
    setInsightsError(null);
    fetchAIAlgorithmInsights(activeOp, selectedModel, true)
      .then(result => {
        setInsights(result);
        if (!result.isAI) {
          setInsightsError('No API key for this provider. Add it in Settings or choose a different model.');
        }
      })
      .catch(err => {
        setInsights(getBuiltInAlgorithmInsights(activeOp));
        setInsightsError(err instanceof Error ? err.message : String(err));
      })
      .finally(() => setInsightsLoading(false));
  }, [activeOp, selectedModel]);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const totalSteps = trace.allSteps.length;
  const currentStep: ProductStep = trace.allSteps[Math.min(stepIdx, totalSteps - 1)] ?? trace.allSteps[0];
  const progressPct = totalSteps > 1 ? Math.round((stepIdx / (totalSteps - 1)) * 100) : 0;

  // Load Accept Explanation for current step
  useEffect(() => {
    if (currentStep) {
      fetchAIAcceptExplanation(
        activeOp,
        currentStep.q1 || 'q0',
        currentStep.q2 || 'q0',
        currentStep.isAccept1 || false,
        currentStep.isAccept2 || false,
        currentStep.isAcceptResult || false
      ).then(setAcceptExplanation);
    }
  }, [activeOp, currentStep?.q1, currentStep?.q2, currentStep?.isAccept1, currentStep?.isAccept2, currentStep?.isAcceptResult]);

  // Unique visible states revealed so far
  const visibleStateMap: Record<string, ProductStep> = {};
  trace.allSteps.slice(0, stepIdx + 1)
    .filter(s => s.phase >= 3 && s.phase <= 5 && s.stateName)
    .forEach(s => { visibleStateMap[s.stateName] = s; });
  const visibleUniqueSteps = Object.values(visibleStateMap);

  const stopPlay = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = null;
    setIsPlaying(false);
  }, []);

  useEffect(() => {
    if (!isPlaying) return;
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      setStepIdx(prev => {
        if (prev >= totalSteps - 1) { stopPlay(); return prev; }
        return prev + 1;
      });
    }, BASE_INTERVAL_MS / SPEEDS[speedIdx]);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [isPlaying, speedIdx, totalSteps, stopPlay]);

  const jumpToPhase = (phase: number) => {
    const idx = trace.allSteps.findIndex(s => s.phase === phase);
    if (idx >= 0) { stopPlay(); setStepIdx(idx); }
  };

  const handleApply = () => {
    const resGraph = dfaToGraph(trace.resultDFA, `Product (${OP_LABELS[activeOp]}) DFA`);
    if (onApplyResult) onApplyResult(resGraph);
    onClose();
  };

  const hlEdgeA = currentStep?.phase === 4 && currentStep.symbol ? { from: currentStep.q1, to: currentStep.nextQ1 ?? '', sym: currentStep.symbol } : undefined;
  const hlEdgeB = currentStep?.phase === 4 && currentStep.symbol ? { from: currentStep.q2, to: currentStep.nextQ2 ?? '', sym: currentStep.symbol } : undefined;

  const revealedProductDFA = useMemo(() => {
    const names = new Set(visibleUniqueSteps.map(s => s.stateName));
    return {
      states: Array.from(names),
      startState: trace.resultDFA.startState,
      acceptStates: trace.resultDFA.acceptStates.filter(s => names.has(s)),
      transitions: Object.fromEntries(Object.entries(trace.resultDFA.transitions).filter(([k]) => names.has(k))),
      alphabet: trace.alphabet,
    };
  }, [visibleUniqueSteps, trace]);

  /* adaptive graph SVG dims */
  const graphSvgW = 360;
  const maxStateCount = Math.max(
    trace.dfa1.states.length,
    trace.dfa2.states.length,
    revealedProductDFA.states.length + 1
  );
  const graphSvgH = computeMiniGraphHeight(maxStateCount, 240);

  const tabs = [
    { id: 'theory' as const,      label: 'Theory & AI',        icon: BookOpen },
    { id: 'construction' as const, label: 'Construction',        icon: GitMerge },
    { id: 'formula' as const,      label: 'Formula Evaluation',  icon: FlaskConical },
    { id: 'derivation' as const,   label: 'Transition Derivation', icon: ArrowRight },
    { id: 'complexity' as const,   label: 'Complexity',          icon: BarChart3 },
    { id: 'examples' as const,     label: 'Examples',            icon: AlertCircle },
  ];

  // 4-Way Operation Comparison for Current Pair
  const currentPairEval = useMemo(() => {
    const q1 = currentStep?.q1 || 'q0';
    const q2 = currentStep?.q2 || 'q0';
    const aAcc = currentStep?.isAccept1 || false;
    const bAcc = currentStep?.isAccept2 || false;

    return {
      q1, q2, aAcc, bAcc,
      OR: { accept: aAcc || bAcc, reason: `${q1} ∈ FA (${aAcc}) OR ${q2} ∈ FB (${bAcc})` },
      AND: { accept: aAcc && bAcc, reason: `${q1} ∈ FA (${aAcc}) AND ${q2} ∈ FB (${bAcc})` },
      DIFF: { accept: aAcc && !bAcc, reason: `${q1} ∈ FA (${aAcc}) AND ${q2} ∉ FB (${!bAcc})` },
      XOR: { accept: aAcc !== bAcc, reason: `${q1} ∈ FA (${aAcc}) ≠ ${q2} ∈ FB (${bAcc})` },
    };
  }, [currentStep]);

  /* ══════════════════════════════════════════════════════
     RENDER
  ══════════════════════════════════════════════════════ */
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/95 backdrop-blur-lg p-2">
      <div className="w-full max-w-[1440px] max-h-[98vh] flex flex-col rounded-2xl overflow-hidden shadow-2xl"
        style={{ background: 'linear-gradient(165deg, #08111f 0%, #050c18 100%)', border: '1px solid rgba(30,41,59,0.6)' }}>

        {/* ═══ HEADER ═══ */}
        <div className="shrink-0 px-5 py-3 relative overflow-hidden"
          style={{ background: 'rgba(6,10,20,0.95)', borderBottom: '1px solid rgba(30,41,59,0.6)' }}>
          <div className="absolute right-0 top-0 w-48 h-full rounded-l-full blur-3xl opacity-15 pointer-events-none"
            style={{ background: theme.accent }} />
          <div className="relative flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl shrink-0" style={{ background: theme.bg, border: `1px solid ${theme.border}` }}>
                <Layers className="w-5 h-5" style={{ color: theme.accent }} />
              </div>
              <div>
                <h2 className="text-[14px] font-black text-white leading-none mb-0.5">Interactive Product Construction Visualizer</h2>
                <p className="text-[10px] font-semibold" style={{ color: theme.accent }}>
                  {OP_LABELS[activeOp]} ({OP_SYMBOLS[activeOp]}) — Cartesian Product Construction
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 text-center">
              {[
                { label: 'DFA A', val: `${trace.dfa1.states.length}` },
                { sep: '×' },
                { label: 'DFA B', val: `${trace.dfa2.states.length}` },
                { sep: '=' },
                { label: 'Potential', val: `${trace.potentialStatesCount}` },
                { sep: '↓' },
                { label: 'Reachable', val: `${trace.reachableStatesCount}` },
                { sep: '|' },
                { label: 'Step', val: `${stepIdx + 1}/${totalSteps}` },
              ].map((item, i) => 'sep' in item ? (
                <span key={i} className="text-slate-700 font-black">{item.sep}</span>
              ) : (
                <div key={i}>
                  <div className="text-[8px] text-slate-600 font-black uppercase tracking-wide">{item.label}</div>
                  <div className="text-[12px] font-black font-mono text-slate-200">{item.val}</div>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <div className="flex gap-1.5 p-1 rounded-xl bg-slate-950 border border-slate-800">
                {(['OR', 'AND', 'DIFF', 'XOR'] as const).map(op => {
                  const t = OP_THEME[op];
                  const isSelected = op === activeOp;
                  return (
                    <button
                      key={op}
                      onClick={() => {
                        setActiveOp(op);
                        setStepIdx(0);
                        setIsPlaying(false);
                      }}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold transition-all cursor-pointer ${
                        isSelected ? 'shadow-md ring-1 ring-white/20' : 'opacity-60 hover:opacity-100 hover:scale-105'
                      }`}
                      style={{
                        background: isSelected ? t.bg : 'rgba(15,23,42,0.5)',
                        border: `1px solid ${isSelected ? t.border : 'rgba(30,41,59,0.4)'}`,
                        color: isSelected ? t.accent : '#94a3b8',
                      }}
                    >
                      {OP_LABELS[op]}
                    </button>
                  );
                })}
              </div>
              <div className="w-20 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all duration-300"
                  style={{ width: `${progressPct}%`, background: `linear-gradient(90deg, ${theme.accent}70, ${theme.accent})` }} />
              </div>
              <button onClick={onClose} className="p-2 rounded-xl cursor-pointer transition"
                style={{ background: 'rgba(30,41,59,0.5)', border: '1px solid rgba(51,65,85,0.4)' }}>
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>
          </div>
        </div>

        {/* ═══ PHASE TIMELINE ═══ */}
        <div className="shrink-0 px-5 py-2" style={{ background: 'rgba(4,8,16,0.9)', borderBottom: '1px solid rgba(20,30,50,0.8)' }}>
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
            {PHASE_NAMES.slice(1).map((name, i) => {
              const phase = i + 1;
              const isCurrent = currentStep?.phase === phase;
              const isDone = currentStep?.phase > phase;
              return (
                <React.Fragment key={phase}>
                  <button onClick={() => jumpToPhase(phase)} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[9px] font-black whitespace-nowrap transition-all shrink-0 cursor-pointer"
                    style={{
                      background: isCurrent ? theme.bg : isDone ? 'rgba(20,30,50,0.6)' : 'rgba(8,14,26,0.4)',
                      border: `1px solid ${isCurrent ? theme.border : isDone ? 'rgba(51,65,85,0.4)' : 'rgba(20,30,50,0.5)'}`,
                      color: isCurrent ? theme.accent : isDone ? '#4b5563' : '#1f2937',
                    }}>
                    {isDone && <span style={{ color: '#34d399' }} className="text-[10px]">✓</span>}
                    {isCurrent && <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: theme.accent }} />}
                    {phase}. {name}
                  </button>
                  {phase < 7 && <div className="w-3 h-px shrink-0" style={{ background: 'rgba(30,41,59,0.5)' }} />}
                </React.Fragment>
              );
            })}
          </div>
        </div>

        {/* ═══ SCROLL AREA ═══ */}
        <div className="flex-1 overflow-y-auto min-h-0 space-y-3 pb-4">

          {/* ── ROW 1: THREE GRAPH PANELS (Interactive Canvas Sheets) ── */}
          <div className="px-4 pt-3 grid grid-cols-3 gap-3">
            {/* DFA A */}
            <div className="rounded-2xl p-3 flex flex-col min-h-[280px]"
              style={{ background: 'rgba(15,30,55,0.4)', border: '1px solid rgba(59,130,246,0.20)' }}>
              <MiniAutomataGraph dfa={trace.dfa1} title="DFA A" accentColor="#3b82f6"
                highlightState={currentStep?.q1} highlightEdge={hlEdgeA}
                svgW={graphSvgW} svgH={graphSvgH} />
            </div>

            {/* DFA B */}
            <div className="rounded-2xl p-3 flex flex-col min-h-[280px]"
              style={{ background: 'rgba(60,20,100,0.20)', border: '1px solid rgba(168,85,247,0.20)' }}>
              <MiniAutomataGraph dfa={trace.dfa2} title="DFA B" accentColor="#a855f7"
                highlightState={currentStep?.q2} highlightEdge={hlEdgeB}
                svgW={graphSvgW} svgH={graphSvgH} />
            </div>

            {/* Product DFA (growing) */}
            <div className="rounded-2xl p-3 flex flex-col min-h-[280px]"
              style={{ background: theme.bg, border: `1px solid ${theme.border}` }}>
              {revealedProductDFA.states.length > 0 ? (
                <MiniAutomataGraph dfa={revealedProductDFA} title="Product DFA (Growing)" accentColor={theme.accent}
                  highlightState={selectedStateName || currentStep?.stateName}
                  svgW={graphSvgW} svgH={graphSvgH} />
              ) : (
                <div className="flex flex-col items-center justify-center gap-2" style={{ height: graphSvgH + 28 }}>
                  <div className="flex items-center gap-1.5 px-3 py-1 rounded-full"
                    style={{ background: theme.bg, border: `1px solid ${theme.border}` }}>
                    <div className="w-1.5 h-1.5 rounded-full" style={{ background: theme.accent }} />
                    <span className="text-[9px] font-black uppercase tracking-[0.14em]" style={{ color: theme.accent }}>Product DFA (Growing)</span>
                  </div>
                  <span className="text-[10px] text-slate-700">States appear via BFS exploration</span>
                </div>
              )}
            </div>
          </div>

          {/* State combination merge banner — Phase 3 only */}
          {currentStep?.phase === 3 && (
            <div className="mx-4 flex items-center justify-center gap-3 p-2.5 rounded-xl"
              style={{ background: 'rgba(99,102,241,0.07)', border: '1px solid rgba(99,102,241,0.18)' }}>
              <span className="px-3 py-1.5 rounded-xl text-xs font-black font-mono" style={{ background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.35)', color: '#93c5fd' }}>{currentStep.q1}</span>
              <span className="text-slate-700 font-black">+</span>
              <span className="px-3 py-1.5 rounded-xl text-xs font-black font-mono" style={{ background: 'rgba(168,85,247,0.15)', border: '1px solid rgba(168,85,247,0.35)', color: '#d8b4fe' }}>{currentStep.q2}</span>
              <ArrowRight className="w-4 h-4 text-slate-700" />
              <span className="px-3 py-1.5 rounded-xl text-xs font-black font-mono text-slate-300" style={{ background: 'rgba(30,41,59,0.5)', border: '1px solid rgba(51,65,85,0.5)' }}>({currentStep.q1},{currentStep.q2})</span>
              <ArrowRight className="w-4 h-4 text-slate-700" />
              <span className="px-4 py-1.5 rounded-xl text-sm font-black" style={{ background: theme.bg, border: `1px solid ${theme.border}`, color: theme.accent }}>{currentStep.stateName}</span>
            </div>
          )}

          {/* ── ROW 2: DIRECTLY BELOW DIAGRAMS (STATE MAPPING TABLE & LIVE TRANSITION TABLE) ── */}
          <div className="px-4 grid grid-cols-2 gap-3">
            {/* Interactive Product State Mapping Table */}
            <div className="rounded-xl overflow-hidden shadow-lg flex flex-col" style={{ background: 'rgba(8,14,26,0.92)', border: '1px solid rgba(51,65,85,0.7)' }}>
              <div className="flex items-center justify-between px-4 py-2.5 shrink-0" style={{ borderBottom: '1px solid rgba(30,41,59,0.8)' }}>
                <div className="flex items-center gap-2">
                  <TableIcon className="w-4 h-4" style={{ color: theme.accent }} />
                  <span className="text-xs font-black uppercase tracking-[0.14em] text-slate-300">State Mapping Table</span>
                </div>
                <span className="text-[10px] font-mono text-slate-400">Click row to highlight on graph</span>
              </div>
              <div className="overflow-auto max-h-[220px] flex-1">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 z-10" style={{ background: 'rgba(6,10,20,0.98)', borderBottom: '1px solid rgba(30,41,59,0.9)' }}>
                    <tr>
                      <th className="px-3 py-2 text-left font-black text-slate-400 text-[10px] uppercase tracking-wider">Product State</th>
                      <th className="px-3 py-2 text-left font-black text-slate-400 text-[10px] uppercase tracking-wider">Pair (qA,qB)</th>
                      <th className="px-3 py-2 text-left font-black text-slate-400 text-[10px] uppercase tracking-wider">Status</th>
                      <th className="px-3 py-2 text-left font-black text-slate-400 text-[10px] uppercase tracking-wider">Accept</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleUniqueSteps.map((s) => {
                      const isSel = selectedStateName === s.stateName || currentStep?.stateName === s.stateName;
                      return (
                        <tr
                          key={s.stateName}
                          onClick={() => setSelectedStateName(p => p === s.stateName ? null : s.stateName)}
                          className="cursor-pointer transition-all hover:bg-slate-900/60"
                          style={{
                            background: isSel ? theme.bg : 'transparent',
                            borderBottom: '1px solid rgba(15,23,42,0.9)',
                          }}
                        >
                          <td className="px-3 py-1.5 font-mono text-xs font-black" style={{ color: theme.accent }}>{s.stateName}</td>
                          <td className="px-3 py-1.5 font-mono text-indigo-300 text-xs font-bold">{s.pairName}</td>
                          <td className="px-3 py-1.5 font-mono text-[10px] text-emerald-400 font-bold">✓ Explored</td>
                          <td className="px-3 py-1.5">
                            {s.isAcceptResult
                              ? <span className="px-2 py-0.5 rounded text-[9px] font-black bg-emerald-950 text-emerald-300 border border-emerald-500/40">✓ Accept</span>
                              : <span className="text-slate-600 text-[10px] font-mono">— Reject</span>}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Live Transition Table (Step-by-Step Transition Derivation) */}
            <div className="rounded-xl overflow-hidden shadow-lg flex flex-col" style={{ background: 'rgba(8,14,26,0.92)', border: '1px solid rgba(51,65,85,0.7)' }}>
              <div className="flex items-center justify-between px-4 py-2.5 shrink-0" style={{ borderBottom: '1px solid rgba(30,41,59,0.8)' }}>
                <div className="flex items-center gap-2">
                  <GitMerge className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-black uppercase tracking-[0.14em] text-slate-300">Live Transition Table</span>
                </div>
                <span className="text-[10px] font-mono text-slate-400">Step {stepIdx + 1} of {totalSteps}</span>
              </div>
              <div className="overflow-auto max-h-[220px] flex-1">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 z-10" style={{ background: 'rgba(6,10,20,0.98)', borderBottom: '1px solid rgba(30,41,59,0.9)' }}>
                    <tr>
                      <th className="px-2 py-2 text-left font-black text-slate-400 text-[10px] uppercase tracking-wider">#</th>
                      <th className="px-2 py-2 text-left font-black text-slate-400 text-[10px] uppercase tracking-wider">State</th>
                      <th className="px-2 py-2 text-left font-black text-slate-400 text-[10px] uppercase tracking-wider">Sym</th>
                      <th className="px-2 py-2 text-left font-black text-slate-400 text-[10px] uppercase tracking-wider">δ_A</th>
                      <th className="px-2 py-2 text-left font-black text-slate-400 text-[10px] uppercase tracking-wider">δ_B</th>
                      <th className="px-2 py-2 text-left font-black text-slate-400 text-[10px] uppercase tracking-wider">Result</th>
                    </tr>
                  </thead>
                  <tbody>
                    {trace.derivationLogs.slice(0, stepIdx + 1).map((d) => (
                      <tr key={d.step} className="border-b border-slate-900/80 hover:bg-slate-900/40 font-mono text-[10.5px]">
                        <td className="px-2 py-1.5 text-slate-600 font-mono">{d.step}</td>
                        <td className="px-2 py-1.5 font-mono font-bold" style={{ color: theme.accent }}>{d.stateName}</td>
                        <td className="px-2 py-1.5 font-mono font-black text-orange-400">{d.symbol}</td>
                        <td className="px-2 py-1.5 font-mono text-blue-400">{d.transitionA}</td>
                        <td className="px-2 py-1.5 font-mono text-purple-400">{d.transitionB}</td>
                        <td className="px-2 py-1.5 font-mono font-bold text-emerald-400">{d.targetPair} → {d.targetStateName}</td>
                      </tr>
                    ))}
                    {trace.derivationLogs.slice(0, stepIdx + 1).length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-4 py-6 text-center text-slate-600 italic text-[11px]">
                          Advance animation to reveal transitions...
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* ── ROW 3: ENHANCED 4 CARDS GRID ── */}
          <div className="px-4 grid grid-cols-4 gap-3">
            {/* 1) ACCEPT LOGIC PANEL */}
            <AcceptRuleExplainer
              operation={activeOp}
              q1={currentStep?.q1 ?? 'q0'}
              q2={currentStep?.q2 ?? 'q0'}
              stateName={currentStep?.stateName}
              isAcc1={currentStep?.isAccept1 ?? false}
              isAcc2={currentStep?.isAccept2 ?? false}
              isAccept={currentStep?.isAcceptResult ?? false}
              explanation={acceptExplanation || getBuiltInAcceptExplanation(activeOp, currentStep?.q1 || 'q0', currentStep?.q2 || 'q0', currentStep?.isAccept1 || false, currentStep?.isAccept2 || false, currentStep?.isAcceptResult || false)}
              theme={theme}
            />

            {/* 2) OPERATION RULE PANEL */}
            <Card>
              <SectionTitle icon={GitCompare} label={`${OP_LABELS[activeOp]} Rule`} color={theme.accent} />
              <div className="font-mono text-xs font-black mb-1.5" style={{ color: theme.text }}>{trace.acceptRuleFormula}</div>
              <div className="text-[9.5px] text-slate-400 leading-relaxed mb-2">{trace.acceptRuleExplanation}</div>
              
              <div className="pt-2 border-t border-slate-800 space-y-1">
                <div className="text-[8px] text-slate-500 font-black uppercase tracking-wider">Current Pair Evaluation</div>
                <div className="font-mono text-[9.5px] text-indigo-300 font-bold bg-slate-950 p-1.5 rounded border border-slate-800">
                  ({currentStep?.q1 || 'q0'}, {currentStep?.q2 || 'q0'}) → {currentStep?.isAcceptResult ? 'TRUE (ACCEPT)' : 'FALSE (REJECT)'}
                </div>
              </div>
            </Card>

            {/* 3) PHASE INFORMATION PANEL */}
            <Card>
              <SectionTitle icon={Zap} label={`Phase ${currentStep?.phase}: ${currentStep?.phaseName}`} color={theme.accent} />
              <div className="space-y-1.5 text-[9.5px]">
                <div className="flex items-center justify-between bg-slate-950 p-1.5 rounded border border-slate-800 font-mono">
                  <span className="text-slate-400">Pair: <strong className="text-indigo-300">{currentStep?.pairName}</strong> ({currentStep?.stateName})</span>
                  <span className="text-orange-400 font-bold">Sym: {currentStep?.symbol || '—'}</span>
                </div>
                <div className="grid grid-cols-2 gap-1 text-[8.5px] font-mono">
                  <span className="bg-slate-900/80 p-1 rounded text-slate-300">Explored: <strong>{currentStep?.processed?.length || 0}</strong></span>
                  <span className="bg-slate-900/80 p-1 rounded text-slate-300">Queue: <strong>{currentStep?.toProcess?.length || 0}</strong></span>
                </div>
                <div className="px-2 py-1 rounded bg-slate-950/80 border border-slate-800 text-[9px] text-slate-300 leading-relaxed">
                  {currentStep?.description}
                </div>
              </div>
            </Card>

            {/* 4) BFS WORK QUEUE PANEL */}
            <QueueViz
              toProcess={currentStep?.toProcess ?? []}
              processed={currentStep?.processed ?? []}
              current={currentStep?.pairName ?? ''}
              pairToNameMap={trace.pairToNameMap}
              onSelectPair={(name) => setSelectedStateName(name)}
            />
          </div>

          {/* ── ROW 4: DETERMINISTIC FORMULA EVALUATION & 4-WAY COMPARISON ── */}
          <div className="px-4 grid grid-cols-2 gap-3">
            {/* CURRENT FORMULA EVALUATION */}
            <Card>
              <SectionTitle icon={Calculator} label="Current Formula Evaluation" color="#f59e0b" />
              <div className="space-y-2 text-xs font-mono">
                <div className="text-[10px] text-slate-400 font-sans">
                  Deterministic Cartesian Transition Mapping:
                </div>
                <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 font-bold text-amber-300 text-[11px] overflow-x-auto">
                  δ((q_A, q_B), a) = (δ_A(q_A, a), δ_B(q_B, a))
                </div>

                {currentStep?.phase === 4 && currentStep.symbol ? (
                  <div className="grid grid-cols-3 gap-2 text-[9.5px]">
                    <div className="p-2 rounded bg-slate-900 border border-indigo-500/30">
                      <span className="text-[8px] text-slate-500 block uppercase">Input Pair & Symbol</span>
                      <span className="text-indigo-300 font-bold">δ(({currentStep.q1}, {currentStep.q2}), '{currentStep.symbol}')</span>
                    </div>

                    <div className="p-2 rounded bg-slate-900 border border-purple-500/30">
                      <span className="text-[8px] text-slate-500 block uppercase">Component Transitions</span>
                      <span className="text-purple-300 font-bold">δ_A={currentStep.nextQ1}, δ_B={currentStep.nextQ2}</span>
                    </div>

                    <div className="p-2 rounded bg-slate-900 border border-emerald-500/30">
                      <span className="text-[8px] text-slate-500 block uppercase">Mapped Result</span>
                      <span className="text-emerald-300 font-bold">({currentStep.nextQ1}, {currentStep.nextQ2}) → {currentStep.targetName}</span>
                    </div>
                  </div>
                ) : (
                  <div className="p-2 rounded bg-slate-950 border border-slate-800 text-[9.5px] text-slate-500 italic">
                    Advance to Phase 4 (Transition Step) to see live variable substitution.
                  </div>
                )}
              </div>
            </Card>

            {/* 4-WAY OPERATION COMPARISON */}
            <Card>
              <SectionTitle icon={ListFilter} label={`4-Way Operation Comparison for (${currentPairEval.q1}, ${currentPairEval.q2})`} color="#38bdf8" />
              <div className="grid grid-cols-2 gap-2 text-[9.5px] font-mono">
                {[
                  { op: 'Union (A ∪ B)', val: currentPairEval.OR, col: '#818cf8' },
                  { op: 'Intersection (A ∩ B)', val: currentPairEval.AND, col: '#34d399' },
                  { op: 'Difference (A \\ B)', val: currentPairEval.DIFF, col: '#fb923c' },
                  { op: 'Sym Diff (A ⊕ B)', val: currentPairEval.XOR, col: '#c084fc' },
                ].map((item) => (
                  <div key={item.op} className="p-2 rounded-lg bg-slate-950 border border-slate-800 flex flex-col justify-between">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold font-sans" style={{ color: item.col }}>{item.op}</span>
                      <span className={`px-1.5 py-0.5 rounded text-[8px] font-black ${item.val.accept ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/40' : 'bg-rose-950 text-rose-300 border border-rose-500/40'}`}>
                        {item.val.accept ? 'ACCEPT' : 'REJECT'}
                      </span>
                    </div>
                    <span className="text-[8.5px] text-slate-400 font-sans truncate">{item.val.reason}</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {/* ── ROW 5: ALGORITHM INSIGHT PANEL (AI + OFFLINE FALLBACK) ── */}
          <div className="px-4">
            <Card style={{ background: 'rgba(12,19,34,0.92)' }}>
              <div className="flex items-center justify-between mb-2 gap-3">
                <SectionTitle icon={Brain} label="Algorithm Insight & Educational Notes" color="#a855f7" />
                <div className="flex items-center gap-2 shrink-0">
                  {/* Model Selector */}
                  <select
                    value={selectedModel.key}
                    onChange={e => {
                      const opt = MODEL_OPTIONS.find(m => m.key === e.target.value);
                      if (opt) setSelectedModel(opt);
                    }}
                    disabled={insightsLoading}
                    className="text-[10px] font-mono font-bold rounded-lg px-2 py-1.5 cursor-pointer transition-all"
                    style={{
                      background: 'rgba(15,23,42,0.95)',
                      border: '1px solid rgba(168,85,247,0.4)',
                      color: '#d8b4fe',
                      outline: 'none',
                      minWidth: 160,
                    }}
                  >
                    {MODEL_OPTIONS.map(opt => (
                      <option key={opt.key} value={opt.key} style={{ background: '#0f172a', color: '#e2e8f0' }}>
                        {opt.badge !== '✦' ? `[${opt.badge}] ` : '✦ '}{opt.label}
                      </option>
                    ))}
                  </select>

                  {/* Provider badge */}
                  <span className="text-[9px] font-mono font-bold text-slate-400 flex items-center gap-1.5 shrink-0">
                    {insightsLoading ? (
                      <><span className="inline-block w-3 h-3 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" /> <span className="text-purple-300">Generating...</span></>
                    ) : insights.isAI ? (
                      <><Sparkles className="w-3 h-3 text-purple-400" /> <strong className="text-purple-300">{insights.aiModelUsed}</strong></>
                    ) : (
                      <><span className="text-slate-500">Built-in</span> <strong className="text-amber-400">Engine</strong></>
                    )}
                  </span>
                </div>
              </div>
              {insightsError && !insightsLoading && (
                <div className="mb-2 px-3 py-1.5 rounded-lg text-[9px] text-amber-300 bg-amber-950/30 border border-amber-500/30 font-mono">
                  ⚠ {insightsError}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-5 gap-2.5 text-[9.5px]">
                <div className="p-2.5 rounded-lg bg-slate-950 border border-purple-500/30">
                  <div className="flex items-center gap-1 font-bold text-purple-300 mb-1">
                    <BookOpen className="w-3 h-3" /> Core Theory
                  </div>
                  <p className="text-slate-300 leading-relaxed">{insights.theory}</p>
                </div>

                <div className="p-2.5 rounded-lg bg-slate-950 border border-rose-500/30">
                  <div className="flex items-center gap-1 font-bold text-rose-300 mb-1">
                    <AlertCircle className="w-3 h-3" /> Common Trap
                  </div>
                  <p className="text-slate-300 leading-relaxed">{insights.commonMistakes}</p>
                </div>

                <div className="p-2.5 rounded-lg bg-slate-950 border border-amber-500/30">
                  <div className="flex items-center gap-1 font-bold text-amber-300 mb-1">
                    <GraduationCap className="w-3 h-3" /> Exam Tip
                  </div>
                  <p className="text-slate-300 leading-relaxed">{insights.examTip}</p>
                </div>

                <div className="p-2.5 rounded-lg bg-slate-950 border border-sky-500/30">
                  <div className="flex items-center gap-1 font-bold text-sky-300 mb-1">
                    <Lightbulb className="w-3 h-3" /> Memory Trick
                  </div>
                  <p className="text-slate-300 leading-relaxed">{insights.memoryTrick}</p>
                </div>

                <div className="p-2.5 rounded-lg bg-slate-950 border border-emerald-500/30">
                  <div className="flex items-center gap-1 font-bold text-emerald-300 mb-1">
                    <Compass className="w-3 h-3" /> Analogy
                  </div>
                  <p className="text-slate-300 leading-relaxed">{insights.realWorldAnalogy}</p>
                </div>
              </div>
            </Card>
          </div>

          {/* ── ROW 6: AT THE VERY END — EDUCATIONAL TABS COVERING ENTIRE SHEET (FULL WIDTH) ── */}
          <div className="px-4 w-full">
            <div className="rounded-xl overflow-hidden shadow-lg flex flex-col w-full" style={{ background: 'rgba(8,14,26,0.92)', border: '1px solid rgba(51,65,85,0.7)' }}>
              {/* Tab bar — equal-width tabs */}
              <div className="grid shrink-0" style={{ gridTemplateColumns: `repeat(${tabs.length}, 1fr)`, borderBottom: '1px solid rgba(20,30,50,0.7)', background: 'rgba(6,10,20,0.95)' }}>
                {tabs.map(({ id, label, icon: Icon }) => {
                  const isActive = activeTab === id;
                  return (
                    <button key={id} onClick={() => setActiveTab(id)}
                      className="flex items-center justify-center gap-1.5 px-2 py-2 text-[11px] font-black transition-all whitespace-nowrap cursor-pointer"
                      style={{
                        color: isActive ? theme.accent : '#64748b',
                        borderBottom: `2px solid ${isActive ? theme.accent : 'transparent'}`,
                        background: isActive ? theme.bg : 'transparent',
                      }}>
                      <Icon className="w-3.5 h-3.5 shrink-0" />
                      <span>{label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Tab content covering entire sheet width */}
              <div className="p-4 text-xs flex-1 overflow-y-auto max-h-[280px]">
                {activeTab === 'theory' && (
                  <div className="space-y-3 text-slate-300 text-xs leading-relaxed">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
                      <div className="flex items-center gap-2 text-xs font-bold text-indigo-300">
                        <Sparkles className="w-4 h-4 text-indigo-400 animate-pulse" />
                        <span>AI Theory Engine Explanation</span>
                      </div>
                      <button
                        onClick={loadAIExplanation}
                        disabled={loadingAI}
                        className="px-2.5 py-1 bg-indigo-950 hover:bg-indigo-900 border border-indigo-500/30 text-indigo-300 rounded-lg text-[10px] font-bold flex items-center gap-1.5 cursor-pointer transition disabled:opacity-50"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${loadingAI ? 'animate-spin' : ''}`} />
                        {loadingAI ? 'Analyzing...' : 'Refresh'}
                      </button>
                    </div>

                    <p>
                      <strong className="text-white">Theory Overview:</strong>{' '}
                      {aiExplanation?.summary ||
                        `Cartesian product construction models the parallel execution of two DFAs by tracking state pairs (q_A, q_B).`}
                    </p>

                    <p>
                      <strong className="text-white">{OP_LABELS[activeOp]} Rule:</strong>{' '}
                      <span style={{ color: theme.accent }} className="font-semibold">
                        {trace.acceptRuleExplanation}
                      </span>
                    </p>
                  </div>
                )}

                {activeTab === 'construction' && (
                  <div className="flex flex-wrap gap-2">
                    {visibleUniqueSteps.map((s, i) => {
                      const isCurr = currentStep?.stateName === s.stateName;
                      return (
                        <div key={s.stateName} onClick={() => setSelectedStateName(s.stateName)}
                          className="flex flex-col items-center p-2 rounded-xl cursor-pointer transition-all hover:scale-105"
                          style={{ background: isCurr ? theme.bg : 'rgba(15,23,42,0.7)', border: `1px solid ${isCurr ? theme.border : 'rgba(30,41,59,0.6)'}`, minWidth: 80 }}>
                          <div className="text-[8px] text-slate-500 font-bold">Step {i + 1}</div>
                          <div className="text-[9px] text-indigo-400 font-mono font-bold">{s.pairName}</div>
                          <div className="text-base font-black" style={{ color: theme.accent }}>→ {s.stateName}</div>
                          {s.isAcceptResult && <div className="text-[8px] text-emerald-400 font-bold">★ Accept</div>}
                        </div>
                      );
                    })}
                  </div>
                )}

                {activeTab === 'formula' && (
                  <div className="space-y-2">
                    <div className="font-mono font-black text-amber-300 text-xs p-2 bg-slate-950 rounded-lg border border-slate-800">
                      δ((q_A, q_B), a) = (δ_A(q_A, a), δ_B(q_B, a))
                    </div>
                    {currentStep?.phase === 4 ? (
                      <div className="grid grid-cols-3 gap-3">
                        {[
                          { label: 'Input Pair & Symbol', val: `δ(${currentStep.pairName}, '${currentStep.symbol}')`, col: '#f97316' },
                          { label: 'Component Transitions', val: `δ_A(${currentStep.q1},${currentStep.symbol})=${currentStep.nextQ1}\nδ_B(${currentStep.q2},${currentStep.symbol})=${currentStep.nextQ2}`, col: '#94a3b8' },
                          { label: 'Mapped Result State', val: `(${currentStep.nextQ1},${currentStep.nextQ2}) → ${currentStep.targetName}`, col: '#34d399' },
                        ].map(({ label, val, col }) => (
                          <div key={label} className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                            <div className="text-[8.5px] text-slate-500 font-black uppercase mb-1">{label}</div>
                            <pre className="text-xs font-mono font-bold whitespace-pre-wrap" style={{ color: col }}>{val}</pre>
                          </div>
                        ))}
                      </div>
                    ) : <p className="text-slate-500 italic text-xs">Advance to Phase 4 to view transition step substitution</p>}
                  </div>
                )}

                {activeTab === 'derivation' && (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="text-slate-400 border-b border-slate-800 bg-slate-950 font-black">
                          {['#', 'State', 'Sym', 'δ_A', 'δ_B', 'Result'].map(h => (
                            <th key={h} className="text-left px-3 py-2 uppercase text-[9.5px] tracking-wider">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {trace.derivationLogs.map(d => (
                          <tr key={d.step} className="border-b border-slate-900/80 hover:bg-slate-900/50 font-mono text-xs">
                            <td className="px-3 py-1.5 text-slate-500">{d.step}</td>
                            <td className="px-3 py-1.5 font-bold" style={{ color: theme.accent }}>{d.stateName}</td>
                            <td className="px-3 py-1.5 font-black text-orange-400">{d.symbol}</td>
                            <td className="px-3 py-1.5 text-blue-400">{d.transitionA}</td>
                            <td className="px-3 py-1.5 text-purple-400">{d.transitionB}</td>
                            <td className="px-3 py-1.5 font-bold text-emerald-400">{d.targetPair} → {d.targetStateName}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {activeTab === 'complexity' && (
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { label: 'Potential States', val: `${trace.dfa1.states.length} × ${trace.dfa2.states.length} = ${trace.potentialStatesCount}`, col: '#f59e0b' },
                      { label: 'Reachable States', val: `${trace.reachableStatesCount}`, col: '#34d399' },
                      { label: 'Accept States', val: `${trace.resultDFA.acceptStates.length}`, col: theme.accent },
                      { label: 'Time Complexity', val: 'O(|Q_A| × |Q_B|)', col: '#818cf8' },
                      { label: 'Space Complexity', val: 'O(|Q_A| × |Q_B|)', col: '#818cf8' },
                      { label: 'Unreachable Pruned', val: `${trace.potentialStatesCount - trace.reachableStatesCount} states`, col: '#c084fc' },
                    ].map(({ label, val, col }) => (
                      <div key={label} className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                        <div className="text-[8.5px] text-slate-500 font-black uppercase mb-1">{label}</div>
                        <div className="font-mono font-black text-xs" style={{ color: col }}>{val}</div>
                      </div>
                    ))}
                  </div>
                )}

                {activeTab === 'examples' && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-[9px] text-emerald-400 font-black uppercase tracking-wider mb-1.5">Accepted Test Strings</div>
                      <div className="flex flex-wrap gap-1.5">
                        {trace.examples.acceptedStrings.map(s => (
                          <span key={s} className="px-2.5 py-1 rounded-lg font-mono font-bold text-xs bg-emerald-950/80 text-emerald-300 border border-emerald-500/30">{s}</span>
                        ))}
                      </div>
                    </div>
                    <div>
                      <div className="text-[9px] text-rose-400 font-black uppercase tracking-wider mb-1.5">Rejected Test Strings</div>
                      <div className="flex flex-wrap gap-1.5">
                        {trace.examples.rejectedStrings.map(s => (
                          <span key={s} className="px-2.5 py-1 rounded-lg font-mono font-bold text-xs bg-rose-950/80 text-rose-300 border border-rose-500/30">{s}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

        </div>

        {/* ═══ PLAYER CONTROLS ═══ */}
        <div className="shrink-0 flex items-center justify-between px-4 py-2.5"
          style={{ background: 'rgba(4,8,16,0.95)', borderTop: '1px solid rgba(20,30,50,0.8)' }}>
          <div className="flex items-center gap-1.5">
            <button onClick={() => { stopPlay(); setStepIdx(0); }}
              className="p-2 rounded-xl cursor-pointer transition hover:bg-slate-800" style={{ background: 'rgba(20,30,50,0.6)', border: '1px solid rgba(40,55,80,0.6)' }} title="Restart">
              <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
            </button>
            <button onClick={() => { stopPlay(); setStepIdx(p => Math.max(0, p - 1)); }}
              className="p-2 rounded-xl cursor-pointer transition hover:bg-slate-800" style={{ background: 'rgba(20,30,50,0.6)', border: '1px solid rgba(40,55,80,0.6)' }} title="Previous">
              <ChevronLeft className="w-3.5 h-3.5 text-slate-400" />
            </button>
            <button onClick={() => isPlaying ? stopPlay() : setIsPlaying(true)}
              className="px-5 py-2 font-black text-[11px] flex items-center gap-2 rounded-xl transition cursor-pointer"
              style={{
                background: isPlaying ? 'rgba(245,158,11,0.15)' : theme.bg,
                border: `1px solid ${isPlaying ? 'rgba(245,158,11,0.4)' : theme.border}`,
                color: isPlaying ? '#f59e0b' : theme.accent,
                boxShadow: isPlaying ? '0 0 12px rgba(245,158,11,0.15)' : theme.glow,
              }}>
              {isPlaying ? <><Pause className="w-3.5 h-3.5" /> Pause</> : <><Play className="w-3.5 h-3.5" /> Play</>}
            </button>
            <button onClick={() => { stopPlay(); setStepIdx(p => Math.min(totalSteps - 1, p + 1)); }}
              className="p-2 rounded-xl cursor-pointer transition hover:bg-slate-800" style={{ background: 'rgba(20,30,50,0.6)', border: '1px solid rgba(40,55,80,0.6)' }} title="Next">
              <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            </button>
            <button onClick={() => { stopPlay(); setStepIdx(totalSteps - 1); }}
              className="p-2 rounded-xl cursor-pointer transition hover:bg-slate-800" style={{ background: 'rgba(20,30,50,0.6)', border: '1px solid rgba(40,55,80,0.6)' }} title="Jump to end">
              <SkipForward className="w-3.5 h-3.5 text-slate-400" />
            </button>
            <div className="w-px h-5 mx-0.5" style={{ background: 'rgba(40,55,80,0.8)' }} />
            {SPEED_LABELS.map((label, i) => (
              <button key={i} onClick={() => setSpeedIdx(i)}
                className="px-2.5 py-1 rounded-lg text-[9px] font-black transition cursor-pointer"
                style={{
                  background: speedIdx === i ? theme.bg : 'rgba(12,20,36,0.6)',
                  border: `1px solid ${speedIdx === i ? theme.border : 'rgba(30,41,59,0.4)'}`,
                  color: speedIdx === i ? theme.accent : '#374151',
                }}>{label}</button>
            ))}
          </div>

          <button onClick={handleApply}
            className="px-5 py-2 font-black text-[11px] flex items-center gap-2 rounded-xl cursor-pointer transition"
            style={{ background: 'linear-gradient(135deg, #059669, #0d9488)', color: 'white', boxShadow: '0 0 16px rgba(5,150,105,0.25)' }}>
            <Check className="w-4 h-4" /> Apply Product DFA to Workspace
          </button>
        </div>

      </div>
    </div>
  );
};
