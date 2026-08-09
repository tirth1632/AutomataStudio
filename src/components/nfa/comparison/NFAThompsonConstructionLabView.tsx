import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import {
  FileCode,
  Sparkles,
  Layers,
  ArrowRight,
  Database,
  Code2,
  Cpu,
  BookOpen,
  CheckCircle2,
  Table,
  Sliders,
  Play,
  Pause,
  RotateCcw,
  SkipBack,
  SkipForward,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Download,
  FileJson,
  FileText,
  Info,
  Activity,
  AlertTriangle,
  GitBranch,
  Terminal,
  BarChart3,
  Search,
  Check,
  X,
  PlayCircle,
  Eye,
  EyeOff,
  Tag,
} from 'lucide-react';
import type { NFA } from '../../../algorithms/nfa/NFA';
import { convertNFAToDFA } from '../../../algorithms/nfa/conversion/NFAToDFA';
import {
  buildThompsonNFA,
  type ThompsonNFAData,
  type ASTNode,
  type ThompsonNFAFragment,
  type ThompsonConstructionStep,
} from '../../../algorithms/thompsonConstruction';
import { NFABottomEducationalPanel } from './NFABottomEducationalPanel';
import { downloadFile } from '../../../utils/exportUtils';

interface NFAThompsonConstructionLabViewProps {
  nfa: NFA;
  regexStr?: string;
}

export type ThompsonStageId =
  | 'compiler'
  | 'ast'
  | 'fragments'
  | 'timeline'
  | 'epsilon_nfa'
  | 'equivalent_dfa'
  | 'simulation'
  | 'statistics';

export const NFAThompsonConstructionLabView: React.FC<NFAThompsonConstructionLabViewProps> = ({
  nfa,
  regexStr = '(a|b)*abb',
}) => {
  const [inputRegex, setInputRegex] = useState<string>(regexStr || '(a|b)*abb');
  const [activeStage, setActiveStage] = useState<ThompsonStageId>('compiler');

  // AST State
  const [selectedASTNode, setSelectedASTNode] = useState<ASTNode | null>(null);

  // Fragment Workspace State
  const [selectedFragmentIndex, setSelectedFragmentIndex] = useState<number>(0);

  // Construction Timeline Stepper State
  const [timelineStep, setTimelineStep] = useState<number>(0);
  const [isPlayingTimeline, setIsPlayingTimeline] = useState<boolean>(false);
  const [timelineSpeed, setTimelineSpeed] = useState<number>(1000);

  // SVG Controls & Toggles for ε-NFA Canvas
  const [showEpsilonEdges, setShowEpsilonEdges] = useState<boolean>(true);
  const [showStateLabels, setShowStateLabels] = useState<boolean>(true);
  const [selectedSvgNodeId, setSelectedSvgNodeId] = useState<string | null>(null);
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [panPos, setPanPos] = useState<{ x: number; y: number }>({ x: 350, y: 40 });
  const [isPanning, setIsPanning] = useState<boolean>(false);
  const [startPan, setStartPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const svgRef = useRef<SVGSVGElement | null>(null);

  // Interactive Simulation Runner State
  const [simInputString, setSimInputString] = useState<string>('abb');
  const [simStepIndex, setSimStepIndex] = useState<number>(0);
  const [isPlayingSim, setIsPlayingSim] = useState<boolean>(false);

  // Engine Computation
  const thompsonData: ThompsonNFAData = useMemo(() => {
    return buildThompsonNFA(inputRegex);
  }, [inputRegex]);

  // Convert constructed NFA to equivalent DFA using Subset Construction
  const dfaData = useMemo(() => {
    const nfaObj: NFA = {
      states: thompsonData.graph.states.map((s) => s.id),
      alphabet: thompsonData.graph.alphabet,
      transitions: {},
      startState: thompsonData.graph.states.find((s) => s.isStart)?.id || 'q0',
      acceptStates: thompsonData.graph.states.filter((s) => s.isAccept).map((s) => s.id),
    };

    thompsonData.graph.transitions.forEach((t) => {
      if (!nfaObj.transitions[t.source]) nfaObj.transitions[t.source] = {};
      const sym = t.symbols[0] || 'ε';
      if (!nfaObj.transitions[t.source][sym]) nfaObj.transitions[t.source][sym] = [];
      nfaObj.transitions[t.source][sym].push(t.target);
    });

    return {
      dfa: convertNFAToDFA(nfaObj),
    };
  }, [thompsonData]);

  const { dfa } = dfaData;

  // Selected Fragment Object
  const currentFragment = useMemo(() => {
    return thompsonData.fragmentsHistory[selectedFragmentIndex] || thompsonData.fragmentsHistory[0] || null;
  }, [thompsonData, selectedFragmentIndex]);

  // Simulation Evaluation
  const simEvaluation = useMemo(() => {
    const chars = simInputString.split('');
    const consumedPrefix = chars.slice(0, simStepIndex).join('');
    const remainingInput = chars.slice(simStepIndex).join('');

    let regexMatches = false;
    try {
      const reg = new RegExp(`^(${inputRegex})$`);
      regexMatches = reg.test(simInputString);
    } catch {
      regexMatches = false;
    }

    const isFinished = simStepIndex >= chars.length;
    const isAccepted = isFinished && regexMatches;

    return {
      consumedPrefix,
      remainingInput,
      isFinished,
      isAccepted,
      regexMatches,
    };
  }, [inputRegex, simInputString, simStepIndex]);

  // Auto-play Timers
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (isPlayingTimeline) {
      interval = setInterval(() => {
        setTimelineStep((prev) => {
          if (prev >= thompsonData.constructionSteps.length - 1) {
            setIsPlayingTimeline(false);
            return prev;
          }
          return prev + 1;
        });
      }, timelineSpeed);
    }
    return () => clearInterval(interval);
  }, [isPlayingTimeline, thompsonData.constructionSteps.length, timelineSpeed]);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (isPlayingSim) {
      interval = setInterval(() => {
        setSimStepIndex((prev) => {
          if (prev >= simInputString.length) {
            setIsPlayingSim(false);
            return prev;
          }
          return prev + 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isPlayingSim, simInputString.length]);

  // Reset steps on input regex change
  useEffect(() => {
    setTimelineStep(0);
    setIsPlayingTimeline(false);
    setSelectedFragmentIndex(0);
    setSimStepIndex(0);
    setIsPlayingSim(false);
  }, [inputRegex]);

  // SVG Controls
  const handleZoomIn = () => setZoomLevel((prev) => Math.min(prev + 0.25, 2.5));
  const handleZoomOut = () => setZoomLevel((prev) => Math.max(prev - 0.25, 0.4));

  const handleFitView = useCallback(() => {
    if (!svgRef.current || thompsonData.graph.states.length === 0) return;
    const xs = thompsonData.graph.states.map((s) => s.x);
    const ys = thompsonData.graph.states.map((s) => s.y);
    const minX = Math.min(...xs) - 80;
    const maxX = Math.max(...xs) + 80;
    const minY = Math.min(...ys) - 60;
    const maxY = Math.max(...ys) + 80;

    const width = maxX - minX;
    const height = maxY - minY;
    const svgWidth = svgRef.current.clientWidth || 800;
    const svgHeight = svgRef.current.clientHeight || 500;

    const fitScale = Math.min(svgWidth / width, svgHeight / height, 1.2);
    setZoomLevel(Math.max(fitScale, 0.5));
    setPanPos({
      x: svgWidth / 2 - ((minX + maxX) / 2) * fitScale,
      y: 60 - minY * fitScale,
    });
  }, [thompsonData.graph.states]);

  useEffect(() => {
    handleFitView();
  }, [handleFitView, inputRegex]);

  const handleMouseDownSvg = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    setIsPanning(true);
    setStartPan({ x: e.clientX - panPos.x, y: e.clientY - panPos.y });
  };

  const handleMouseMoveSvg = (e: React.MouseEvent) => {
    if (!isPanning) return;
    setPanPos({ x: e.clientX - startPan.x, y: e.clientY - startPan.y });
  };

  const handleMouseUpSvg = () => setIsPanning(false);

  // Exports
  const handleExportSVG = () => {
    if (!svgRef.current) return;
    const svgData = new XMLSerializer().serializeToString(svgRef.current);
    downloadFile(`thompson-${inputRegex}.svg`, svgData, 'image/svg+xml');
  };

  const handleExportJSON = () => {
    downloadFile(
      `thompson-${inputRegex}.json`,
      JSON.stringify(
        {
          regex: inputRegex,
          formatted: thompsonData.formattedRegex,
          postfix: thompsonData.postfix,
          ast: thompsonData.ast,
          steps: thompsonData.constructionSteps,
          graph: thompsonData.graph,
          dfa,
        },
        null,
        2
      ),
      'application/json'
    );
  };

  // Render AST tree recursively
  const renderASTNode = (node: ASTNode | null): React.ReactNode => {
    if (!node) return null;
    const isSelected = selectedASTNode?.id === node.id;
    return (
      <div className="flex flex-col items-center gap-2 font-mono">
        <button
          onClick={() => setSelectedASTNode(node)}
          className={`px-3.5 py-2 rounded-xl border text-xs font-bold transition shadow-md cursor-pointer ${isSelected
              ? 'bg-amber-500 border-amber-300 text-white ring-2 ring-amber-400 shadow-amber-500/40'
              : node.type === 'LITERAL'
                ? 'bg-emerald-950 border-emerald-500/50 text-emerald-300'
                : node.type === 'UNION'
                  ? 'bg-purple-950 border-purple-500/50 text-purple-300'
                  : node.type === 'STAR' || node.type === 'PLUS'
                    ? 'bg-sky-950 border-sky-500/50 text-sky-300'
                    : 'bg-indigo-950 border-indigo-500/50 text-indigo-300'
            }`}
        >
          <span>{node.value}</span>
          <span className="text-[9px] text-slate-400 block font-sans font-normal">{node.type}</span>
        </button>

        {(node.left || node.right) && (
          <div className="flex items-start gap-4 pt-1 border-t border-slate-800">
            {node.left && renderASTNode(node.left)}
            {node.right && renderASTNode(node.right)}
          </div>
        )}
      </div>
    );
  };

  const stages: Array<{ id: ThompsonStageId; label: string; icon: any }> = [
    { id: 'compiler', label: 'Regex Compiler', icon: FileCode },
    { id: 'ast', label: 'Syntax Tree (AST)', icon: Code2 },
    { id: 'fragments', label: 'Thompson Fragments', icon: Layers },
    { id: 'timeline', label: 'Construction Timeline', icon: Cpu },
    { id: 'epsilon_nfa', label: 'ε-NFA Workspace', icon: Sparkles },
    { id: 'equivalent_dfa', label: 'Equivalent DFA', icon: Database },
    { id: 'simulation', label: 'Simulation', icon: PlayCircle },
    { id: 'statistics', label: 'Statistics', icon: BarChart3 },
  ];

  return (
    <div className="space-y-6 text-slate-100 font-sans">
      {/* ────────────────────────────────────────────────────────────────── */}
      {/* 1. HEADER BANNER & COMPILER METRICS                                */}
      {/* ────────────────────────────────────────────────────────────────── */}
      <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl flex flex-wrap items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-amber-600/20 border border-amber-500/40 text-amber-400 rounded-2xl">
            <FileCode className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base font-extrabold text-white flex items-center gap-2">
              📚 Thompson Construction Laboratory 3.0
            </h2>
            <p className="text-xs text-slate-400">
              Compiler-Inspired Interactive Workflow (Regex → AST → Fragments → ε-NFA → DFA → Sim)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-300">Regex Input:</span>
            <input
              type="text"
              value={inputRegex}
              onChange={(e) => setInputRegex(e.target.value)}
              placeholder="e.g. (a|b)*abb"
              className="px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-amber-300 focus:outline-none focus:border-amber-500 w-48 font-bold"
            />
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={handleExportSVG}
              className="p-2 bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-sky-400" />
              <span className="hidden sm:inline">SVG</span>
            </button>
            <button
              onClick={handleExportJSON}
              className="p-2 bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer"
            >
              <FileJson className="w-3.5 h-3.5 text-purple-400" />
              <span className="hidden sm:inline">JSON</span>
            </button>
          </div>
        </div>
      </div>

      {/* ────────────────────────────────────────────────────────────────── */}
      {/* 2. COMPILER PIPELINE STAGE NAVIGATION                             */}
      {/* ────────────────────────────────────────────────────────────────── */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-2 shadow-lg">
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
          {stages.map((st, idx) => {
            const Icon = st.icon;
            const isSel = activeStage === st.id;
            return (
              <React.Fragment key={st.id}>
                <button
                  onClick={() => setActiveStage(st.id)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 cursor-pointer ${isSel
                      ? 'bg-amber-600 text-white shadow-lg shadow-amber-600/30 border border-amber-400/40 ring-1 ring-amber-400'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800 border border-transparent'
                    }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{st.label}</span>
                </button>
                {idx < stages.length - 1 && <ArrowRight className="w-3.5 h-3.5 text-slate-700 shrink-0" />}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* ────────────────────────────────────────────────────────────────── */}
      {/* STAGE 1: REGEX COMPILER                                           */}
      {/* ────────────────────────────────────────────────────────────────── */}
      {activeStage === 'compiler' && (
        <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl space-y-5 shadow-xl text-xs">
          <h3 className="text-sm font-bold text-amber-300 font-sans flex items-center gap-2">
            <FileCode className="w-4 h-4 text-amber-400" /> Regex Compiler Stage & Shunting-Yard Parser
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 font-mono text-xs">
            <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
              <span className="text-[10px] text-slate-400 font-sans uppercase font-bold block">1. Input Regular Expression</span>
              <div className="text-base font-bold text-amber-400">{thompsonData.cleanRegex}</div>
            </div>

            <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
              <span className="text-[10px] text-slate-400 font-sans uppercase font-bold block">2. Explicit Concatenation Form</span>
              <div className="text-base font-bold text-purple-300">{thompsonData.formattedRegex}</div>
            </div>

            <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
              <span className="text-[10px] text-slate-400 font-sans uppercase font-bold block">3. Token Stream</span>
              <div className="flex gap-1.5 flex-wrap pt-0.5">
                {thompsonData.tokens.map((t, i) => (
                  <span key={i} className="px-2 py-0.5 bg-slate-900 border border-slate-700 rounded text-indigo-300 font-bold">
                    {t}
                  </span>
                ))}
              </div>
            </div>

            <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
              <span className="text-[10px] text-slate-400 font-sans uppercase font-bold block">4. Postfix Expression (Shunting-Yard)</span>
              <div className="text-base font-bold text-emerald-400">{thompsonData.postfix}</div>
            </div>
          </div>

          {/* Grouped Operators by Type */}
          <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-3 font-sans">
            <span className="text-xs font-bold text-slate-300 uppercase block">Detected Operators Grouped by Type:</span>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 font-mono text-xs">
              <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl">
                <span className="text-[10px] text-slate-400 block font-sans">Concatenation (·)</span>
                <span className="text-base font-bold text-purple-300">{thompsonData.operatorCounts.concat}</span>
              </div>
              <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl">
                <span className="text-[10px] text-slate-400 block font-sans">Union (|)</span>
                <span className="text-base font-bold text-amber-300">{thompsonData.operatorCounts.union}</span>
              </div>
              <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl">
                <span className="text-[10px] text-slate-400 block font-sans">Kleene Star (*)</span>
                <span className="text-base font-bold text-sky-300">{thompsonData.operatorCounts.star}</span>
              </div>
              <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl">
                <span className="text-[10px] text-slate-400 block font-sans">Plus (+)</span>
                <span className="text-base font-bold text-indigo-300">{thompsonData.operatorCounts.plus}</span>
              </div>
              <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl">
                <span className="text-[10px] text-slate-400 block font-sans">Optional (?)</span>
                <span className="text-base font-bold text-pink-300">{thompsonData.operatorCounts.option}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────── */}
      {/* STAGE 2: SYNTAX TREE (AST) & TRAVERSALS                           */}
      {/* ────────────────────────────────────────────────────────────────── */}
      {activeStage === 'ast' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 p-5 bg-slate-900 border border-slate-800 rounded-2xl space-y-4 shadow-xl text-xs overflow-x-auto">
            <h3 className="text-sm font-bold text-amber-300 font-sans flex items-center gap-2">
              <Code2 className="w-4 h-4 text-amber-400" /> Abstract Syntax Tree (AST) Visualization
            </h3>

            <div className="p-6 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-center min-h-[300px]">
              {renderASTNode(thompsonData.ast)}
            </div>

            {/* AST Traversals Bar */}
            <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-2 font-mono text-xs">
              <span className="text-xs font-bold text-slate-300 font-sans uppercase block">AST Tree Traversals:</span>
              <div className="space-y-1.5 text-[11px]">
                <div><span className="text-slate-400 font-sans">Preorder:</span> <strong className="text-purple-300">{thompsonData.astTraversals.preorder.join(' → ')}</strong></div>
                <div><span className="text-slate-400 font-sans">Inorder:</span> <strong className="text-sky-300">{thompsonData.astTraversals.inorder.join(' → ')}</strong></div>
                <div><span className="text-slate-400 font-sans">Postorder:</span> <strong className="text-emerald-400">{thompsonData.astTraversals.postorder.join(' → ')}</strong></div>
              </div>
            </div>
          </div>

          {/* AST Node Inspector */}
          <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl space-y-3 shadow-xl font-mono text-xs">
            <span className="font-bold text-sky-300 font-sans block border-b border-slate-800 pb-2 flex items-center gap-2">
              <Info className="w-4 h-4 text-sky-400" /> Redesigned AST Inspector
            </span>

            {selectedASTNode ? (
              <div className="space-y-2 pt-1 text-[11px]">
                <div className="flex justify-between py-1 border-b border-slate-800">
                  <span className="text-slate-400 font-sans">Node Type:</span>
                  <span className="font-bold text-amber-300">{selectedASTNode.type}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800">
                  <span className="text-slate-400 font-sans">Operator Symbol:</span>
                  <span className="font-bold text-emerald-400">'{selectedASTNode.value}'</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800">
                  <span className="text-slate-400 font-sans">Parent Node:</span>
                  <span className="font-bold text-purple-300">{selectedASTNode.parentValue || 'Root Node'}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800">
                  <span className="text-slate-400 font-sans">Left Child:</span>
                  <span className="font-bold text-sky-300">{selectedASTNode.left ? selectedASTNode.left.value : 'None'}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800">
                  <span className="text-slate-400 font-sans">Right Child:</span>
                  <span className="font-bold text-sky-300">{selectedASTNode.right ? selectedASTNode.right.value : 'None'}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800">
                  <span className="text-slate-400 font-sans">Precedence:</span>
                  <span className="font-bold text-indigo-300">{selectedASTNode.priority}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800">
                  <span className="text-slate-400 font-sans">Associativity:</span>
                  <span className="font-bold text-pink-300">{selectedASTNode.associativity}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800">
                  <span className="text-slate-400 font-sans">Subtree Height:</span>
                  <span className="font-bold text-white">{selectedASTNode.subTreeDepth}</span>
                </div>
              </div>
            ) : (
              <p className="text-slate-500 italic font-sans text-xs">Click any AST node in the tree to inspect compiler details.</p>
            )}
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────── */}
      {/* STAGE 3: INTERACTIVE THOMPSON FRAGMENT WORKSPACE                  */}
      {/* ────────────────────────────────────────────────────────────────── */}
      {activeStage === 'fragments' && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">
          {/* Left Timeline Selector */}
          <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl space-y-2 shadow-xl font-mono text-xs max-h-[500px] overflow-y-auto">
            <span className="font-bold text-amber-300 font-sans block border-b border-slate-800 pb-2">
              Fragment Timeline Log:
            </span>
            {thompsonData.fragmentsHistory.map((frag, idx) => (
              <button
                key={frag.id}
                onClick={() => setSelectedFragmentIndex(idx)}
                className={`w-full p-2.5 rounded-xl border text-left transition cursor-pointer ${selectedFragmentIndex === idx
                    ? 'bg-amber-600 border-amber-400 text-white shadow-lg shadow-amber-600/30'
                    : 'bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-800'
                  }`}
              >
                <div className="font-bold text-[11px]">{frag.label}</div>
                <div className="text-[9px] opacity-80 font-sans">{frag.rule}</div>
              </button>
            ))}
          </div>

          {/* Main Selected Fragment Viewer */}
          <div className="lg:col-span-3 p-5 bg-slate-900 border border-slate-800 rounded-2xl space-y-4 shadow-xl text-xs font-mono">
            {currentFragment ? (
              <>
                <div className="flex items-center justify-between border-b border-slate-800 pb-3 font-sans">
                  <h3 className="text-sm font-bold text-amber-300 flex items-center gap-2">
                    <Layers className="w-4 h-4 text-amber-400" /> Active Fragment Viewer: {currentFragment.label}
                  </h3>
                  <span className="px-3 py-1 bg-amber-950 border border-amber-500/40 text-amber-300 rounded-xl text-xs font-bold">
                    {currentFragment.rule}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                  <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl">
                    <span className="text-[10px] text-slate-400 font-sans uppercase block">Start State</span>
                    <span className="text-sm font-bold text-sky-400">{currentFragment.startState.id}</span>
                  </div>
                  <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl">
                    <span className="text-[10px] text-slate-400 font-sans uppercase block">Accept State</span>
                    <span className="text-sm font-bold text-emerald-400">{currentFragment.acceptState.id}</span>
                  </div>
                  <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl">
                    <span className="text-[10px] text-slate-400 font-sans uppercase block">States</span>
                    <span className="text-sm font-bold text-white">{currentFragment.states.length}</span>
                  </div>
                  <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl">
                    <span className="text-[10px] text-slate-400 font-sans uppercase block">ε-Transitions</span>
                    <span className="text-sm font-bold text-purple-300">
                      {currentFragment.transitions.filter((t) => t.symbols.includes('ε')).length}
                    </span>
                  </div>
                  <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl">
                    <span className="text-[10px] text-slate-400 font-sans uppercase block">Total Transitions</span>
                    <span className="text-sm font-bold text-indigo-300">{currentFragment.transitions.length}</span>
                  </div>
                </div>

                <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
                  <span className="text-xs font-bold text-slate-300 font-sans uppercase block">Fragment Mechanism Explanation:</span>
                  <p className="text-slate-300 font-sans text-xs leading-relaxed">{currentFragment.explanation}</p>
                </div>
              </>
            ) : (
              <p className="text-slate-500 italic font-sans text-xs">Select any fragment from the timeline log.</p>
            )}
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────── */}
      {/* STAGE 4: CONSTRUCTION TIMELINE STEPPER                             */}
      {/* ────────────────────────────────────────────────────────────────── */}
      {activeStage === 'timeline' && (
        <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl space-y-5 shadow-xl text-xs font-mono">
          <div className="flex items-center justify-between font-sans border-b border-slate-800 pb-3">
            <span className="text-sm font-bold text-amber-300 flex items-center gap-2">
              <Cpu className="w-4 h-4 text-amber-400" /> Animated Construction Stepper
            </span>

            {/* Stepper Playback Controls */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setTimelineStep(0)}
                className="p-2 bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 rounded-xl cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
              <button
                onClick={() => setTimelineStep((prev) => Math.max(0, prev - 1))}
                disabled={timelineStep === 0}
                className="p-2 bg-slate-950 hover:bg-slate-800 disabled:opacity-40 border border-slate-800 text-slate-300 rounded-xl cursor-pointer"
              >
                <SkipBack className="w-4 h-4" />
              </button>
              <button
                onClick={() => setIsPlayingTimeline(!isPlayingTimeline)}
                className={`px-4 py-2 rounded-xl font-bold flex items-center gap-2 text-xs transition border cursor-pointer ${isPlayingTimeline ? 'bg-amber-600 border-amber-400 text-white' : 'bg-sky-600 border-sky-400 text-white'
                  }`}
              >
                {isPlayingTimeline ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-current" />}
                <span>{isPlayingTimeline ? 'Pause' : 'Play'}</span>
              </button>
              <button
                onClick={() => setTimelineStep((prev) => Math.min(thompsonData.constructionSteps.length - 1, prev + 1))}
                disabled={timelineStep >= thompsonData.constructionSteps.length - 1}
                className="p-2 bg-slate-950 hover:bg-slate-800 disabled:opacity-40 border border-slate-800 text-slate-300 rounded-xl cursor-pointer"
              >
                <SkipForward className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Active Construction Card */}
          {thompsonData.constructionSteps[timelineStep] && (
            <div className="p-4 bg-slate-950 border border-amber-500/40 rounded-xl space-y-2">
              <div className="flex items-center justify-between font-sans">
                <span className="font-bold text-amber-300 text-sm">
                  Step {thompsonData.constructionSteps[timelineStep].stepIndex}: Token '{thompsonData.constructionSteps[timelineStep].operator}'
                </span>
                <span className="px-2.5 py-1 bg-amber-950 text-amber-300 text-xs font-bold rounded-lg border border-amber-500/40">
                  {thompsonData.constructionSteps[timelineStep].ruleName}
                </span>
              </div>
              <p className="text-slate-300 font-sans">{thompsonData.constructionSteps[timelineStep].ruleDescription}</p>
              <div className="flex gap-4 pt-1 text-[11px]">
                <span>States Added: <strong className="text-emerald-400">+{thompsonData.constructionSteps[timelineStep].statesAdded}</strong></span>
                <span>ε-Edges Added: <strong className="text-purple-300">+{thompsonData.constructionSteps[timelineStep].epsilonEdgesAdded}</strong></span>
                <span>Total States: <strong className="text-sky-300">{thompsonData.constructionSteps[timelineStep].totalStates}</strong></span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────── */}
      {/* STAGE 5: EPSILON NFA WORKSPACE                                    */}
      {/* ────────────────────────────────────────────────────────────────── */}
      {activeStage === 'epsilon_nfa' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl flex flex-col relative overflow-hidden shadow-2xl min-h-[480px]">
            {/* Toolbar */}
            <div className="p-3 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between z-10 font-sans text-xs">
              <span className="font-bold text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-400" /> Interactive ε-NFA Canvas & Toolbar
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setShowEpsilonEdges(!showEpsilonEdges)}
                  className={`p-1.5 rounded border text-xs font-bold flex items-center gap-1 cursor-pointer ${showEpsilonEdges ? 'bg-purple-950 border-purple-500/50 text-purple-300' : 'bg-slate-900 border-slate-700 text-slate-400'
                    }`}
                >
                  {showEpsilonEdges ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                  <span>ε-Edges</span>
                </button>
                <button
                  onClick={() => setShowStateLabels(!showStateLabels)}
                  className={`p-1.5 rounded border text-xs font-bold flex items-center gap-1 cursor-pointer ${showStateLabels ? 'bg-indigo-950 border-indigo-500/50 text-indigo-300' : 'bg-slate-900 border-slate-700 text-slate-400'
                    }`}
                >
                  <Tag className="w-3.5 h-3.5" />
                  <span>Labels</span>
                </button>
                <button onClick={handleZoomIn} className="p-1.5 bg-slate-900 border border-slate-700 text-slate-300 rounded cursor-pointer">
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>
                <button onClick={handleZoomOut} className="p-1.5 bg-slate-900 border border-slate-700 text-slate-300 rounded cursor-pointer">
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>
                <button onClick={handleFitView} className="p-1.5 bg-slate-900 border border-slate-700 text-slate-300 rounded cursor-pointer flex items-center gap-1 font-bold text-[10px]">
                  <Maximize2 className="w-3.5 h-3.5" /> Fit
                </button>
              </div>
            </div>

            <div
              className="flex-1 w-full h-full relative cursor-grab active:cursor-grabbing select-none overflow-hidden bg-slate-950 min-h-[420px]"
              onMouseDown={handleMouseDownSvg}
              onMouseMove={handleMouseMoveSvg}
              onMouseUp={handleMouseUpSvg}
              onMouseLeave={handleMouseUpSvg}
            >
              <svg ref={svgRef} className="w-full h-full min-h-[420px]">
                <defs>
                  <marker id="t-arr3" viewBox="0 0 10 10" refX="22" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                    <path d="M 0 0 L 10 5 L 0 10 z" fill="#64748b" />
                  </marker>
                </defs>
                <g transform={`translate(${panPos.x}, ${panPos.y}) scale(${zoomLevel})`}>
                  {thompsonData.graph.transitions.map((t) => {
                    const isEps = t.symbols.includes('ε');
                    if (isEps && !showEpsilonEdges) return null;

                    const src = thompsonData.graph.states.find((s) => s.id === t.source);
                    const tgt = thompsonData.graph.states.find((s) => s.id === t.target);
                    if (!src || !tgt) return null;

                    return (
                      <g key={t.id}>
                        <line
                          x1={src.x}
                          y1={src.y}
                          x2={tgt.x}
                          y2={tgt.y}
                          stroke={isEps ? '#c084fc' : '#38bdf8'}
                          strokeWidth={isEps ? 2 : 2.5}
                          strokeDasharray={isEps ? '5,5' : 'none'}
                          markerEnd="url(#t-arr3)"
                        />
                        {showStateLabels && (
                          <text
                            x={(src.x + tgt.x) / 2}
                            y={(src.y + tgt.y) / 2 - 8}
                            fill={isEps ? '#c084fc' : '#38bdf8'}
                            fontSize="11"
                            fontWeight="bold"
                            textAnchor="middle"
                            fontFamily="monospace"
                          >
                            {t.symbols.join(', ')}
                          </text>
                        )}
                      </g>
                    );
                  })}

                  {thompsonData.graph.states.map((s) => (
                    <g
                      key={s.id}
                      transform={`translate(${s.x}, ${s.y})`}
                      onClick={() => setSelectedSvgNodeId(s.id)}
                      className="cursor-pointer"
                    >
                      <circle
                        r="18"
                        fill={s.isStart ? '#1e1b4b' : s.isAccept ? '#065f46' : '#1e293b'}
                        stroke={selectedSvgNodeId === s.id ? '#38bdf8' : s.isAccept ? '#10b981' : s.isStart ? '#6366f1' : '#64748b'}
                        strokeWidth={selectedSvgNodeId === s.id ? 3.5 : 2}
                      />
                      {showStateLabels && (
                        <text textAnchor="middle" dy="4" fill="#ffffff" fontSize="11" fontWeight="bold" fontFamily="monospace">
                          {s.label}
                        </text>
                      )}
                    </g>
                  ))}
                </g>
              </svg>
            </div>
          </div>

          {/* Node Inspector */}
          <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl space-y-3 shadow-xl font-mono text-xs">
            <span className="font-bold text-sky-300 font-sans block border-b border-slate-800 pb-2 flex items-center gap-2">
              <Info className="w-4 h-4 text-sky-400" /> Node Inspector
            </span>

            {selectedSvgNodeId ? (
              <div className="space-y-2 pt-1 text-[11px]">
                <div className="flex justify-between py-1 border-b border-slate-800">
                  <span className="text-slate-400 font-sans">State ID:</span>
                  <span className="font-bold text-white">{selectedSvgNodeId}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800">
                  <span className="text-slate-400 font-sans">Is Start State:</span>
                  <span className="font-bold text-sky-300">{thompsonData.graph.states.find((s) => s.id === selectedSvgNodeId)?.isStart ? 'YES' : 'NO'}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800">
                  <span className="text-slate-400 font-sans">Is Accept State:</span>
                  <span className="font-bold text-emerald-400">{thompsonData.graph.states.find((s) => s.id === selectedSvgNodeId)?.isAccept ? 'YES' : 'NO'}</span>
                </div>
              </div>
            ) : (
              <p className="text-slate-500 italic font-sans text-xs">Click any node in the canvas to inspect transitions.</p>
            )}
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────── */}
      {/* STAGE 6: EQUIVALENT DFA STAGE                                      */}
      {/* ────────────────────────────────────────────────────────────────── */}
      {activeStage === 'equivalent_dfa' && (
        <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl space-y-4 shadow-xl text-xs font-mono">
          <h3 className="text-sm font-bold text-sky-300 font-sans flex items-center gap-2">
            <Database className="w-4 h-4 text-sky-400" /> Equivalent DFA Stage (Subset-Constructed)
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
              <span className="font-bold text-amber-400 font-sans text-xs block">Constructed Thompson ε-NFA</span>
              <div>Total States: <strong className="text-white">{thompsonData.graph.states.length}</strong></div>
              <div>Transitions: <strong className="text-purple-300">{thompsonData.graph.transitions.length}</strong></div>
            </div>

            <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
              <span className="font-bold text-emerald-400 font-sans text-xs block">Equivalent DFA</span>
              <div>DFA States: <strong className="text-white">{dfa.states.length}</strong></div>
              <div>Accept States: <strong className="text-emerald-400">&#123;{dfa.acceptStates.join(', ')}&#125;</strong></div>
            </div>
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────── */}
      {/* STAGE 7: SIMULATION STAGE                                          */}
      {/* ────────────────────────────────────────────────────────────────── */}
      {activeStage === 'simulation' && (
        <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl space-y-5 shadow-xl text-xs font-sans">
          <h3 className="text-sm font-bold text-emerald-400 flex items-center gap-2">
            <PlayCircle className="w-4 h-4 text-emerald-400" /> Interactive Input String Simulation Stage
          </h3>

          <div className="flex items-center gap-3">
            <span className="font-bold text-slate-300">Input Test String:</span>
            <input
              type="text"
              value={simInputString}
              onChange={(e) => setSimInputString(e.target.value)}
              className="px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-emerald-300 focus:outline-none focus:border-emerald-500 w-44 font-bold"
            />
            <button
              onClick={() => setSimStepIndex(0)}
              className="p-1.5 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <button
              onClick={() => setIsPlayingSim(!isPlayingSim)}
              className={`px-3 py-1.5 rounded-xl font-bold flex items-center gap-1 text-xs cursor-pointer ${isPlayingSim ? 'bg-amber-600 text-white' : 'bg-emerald-600 text-white'
                }`}
            >
              {isPlayingSim ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-current" />}
              <span>{isPlayingSim ? 'Pause' : 'Play'}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-mono text-xs">
            <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-1">
              <span className="text-[10px] text-slate-400 font-sans uppercase block">Consumed Prefix</span>
              <span className="text-base font-bold text-amber-300">{simEvaluation.consumedPrefix || 'ε'}</span>
            </div>
            <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-1">
              <span className="text-[10px] text-slate-400 font-sans uppercase block">Remaining Input</span>
              <span className="text-base font-bold text-sky-300">{simEvaluation.remainingInput || 'ε'}</span>
            </div>
            <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-1">
              <span className="text-[10px] text-slate-400 font-sans uppercase block">Acceptance Result</span>
              <span className={`text-base font-bold ${simEvaluation.regexMatches ? 'text-emerald-400' : 'text-rose-400'}`}>
                {simEvaluation.regexMatches ? '✅ ACCEPTED' : '❌ REJECTED'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────── */}
      {/* STAGE 8: STATISTICS DASHBOARD                                     */}
      {/* ────────────────────────────────────────────────────────────────── */}
      {activeStage === 'statistics' && (
        <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl space-y-4 shadow-xl text-xs font-mono">
          <h3 className="text-sm font-bold text-sky-300 font-sans flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-sky-400" /> Thompson Construction Statistics
          </h3>

          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3">
            <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl space-y-1">
              <span className="text-[10px] text-slate-400 font-sans uppercase font-bold block">Regex Length</span>
              <span className="text-xl font-bold text-white">{thompsonData.cleanRegex.length}</span>
            </div>
            <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl space-y-1">
              <span className="text-[10px] text-amber-400 font-sans uppercase font-bold block">Operators</span>
              <span className="text-xl font-bold text-amber-300">{thompsonData.operatorCounts.total}</span>
            </div>
            <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl space-y-1">
              <span className="text-[10px] text-indigo-400 font-sans uppercase font-bold block">AST Depth</span>
              <span className="text-xl font-bold text-indigo-300">{thompsonData.ast?.subTreeDepth || 1}</span>
            </div>
            <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl space-y-1">
              <span className="text-[10px] text-purple-400 font-sans uppercase font-bold block">ε-NFA States</span>
              <span className="text-xl font-bold text-purple-300">{thompsonData.graph.states.length}</span>
            </div>
            <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl space-y-1">
              <span className="text-[10px] text-emerald-400 font-sans uppercase font-bold block">DFA States</span>
              <span className="text-xl font-bold text-emerald-300">{dfa.states.length}</span>
            </div>
          </div>
        </div>
      )}

      {/* Educational Footer */}
      <NFABottomEducationalPanel
        nfa={nfa}
        toolKey="thompson_construction"
        toolTitle="Thompson Construction"
      />
    </div>
  );
};
