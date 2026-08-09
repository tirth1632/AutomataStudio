import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, RotateCcw, Sparkles } from 'lucide-react';
import type { NFA } from '../../algorithms/nfa/NFA';

interface NFAThompsonAnimationPanelProps {
  nfa: NFA;
  regexStr?: string;
}

export const NFAThompsonAnimationPanel: React.FC<NFAThompsonAnimationPanelProps> = ({
  nfa,
  regexStr = '(0|1)*101',
}) => {
  const [currentStep, setCurrentStep] = useState(0);

  const steps = [
    {
      title: '1. Regular Expression Input',
      desc: `Regex string parsed: "${regexStr}"`,
      detail: 'Parses tokens and operator precedence (Union |, Concatenation •, Kleene Star *).',
      badge: 'Regex Input',
    },
    {
      title: '2. Abstract Syntax Tree (AST) Generation',
      desc: 'Constructs syntax tree with binary operator nodes.',
      detail: 'Nodes: Concatenation( Union(0, 1)*, Exact("101") ).',
      badge: 'AST Parser',
    },
    {
      title: '3. Atomic Symbol Thompson Base Sub-Automata',
      desc: 'Generates 2-state base automata for atomic symbols 0, 1, ε.',
      detail: 'Base Rule: q0 ──a──> q1 for every literal character a in Σ.',
      badge: 'Base Automata',
    },
    {
      title: '4. Thompson Union (|) & Concatenation (•) Construction',
      desc: 'Applies Thompson Union (ε-branches to sub-automata) and Concatenation.',
      detail: 'Union adds new start/accept states with ε-transitions to both branches.',
      badge: 'Union & Concat',
    },
    {
      title: '5. Thompson Kleene Star (*) Loopback',
      desc: 'Adds ε-loopback transitions from accept states back to start state.',
      detail: 'Adds ε-bypass from new start to new accept state to accept empty string ε.',
      badge: 'Kleene Star',
    },
    {
      title: '6. Final ε-NFA Assembly',
      desc: 'Combines all sub-automata into the complete Thompson ε-NFA.',
      detail: `Final Assembly: ${nfa.states.length} states, ${nfa.acceptStates.length} accept state(s).`,
      badge: 'Final ε-NFA',
    },
  ];

  const totalSteps = steps.length;
  const stepData = steps[currentStep];

  return (
    <div className="p-4 bg-slate-900/95 border border-slate-800 rounded-2xl space-y-4 text-slate-100 text-xs font-sans shadow-xl max-h-[70vh] overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-amber-600/20 border border-amber-500/40 text-amber-400 rounded-xl">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-slate-100">Thompson Construction Stepper (Regex → ε-NFA)</h3>
            <p className="text-[11px] text-amber-400 font-medium font-mono">
              Regex: <span className="font-bold text-white">"{regexStr}"</span>
            </p>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2 font-mono">
          <button
            onClick={() => setCurrentStep(0)}
            className="p-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300 transition"
            title="Reset"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
          <button
            disabled={currentStep === 0}
            onClick={() => setCurrentStep((prev) => Math.max(0, prev - 1))}
            className="p-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 rounded-lg text-slate-300 transition"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-xs font-bold text-amber-300">
            Step {currentStep + 1} of {totalSteps}
          </span>
          <button
            disabled={currentStep >= totalSteps - 1}
            onClick={() => setCurrentStep((prev) => Math.min(totalSteps - 1, prev + 1))}
            className="p-1.5 bg-amber-600 hover:bg-amber-500 disabled:opacity-40 rounded-lg text-white font-bold transition"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Step Detail Card */}
      <div className="p-4 bg-slate-950/90 border border-slate-800 rounded-xl space-y-3 font-mono">
        <div className="flex justify-between items-center border-b border-slate-800 pb-2">
          <span className="font-bold text-sm text-amber-400">{stepData.title}</span>
          <span className="px-2 py-0.5 bg-amber-950 text-amber-300 rounded text-[10px] font-bold border border-amber-500/30">
            {stepData.badge}
          </span>
        </div>
        <p className="text-slate-200 text-xs font-semibold">{stepData.desc}</p>
        <p className="text-slate-400 text-xs">{stepData.detail}</p>
      </div>

      {/* Steps Pipeline Visualizer */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-2 font-mono">
        {steps.map((st, idx) => (
          <div
            key={idx}
            onClick={() => setCurrentStep(idx)}
            className={`p-2.5 rounded-lg border transition cursor-pointer text-center space-y-1 ${
              idx === currentStep
                ? 'bg-amber-950/90 border-amber-500 text-amber-200 shadow-md'
                : 'bg-slate-950/80 border-slate-800 text-slate-400 hover:border-slate-700'
            }`}
          >
            <div className="text-[10px] font-bold">Step {idx + 1}</div>
            <div className="text-[9px] truncate font-semibold">{st.badge}</div>
          </div>
        ))}
      </div>
    </div>
  );
};
