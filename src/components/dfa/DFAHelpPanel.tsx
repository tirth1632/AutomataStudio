import React, { useState } from 'react';
import { HelpCircle, ChevronDown, ChevronUp, BookOpen, Layers, Scissors, GitBranch } from 'lucide-react';

export const DFAHelpPanel: React.FC = () => {
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    whatIsDFA: true,
    transitions: true,
    trapState: false,
    minimization: false,
    dfaVsNfa: false,
  });

  const toggleSection = (key: string) => {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="p-4 sm:p-5 space-y-4 bg-slate-900/95 text-slate-100 rounded-2xl border border-slate-800 text-sm shadow-xl">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2.5 font-bold text-base text-indigo-300">
          <HelpCircle className="w-5 h-5 text-indigo-400 shrink-0" />
          Theory of Computation — DFA Educational Guide
        </div>
        <span className="text-xs font-mono font-bold text-indigo-300 bg-indigo-950/80 px-2.5 py-1 rounded-lg border border-indigo-500/30">
          Coursework Handbook
        </span>
      </div>

      <div className="space-y-3">
        {/* 1. What is a DFA? */}
        <div className="bg-slate-950/90 rounded-xl border border-slate-800 overflow-hidden">
          <button
            onClick={() => toggleSection('whatIsDFA')}
            className="w-full p-3.5 flex items-center justify-between font-bold text-sm text-indigo-300 hover:bg-slate-900/80 transition"
          >
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-indigo-400" />
              1. What is a Deterministic Finite Automaton (DFA)?
            </div>
            {openSections.whatIsDFA ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          {openSections.whatIsDFA && (
            <div className="p-4 pt-0 text-slate-300 text-xs sm:text-sm leading-relaxed border-t border-slate-800/80 space-y-2">
              <p>
                A <strong>Deterministic Finite Automaton (DFA)</strong> is a mathematical model of computation consisting of a finite set of states, an input alphabet, a transition function, an initial start state, and a set of accepting states.
              </p>
              <div className="p-2.5 bg-indigo-950/40 border border-indigo-500/20 rounded-lg font-mono text-xs text-indigo-200">
                Formal 5-Tuple: M = (Q, Σ, δ, q₀, F)
              </div>
              <ul className="list-disc list-inside space-y-1 text-slate-400">
                <li><strong>Q</strong>: Finite set of states &#123;q₀, q₁, ..., qₙ&#125;.</li>
                <li><strong>Σ</strong>: Finite set of input symbols (e.g. &#123;0, 1&#125;).</li>
                <li><strong>δ</strong>: Transition mapping function δ: Q × Σ → Q.</li>
                <li><strong>q₀</strong>: Unique initial state (q₀ ∈ Q).</li>
                <li><strong>F</strong>: Set of accepting final states (F ⊆ Q).</li>
              </ul>
            </div>
          )}
        </div>

        {/* 2. How Deterministic Transitions Work */}
        <div className="bg-slate-950/90 rounded-xl border border-slate-800 overflow-hidden">
          <button
            onClick={() => toggleSection('transitions')}
            className="w-full p-3.5 flex items-center justify-between font-bold text-sm text-sky-300 hover:bg-slate-900/80 transition"
          >
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-sky-400" />
              2. How Deterministic Transitions Operate
            </div>
            {openSections.transitions ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          {openSections.transitions && (
            <div className="p-4 pt-0 text-slate-300 text-xs sm:text-sm leading-relaxed border-t border-slate-800/80 space-y-2">
              <p>
                In a DFA, computation is <strong>100% deterministic</strong>. For every active state q ∈ Q and for every input symbol σ ∈ Σ, there exists <strong>EXACTLY ONE</strong> outgoing transition destination q' ∈ Q.
              </p>
              <ul className="list-disc list-inside space-y-1 text-slate-400">
                <li>No spontaneous ε-transitions (empty string jumps) are permitted.</li>
                <li>No state can have multiple outgoing arrows for the same symbol.</li>
                <li>Computation proceeds character by character from left to right with no guessing or backtracking.</li>
              </ul>
            </div>
          )}
        </div>

        {/* 3. What is a Trap State? */}
        <div className="bg-slate-950/90 rounded-xl border border-slate-800 overflow-hidden">
          <button
            onClick={() => toggleSection('trapState')}
            className="w-full p-3.5 flex items-center justify-between font-bold text-sm text-amber-300 hover:bg-slate-900/80 transition"
          >
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-amber-400" />
              3. What is a Trap (Sink) State?
            </div>
            {openSections.trapState ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          {openSections.trapState && (
            <div className="p-4 pt-0 text-slate-300 text-xs sm:text-sm leading-relaxed border-t border-slate-800/80 space-y-2">
              <p>
                A <strong>Trap State (Sink State)</strong> is a non-accepting state q_trap ∉ F whose transitions for all alphabet symbols loop back to itself:
              </p>
              <div className="p-2.5 bg-amber-950/40 border border-amber-500/20 rounded-lg font-mono text-xs text-amber-200">
                ∀ σ ∈ Σ, δ(q_trap, σ) = q_trap
              </div>
              <p className="text-slate-400">
                Once computation enters a trap state, it can never reach an accepting state again, guaranteeing that any string passing through it will be rejected. Trap states are necessary to make a DFA complete.
              </p>
            </div>
          )}
        </div>

        {/* 4. Why Minimization Works */}
        <div className="bg-slate-950/90 rounded-xl border border-slate-800 overflow-hidden">
          <button
            onClick={() => toggleSection('minimization')}
            className="w-full p-3.5 flex items-center justify-between font-bold text-sm text-purple-300 hover:bg-slate-900/80 transition"
          >
            <div className="flex items-center gap-2">
              <Scissors className="w-4 h-4 text-purple-400" />
              4. Why Hopcroft Minimization Works (Myhill-Nerode Theorem)
            </div>
            {openSections.minimization ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          {openSections.minimization && (
            <div className="p-4 pt-0 text-slate-300 text-xs sm:text-sm leading-relaxed border-t border-slate-800/80 space-y-2">
              <p>
                By the <strong>Myhill-Nerode Theorem</strong>, every regular language L has a <strong>unique minimal DFA</strong> (up to state renaming). Two states p, q are indistinguishable (p ≡ q) if for all strings z ∈ Σ*, δ(p, z) ∈ F ⟺ δ(q, z) ∈ F.
              </p>
              <p className="text-slate-400">
                Hopcroft's Algorithm begins with partition P₀ = &#123;F, Q \ F&#125; and iteratively refines groups based on transition behavior until no further splitting is possible. All indistinguishable states are then merged into single equivalence classes.
              </p>
            </div>
          )}
        </div>

        {/* 5. Difference between DFA and NFA */}
        <div className="bg-slate-950/90 rounded-xl border border-slate-800 overflow-hidden">
          <button
            onClick={() => toggleSection('dfaVsNfa')}
            className="w-full p-3.5 flex items-center justify-between font-bold text-sm text-emerald-300 hover:bg-slate-900/80 transition"
          >
            <div className="flex items-center gap-2">
              <GitBranch className="w-4 h-4 text-emerald-400" />
              5. Difference Between DFA and NFA
            </div>
            {openSections.dfaVsNfa ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          {openSections.dfaVsNfa && (
            <div className="p-4 pt-0 text-slate-300 text-xs sm:text-sm leading-relaxed border-t border-slate-800/80 space-y-2">
              <div className="overflow-x-auto">
                <table className="w-full text-xs font-sans border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 text-left">
                      <th className="py-2 px-3">Property</th>
                      <th className="py-2 px-3 text-indigo-300">DFA (Deterministic)</th>
                      <th className="py-2 px-3 text-sky-300">NFA (Nondeterministic)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    <tr>
                      <td className="py-2 px-3 font-bold">Transitions per Symbol</td>
                      <td className="py-2 px-3">Exactly 1 transition</td>
                      <td className="py-2 px-3">0, 1, or multiple transitions</td>
                    </tr>
                    <tr>
                      <td className="py-2 px-3 font-bold">ε-Transitions</td>
                      <td className="py-2 px-3">Not allowed</td>
                      <td className="py-2 px-3">Allowed ($\varepsilon$-jumps)</td>
                    </tr>
                    <tr>
                      <td className="py-2 px-3 font-bold">Active States</td>
                      <td className="py-2 px-3">Exactly 1 active state</td>
                      <td className="py-2 px-3">Multiple active state sets ($S \subseteq Q$)</td>
                    </tr>
                    <tr>
                      <td className="py-2 px-3 font-bold">Language Power</td>
                      <td className="py-2 px-3 font-bold text-emerald-300">Identical (Recognizes Regular Languages)</td>
                      <td className="py-2 px-3 font-bold text-emerald-300">Identical (Convertible via Subset Construction)</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
