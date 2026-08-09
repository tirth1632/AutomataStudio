import React from 'react';
import {
  X,
  Sparkles,
  ArrowRight,
  BookOpen,
  Cpu,
  Play,
  Layers,
  Table,
  Minimize2,
  CheckCircle2,
  GraduationCap,
  Code2,
} from 'lucide-react';
import type { PageId } from '../../context/AutomataContext';

export interface ToolDetail {
  id: PageId;
  title: string;
  subtitle: string;
  description: string;
  formalTuple: string;
  formalDefinition: { label: string; value: string }[];
  algorithmSteps: string[];
  keyFeatures: string[];
  icon: any;
  color: string;
  badgeColor: string;
}

export const TOOL_DETAILS: Record<string, ToolDetail> = {
  dfa: {
    id: 'dfa',
    title: 'DFA Simulator',
    subtitle: 'Deterministic Finite Automata Construction & Execution',
    description:
      'A Deterministic Finite Automaton (DFA) is a theoretical model of computation where for every state and input symbol, there is EXACTLY ONE deterministic next-state transition. DFAs recognize regular languages and form the core foundation of compiler lexical analysis.',
    formalTuple: 'M = (Q, Σ, δ, q₀, F)',
    formalDefinition: [
      { label: 'Q', value: 'Finite non-empty set of state nodes' },
      { label: 'Σ', value: 'Finite input alphabet (e.g. {0, 1})' },
      { label: 'δ', value: 'Deterministic transition function: Q × Σ → Q' },
      { label: 'q₀', value: 'Unique initial start state (q₀ ∈ Q)' },
      { label: 'F', value: 'Set of accepting final states (F ⊆ Q)' },
    ],
    algorithmSteps: [
      'Initialize simulation at the start state q₀ with consumed input = ε.',
      'For each symbol c in input string w, follow the unique outgoing edge δ(q, c).',
      'If any state lacks a transition for c, route automatically to dead/trap state q_trap.',
      'After processing all symbols of w, accept if current state q ∈ F, otherwise reject.',
    ],
    keyFeatures: [
      'Real-time transition completeness & duplicate symbol validation',
      'Interactive step-by-step timeline execution (Step, Play, Speed Slider)',
      'Automatic trap state completion for missing transitions',
      'Export to JFLAP / JSON / high-resolution image formats',
    ],
    icon: Cpu,
    color: 'text-indigo-400',
    badgeColor: 'bg-indigo-950/80 border-indigo-500/40 text-indigo-300',
  },
  nfa: {
    id: 'nfa',
    title: 'NFA Simulator',
    subtitle: 'Non-Deterministic Finite Automata & Parallel Path Branching',
    description:
      'Non-Deterministic Finite Automata allow a state to have zero, one, or multiple outgoing transitions for a single input symbol. The machine explores all valid computational paths simultaneously in parallel.',
    formalTuple: 'M = (Q, Σ, δ, q₀, F)',
    formalDefinition: [
      { label: 'Q', value: 'Finite set of state nodes' },
      { label: 'Σ', value: 'Input alphabet' },
      { label: 'δ', value: 'Non-deterministic transition function: Q × Σ → P(Q)' },
      { label: 'q₀', value: 'Start state' },
      { label: 'F', value: 'Set of accepting final states' },
    ],
    algorithmSteps: [
      'Maintain an active set of states S (initially {q₀}).',
      'On symbol c, compute the next active state set S\' = ∪_{s ∈ S} δ(s, c).',
      'If S\' is empty, the current branch dies.',
      'Accept input string w if S_final ∩ F ≠ ∅ (at least one branch reaches F).',
    ],
    keyFeatures: [
      'Visual active state set highlighting (e.g. {q0, q2, q4})',
      'Multi-branch step execution with path breakdown',
      'Concise pattern specification without trap state overhead',
    ],
    icon: Play,
    color: 'text-sky-400',
    badgeColor: 'bg-sky-950/80 border-sky-500/40 text-sky-300',
  },
  enfa: {
    id: 'enfa',
    title: 'ε-NFA Simulator',
    subtitle: 'Epsilon Transitions & Automatic Closure Expansions',
    description:
      'ε-NFAs extend NFAs by allowing spontaneous state transitions without consuming any input character (ε-moves). Taking ε-moves expands the current state set instantly via ε-Closure.',
    formalTuple: 'M = (Q, Σ ∪ {ε}, δ, q₀, F)',
    formalDefinition: [
      { label: 'Q', value: 'Finite set of state nodes' },
      { label: 'Σ', value: 'Input alphabet' },
      { label: 'δ', value: 'Transition function: Q × (Σ ∪ {ε}) → P(Q)' },
      { label: 'ECLOSE(q)', value: 'Set of states reachable from q via zero or more ε-transitions' },
      { label: 'F', value: 'Set of accept states' },
    ],
    algorithmSteps: [
      'Initialize active state set S = ECLOSE({q₀}).',
      'For each input character c, compute direct transitions T = ∪_{s ∈ S} δ(s, c).',
      'Expand the new active state set S\' = ECLOSE(T).',
      'Accept if S_final ∩ F ≠ ∅.',
    ],
    keyFeatures: [
      'Automatic ε-Closure cluster visualizer',
      'Zero-cost spontaneous state jump highlighting',
      'Direct foundation for Thompson Construction NFAs',
    ],
    icon: Layers,
    color: 'text-purple-400',
    badgeColor: 'bg-purple-950/80 border-purple-500/40 text-purple-300',
  },
  'nfa-to-dfa': {
    id: 'nfa-to-dfa',
    title: 'NFA → DFA Converter',
    subtitle: 'Rabin-Scott Subset Construction Algorithm',
    description:
      'Converts any NFA or ε-NFA into an equivalent complete DFA using Subset Construction (Power Set Construction), proving that DFAs and NFAs possess identical language recognition power.',
    formalTuple: 'M_N → M_D (DFA)',
    formalDefinition: [
      { label: 'Q_D', value: 'Subsets of NFA states (P(Q_N))' },
      { label: 'q₀D', value: 'ECLOSE(q₀N)' },
      { label: 'δD(S, a)', value: 'ECLOSE( ∪_{s ∈ S} δ_N(s, a) )' },
      { label: 'F_D', value: '{ S ⊆ Q_N | S ∩ F_N ≠ ∅ }' },
    ],
    algorithmSteps: [
      'Compute initial DFA start state S₀ = ECLOSE({q₀N}).',
      'For each discovered subset S and alphabet symbol a, compute target subset T = ECLOSE(∪_{s ∈ S} δ_N(s, a)).',
      'Mark T as a new DFA state if not previously seen, and set δ_D(S, a) = T.',
      'Mark subset S as accepting if it contains any original NFA accept state.',
    ],
    keyFeatures: [
      'Interactive step-by-step subset construction table',
      'Auto-generates clean, fully layouted target DFAs',
      'Subset to composite state name mapping e.g. {q0, q1} → q0_q1',
    ],
    icon: Table,
    color: 'text-amber-400',
    badgeColor: 'bg-amber-950/80 border-amber-500/40 text-amber-300',
  },
  minimizer: {
    id: 'minimizer',
    title: 'DFA Minimizer',
    subtitle: 'Hopcroft’s Partition Refinement Algorithm',
    description:
      'Reduces any DFA to its unique, minimal canonical DFA with the smallest possible number of states, eliminating unreachable states and merging indistinguishable state equivalent classes.',
    formalTuple: 'M → M_min (Minimal DFA)',
    formalDefinition: [
      { label: 'Unreachable', value: 'Eliminate states not reachable from start state q₀' },
      { label: 'Equivalence p ~ q', value: '∀ w ∈ Σ*, δ(p, w) ∈ F ⇔ δ(q, w) ∈ F' },
      { label: 'Initial P₀', value: '{ F, Q \\ F } (Accepting vs Non-Accepting)' },
      { label: 'Refinement', value: 'Split partition groups if states transition into different target groups' },
    ],
    algorithmSteps: [
      'Remove all unreachable states using Breadth-First Search (BFS).',
      'Partition remaining states into P₀ = { F, Q \\ F }.',
      'Refine partitions against each alphabet symbol until no further splits occur.',
      'Merge all states in each partition group into a single canonical minimal state.',
    ],
    keyFeatures: [
      'Partition Group History (P₀, P₁, P₂, ...) breakdown table',
      'Guarantees the unique minimal canonical DFA for the language',
      'Visual side-by-side comparison of original vs reduced DFA',
    ],
    icon: Minimize2,
    color: 'text-rose-400',
    badgeColor: 'bg-rose-950/80 border-rose-500/40 text-rose-300',
  },
  mealy: {
    id: 'mealy',
    title: 'Mealy Machine Laboratory',
    subtitle: 'Edge-Output Transducer λ: Q × Σ → Δ',
    description:
      'A Mealy Machine is a finite-state machine whose output values are determined by BOTH its current state and its current input symbol (edge-based outputs). Outputs are emitted instantaneously on state transitions.',
    formalTuple: 'M = (Q, Σ, Δ, δ, λ, q₀)',
    formalDefinition: [
      { label: 'Q', value: 'Finite set of state nodes' },
      { label: 'Σ', value: 'Input alphabet (e.g. {0, 1})' },
      { label: 'Δ', value: 'Output alphabet (e.g. {0, 1})' },
      { label: 'δ', value: 'Deterministic transition function: Q × Σ → Q' },
      { label: 'λ', value: 'Edge output function: Q × Σ → Δ' },
      { label: 'q₀', value: 'Initial start state' },
    ],
    algorithmSteps: [
      'Start simulation at initial state q₀.',
      'On receiving input symbol x, transition to state δ(q, x) and instantaneously emit output λ(q, x).',
      'Accumulate edge output symbols on the output tape Δ*.',
      'Execute Mealy → Moore conversion to split states with multiple incoming outputs.',
    ],
    keyFeatures: [
      'Real-time edge output generation on transitions',
      'Deterministic state transition matrix δ(q, x)',
      'Step-by-step Mealy → Moore state expansion conversion stepper',
      'Preset library (Sequence Detectors, Parity Generators, Serial Adders)',
    ],
    icon: Cpu,
    color: 'text-purple-400',
    badgeColor: 'bg-purple-950/80 border-purple-500/40 text-purple-300',
  },
  moore: {
    id: 'moore',
    title: 'Moore Machine Laboratory',
    subtitle: 'State-Output Transducer λ: Q → Δ',
    description:
      'A Moore Machine is a finite-state machine whose output values are determined SOLELY by its current state (state-based outputs). Entering a state node automatically emits its assigned output symbol.',
    formalTuple: 'M = (Q, Σ, Δ, δ, λ, q₀)',
    formalDefinition: [
      { label: 'Q', value: 'Finite set of state nodes' },
      { label: 'Σ', value: 'Input alphabet' },
      { label: 'Δ', value: 'Output alphabet' },
      { label: 'δ', value: 'Transition function: Q × Σ → Q' },
      { label: 'λ', value: 'State output function: Q → Δ' },
      { label: 'q₀', value: 'Initial start state with initial output λ(q₀)' },
    ],
    algorithmSteps: [
      'Initialize simulation at state q₀ with initial state output λ(q₀).',
      'For each input symbol x, move to state q\' = δ(q, x).',
      'Emit state output λ(q\') upon entering state q\'.',
      'Convert Moore → Mealy and perform state minimization to merge equivalent states.',
    ],
    keyFeatures: [
      'State-based output mapping (q_i / y)',
      'Progressive dynamic state graph construction',
      'Step-by-step Moore → Mealy conversion stepper with state minimization',
      'Interactive ball dragging and node position preservation',
    ],
    icon: Cpu,
    color: 'text-emerald-400',
    badgeColor: 'bg-emerald-950/80 border-emerald-500/40 text-emerald-300',
  },
};

export const ToolDetailModal: React.FC<{
  toolId: PageId | null;
  onClose: () => void;
  onOpenTool: (id: PageId) => void;
}> = ({ toolId, onClose, onOpenTool }) => {
  if (!toolId || !TOOL_DETAILS[toolId]) return null;

  const tool = TOOL_DETAILS[toolId];
  const Icon = tool.icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-3xl max-h-[90vh] bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col text-slate-100">
        {/* Top Header */}
        <div className="p-6 border-b border-slate-800/80 bg-slate-950/50 flex items-start justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className={`p-3 bg-slate-900 border border-slate-800 rounded-2xl ${tool.color} shadow-lg`}>
              <Icon className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-extrabold text-white tracking-tight">{tool.title}</h2>
                <span className={`px-2.5 py-0.5 rounded-full border text-[10px] font-bold ${tool.badgeColor}`}>
                  Concept Guide
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5 font-medium">{tool.subtitle}</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white rounded-xl transition"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-sm">
          {/* Detailed Description */}
          <div className="bg-slate-950/60 border border-slate-800/60 rounded-2xl p-4 space-y-2">
            <div className="flex items-center gap-2 text-indigo-400 font-bold text-xs uppercase tracking-wider">
              <BookOpen className="w-4 h-4 text-indigo-400" />
              Detailed Description & Overview
            </div>
            <p className="text-slate-300 leading-relaxed text-xs md:text-sm">{tool.description}</p>
          </div>

          {/* Mathematical Definition */}
          <div className="bg-slate-950/60 border border-slate-800/60 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div className="flex items-center gap-2 text-purple-400 font-bold text-xs uppercase tracking-wider">
                <GraduationCap className="w-4 h-4 text-purple-400" />
                Formal Mathematical Definition
              </div>
              <span className="font-mono text-xs font-bold text-indigo-300 bg-indigo-950/80 px-2.5 py-1 rounded-lg border border-indigo-500/30">
                {tool.formalTuple}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {tool.formalDefinition.map((def, i) => (
                <div key={i} className="flex items-start gap-2 bg-slate-900/80 p-2.5 rounded-xl border border-slate-800/60 text-xs">
                  <span className="font-mono font-bold text-indigo-300 bg-slate-950 px-2 py-0.5 rounded border border-slate-800 shrink-0">
                    {def.label}
                  </span>
                  <span className="text-slate-300 leading-tight mt-0.5">{def.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Algorithm Breakdown */}
          <div className="bg-slate-950/60 border border-slate-800/60 rounded-2xl p-4 space-y-2.5">
            <div className="flex items-center gap-2 text-sky-400 font-bold text-xs uppercase tracking-wider">
              <Code2 className="w-4 h-4 text-sky-400" />
              Algorithmic Execution Steps
            </div>
            <ol className="space-y-2 text-xs text-slate-300 list-decimal list-inside leading-relaxed">
              {tool.algorithmSteps.map((step, idx) => (
                <li key={idx} className="bg-slate-900/60 p-2.5 rounded-xl border border-slate-800/40">
                  <span className="font-semibold text-slate-200">{step}</span>
                </li>
              ))}
            </ol>
          </div>

          {/* Key Capabilities */}
          <div className="bg-slate-950/60 border border-slate-800/60 rounded-2xl p-4 space-y-2.5">
            <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs uppercase tracking-wider">
              <Sparkles className="w-4 h-4 text-emerald-400" />
              Key Platform Features
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
              {tool.keyFeatures.map((feat, i) => (
                <div key={i} className="flex items-center gap-2 bg-slate-900/60 p-2.5 rounded-xl border border-slate-800/40 text-slate-300">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{feat}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer with Action Button */}
        <div className="p-4 border-t border-slate-800/80 bg-slate-950/60 flex items-center justify-between gap-4">
          <button
            onClick={onClose}
            className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs transition"
          >
            Close Guide
          </button>

          <button
            onClick={() => {
              onClose();
              onOpenTool(tool.id);
            }}
            className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold rounded-xl text-xs shadow-xl shadow-indigo-600/30 transition active:scale-95"
          >
            Open Interactive {tool.title}
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
