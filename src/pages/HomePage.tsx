import React, { useState } from 'react';
import {
  Sparkles,
  ArrowRight,
  Play,
  Cpu,
  Layers,
  Minimize2,
  Table,
  Info,
} from 'lucide-react';
import { useAutomata } from '../context/AutomataContext';
import type { PageId } from '../context/AutomataContext';
import { ToolDetailModal } from '../components/home/ToolDetailModal';

export const HomePage: React.FC = () => {
  const { setActivePage, loadSample } = useAutomata();
  const [selectedToolId, setSelectedToolId] = useState<PageId | null>(null);

  const featureCards: {
    id: PageId;
    title: string;
    description: string;
    icon: any;
    color: string;
    gradient: string;
  }[] = [
      {
        id: 'dfa',
        title: 'DFA Simulator',
        description: 'Build and simulate Deterministic Finite Automata (M = (Q, Σ, δ, q₀, F)) with real-time validation, state inspector, and trap state completion.',
        icon: Cpu,
        color: 'text-indigo-400',
        gradient: 'from-indigo-950/60 to-slate-900 border-indigo-500/30',
      },
      {
        id: 'nfa',
        title: 'NFA & ε-NFA Simulator',
        description: 'Visualize non-deterministic multi-path branching, active state sets {q0, q2}, and automatic ε-closure explorations in real-time.',
        icon: Play,
        color: 'text-sky-400',
        gradient: 'from-sky-950/60 to-slate-900 border-sky-500/30',
      },
      {
        id: 'mealy',
        title: 'Mealy Machine Laboratory',
        description: 'Deterministic edge-output transducer (λ: Q × Σ → Δ) with live transition matrix and animated Mealy → Moore state expansion stepper.',
        icon: Layers,
        color: 'text-purple-400',
        gradient: 'from-purple-950/60 to-slate-900 border-purple-500/30',
      },
      {
        id: 'moore',
        title: 'Moore Machine Laboratory',
        description: 'State-output transducer (λ: Q → Δ) with progressive dynamic graph building, state minimization, and Moore → Mealy conversion stepper.',
        icon: Cpu,
        color: 'text-emerald-400',
        gradient: 'from-emerald-950/60 to-slate-900 border-emerald-500/30',
      },
      {
        id: 'nfa-to-dfa',
        title: 'NFA → DFA Converter',
        description: 'Interactive step-by-step subset construction table showing discovered power set states (2^Q) and target DFA generation.',
        icon: Table,
        color: 'text-amber-400',
        gradient: 'from-amber-950/60 to-slate-900 border-amber-500/30',
      },
      {
        id: 'minimizer',
        title: 'DFA Minimizer',
        description: 'Hopcroft partition refinement algorithm displaying intermediate partition groups (P₀, P₁, ...) and reduced canonical minimal DFAs.',
        icon: Minimize2,
        color: 'text-rose-400',
        gradient: 'from-rose-950/60 to-slate-900 border-rose-500/30',
      },
    ];

  return (
    <div className="w-full h-full bg-slate-950 text-slate-100 overflow-y-auto">
      {/* Hero Section */}
      <section className="relative px-6 pt-10 pb-8 text-center max-w-5xl mx-auto space-y-8">
        {/* Big Brand Logo Image with Dynamic Lights */}
        <div className="flex justify-center pt-2">
          <div className="relative group cursor-pointer" onClick={() => setActivePage('dfa')}>
            {/* Dynamic Light Layer 1: Rotating Pulsing Color Gradient Halo */}
            <div className="absolute -inset-8 bg-gradient-to-r from-indigo-500 via-purple-600 to-cyan-400 rounded-full animate-spin-slow animate-pulse-glow opacity-75 group-hover:opacity-100 transition duration-700"></div>

            {/* Dynamic Light Layer 2: Secondary Outer Neon Glow */}
            <div className="absolute -inset-4 bg-gradient-to-tr from-cyan-500 via-indigo-600 to-purple-500 rounded-full blur-2xl opacity-60 group-hover:opacity-90 transition duration-500"></div>

            {/* Dynamic Light Layer 3: Orbiting Light Beams */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-16 h-16 bg-cyan-400/80 rounded-full blur-xl animate-orbit-1"></div>
              <div className="w-20 h-20 bg-purple-500/80 rounded-full blur-xl animate-orbit-2"></div>
            </div>

            {/* Logo Image */}
            <img
              src="/logo.png"
              alt="Automata Studio Logo"
              className="relative w-full max-w-xs md:max-w-sm lg:max-w-md h-auto object-contain mx-auto drop-shadow-[0_20px_60px_rgba(99,102,241,0.5)] transition duration-500 group-hover:scale-[1.04]"
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
          <button
            onClick={() => setActivePage('dfa')}
            className="flex items-center gap-2.5 px-8 py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-base rounded-2xl shadow-2xl shadow-indigo-600/50 transition active:scale-95 cursor-pointer"
          >
            Start Building
            <ArrowRight className="w-5 h-5" />
          </button>

          <button
            onClick={() => {
              loadSample('sample_ends_101');
              setActivePage('dfa');
            }}
            className="flex items-center gap-2 px-6 py-3.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-200 font-bold rounded-2xl shadow-xl transition cursor-pointer"
          >
            <Sparkles className="w-5 h-5 text-purple-400" />
            Explore Examples
          </button>
        </div>
      </section>

      {/* Feature Cards Grid */}
      <section className="px-6 py-12 max-w-6xl mx-auto space-y-8">
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold text-white">Comprehensive Toolsuite</h2>
          <p className="text-sm text-slate-400">Click any tool to explore its detailed theoretical concepts, formal mathematical definitions, and algorithm execution steps.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {featureCards.map((card) => {
            const Icon = card.icon;
            return (
              <div
                key={card.id}
                onClick={() => setSelectedToolId(card.id)}
                className={`p-6 bg-gradient-to-b ${card.gradient} border rounded-3xl shadow-xl hover:scale-[1.02] transition cursor-pointer group flex flex-col justify-between`}
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className={`p-3 bg-slate-950/80 rounded-2xl ${card.color} border border-slate-800 group-hover:scale-110 transition`}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <span className="flex items-center gap-1 text-[11px] font-bold text-indigo-300 opacity-0 group-hover:opacity-100 transition bg-indigo-950/80 px-2.5 py-1 rounded-full border border-indigo-500/40">
                      <Info className="w-3.5 h-3.5" /> Concept Guide
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-white mb-2 group-hover:text-indigo-300 transition">{card.title}</h3>
                  <p className="text-xs text-slate-400 leading-relaxed">{card.description}</p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-800/60 flex items-center justify-between text-xs text-indigo-400 font-bold group-hover:translate-x-1 transition">
                  <span>View Details & Theory</span>
                  <ArrowRight className="w-4 h-4" />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Tool Detail & Concept Modal */}
      <ToolDetailModal
        toolId={selectedToolId}
        onClose={() => setSelectedToolId(null)}
        onOpenTool={(id) => setActivePage(id)}
      />
    </div>
  );
};
