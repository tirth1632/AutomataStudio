import React, { useState } from 'react';
import { Cpu, Play, Layers, Sparkles, BookOpen, CheckCircle2, ArrowRight, Table, Settings } from 'lucide-react';
import type { PageId } from '../../context/AutomataContext';
import { MealyMachineWorkspace } from '../workspaces/MealyMachineWorkspace';
import { MooreMachineWorkspace } from '../workspaces/MooreMachineWorkspace';

interface TheoryWorkspaceViewProps {
  pageId: PageId;
}

export const TheoryWorkspaceView: React.FC<TheoryWorkspaceViewProps> = ({ pageId }) => {
  if (pageId === 'mealy') {
    return <MealyMachineWorkspace />;
  }

  if (pageId === 'moore') {
    return <MooreMachineWorkspace />;
  }

  const [inputString, setInputString] = useState<string>('10110');
  const [activeStep, setActiveStep] = useState<number>(0);

  const getMetadata = () => {
    return {
      title: 'Moore Machine Laboratory',
      tag: 'Output on States',
      desc: 'A finite-state machine whose output values are determined solely by its current state (State-based outputs q_i/y).',
      states: ['q0/0', 'q1/0', 'q2/1'],
      sampleRule: 'State q2 outputs 1 (pattern detected), while q0 & q1 output 0.',
      tape: [
        { in: '1', out: '0', state: 'q1/0' },
        { in: '0', out: '1', state: 'q2/1' },
        { in: '1', out: '0', state: 'q1/0' },
        { in: '1', out: '0', state: 'q1/0' },
        { in: '0', out: '1', state: 'q2/1' },
      ],
    };
  };

  const meta = getMetadata();

  return (
    <div className="flex-1 min-h-0 bg-slate-950 text-slate-100 p-6 overflow-y-auto space-y-6 font-sans">
      {/* Header Banner */}
      <div className="p-6 bg-slate-900/90 border border-slate-800 rounded-3xl space-y-3 shadow-2xl relative overflow-hidden">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-indigo-600/20 border border-indigo-500/40 text-indigo-400 rounded-2xl">
              <Cpu className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white flex items-center gap-2">
                {meta.title}
                <span className="text-xs font-mono font-bold px-2 py-0.5 bg-indigo-950 border border-indigo-500/40 text-indigo-300 rounded-full">
                  {meta.tag}
                </span>
              </h1>
              <p className="text-xs text-slate-400 font-medium max-w-3xl mt-1 leading-relaxed">
                {meta.desc}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-mono">Sample Input:</span>
            <input
              type="text"
              value={inputString}
              onChange={(e) => setInputString(e.target.value)}
              className="px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono font-bold text-sky-300 focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>
      </div>

      {/* Simulator Strip */}
      <div className="p-6 bg-slate-900/90 border border-slate-800 rounded-3xl space-y-5 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3 flex-wrap gap-2">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-200">
            <Play className="w-4 h-4 text-indigo-400 fill-current" /> Interactive Step-by-Step Simulation Tape
          </div>
          <div className="flex items-center gap-2 text-xs font-mono">
            <button
              onClick={() => setActiveStep((s) => Math.max(0, s - 1))}
              className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg transition font-bold cursor-pointer"
            >
              Prev
            </button>
            <span className="text-sky-300 font-bold">
              Step {activeStep + 1} / {meta.tape.length}
            </span>
            <button
              onClick={() => setActiveStep((s) => Math.min(meta.tape.length - 1, s + 1))}
              className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition font-bold cursor-pointer"
            >
              Next Step
            </button>
          </div>
        </div>

        {/* Tape Representation */}
        <div className="flex items-center gap-2 overflow-x-auto p-3 bg-slate-950 rounded-2xl border border-slate-800 custom-scrollbar">
          {meta.tape.map((item, idx) => {
            const isCurrent = idx === activeStep;
            return (
              <div
                key={idx}
                className={`p-3 rounded-xl border text-center font-mono min-w-24 transition ${
                  isCurrent
                    ? 'bg-indigo-600 text-white border-indigo-400 scale-105 shadow-lg shadow-indigo-600/30'
                    : 'bg-slate-900 text-slate-300 border-slate-800'
                }`}
              >
                <div className="text-[10px] text-slate-400 font-sans font-bold uppercase">Symbol</div>
                <div className="text-lg font-bold my-0.5">{item.in}</div>
                <div className="text-[10px] border-t border-slate-800/80 pt-1 text-sky-300 font-bold">
                  {item.out}
                </div>
                <div className="text-[9px] text-slate-400 font-sans">{item.state}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Rules & Formal Description Card */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-5 bg-slate-900/90 border border-slate-800 rounded-3xl space-y-3 font-sans">
          <div className="flex items-center gap-2 font-bold text-sm text-slate-200">
            <Table className="w-4 h-4 text-purple-400" /> Formal States & Transitions
          </div>
          <div className="space-y-2 text-xs font-mono">
            {meta.states.map((st, i) => (
              <div key={i} className="p-2.5 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between">
                <span className="text-purple-300 font-bold">{st}</span>
                <span className="text-[11px] text-slate-400 font-sans">Active in Step {i + 1}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="p-5 bg-slate-900/90 border border-slate-800 rounded-3xl space-y-3 font-sans">
          <div className="flex items-center gap-2 font-bold text-sm text-slate-200">
            <BookOpen className="w-4 h-4 text-emerald-400" /> Machine Rule Specification
          </div>
          <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-2 text-xs text-slate-300 font-mono leading-relaxed">
            <div className="text-emerald-400 font-bold font-sans text-xs">Active Machine Rule:</div>
            <div>{meta.sampleRule}</div>
          </div>
        </div>
      </div>
    </div>
  );
};
