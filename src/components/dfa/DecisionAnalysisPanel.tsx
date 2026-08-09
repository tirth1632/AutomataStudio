import React, { useState, useMemo, useEffect } from 'react';
import {
  Brain,
  CheckCircle2,
  Cpu,
  BookOpen,
  Sparkles,
  HelpCircle,
  AlertTriangle,
  Lightbulb,
  GraduationCap,
  Layers,
  ArrowRight,
  ShieldAlert,
  Check,
  X,
  Target,
  Key,
  Zap,
} from 'lucide-react';
import type { AutomatonGraph, APIKeys, AIProvider } from '../../types/automata';
import type { SetOpType } from './ThreeAutomataArena';
import { simulateNFA } from '../../algorithms/nfaSimulator';
import { loadAPIKeys, saveAPIKeys, loadPreferredProvider, savePreferredProvider } from '../../services/aiProviders';
import { buildAITutorPrompt, generateOfflineAITutorExplanation, type AITutorInputContext } from '../../services/aiTutorEngine';

export type TutorStyle =
  | 'beginner'
  | 'exam'
  | 'technical'
  | 'analogy'
  | 'memory'
  | 'mistakes'
  | 'tip';

interface DecisionAnalysisPanelProps {
  graphA: AutomatonGraph;
  graphB: AutomatonGraph;
  resultGraph: AutomatonGraph;
  opType: SetOpType;
  testString: string;
  accA: boolean;
  accB: boolean;
  accRes: boolean;
}

// Global In-Memory Cache for AI Explanations
const aiCache = new Map<string, string>();

// ── 1. Counterexample Computation (Deterministic BFS) ──
function computeCounterexample(resultGraph: AutomatonGraph, testStr: string) {
  if (!resultGraph || !resultGraph.states || resultGraph.states.length === 0) return null;
  const startState = resultGraph.states.find((s) => s.isStart)?.id || resultGraph.states[0]?.id;
  if (!startState) return null;

  const acceptSet = new Set(resultGraph.states.filter((s) => s.isAccept).map((s) => s.id));
  const alphabet = resultGraph.alphabet?.length ? resultGraph.alphabet : ['0', '1'];

  const queue: Array<{ state: string; str: string }> = [{ state: startState, str: '' }];
  const visited = new Set<string>();
  visited.add(`${startState}:`);

  let smallestAccepted: string | null = null;
  let closestAccepted: string | null = null;
  let minDiff = Infinity;

  while (queue.length > 0 && visited.size < 500) {
    const { state, str } = queue.shift()!;
    if (acceptSet.has(state)) {
      if (smallestAccepted === null) smallestAccepted = str;

      const diff = computeEditDistance(testStr, str);
      if (diff < minDiff) {
        minDiff = diff;
        closestAccepted = str;
      }
    }

    if (str.length >= 8) continue;

    for (const sym of alphabet) {
      const edges = resultGraph.transitions.filter((t) => t.source === state && t.symbols.includes(sym));
      for (const e of edges) {
        const key = `${e.target}:${str}${sym}`;
        if (!visited.has(key)) {
          visited.add(key);
          queue.push({ state: e.target, str: str + sym });
        }
      }
    }
  }

  const smallestDisplay =
    smallestAccepted !== null ? (smallestAccepted === '' ? 'ε (empty string)' : smallestAccepted) : 'None (Empty Set ∅)';
  const closestDisplay =
    closestAccepted !== null ? (closestAccepted === '' ? 'ε (empty string)' : closestAccepted) : 'None';

  return {
    smallestAccepted: smallestDisplay,
    closestAccepted: closestDisplay,
    characterDiff: minDiff === Infinity ? 0 : minDiff,
  };
}

function computeEditDistance(s1: string, s2: string): number {
  let diff = Math.abs(s1.length - s2.length);
  const minLen = Math.min(s1.length, s2.length);
  for (let i = 0; i < minLen; i++) {
    if (s1[i] !== s2[i]) diff++;
  }
  return diff;
}

// ── 2. Evaluate String across All 8 Operations ──
function computeAllOpResults(graphA: AutomatonGraph, graphB: AutomatonGraph, testStr: string) {
  try {
    const stepsA = simulateNFA(graphA, testStr);
    const stepsB = simulateNFA(graphB, testStr);
    const aAcc = stepsA[stepsA.length - 1]?.isAccepting || false;
    const bAcc = stepsB[stepsB.length - 1]?.isAccepting || false;

    return [
      { key: 'OR', name: 'Union (A ∪ B)', accepted: aAcc || bAcc, formula: `${aAcc ? 'TRUE' : 'FALSE'} OR ${bAcc ? 'TRUE' : 'FALSE'}` },
      { key: 'AND', name: 'Intersection (A ∩ B)', accepted: aAcc && bAcc, formula: `${aAcc ? 'TRUE' : 'FALSE'} AND ${bAcc ? 'TRUE' : 'FALSE'}` },
      { key: 'DIFF', name: 'Difference (A \\ B)', accepted: aAcc && !bAcc, formula: `${aAcc ? 'TRUE' : 'FALSE'} AND NOT ${bAcc ? 'TRUE' : 'FALSE'}` },
      { key: 'XOR', name: 'Sym Diff (A ⊕ B)', accepted: aAcc !== bAcc, formula: `${aAcc ? 'TRUE' : 'FALSE'} XOR ${bAcc ? 'TRUE' : 'FALSE'}` },
      { key: 'COMP_A', name: "Complement A (Aᶜ)", accepted: !aAcc, formula: `NOT ${aAcc ? 'TRUE' : 'FALSE'}` },
      { key: 'COMP_B', name: "Complement B (Bᶜ)", accepted: !bAcc, formula: `NOT ${bAcc ? 'TRUE' : 'FALSE'}` },
      { key: 'MIN_A', name: 'Minimization A', accepted: aAcc, formula: `${aAcc ? 'TRUE' : 'FALSE'}` },
      { key: 'MIN_B', name: 'Minimization B', accepted: bAcc, formula: `${bAcc ? 'TRUE' : 'FALSE'}` },
    ];
  } catch {
    return [];
  }
}

// ── 3. Deterministic Decision Explanation ──
function getDeterministicExplanation(
  opType: SetOpType,
  nameA: string,
  nameB: string,
  testStr: string,
  accA: boolean,
  accB: boolean,
  accRes: boolean,
  hasDfaB: boolean
): string {
  const satA = accA ? 'satisfies' : 'does NOT satisfy';
  const satB = accB ? 'satisfies' : 'does NOT satisfy';
  const resWord = accRes ? 'ACCEPTS' : 'REJECTS';

  if (!hasDfaB) {
    if (opType === 'COMP_A') {
      return `The input string "${testStr}" ${satA} Language A ("${nameA}"). Since Complement returns the exact opposite decision, the resulting DFA ${resWord}.`;
    }
    if (opType === 'MIN_A') {
      return `The input string "${testStr}" ${satA} Language A ("${nameA}"). Since Minimization preserves exact language equivalence, the minimized DFA ${resWord}.`;
    }
    return `The input string "${testStr}" ${satA} Language A ("${nameA}"). The resulting DFA ${resWord}.`;
  }

  const rules: Record<SetOpType, string> = {
    OR: 'only at least one automaton needs to accept',
    AND: 'both automata must accept simultaneously',
    DIFF: 'Automaton A must accept while Automaton B must reject',
    XOR: 'exactly one automaton must accept, but not both',
    COMP_A: "the result is the exact opposite of Automaton A's decision",
    COMP_B: "the result is the exact opposite of Automaton B's decision",
    MIN_A: "minimization preserves Automaton A's exact decision",
    MIN_B: "minimization preserves Automaton B's exact decision",
  };

  return `The input string "${testStr}" ${satA} Language A ("${nameA}") and ${satB} Language B ("${nameB}"). Since the current operation is ${opType} (${rules[opType]}), the Product DFA ${resWord}.`;
}

export const DecisionAnalysisPanel: React.FC<DecisionAnalysisPanelProps> = ({
  graphA,
  graphB,
  resultGraph,
  opType,
  testString,
  accA,
  accB,
  accRes,
}) => {
  const [selectedProvider, setSelectedProvider] = useState<AIProvider>(() => loadPreferredProvider() || 'AUTO');
  const [showKeyModal, setShowKeyModal] = useState<boolean>(false);
  const [apiKeys, setApiKeys] = useState<APIKeys>(() => loadAPIKeys());
  const [activeTutorStyle, setActiveTutorStyle] = useState<TutorStyle | null>(null);
  const [aiExplanation, setAiExplanation] = useState<string | null>(null);
  const [isAiLoading, setIsAiLoading] = useState<boolean>(false);
  const [aiSourceBadge, setAiSourceBadge] = useState<string>('');

  // AI Decision Reason State
  const [aiDecisionReason, setAiDecisionReason] = useState<string>('');
  const [isDecisionLoading, setIsDecisionLoading] = useState<boolean>(false);
  const [decisionBadge, setDecisionBadge] = useState<string>('AI Analyzing...');

  const hasKeyForSelected = useMemo(() => {
    if (selectedProvider === 'AUTO') {
      return Object.values(apiKeys).some((k) => !!k && k.trim().length > 0);
    }
    const keyProp = selectedProvider.toLowerCase() as keyof APIKeys;
    return !!(apiKeys[keyProp] && apiKeys[keyProp].trim().length > 0);
  }, [selectedProvider, apiKeys]);

  const nameA = graphA.name || 'DFA A';
  const nameB = graphB.name || 'DFA B';

  const hasDfaB = useMemo(() => {
    if (!graphB || !graphB.states || graphB.states.length === 0) return false;
    if (nameB && (nameB.includes('(Empty)') || nameB.toLowerCase().includes('empty'))) return false;
    return true;
  }, [graphB, nameB]);

  // 1. Boolean Expression Component Data
  const booleanData = useMemo(() => {
    const strA = accA ? 'TRUE' : 'FALSE';
    const strB = accB ? 'TRUE' : 'FALSE';
    const strRes = accRes ? 'TRUE' : 'FALSE';

    if (!hasDfaB) {
      if (opType === 'COMP_A') {
        return { opName: "Complement A (Aᶜ)", expr: `NOT ${strA}`, left: 'NOT', op: '', right: strA, res: strRes };
      }
      if (opType === 'MIN_A') {
        return { opName: 'Minimization A', expr: `${strA}`, left: strA, op: '', right: '', res: strRes };
      }
      return { opName: `${opType} (DFA A)`, expr: strA, left: strA, op: '', right: '', res: strRes };
    }

    switch (opType) {
      case 'OR':
        return { opName: 'Union (A ∪ B)', expr: `${strA} OR ${strB}`, left: strA, op: 'OR', right: strB, res: strRes };
      case 'AND':
        return { opName: 'Intersection (A ∩ B)', expr: `${strA} AND ${strB}`, left: strA, op: 'AND', right: strB, res: strRes };
      case 'DIFF':
        return { opName: 'Difference (A \\ B)', expr: `${strA} AND NOT ${strB}`, left: strA, op: 'AND NOT', right: strB, res: strRes };
      case 'XOR':
        return { opName: 'Symmetric Difference (A ⊕ B)', expr: `${strA} XOR ${strB}`, left: strA, op: 'XOR', right: strB, res: strRes };
      case 'COMP_A':
        return { opName: "Complement A (Aᶜ)", expr: `NOT ${strA}`, left: 'NOT', op: '', right: strA, res: strRes };
      case 'COMP_B':
        return { opName: "Complement B (Bᶜ)", expr: `NOT ${strB}`, left: 'NOT', op: '', right: strB, res: strRes };
      case 'MIN_A':
        return { opName: 'Minimization A', expr: `${strA}`, left: strA, op: '', right: '', res: strRes };
      case 'MIN_B':
        return { opName: 'Minimization B', expr: `${strB}`, left: strB, op: '', right: '', res: strRes };
    }
  }, [opType, accA, accB, accRes, hasDfaB]);

  // 2. Current State Semantics
  const stateSemantics = useMemo(() => {
    const stepsA = simulateNFA(graphA, testString);
    const stepsB = simulateNFA(graphB, testString);

    const lastA = stepsA[stepsA.length - 1]?.currentStateIds[0] || 'q0';
    const lastB = stepsB[stepsB.length - 1]?.currentStateIds[0] || 'p0';

    const nodeA = graphA.states.find((s) => s.id === lastA);
    const nodeB = graphB.states.find((s) => s.id === lastB);

    const descA = nodeA?.label && nodeA.label !== nodeA.id
      ? nodeA.label
      : accA
        ? `In accepting state '${lastA}': Input satisfies ${nameA}`
        : `In non-accepting state '${lastA}': Input does not satisfy ${nameA}`;

    const descB = nodeB?.label && nodeB.label !== nodeB.id
      ? nodeB.label
      : accB
        ? `In accepting state '${lastB}': Input satisfies ${nameB}`
        : `In non-accepting state '${lastB}': Input does not satisfy ${nameB}`;

    const descProduct = hasDfaB
      ? `Product pair (${lastA}, ${lastB}): String ${accA ? 'satisfies' : 'fails'} ${nameA} and ${accB ? 'satisfies' : 'fails'} ${nameB}.`
      : `Result state '${lastA}': Evaluated directly on Automaton A (${accA ? 'Satisfies' : 'Fails'}).`;

    return {
      stateA: lastA,
      meaningA: descA,
      stateB: lastB,
      meaningB: descB,
      stateProduct: hasDfaB ? `(${lastA}, ${lastB})` : lastA,
      meaningProduct: descProduct,
    };
  }, [graphA, graphB, testString, accA, accB, nameA, nameB, hasDfaB]);

  // Deterministic Explanation
  const deterministicExplanation = useMemo(() => {
    return getDeterministicExplanation(opType, nameA, nameB, testString, accA, accB, accRes, hasDfaB);
  }, [opType, nameA, nameB, testString, accA, accB, accRes, hasDfaB]);

  // Auto-fetch AI Decision Reason when string, operation, or automata changes
  useEffect(() => {
    let isMounted = true;
    const fetchReason = async () => {
      const keys = loadAPIKeys();
      const cacheKey = `reason__${testString}__${opType}__${graphA.id || nameA}__${graphB.id || nameB}__${accA}__${accB}__${accRes}`;

      if (aiCache.has(cacheKey)) {
        setAiDecisionReason(aiCache.get(cacheKey)!);
        setDecisionBadge('AI Verified (Cached)');
        return;
      }

      setIsDecisionLoading(true);
      setDecisionBadge('AI Generating...');

      const prompt = `Explain in 2-3 clear, insightful sentences in natural human English why the input string "${testString}" yields ${accRes ? 'ACCEPT' : 'REJECT'} under the ${opType} set operation between Automaton A ("${nameA}") and Automaton B ("${nameB}").
Context: Automaton A returned ${accA ? 'TRUE (ACCEPT)' : 'FALSE (REJECT)'}, Automaton B returned ${accB ? 'TRUE (ACCEPT)' : 'FALSE (REJECT)'}.
CRITICAL RULE: DO NOT use LaTeX code or math syntax like $, \\delta, \\implies. Use plain, readable human English.`;

      try {
        let content = '';
        let usedProv = selectedProvider;

        if (selectedProvider === 'GEMINI' || (selectedProvider === 'AUTO' && keys.gemini)) {
          if (keys.gemini) {
            usedProv = 'GEMINI';
            const resp = await fetch(
              `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${keys.gemini}`,
              {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
              }
            );
            const data = await resp.json();
            content = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
          }
        }

        if (!content && (selectedProvider === 'GROQ' || (selectedProvider === 'AUTO' && keys.groq))) {
          if (keys.groq) {
            usedProv = 'GROQ';
            const resp = await fetch('https://api.groq.com/openai/v1/chat/completions', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${keys.groq}` },
              body: JSON.stringify({ model: 'llama-3.3-70b-versatile', messages: [{ role: 'user', content: prompt }] }),
            });
            const data = await resp.json();
            content = data?.choices?.[0]?.message?.content || '';
          }
        }

        if (!content && (selectedProvider === 'OPENAI' || (selectedProvider === 'AUTO' && keys.openai))) {
          if (keys.openai) {
            usedProv = 'OPENAI';
            const resp = await fetch('https://api.openai.com/v1/chat/completions', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${keys.openai}` },
              body: JSON.stringify({ model: 'gpt-4o-mini', messages: [{ role: 'user', content: prompt }] }),
            });
            const data = await resp.json();
            content = data?.choices?.[0]?.message?.content || '';
          }
        }

        if (!content.trim()) {
          content = deterministicExplanation;
          if (isMounted) setDecisionBadge('Deterministic Engine');
        } else {
          if (isMounted) setDecisionBadge(`AI Generated (${usedProv})`);
        }

        if (isMounted) {
          aiCache.set(cacheKey, content);
          setAiDecisionReason(content);
        }
      } catch {
        if (isMounted) {
          setAiDecisionReason(deterministicExplanation);
          setDecisionBadge('Deterministic Engine (Fallback)');
        }
      } finally {
        if (isMounted) setIsDecisionLoading(false);
      }
    };

    fetchReason();
    return () => {
      isMounted = false;
    };
  }, [testString, opType, nameA, nameB, accA, accB, accRes, selectedProvider, deterministicExplanation, graphA.id, graphB.id]);

  // 3. Language Checklist
  const checklist = useMemo(() => {
    const count1 = (testString.match(/1/g) || []).length;
    const _count0 = (testString.match(/0/g) || []).length;

    return [
      { label: `Starts with '0'`, ok: testString.startsWith('0') },
      { label: `Starts with '1'`, ok: testString.startsWith('1') },
      { label: `Ends with '0'`, ok: testString.endsWith('0') },
      { label: `Ends with '1'`, ok: testString.endsWith('1') },
      { label: `Contains '11'`, ok: testString.includes('11') },
      { label: `Contains '01'`, ok: testString.includes('01') },
      { label: `Even number of 1s (${count1})`, ok: count1 % 2 === 0 },
      { label: `Even length (${testString.length})`, ok: testString.length % 2 === 0 },
    ];
  }, [testString]);

  // 4. Counterexample (if rejected)
  const counterexample = useMemo(() => {
    if (accRes) return null;
    return computeCounterexample(resultGraph, testString);
  }, [accRes, resultGraph, testString]);

  // 5. All Operation Comparison
  const allOps = useMemo(() => {
    return computeAllOpResults(graphA, graphB, testString);
  }, [graphA, graphB, testString]);

  // Handle AI Tutor button click with selected provider & local caching
  const handleFetchTutorExplanation = async (style: TutorStyle, providerOverride?: AIProvider) => {
    setActiveTutorStyle(style);
    const providerToUse = providerOverride || selectedProvider;
    const cacheKey = `${testString}__${opType}__${graphA.id || nameA}__${graphB.id || nameB}__${style}__${providerToUse}`;

    if (aiCache.has(cacheKey)) {
      setAiExplanation(aiCache.get(cacheKey)!);
      setAiSourceBadge(`Cached (${providerToUse})`);
      return;
    }

    setIsAiLoading(true);
    setAiExplanation(null);

    const keys = loadAPIKeys();

    const ctx: AITutorInputContext = {
      currentTopic: `DFA Set Operation: ${opType}`,
      currentOperation: opType,
      languageDescriptionA: nameA,
      languageDescriptionB: nameB,
      automatonStatsA: { statesCount: graphA.states.length, transitionsCount: graphA.transitions.length, acceptStatesCount: graphA.states.filter((s) => s.isAccept).length },
      automatonStatsB: { statesCount: graphB.states.length, transitionsCount: graphB.transitions.length, acceptStatesCount: graphB.states.filter((s) => s.isAccept).length },
      simulationResult: {
        accA,
        accB,
        accRes,
        stateA: stateSemantics.stateA,
        stateB: stateSemantics.stateB,
        stateProduct: stateSemantics.stateProduct,
      },
      currentString: testString,
      generatorUsed: 'Automata Engine (Product Construction)',
      mathematicalResults: {
        booleanExpr: booleanData.expr,
        opName: booleanData.opName,
        formalRule: booleanData.res,
      },
      nameA,
      nameB,
      tutorStyle: style,
    };

    const prompt = buildAITutorPrompt(ctx);

    try {
      let content = '';
      let usedProvider = providerToUse;

      if (providerToUse === 'GEMINI' || (providerToUse === 'AUTO' && keys.gemini)) {
        if (keys.gemini) {
          usedProvider = 'GEMINI';
          const resp = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${keys.gemini}`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
            }
          );
          const data = await resp.json();
          content = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
        }
      }

      if (!content && (providerToUse === 'GROQ' || (providerToUse === 'AUTO' && keys.groq))) {
        if (keys.groq) {
          usedProvider = 'GROQ';
          const resp = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${keys.groq}` },
            body: JSON.stringify({ model: 'llama-3.3-70b-versatile', messages: [{ role: 'user', content: prompt }] }),
          });
          const data = await resp.json();
          content = data?.choices?.[0]?.message?.content || '';
        }
      }

      if (!content && (providerToUse === 'OPENROUTER' || (providerToUse === 'AUTO' && keys.openrouter))) {
        if (keys.openrouter) {
          usedProvider = 'OPENROUTER';
          const resp = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${keys.openrouter}` },
            body: JSON.stringify({ model: 'google/gemini-flash-1.5', messages: [{ role: 'user', content: prompt }] }),
          });
          const data = await resp.json();
          content = data?.choices?.[0]?.message?.content || '';
        }
      }

      if (!content && (providerToUse === 'OPENAI' || (providerToUse === 'AUTO' && keys.openai))) {
        if (keys.openai) {
          usedProvider = 'OPENAI';
          const resp = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${keys.openai}` },
            body: JSON.stringify({ model: 'gpt-4o-mini', messages: [{ role: 'user', content: prompt }] }),
          });
          const data = await resp.json();
          content = data?.choices?.[0]?.message?.content || '';
        }
      }

      if (!content.trim()) {
        content = generateOfflineAITutorExplanation(ctx);
        setAiSourceBadge('Offline Mode (Deterministic)');
      } else {
        setAiSourceBadge(`API Verified (${usedProvider})`);
      }

      aiCache.set(cacheKey, content);
      setAiExplanation(content);
    } catch {
      const fallbackText = generateOfflineAITutorExplanation(ctx);
      aiCache.set(cacheKey, fallbackText);
      setAiExplanation(fallbackText);
      setAiSourceBadge('Offline Mode (Fallback)');
    } finally {
      setIsAiLoading(false);
    }
  };

  return (
    <div className="bg-slate-900/95 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-6 shadow-2xl text-slate-100 font-sans mt-4">
      {/* ── HEADER ───────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3 flex-wrap gap-2">
        <div className="flex items-center gap-2.5 font-bold text-base text-indigo-300">
          <Brain className="w-5 h-5 text-indigo-400 shrink-0" />
          <span>Decision Analysis Panel (Why Did This Result Occur?)</span>
        </div>
        <span className="px-3 py-1 bg-indigo-950/80 border border-indigo-500/40 text-indigo-300 rounded-full text-xs font-mono font-bold flex items-center gap-1.5">
          <Cpu className="w-3.5 h-3.5 text-indigo-400" /> Automata Engine Verified
        </span>
      </div>

      {/* ── SECTION 1 & 2: BOOLEAN DECISION & LANGUAGE SATISFACTION ────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Card 1: Boolean Decision */}
        <div className="p-4 bg-slate-950/90 border border-slate-800 rounded-xl space-y-3 shadow-inner">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
            <Layers className="w-4 h-4 text-indigo-400" />
            Boolean Decision Evaluation
          </div>

          <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 flex items-center justify-between font-mono text-sm">
            <span className="text-slate-300 font-bold">{booleanData.opName}:</span>
            <div className="flex items-center gap-2 font-bold">
              <span className={`px-2.5 py-1 rounded text-xs border ${accA ? 'bg-emerald-950 text-emerald-300 border-emerald-500/40' : 'bg-rose-950 text-rose-300 border-rose-500/40'}`}>
                {accA ? 'TRUE' : 'FALSE'}
              </span>
              <span className="text-slate-400">{booleanData.op || '→'}</span>
              {booleanData.right && (
                <span className={`px-2.5 py-1 rounded text-xs border ${booleanData.right.includes('EMPTY') ? 'bg-slate-900 text-slate-400 border-slate-700 font-bold' : accB ? 'bg-emerald-950 text-emerald-300 border-emerald-500/40' : 'bg-rose-950 text-rose-300 border-rose-500/40'}`}>
                  {booleanData.right}
                </span>
              )}
              <ArrowRight className="w-4 h-4 text-slate-500" />
              <span className={`px-3 py-1 rounded text-xs font-extrabold border shadow ${accRes ? 'bg-emerald-600/30 text-emerald-300 border-emerald-500/50' : 'bg-rose-600/30 text-rose-300 border-rose-500/50'}`}>
                {accRes ? 'TRUE (ACCEPT)' : 'FALSE (REJECT)'}
              </span>
            </div>
          </div>
        </div>

        {/* Card 2: Language Satisfaction */}
        <div className="p-4 bg-slate-950/90 border border-slate-800 rounded-xl space-y-2.5 shadow-inner">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            Language Satisfaction Status
          </div>

          <div className="space-y-2 text-xs font-mono">
            <div className="p-2.5 bg-slate-900 rounded-lg border border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2 truncate">
                <span className="w-2 h-2 rounded-full bg-indigo-400 shrink-0" />
                <span className="text-slate-300 font-sans font-bold truncate">{nameA}:</span>
              </div>
              <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${accA ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/40' : 'bg-rose-950 text-rose-300 border border-rose-500/40'}`}>
                {accA ? 'Satisfied (True)' : 'Fails (False)'}
              </span>
            </div>

            {hasDfaB && (
              <div className="p-2.5 bg-slate-900 rounded-lg border border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2 truncate">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                  <span className="text-slate-300 font-sans font-bold truncate">{nameB}:</span>
                </div>
                <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${accB ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/40' : 'bg-rose-950 text-rose-300 border border-rose-500/40'}`}>
                  {accB ? 'Satisfied (True)' : 'Fails (False)'}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── SECTION 3: AI DECISION ANALYSIS REASON ──────────────────── */}
      <div className="p-4 bg-gradient-to-r from-indigo-950/40 via-slate-900/60 to-purple-950/30 border border-indigo-500/40 rounded-xl space-y-2.5 shadow-lg relative overflow-hidden">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="text-xs font-bold text-indigo-300 uppercase tracking-wider flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-indigo-400 animate-pulse" />
            AI Decision Analysis Reason
          </div>
          <span className="px-2.5 py-0.5 bg-indigo-950/80 border border-indigo-500/40 text-indigo-300 rounded-full text-[10px] font-mono font-bold flex items-center gap-1.5 shadow-sm">
            {isDecisionLoading && <Sparkles className="w-3 h-3 text-indigo-400 animate-spin" />}
            {decisionBadge}
          </span>
        </div>

        {isDecisionLoading ? (
          <div className="flex items-center gap-2.5 text-xs text-indigo-300 py-1 font-mono">
            <Sparkles className="w-4 h-4 text-indigo-400 animate-spin" />
            <span>AI model is synthesizing decision analysis for string "{testString}"...</span>
          </div>
        ) : (
          <p className="text-xs sm:text-sm text-slate-100 leading-relaxed font-sans whitespace-pre-wrap">
            {aiDecisionReason || deterministicExplanation}
          </p>
        )}
      </div>





      {/* ── SECTION 7: ALL OPERATION COMPARISON ─────────────────────────────── */}
      <div className="p-4 bg-slate-950/90 border border-slate-800 rounded-xl space-y-3">
        <div className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
          <Target className="w-4 h-4 text-indigo-400" />
          All 8 Set Operations Comparison for "{testString}"
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
          {allOps.map((op) => (
            <div
              key={op.key}
              className={`p-2.5 rounded-lg border flex flex-col justify-between space-y-1 ${
                op.accepted
                  ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                  : 'bg-slate-900 border-slate-800 text-slate-400'
              }`}
            >
              <span className="font-sans font-bold text-[11px] truncate">{op.name}</span>
              <div className="flex items-center justify-between pt-1">
                <span className="text-[10px] text-slate-500 truncate">{op.formula}</span>
                <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${op.accepted ? 'bg-emerald-600/40 text-emerald-200' : 'bg-rose-600/30 text-rose-300'}`}>
                  {op.accepted ? 'ACCEPT' : 'REJECT'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── SECTION 8: AI TUTOR (OPTIONAL EXPLANATION LAYER) ─────────────────── */}
      <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-4 shadow-xl">
        <div className="flex items-center justify-between flex-wrap gap-2 border-b border-slate-800 pb-2">
          <div className="text-xs font-bold text-indigo-300 uppercase tracking-wider flex items-center gap-2">
            <GraduationCap className="w-4 h-4 text-indigo-400" />
            AI Tutor Explanation Layer
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 bg-slate-900 px-2.5 py-1 rounded-lg border border-slate-800 text-xs font-mono text-slate-300">
              <span className="text-[10px] text-slate-400">AI Provider:</span>
              <select
                value={selectedProvider}
                onChange={(e) => {
                  const p = e.target.value as AIProvider;
                  setSelectedProvider(p);
                  savePreferredProvider(p);
                  if (activeTutorStyle) {
                    handleFetchTutorExplanation(activeTutorStyle, p);
                  }
                }}
                className="bg-transparent text-indigo-300 font-bold focus:outline-none cursor-pointer text-xs"
              >
                <option value="AUTO" className="bg-slate-900 text-white">✦ Auto (Fallback Chain)</option>
                <option value="GEMINI" className="bg-slate-900 text-white">Google Gemini 2.0 / 1.5</option>
                <option value="GROQ" className="bg-slate-900 text-white">Groq (Llama 3.3 70B Fast)</option>
                <option value="OPENAI" className="bg-slate-900 text-white">OpenAI (GPT-4o Mini)</option>
                <option value="CLAUDE" className="bg-slate-900 text-white">Anthropic Claude 3.5</option>
                <option value="OPENROUTER" className="bg-slate-900 text-white">OpenRouter Multi-Model</option>
              </select>
            </div>

            <button
              onClick={() => setShowKeyModal(true)}
              className={`px-2.5 py-1 text-xs font-mono font-bold rounded-lg border flex items-center gap-1.5 transition cursor-pointer ${
                hasKeyForSelected
                  ? 'bg-emerald-950/80 border-emerald-500/40 text-emerald-300 hover:bg-emerald-900'
                  : 'bg-amber-950/80 border-amber-500/40 text-amber-300 hover:bg-amber-900'
              }`}
              title="Upload or Edit API Keys"
            >
              <Key className="w-3.5 h-3.5" />
              {hasKeyForSelected ? 'Key Configured' : '+ Add API Key'}
            </button>

            {aiSourceBadge && (
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-950/80 border border-indigo-500/40 text-indigo-300">
                {aiSourceBadge}
              </span>
            )}
          </div>
        </div>

        {/* Buttons Grid */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => handleFetchTutorExplanation('beginner')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              activeTutorStyle === 'beginner'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'bg-slate-900 text-slate-300 border border-slate-800 hover:border-indigo-500/50'
            }`}
          >
            <Lightbulb className="w-3.5 h-3.5 text-amber-400" /> Explain Like Beginner
          </button>

          <button
            onClick={() => handleFetchTutorExplanation('exam')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              activeTutorStyle === 'exam'
                ? 'bg-sky-600 text-white shadow-md'
                : 'bg-slate-900 text-slate-300 border border-slate-800 hover:border-sky-500/50'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5 text-sky-400" /> Explain Like Exam
          </button>

          <button
            onClick={() => handleFetchTutorExplanation('technical')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              activeTutorStyle === 'technical'
                ? 'bg-purple-600 text-white shadow-md'
                : 'bg-slate-900 text-slate-300 border border-slate-800 hover:border-purple-500/50'
            }`}
          >
            <Cpu className="w-3.5 h-3.5 text-purple-400" /> Explain Technically
          </button>

          <button
            onClick={() => handleFetchTutorExplanation('analogy')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              activeTutorStyle === 'analogy'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'bg-slate-900 text-slate-300 border border-slate-800 hover:border-emerald-500/50'
            }`}
          >
            <Zap className="w-3.5 h-3.5 text-emerald-400" /> Real World Analogy
          </button>

          <button
            onClick={() => handleFetchTutorExplanation('memory')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              activeTutorStyle === 'memory'
                ? 'bg-amber-600 text-white shadow-md'
                : 'bg-slate-900 text-slate-300 border border-slate-800 hover:border-amber-500/50'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-300" /> Memory Trick
          </button>

          <button
            onClick={() => handleFetchTutorExplanation('mistakes')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              activeTutorStyle === 'mistakes'
                ? 'bg-rose-600 text-white shadow-md'
                : 'bg-slate-900 text-slate-300 border border-slate-800 hover:border-rose-500/50'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5 text-rose-400" /> Common Mistakes
          </button>

          <button
            onClick={() => handleFetchTutorExplanation('tip')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              activeTutorStyle === 'tip'
                ? 'bg-teal-600 text-white shadow-md'
                : 'bg-slate-900 text-slate-300 border border-slate-800 hover:border-teal-500/50'
            }`}
          >
            <HelpCircle className="w-3.5 h-3.5 text-teal-400" /> Exam Tip
          </button>
        </div>

        {/* AI Tutor Response Content Box */}
        {isAiLoading && (
          <div className="p-3.5 bg-slate-900 rounded-xl border border-indigo-500/30 flex items-center gap-2 text-xs text-indigo-300 animate-pulse font-mono">
            <Sparkles className="w-4 h-4 animate-spin text-indigo-400" />
            Synthesizing educational explanation...
          </div>
        )}

        {aiExplanation && !isAiLoading && (
          <div className="p-4 bg-slate-900 rounded-xl border border-indigo-500/30 space-y-1.5">
            <div className="text-xs font-bold text-indigo-300 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              Tutor Explanation ({activeTutorStyle?.toUpperCase()} MODE)
            </div>
            <div className="text-xs sm:text-sm text-slate-200 leading-relaxed font-sans whitespace-pre-wrap space-y-2 pt-1">
              {aiExplanation}
            </div>
          </div>
        )}
      </div>

      {/* ── API KEY CONFIGURATION MODAL ────────────────────────────────────── */}
      {showKeyModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-5 max-w-md w-full space-y-4 shadow-2xl text-slate-100 font-sans">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 font-bold text-indigo-300 text-sm">
                <Key className="w-4 h-4 text-amber-400" />
                <span>Upload / Add API Keys</span>
              </div>
              <button
                onClick={() => setShowKeyModal(false)}
                className="text-slate-400 hover:text-white text-xs font-mono cursor-pointer"
              >
                ✕ Close
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Keys are saved locally in your browser storage and used directly to make AI tutor API requests.
            </p>

            <div className="space-y-3 text-xs font-mono">
              <div>
                <label className="block text-indigo-300 font-bold mb-1">Google Gemini API Key:</label>
                <input
                  type="password"
                  value={apiKeys.gemini || ''}
                  onChange={(e) => setApiKeys({ ...apiKeys, gemini: e.target.value })}
                  placeholder="AIzaSy..."
                  className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-emerald-300 font-bold mb-1">Groq API Key:</label>
                <input
                  type="password"
                  value={apiKeys.groq || ''}
                  onChange={(e) => setApiKeys({ ...apiKeys, groq: e.target.value })}
                  placeholder="gsk_..."
                  className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sky-300 font-bold mb-1">OpenAI API Key:</label>
                <input
                  type="password"
                  value={apiKeys.openai || ''}
                  onChange={(e) => setApiKeys({ ...apiKeys, openai: e.target.value })}
                  placeholder="sk-proj-..."
                  className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-amber-300 font-bold mb-1">Anthropic Claude API Key:</label>
                <input
                  type="password"
                  value={apiKeys.claude || ''}
                  onChange={(e) => setApiKeys({ ...apiKeys, claude: e.target.value })}
                  placeholder="sk-ant-..."
                  className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-purple-300 font-bold mb-1">OpenRouter API Key:</label>
                <input
                  type="password"
                  value={apiKeys.openrouter || ''}
                  onChange={(e) => setApiKeys({ ...apiKeys, openrouter: e.target.value })}
                  placeholder="sk-or-..."
                  className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                onClick={() => setShowKeyModal(false)}
                className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  saveAPIKeys(apiKeys);
                  setShowKeyModal(false);
                  if (activeTutorStyle) {
                    handleFetchTutorExplanation(activeTutorStyle);
                  }
                }}
                className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition cursor-pointer shadow-lg"
              >
                Save API Keys
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Offline Fallback Styled Explanations (100% deterministic & highly informative)
function getOfflineStyledExplanation(
  style: TutorStyle,
  opType: SetOpType,
  nameA: string,
  nameB: string,
  testStr: string,
  accA: boolean,
  accB: boolean,
  accRes: boolean
): string {
  return generateOfflineAITutorExplanation({
    currentTopic: `DFA Set Operation: ${opType}`,
    currentOperation: opType,
    languageDescriptionA: nameA,
    languageDescriptionB: nameB,
    simulationResult: { accA, accB, accRes },
    currentString: testStr,
    generatorUsed: 'Automata Engine',
    nameA,
    nameB,
    tutorStyle: style,
  });
}
