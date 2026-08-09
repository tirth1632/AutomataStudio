import React, { useState } from 'react';
import { Check, FileText, Code, Sigma } from 'lucide-react';
import type { DFAInspectorData } from '../../../utils/dfaInspectorEngine';
import { exportToLaTeX, copyToClipboard } from '../../../utils/exportUtils';

interface TabFormalDefinitionProps {
  data: DFAInspectorData;
}

export const TabFormalDefinition: React.FC<TabFormalDefinitionProps> = ({ data }) => {
  const { graph, alphabet } = data;
  const [copiedText, setCopiedText] = useState(false);
  const [copiedLatex, setCopiedLatex] = useState(false);
  const [copiedMath, setCopiedMath] = useState(false);

  const startState = graph.states.find((s) => s.isStart)?.id || 'q0';
  const acceptStates = graph.states.filter((s) => s.isAccept).map((s) => s.id);
  const statesList = graph.states.map((s) => s.id);

  // 1. Text Definition
  const textDefinition = `Formal DFA 5-Tuple Definition M = (Q, Σ, δ, q₀, F)
Name: ${graph.name || 'DFA'}
Q = { ${statesList.join(', ')} }
Σ = { ${alphabet.join(', ')} }
q₀ = ${startState}
F = { ${acceptStates.join(', ')} }

Transition Function δ: Q × Σ → Q:
${graph.states
  .map((s) => {
    return alphabet
      .map((sym) => {
        const edge = graph.transitions.find((t) => t.source === s.id && t.symbols.includes(sym));
        return `δ(${s.id}, ${sym}) = ${edge ? edge.target : '∅'}`;
      })
      .join('\n');
  })
  .join('\n')}`;

  // 2. Math Definition
  const mathDefinition = `M = (Q, Σ, δ, q₀, F)
Q = { ${statesList.join(', ')} }
Σ = { ${alphabet.join(', ')} }
q₀ = ${startState}
F = { ${acceptStates.join(', ')} }
δ(q, a) defined ∀ q ∈ Q, a ∈ Σ`;

  const handleCopyText = async () => {
    const success = await copyToClipboard(textDefinition);
    if (success) {
      setCopiedText(true);
      setTimeout(() => setCopiedText(false), 2000);
    }
  };

  const handleCopyLaTeX = async () => {
    const latex = exportToLaTeX(graph, graph.name);
    const success = await copyToClipboard(latex);
    if (success) {
      setCopiedLatex(true);
      setTimeout(() => setCopiedLatex(false), 2000);
    }
  };

  const handleCopyMath = async () => {
    const success = await copyToClipboard(mathDefinition);
    if (success) {
      setCopiedMath(true);
      setTimeout(() => setCopiedMath(false), 2000);
    }
  };

  return (
    <div className="space-y-3 font-sans text-xs">
      {/* Formal 5-Tuple Card */}
      <div className="p-3.5 bg-gradient-to-br from-indigo-950/80 via-slate-950 to-slate-900 border border-indigo-500/30 rounded-xl space-y-2 font-mono">
        <div className="flex items-center gap-1.5 font-sans font-bold text-indigo-300 text-sm">
          <Sigma className="w-4 h-4 text-indigo-400" /> M = (Q, Σ, δ, q₀, F)
        </div>

        <div className="text-slate-300 text-xs space-y-1.5 pt-1 font-mono">
          <div className="flex items-center gap-1.5">
            <span className="text-indigo-400 font-bold w-6">Q</span> = &#123; {statesList.join(', ')} &#125;
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-indigo-400 font-bold w-6">Σ</span> = &#123; {alphabet.join(', ')} &#125;
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-indigo-400 font-bold w-6">q₀</span> = {startState}
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-indigo-400 font-bold w-6">F</span> = &#123; {acceptStates.join(', ')} &#125;
          </div>
        </div>
      </div>

      {/* Copy Buttons */}
      <div className="grid grid-cols-3 gap-1.5">
        <button
          onClick={handleCopyText}
          className="py-2 px-1 bg-slate-950 hover:bg-slate-800 text-slate-200 border border-slate-800 rounded-lg text-[10px] font-bold transition flex items-center justify-center gap-1"
        >
          {copiedText ? <Check className="w-3 h-3 text-emerald-400" /> : <FileText className="w-3 h-3 text-indigo-400" />}
          <span>{copiedText ? 'Copied' : 'Copy Text'}</span>
        </button>

        <button
          onClick={handleCopyLaTeX}
          className="py-2 px-1 bg-slate-950 hover:bg-slate-800 text-slate-200 border border-slate-800 rounded-lg text-[10px] font-bold transition flex items-center justify-center gap-1"
        >
          {copiedLatex ? <Check className="w-3 h-3 text-emerald-400" /> : <Code className="w-3 h-3 text-cyan-400" />}
          <span>{copiedLatex ? 'Copied' : 'Copy LaTeX'}</span>
        </button>

        <button
          onClick={handleCopyMath}
          className="py-2 px-1 bg-slate-950 hover:bg-slate-800 text-slate-200 border border-slate-800 rounded-lg text-[10px] font-bold transition flex items-center justify-center gap-1"
        >
          {copiedMath ? <Check className="w-3 h-3 text-emerald-400" /> : <Sigma className="w-3 h-3 text-amber-400" />}
          <span>{copiedMath ? 'Copied' : 'Copy Math'}</span>
        </button>
      </div>

      {/* Mathematical Transition Function δ(q, a) Table */}
      <div className="p-3 bg-slate-950/90 border border-slate-800 rounded-xl space-y-2">
        <span className="font-sans font-bold text-slate-300 text-[11px] block">
          Transition Function δ: Q × Σ → Q
        </span>

        <div className="overflow-x-auto border border-slate-800/80 rounded-lg font-mono text-[11px]">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-900 text-indigo-400 border-b border-slate-800">
                <th className="p-2">δ(q, a)</th>
                {alphabet.map((sym) => (
                  <th key={sym} className="p-2 text-center">
                    a = '{sym}'
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {graph.states.map((s) => (
                <tr key={s.id} className="border-b border-slate-800/60 hover:bg-slate-900/50 text-slate-300">
                  <td className="p-2 font-bold text-indigo-300">
                    {s.isStart && '→ '}
                    {s.isAccept && '*'}
                    {s.id}
                  </td>
                  {alphabet.map((sym) => {
                    const edge = graph.transitions.find((t) => t.source === s.id && t.symbols.includes(sym));
                    return (
                      <td key={sym} className="p-2 text-center text-slate-200">
                        {edge ? edge.target : '∅'}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
