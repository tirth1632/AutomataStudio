import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Play,
  Pause,
  RotateCcw,
  FastForward,
  SkipBack,
  SkipForward,
  Sparkles,
  FileCode,
  Table as TableIcon,
  Cpu,
  BookOpen,
  CheckCircle2,
  Film,
} from 'lucide-react';
import type { AlgorithmTrace } from '../../types/algorithmVisualizer';
import type { AutomatonGraph } from '../../types/automata';
import { applyDagreLayout } from '../../services/layoutEngine';
import { downloadFile } from '../../utils/exportUtils';
import { AIVideoGeneratorModal } from '../video/AIVideoGeneratorModal';

interface AlgorithmVisualizerModalProps {
  trace: AlgorithmTrace;
  onClose: () => void;
  onApplyResultGraph: (resultGraph: AutomatonGraph) => void;
}

/**
 * Helper to render formatted LaTeX and Markdown theory cleanly in React UI
 */
function formatMathMarkdown(text: string): React.ReactNode {
  if (!text) return null;

  const lines = text.split('\n');
  return (
    <div className="space-y-2 font-sans text-xs">
      {lines.map((line, idx) => {
        const clean = line
          .replace(/###\s*/g, '')
          .replace(/\$([^$]+)\$/g, '$1')
          .replace(/\\Sigma\^\*/g, 'Σ*')
          .replace(/\\Sigma/g, 'Σ')
          .replace(/\\delta/g, 'δ')
          .replace(/\\emptyset/g, '∅')
          .replace(/\\setminus/g, ' \\ ')
          .replace(/\\cup/g, ' ∪ ')
          .replace(/\\cap/g, ' ∩ ')
          .replace(/\\oplus/g, ' ⊕ ')
          .replace(/\\subseteq/g, ' ⊆ ')
          .replace(/\\overline\{([^}]+)\}/g, '$1̄')
          .replace(/\\iff/g, ' ⟺ ')
          .replace(/\\notin/g, ' ∉ ')
          .replace(/\\in/g, ' ∈ ')
          .replace(/\\cdot/g, ' · ')
          .replace(/q_0/g, 'q₀')
          .replace(/q_1/g, 'q₁')
          .replace(/q_2/g, 'q₂')
          .replace(/M_1/g, 'M₁')
          .replace(/M_2/g, 'M₂')
          .replace(/M_3/g, 'M₃')
          .replace(/F_1/g, 'F₁')
          .replace(/F_2/g, 'F₂')
          .replace(/Q_1/g, 'Q₁')
          .replace(/Q_2/g, 'Q₂');

        if (line.startsWith('###')) {
          return (
            <div key={idx} className="font-bold text-sm text-indigo-300 border-b border-slate-800 pb-1.5 mt-2 mb-1 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-400" />
              {clean}
            </div>
          );
        }

        if (line.trim().startsWith('1.') || line.trim().startsWith('2.') || line.trim().startsWith('3.') || line.trim().startsWith('4.') || line.trim().startsWith('5.')) {
          return (
            <div key={idx} className="pl-3 border-l-2 border-indigo-500/50 my-1 text-slate-200 font-mono text-[11px] bg-indigo-950/20 py-1 rounded-r-lg">
              {clean}
            </div>
          );
        }

        if (!clean.trim()) return <div key={idx} className="h-1" />;

        return (
          <p key={idx} className="text-slate-300 leading-relaxed font-sans text-xs">
            {clean}
          </p>
        );
      })}
    </div>
  );
}

export const AlgorithmVisualizerModal: React.FC<AlgorithmVisualizerModalProps> = ({
  trace,
  onClose,
  onApplyResultGraph,
}) => {
  const [stepIdx, setStepIdx] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [speed, setSpeed] = useState<number>(1);
  const [bottomTab, setBottomTab] = useState<'theory' | 'steps' | 'complexity' | 'proof'>('theory');
  const [showAIVideoModal, setShowAIVideoModal] = useState<boolean>(false);

  const currentStep = trace.steps[stepIdx] || trace.steps[0];
  const progressPercent = Math.round(((stepIdx + 1) / trace.steps.length) * 100);

  // Auto-play timer
  useEffect(() => {
    let timer: any;
    if (isPlaying) {
      const intervalMs = Math.round(1200 / speed);
      timer = setInterval(() => {
        setStepIdx((prev) => {
          if (prev >= trace.steps.length - 1) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, intervalMs);
    }
    return () => clearInterval(timer);
  }, [isPlaying, speed, trace.steps.length]);

  // Apply Dagre layout to step graph
  const stepGraph = useMemo(() => {
    try {
      return applyDagreLayout(currentStep.generatedGraph);
    } catch {
      return currentStep.generatedGraph;
    }
  }, [currentStep.generatedGraph]);

  // Dynamic SVG viewBox calculation
  const viewBox = useMemo(() => {
    if (!stepGraph.states || stepGraph.states.length === 0) return '0 0 500 300';
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    stepGraph.states.forEach((s) => {
      if (s.x < minX) minX = s.x;
      if (s.y < minY) minY = s.y;
      if (s.x > maxX) maxX = s.x;
      if (s.y > maxY) maxY = s.y;
    });

    const padding = 90;
    const w = Math.max(maxX - minX + padding * 2, 480);
    const h = Math.max(maxY - minY + padding * 2, 300);
    const x0 = minX - padding;
    const y0 = minY - padding;

    return `${x0} ${y0} ${w} ${h}`;
  }, [stepGraph]);

  // Export Step Log JSON
  const handleExportJSON = () => {
    const jsonStr = JSON.stringify(trace, null, 2);
    downloadFile(jsonStr, `${trace.algorithmName.toLowerCase().replace(/\s+/g, '_')}_trace.json`, 'application/json');
  };

  // Export CSV Report
  const handleExportCSV = () => {
    let csv = 'Step Number,Title,Description,Explanation,Formula\n';
    trace.steps.forEach((s) => {
      csv += `"${s.stepNumber}","${s.title.replace(/"/g, '""')}","${s.description.replace(/"/g, '""')}","${s.explanation.replace(/"/g, '""')}","${(s.formula || '').replace(/"/g, '""')}"\n`;
    });
    downloadFile(csv, `${trace.algorithmName.toLowerCase().replace(/\s+/g, '_')}_steps.csv`, 'text/csv');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md animate-fade-in font-sans">
      <div className="bg-slate-900 border border-slate-700/80 text-slate-100 rounded-3xl max-w-6xl w-full h-[92vh] flex flex-col shadow-2xl overflow-hidden relative">
        {/* ── TOP HEADER ──────────────────────────────────────────────────── */}
        <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-600/20 border border-indigo-500/40 rounded-2xl text-indigo-400">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-sm text-white">{trace.algorithmName}</h2>
                <span className="text-[10px] font-mono font-bold bg-indigo-950 text-indigo-300 px-2.5 py-0.5 rounded-md border border-indigo-500/40 shadow-sm">
                  Step {stepIdx + 1} of {trace.steps.length}
                </span>
              </div>
              <p className="text-xs text-slate-400 truncate max-w-xl">{trace.algorithmDescription}</p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowAIVideoModal(true)}
              className="px-3 py-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-md"
            >
              <Film className="w-3.5 h-3.5" /> AI Motion Video
            </button>
            <button
              onClick={handleExportJSON}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-sm"
            >
              <FileCode className="w-3.5 h-3.5 text-sky-400" /> JSON
            </button>
            <button
              onClick={handleExportCSV}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-sm"
            >
              <TableIcon className="w-3.5 h-3.5 text-emerald-400" /> CSV
            </button>
            <button
              onClick={() => {
                onApplyResultGraph(trace.resultGraph);
                onClose();
              }}
              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-md"
            >
              <Sparkles className="w-3.5 h-3.5" /> Load Result
            </button>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 p-2 rounded-xl transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ── MAIN WORKSPACE (Graph Canvas + Side Panel) ──────────────────── */}
        <div className="flex-1 min-h-0 flex flex-col md:flex-row overflow-hidden relative">
          {/* Left: Interactive SVG Graph Canvas */}
          <div className="flex-1 bg-slate-950 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:16px_16px] relative overflow-hidden flex flex-col justify-center items-center">
            <svg className="w-full h-full select-none" viewBox={viewBox}>
              <defs>
                <marker id="vis-arr" viewBox="0 0 10 10" refX="24" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                  <path d="M 0 0 L 10 5 L 0 10 z" fill="#818cf8" />
                </marker>
                <marker id="vis-arr-hl" viewBox="0 0 10 10" refX="24" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                  <path d="M 0 0 L 10 5 L 0 10 z" fill="#38bdf8" />
                </marker>
              </defs>

              {/* Transitions */}
              {stepGraph.transitions.map((t) => {
                const src = stepGraph.states.find((s) => s.id === t.source);
                const tgt = stepGraph.states.find((s) => s.id === t.target);
                if (!src || !tgt) return null;

                const isHighlighted = (currentStep.highlightTransitionIds || []).includes(t.id) || (currentStep.highlightTransitionIds || []).includes(`t_${t.source}_${t.target}`);
                const isSelf = t.source === t.target;

                if (isSelf) {
                  return (
                    <g key={t.id}>
                      <path
                        d={`M ${src.x} ${src.y - 20} C ${src.x - 40} ${src.y - 85}, ${src.x + 40} ${src.y - 85}, ${src.x + 20} ${src.y - 20}`}
                        fill="none"
                        stroke={isHighlighted ? '#38bdf8' : '#6366f1'}
                        strokeWidth={isHighlighted ? '3.5' : '2'}
                        markerEnd={isHighlighted ? 'url(#vis-arr-hl)' : 'url(#vis-arr)'}
                        className="transition-all duration-300"
                      />
                      <text x={src.x} y={src.y - 75} textAnchor="middle" fill={isHighlighted ? '#7dd3fc' : '#c7d2fe'} className="text-[11px] font-mono font-bold">
                        {t.symbols.join(',')}
                      </text>
                    </g>
                  );
                }

                const dx = tgt.x - src.x;
                const dy = tgt.y - src.y;
                const dist = Math.sqrt(dx * dx + dy * dy) || 1;
                const ux = dx / dist;
                const uy = dy / dist;
                const rx = uy;
                const ry = -ux;

                const startX = src.x + ux * 24;
                const startY = src.y + uy * 24;
                const endX = tgt.x - ux * 30;
                const endY = tgt.y - uy * 30;

                const cpx = (startX + endX) / 2 + rx * 18;
                const cpy = (startY + endY) / 2 + ry * 18;

                return (
                  <g key={t.id}>
                    <path
                      d={`M ${startX} ${startY} Q ${cpx} ${cpy} ${endX} ${endY}`}
                      fill="none"
                      stroke={isHighlighted ? '#38bdf8' : '#475569'}
                      strokeWidth={isHighlighted ? '3.5' : '2'}
                      markerEnd={isHighlighted ? 'url(#vis-arr-hl)' : 'url(#vis-arr)'}
                      className="transition-all duration-300"
                    />
                    <text x={cpx} y={cpy} textAnchor="middle" fill={isHighlighted ? '#38bdf8' : '#94a3b8'} className="text-[11px] font-mono font-bold">
                      {t.symbols.join(',')}
                    </text>
                  </g>
                );
              })}

              {/* States */}
              {stepGraph.states.map((s) => {
                const isHighlighted = (currentStep.highlightStateIds || []).includes(s.id);
                const labelText = s.label || s.id;
                const radius = Math.max(20, Math.min(48, labelText.length * 3.6 + 6));
                const startOffset = radius + 22;
                const startEnd = radius + 4;
                const fontSize = labelText.length > 10 ? '9px' : labelText.length > 5 ? '10px' : '11px';

                return (
                  <g key={s.id} transform={`translate(${s.x}, ${s.y})`} className="transition-all duration-300">
                    {s.isStart && <path d={`M -${startOffset} 0 L -${startEnd} 0`} stroke="#38bdf8" strokeWidth="2.5" markerEnd="url(#vis-arr)" />}
                    {s.isAccept && <circle r={radius + 4} fill="none" stroke="#10b981" strokeWidth="2.5" />}
                    <circle
                      r={radius}
                      fill={isHighlighted ? '#312e81' : s.isStart ? '#1e1b4b' : '#0f172a'}
                      stroke={isHighlighted ? '#818cf8' : s.isAccept ? '#10b981' : '#6366f1'}
                      strokeWidth={isHighlighted ? '3.5' : '2'}
                      className={isHighlighted ? 'filter drop-shadow-[0_0_8px_rgba(129,140,248,0.6)]' : ''}
                    />
                    <text textAnchor="middle" dy="3.5" fill="#f8fafc" style={{ fontSize }} className="font-mono font-bold select-none">
                      {labelText}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>

          {/* Right: Step Explanation Side Panel */}
          <div className="w-full md:w-80 bg-slate-900 border-l border-slate-800 p-4 flex flex-col gap-3 overflow-y-auto shrink-0 font-sans">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="font-bold text-xs text-indigo-300 uppercase tracking-wider">Current Step Theory</span>
              <span className="text-[10px] font-mono font-bold text-slate-400">Step {currentStep.stepNumber}</span>
            </div>

            <div>
              <h3 className="font-bold text-sm text-white">{currentStep.title}</h3>
              <p className="text-xs text-slate-300 mt-1">{currentStep.description}</p>
            </div>

            {/* Formula Block */}
            {currentStep.formula && (
              <div className="p-2.5 bg-slate-950 border border-slate-800 rounded-xl space-y-1">
                <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider block">Mathematical Formula</span>
                <code className="text-xs text-indigo-200 font-mono block">{currentStep.formula}</code>
              </div>
            )}

            {/* Plain English Explanation */}
            <div className="p-2.5 bg-slate-950 border border-slate-800 rounded-xl space-y-1">
              <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block">Plain English Rule</span>
              <p className="text-xs text-slate-300 leading-relaxed">{currentStep.explanation}</p>
            </div>

            {currentStep.acceptStateRule && (
              <div className="p-2.5 bg-amber-950/40 border border-amber-500/30 rounded-xl text-amber-200 text-xs font-medium">
                {currentStep.acceptStateRule}
              </div>
            )}
          </div>
        </div>

        {/* ── COMMON PLAYER CONTROLS BAR ──────────────────────────────────── */}
        <div className="p-3 bg-slate-950 border-t border-slate-800 flex items-center justify-between gap-3 shrink-0 flex-wrap font-sans">
          {/* Playback Controls */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => {
                setStepIdx(0);
                setIsPlaying(false);
              }}
              className="p-2 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-xl border border-slate-800 transition cursor-pointer"
              title="Restart"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <button
              onClick={() => {
                setStepIdx((prev) => Math.max(0, prev - 1));
                setIsPlaying(false);
              }}
              disabled={stepIdx === 0}
              className="p-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-slate-300 rounded-xl border border-slate-800 transition cursor-pointer"
              title="Previous Step"
            >
              <SkipBack className="w-4 h-4" />
            </button>
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="p-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl shadow-md transition cursor-pointer"
              title={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
            </button>
            <button
              onClick={() => {
                setStepIdx((prev) => Math.min(trace.steps.length - 1, prev + 1));
                setIsPlaying(false);
              }}
              disabled={stepIdx === trace.steps.length - 1}
              className="p-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-slate-300 rounded-xl border border-slate-800 transition cursor-pointer"
              title="Next Step"
            >
              <SkipForward className="w-4 h-4" />
            </button>
            <button
              onClick={() => {
                setStepIdx(trace.steps.length - 1);
                setIsPlaying(false);
              }}
              className="p-2 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-xl border border-slate-800 transition cursor-pointer"
              title="Finish"
            >
              <FastForward className="w-4 h-4" />
            </button>
          </div>

          {/* Progress Bar & Counter */}
          <div className="flex-1 min-w-[200px] flex items-center gap-3">
            <div className="flex-1 bg-slate-900 h-2.5 rounded-full overflow-hidden border border-slate-800 relative">
              <div className="bg-gradient-to-r from-indigo-500 to-sky-400 h-full transition-all duration-300 rounded-full" style={{ width: `${progressPercent}%` }} />
            </div>
            <span className="text-xs font-mono text-slate-300 font-bold shrink-0">{progressPercent}%</span>
          </div>

          {/* Speed Controls */}
          <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 p-1 rounded-xl">
            {[0.5, 1, 2, 4].map((s) => (
              <button
                key={s}
                onClick={() => setSpeed(s)}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold font-mono transition cursor-pointer ${
                  speed === s ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                }`}
              >
                {s}×
              </button>
            ))}
          </div>
        </div>

        {/* ── BOTTOM THEORY & PROOF TABS PANEL ────────────────────────────── */}
        <div className="bg-slate-950 border-t border-slate-800 p-4 flex flex-col gap-3 shrink-0 max-h-48 overflow-y-auto">
          {/* Tab Selection Buttons */}
          <div className="flex items-center gap-2 border-b border-slate-800 pb-2 text-xs font-bold font-sans">
            <button
              onClick={() => setBottomTab('theory')}
              className={`px-3 py-1.5 rounded-xl transition cursor-pointer flex items-center gap-1.5 ${
                bottomTab === 'theory' ? 'bg-indigo-600 text-white shadow-md' : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" /> Theory
            </button>
            <button
              onClick={() => setBottomTab('steps')}
              className={`px-3 py-1.5 rounded-xl transition cursor-pointer flex items-center gap-1.5 ${
                bottomTab === 'steps' ? 'bg-indigo-600 text-white shadow-md' : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" /> Construction Steps ({trace.steps.length})
            </button>
            <button
              onClick={() => setBottomTab('complexity')}
              className={`px-3 py-1.5 rounded-xl transition cursor-pointer flex items-center gap-1.5 ${
                bottomTab === 'complexity' ? 'bg-indigo-600 text-white shadow-md' : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              <Cpu className="w-3.5 h-3.5" /> Complexity
            </button>
            <button
              onClick={() => setBottomTab('proof')}
              className={`px-3 py-1.5 rounded-xl transition cursor-pointer flex items-center gap-1.5 ${
                bottomTab === 'proof' ? 'bg-indigo-600 text-white shadow-md' : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" /> Proof
            </button>
          </div>

          {/* Formatted Tab Content */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-3.5">
            {bottomTab === 'theory' && formatMathMarkdown(trace.theoryMarkdown)}

            {bottomTab === 'steps' && (
              <div className="space-y-1.5 font-sans">
                {trace.steps.map((s, idx) => (
                  <button
                    key={s.stepNumber}
                    onClick={() => {
                      setStepIdx(idx);
                      setIsPlaying(false);
                    }}
                    className={`w-full p-2.5 rounded-xl text-left transition flex items-center justify-between border cursor-pointer ${
                      stepIdx === idx
                        ? 'bg-indigo-950/80 border-indigo-500/60 text-indigo-200 shadow'
                        : 'bg-slate-950 border-slate-800/80 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-lg bg-indigo-600/30 text-indigo-300 flex items-center justify-center text-xs font-bold font-mono">
                        {s.stepNumber}
                      </span>
                      <span className="font-bold text-xs text-white">{s.title}</span>
                    </div>
                    <span className="text-[11px] text-slate-400 font-mono truncate max-w-xs">{s.description}</span>
                  </button>
                ))}
              </div>
            )}

            {bottomTab === 'complexity' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 font-sans">
                <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-1">
                  <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block">Time Complexity</span>
                  <div className="text-sm font-mono font-bold text-emerald-300">{trace.complexityInfo.time}</div>
                  <p className="text-[11px] text-slate-400">Total operations to construct states and transitions.</p>
                </div>
                <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-1">
                  <span className="text-[10px] font-bold text-sky-400 uppercase tracking-wider block">Space Complexity</span>
                  <div className="text-sm font-mono font-bold text-sky-300">{trace.complexityInfo.space}</div>
                  <p className="text-[11px] text-slate-400">Memory required for compound state storage.</p>
                </div>
              </div>
            )}

            {bottomTab === 'proof' && formatMathMarkdown(trace.proofMarkdown)}
          </div>
        </div>
      </div>

      {/* In-Built AI Video Generator Modal */}
      {showAIVideoModal && (
        <AIVideoGeneratorModal
          initialPrompt={`Smooth 2D motion graphics animation of ${trace.algorithmName} - Step ${currentStep.stepNumber}: ${currentStep.title}`}
          onClose={() => setShowAIVideoModal(false)}
        />
      )}
    </div>
  );
};
