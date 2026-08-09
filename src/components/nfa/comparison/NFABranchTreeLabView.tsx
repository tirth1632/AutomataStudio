import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import {
  GitFork,
  CheckCircle2,
  XCircle,
  AlertOctagon,
  ArrowRight,
  BarChart3,
  Play,
  Pause,
  RotateCcw,
  SkipBack,
  SkipForward,
  TreeDeciduous,
  Filter,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Download,
  Info,
  Layers,
  ChevronRight,
  ChevronDown,
  Activity,
  Code2,
  FileText,
  FileJson,
  ShieldCheck,
  HelpCircle,
  Search,
  ArrowUpDown,
  Terminal,
  Flame,
  Eye,
  RefreshCw,
  GitCommit,
  SlidersHorizontal,
  Scale,
  X,
  PlayCircle,
  Check,
  Hash,
  Cpu,
  Clock,
  Sparkles,
} from 'lucide-react';
import type { NFA } from '../../../algorithms/nfa/NFA';
import { computeEpsilonClosure } from '../../../algorithms/shared/EpsilonClosure';
import { NFABottomEducationalPanel } from './NFABottomEducationalPanel';
import { downloadFile, copyToClipboard } from '../../../utils/exportUtils';

interface NFABranchTreeLabViewProps {
  nfa: NFA;
}

export type BranchFilterChip = 'all' | 'active' | 'accepted' | 'rejected' | 'dead' | 'statistics';
export type SortField = 'creation' | 'execution' | 'depth' | 'length' | 'acceptance' | 'id';
export type ExecutionLogEventType = 'CREATION' | 'EPSILON' | 'ACCEPTANCE' | 'REJECTION' | 'DEAD' | 'STATE_CHANGE';

export interface ExecutionLogEvent {
  id: string;
  timestamp: string;
  step: number;
  type: ExecutionLogEventType;
  message: string;
  branchId?: string;
  state?: string;
}

export interface TreeNode {
  id: string;
  state: string;
  depth: number;
  consumed: string;
  remaining: string;
  symbol: string | null;
  isEpsilon: boolean;
  status: 'ACTIVE' | 'ACCEPTED' | 'REJECTED' | 'DEAD';
  parentId: string | null;
  childrenIds: string[];
  x: number;
  y: number;
  collapsed?: boolean;
  visitCount: number;
}

export interface BranchPath {
  id: string;
  parentBranchId: string | null;
  childBranchIds: string[];
  nodeIds: string[];
  states: string[];
  symbols: string[];
  status: 'ACTIVE' | 'ACCEPTED' | 'REJECTED' | 'DEAD';
  length: number;
  depth: number;
  terminalReason: string;
  consumedPrefix: string;
  remainingInput: string;
  stateSequence: string[];
  transitionSequence: Array<{ from: string; symbol: string; to: string }>;
  acceptanceProof: string;
  executionTimeMs: number;
  visitCount: number;
  finalState: string;
}

export const NFABranchTreeLabView: React.FC<NFABranchTreeLabViewProps> = ({ nfa }) => {
  // Simulation Controls & Input String State
  const [testString, setTestString] = useState<string>('0101');
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1000);
  const [autoPlayOnStart, setAutoPlayOnStart] = useState<boolean>(false);

  // Selection & Heatmap State
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedPathId, setSelectedPathId] = useState<string | null>(null);
  const [collapsedNodes, setCollapsedNodes] = useState<Record<string, boolean>>({});
  const [heatmapMode, setHeatmapMode] = useState<boolean>(false);

  // SVG Pan & Zoom State (Centered by default)
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [panPos, setPanPos] = useState<{ x: number; y: number }>({ x: 350, y: 30 });
  const [isPanning, setIsPanning] = useState<boolean>(false);
  const [startPan, setStartPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const svgRef = useRef<SVGSVGElement | null>(null);

  // Unified Branch Explorer State
  const [branchFilter, setBranchFilter] = useState<BranchFilterChip>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortBy, setSortBy] = useState<SortField>('id');
  const [isDetailsExpanded, setIsDetailsExpanded] = useState<boolean>(true);

  // Single Branch Replay State
  const [replayPath, setReplayPath] = useState<BranchPath | null>(null);
  const [replayStep, setReplayStep] = useState<number>(0);
  const [isReplaying, setIsReplaying] = useState<boolean>(false);

  // Branch Comparison Modal State
  const [comparePathA, setComparePathA] = useState<BranchPath | null>(null);
  const [comparePathB, setComparePathB] = useState<BranchPath | null>(null);
  const [isCompareModalOpen, setIsCompareModalOpen] = useState<boolean>(false);

  // Execution Log Controls
  const [logFilter, setLogFilter] = useState<string>('all');
  const [autoScrollLogs, setAutoScrollLogs] = useState<boolean>(true);
  const logContainerRef = useRef<HTMLDivElement | null>(null);

  // --------------------------------------------------------------------------
  // 1. ENGINE BRANCH TREE & PATH ENUMERATION ALGORITHM
  // --------------------------------------------------------------------------
  const treeData = useMemo(() => {
    const startTime = performance.now();
    const nodes: TreeNode[] = [];
    const nodeMap = new Map<string, TreeNode>();
    const paths: BranchPath[] = [];
    const eventsLog: ExecutionLogEvent[] = [];
    let eventCounter = 0;

    function addLog(type: ExecutionLogEventType, message: string, step: number, branchId?: string, state?: string) {
      const now = new Date();
      const timestamp = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}.${now.getMilliseconds().toString().padStart(3, '0')}`;
      eventsLog.push({
        id: `evt-${++eventCounter}`,
        timestamp,
        step,
        type,
        message,
        branchId,
        state,
      });
    }

    addLog('CREATION', `Initialization: Building execution tree for input "${testString}" starting at state ${nfa.startState}`, 0, 'root', nfa.startState);

    const acceptSet = new Set(nfa.acceptStates);
    let nodeCounter = 0;
    let branchCounter = 0;

    const rootId = `node-${++nodeCounter}`;
    const rootNode: TreeNode = {
      id: rootId,
      state: nfa.startState,
      depth: 0,
      consumed: '',
      remaining: testString,
      symbol: null,
      isEpsilon: false,
      status: testString.length === 0 ? (acceptSet.has(nfa.startState) ? 'ACCEPTED' : 'REJECTED') : 'ACTIVE',
      parentId: null,
      childrenIds: [],
      x: 0,
      y: 0,
      visitCount: 1,
    };

    nodes.push(rootNode);
    nodeMap.set(rootId, rootNode);

    const stateVisitCounts: Record<string, number> = {};
    stateVisitCounts[nfa.startState] = (stateVisitCounts[nfa.startState] || 0) + 1;

    let duplicateStateEliminations = 0;

    // Helper function to build execution tree
    function buildTree(
      currNodeId: string,
      currState: string,
      remaining: string,
      consumed: string,
      currentDepth: number,
      pathNodeIds: string[],
      pathStates: string[],
      pathSymbols: string[],
      parentBranchId: string | null
    ): string {
      const myBranchId = `branch-${++branchCounter}`;
      addLog('CREATION', `Branch ${myBranchId} spawned at state ${currState} (depth ${currentDepth})`, currentDepth, myBranchId, currState);

      const parentObj = nodeMap.get(currNodeId)!;
      const transitionSeq: Array<{ from: string; symbol: string; to: string }> = [];

      for (let i = 0; i < pathSymbols.length; i++) {
        transitionSeq.push({
          from: pathStates[i],
          symbol: pathSymbols[i],
          to: pathStates[i + 1],
        });
      }

      // 1. Epsilon transitions
      const epsClosure = Array.from(computeEpsilonClosure([currState], nfa.transitions)).sort();
      const directEpsTargets: string[] = [];
      const epsMap = nfa.transitions[currState]?.['ε'] || nfa.transitions[currState]?.['epsilon'] || [];
      for (const tgt of epsMap) {
        if (tgt !== currState && !pathStates.includes(tgt)) {
          directEpsTargets.push(tgt);
        }
      }

      const childBranchIds: string[] = [];

      for (const epsTgt of directEpsTargets) {
        stateVisitCounts[epsTgt] = (stateVisitCounts[epsTgt] || 0) + 1;
        const epsNodeId = `node-${++nodeCounter}`;
        const epsNode: TreeNode = {
          id: epsNodeId,
          state: epsTgt,
          depth: currentDepth,
          consumed,
          remaining,
          symbol: 'ε',
          isEpsilon: true,
          status: remaining.length === 0 ? (acceptSet.has(epsTgt) ? 'ACCEPTED' : 'REJECTED') : 'ACTIVE',
          parentId: currNodeId,
          childrenIds: [],
          x: 0,
          y: 0,
          visitCount: (stateVisitCounts[epsTgt] || 1),
        };
        nodes.push(epsNode);
        nodeMap.set(epsNodeId, epsNode);
        parentObj.childrenIds.push(epsNodeId);

        addLog('EPSILON', `Branch ${myBranchId}: Took ε-transition from ${currState} to ${epsTgt}`, currentDepth, myBranchId, epsTgt);

        const childBId = buildTree(
          epsNodeId,
          epsTgt,
          remaining,
          consumed,
          currentDepth,
          [...pathNodeIds, epsNodeId],
          [...pathStates, epsTgt],
          [...pathSymbols, 'ε'],
          myBranchId
        );
        childBranchIds.push(childBId);
      }

      // 2. Base Case: End of input string
      if (remaining.length === 0) {
        const isAcc = acceptSet.has(currState) || epsClosure.some((s) => acceptSet.has(s));
        parentObj.status = isAcc ? 'ACCEPTED' : 'REJECTED';

        const termReason = isAcc
          ? `Reached accept state '${currState}' at end of input`
          : `Terminated in non-accept state '${currState}' at end of input`;

        addLog(
          isAcc ? 'ACCEPTANCE' : 'REJECTION',
          `Branch ${myBranchId} ${isAcc ? 'ACCEPTED' : 'REJECTED'}: ${termReason}`,
          currentDepth,
          myBranchId,
          currState
        );

        paths.push({
          id: myBranchId,
          parentBranchId,
          childBranchIds,
          nodeIds: pathNodeIds,
          states: pathStates,
          symbols: pathSymbols,
          status: isAcc ? 'ACCEPTED' : 'REJECTED',
          length: pathStates.length,
          depth: currentDepth,
          terminalReason: termReason,
          consumedPrefix: consumed,
          remainingInput: '',
          stateSequence: pathStates,
          transitionSequence: transitionSeq,
          acceptanceProof: isAcc
            ? `State '${currState}' ∈ Accept States {${Array.from(acceptSet).join(', ')}} after consuming full input "${consumed}".`
            : `State '${currState}' ∉ Accept States {${Array.from(acceptSet).join(', ')}} after consuming input "${consumed}".`,
          executionTimeMs: 0,
          visitCount: pathStates.length,
          finalState: currState,
        });

        return myBranchId;
      }

      // 3. Consume Next Symbol
      const sym = remaining[0];
      const nextRemaining = remaining.slice(1);
      const nextConsumed = consumed + sym;
      let hasValidNextTransition = false;

      const targetPairs: Array<{ src: string; tgt: string }> = [];
      for (const srcState of epsClosure) {
        const targets = nfa.transitions[srcState]?.[sym] || [];
        for (const tgtState of targets) {
          targetPairs.push({ src: srcState, tgt: tgtState });
        }
      }

      // Track duplicate state visits across parallel branches
      const seenTargetsInStep = new Set<string>();

      for (const pair of targetPairs) {
        hasValidNextTransition = true;
        if (seenTargetsInStep.has(pair.tgt)) {
          duplicateStateEliminations++;
        }
        seenTargetsInStep.add(pair.tgt);

        stateVisitCounts[pair.tgt] = (stateVisitCounts[pair.tgt] || 0) + 1;
        const childNodeId = `node-${++nodeCounter}`;
        const childNode: TreeNode = {
          id: childNodeId,
          state: pair.tgt,
          depth: currentDepth + 1,
          consumed: nextConsumed,
          remaining: nextRemaining,
          symbol: sym,
          isEpsilon: false,
          status: nextRemaining.length === 0 ? (acceptSet.has(pair.tgt) ? 'ACCEPTED' : 'REJECTED') : 'ACTIVE',
          parentId: currNodeId,
          childrenIds: [],
          x: 0,
          y: 0,
          visitCount: stateVisitCounts[pair.tgt],
        };

        nodes.push(childNode);
        nodeMap.set(childNodeId, childNode);
        parentObj.childrenIds.push(childNodeId);

        addLog('STATE_CHANGE', `Branch ${myBranchId}: Transition ${pair.src} --'${sym}'--> ${pair.tgt}`, currentDepth + 1, myBranchId, pair.tgt);

        const childBId = buildTree(
          childNodeId,
          pair.tgt,
          nextRemaining,
          nextConsumed,
          currentDepth + 1,
          [...pathNodeIds, childNodeId],
          [...pathStates, pair.tgt],
          [...pathSymbols, sym],
          myBranchId
        );
        childBranchIds.push(childBId);
      }

      // 4. Dead Hop / Terminated Branch
      if (!hasValidNextTransition) {
        parentObj.status = 'DEAD';
        const termReason = `Dead hop: No transition defined on symbol '${sym}' from state '${currState}'`;
        addLog('DEAD', `Branch ${myBranchId} DEAD: ${termReason}`, currentDepth, myBranchId, currState);

        paths.push({
          id: myBranchId,
          parentBranchId,
          childBranchIds,
          nodeIds: pathNodeIds,
          states: pathStates,
          symbols: pathSymbols,
          status: 'DEAD',
          length: pathStates.length,
          depth: currentDepth,
          terminalReason: termReason,
          consumedPrefix: consumed,
          remainingInput: remaining,
          stateSequence: pathStates,
          transitionSequence: transitionSeq,
          acceptanceProof: `Terminated prematurely on symbol '${sym}' because transition δ(${currState}, ${sym}) = ∅.`,
          executionTimeMs: 0,
          visitCount: pathStates.length,
          finalState: currState,
        });
      }

      return myBranchId;
    }

    buildTree(rootId, nfa.startState, testString, '', 0, [rootId], [nfa.startState], [], null);

    // ------------------------------------------------------------------------
    // TREE VISUALIZATION LAYOUT (Layered Tree Coordinates x, y)
    // ------------------------------------------------------------------------
    const nodesByDepth: Map<number, TreeNode[]> = new Map();
    for (const nd of nodes) {
      if (!nodesByDepth.has(nd.depth)) nodesByDepth.set(nd.depth, []);
      nodesByDepth.get(nd.depth)!.push(nd);
    }

    const LEVEL_HEIGHT = 100;
    const NODE_SPACING_X = 110;

    nodesByDepth.forEach((depthNodes, depth) => {
      const totalWidth = (depthNodes.length - 1) * NODE_SPACING_X;
      const startX = -totalWidth / 2;
      depthNodes.forEach((node, idx) => {
        node.x = startX + idx * NODE_SPACING_X;
        node.y = depth * LEVEL_HEIGHT + 60;
      });
    });

    const endTime = performance.now();
    const executionTimeMs = parseFloat((endTime - startTime).toFixed(2));

    // Update execution time in path objects
    paths.forEach((p) => {
      p.executionTimeMs = executionTimeMs;
    });

    addLog('CREATION', `Simulation Finished: Evaluated ${paths.length} total branches across depth ${testString.length} in ${executionTimeMs} ms`, testString.length);

    // Calculate advanced metrics
    const frontierByLevel: Map<number, string[]> = new Map();
    nodes.forEach((nd) => {
      if (!frontierByLevel.has(nd.depth)) frontierByLevel.set(nd.depth, []);
      const list = frontierByLevel.get(nd.depth)!;
      if (!list.includes(nd.state)) list.push(nd.state);
    });

    let maxFrontierSize = 0;
    frontierByLevel.forEach((states) => {
      if (states.length > maxFrontierSize) maxFrontierSize = states.length;
    });

    let maxParallelBranches = 0;
    nodesByDepth.forEach((list) => {
      if (list.length > maxParallelBranches) maxParallelBranches = list.length;
    });

    const pathLengths = paths.map((p) => p.length);
    const avgBranchLength = pathLengths.length > 0 ? (pathLengths.reduce((a, b) => a + b, 0) / pathLengths.length).toFixed(1) : '0';

    const accPaths = paths.filter((p) => p.status === 'ACCEPTED');
    const shortestAcceptingPath = accPaths.length > 0 ? Math.min(...accPaths.map((p) => p.length)) : 0;
    const longestPath = pathLengths.length > 0 ? Math.max(...pathLengths) : 0;

    const memoryUsageEstimate = (nodes.length * 128 + paths.length * 256) / 1024; // KB estimate

    return {
      nodes,
      nodeMap,
      paths,
      nodesByDepth,
      maxDepth: testString.length,
      executionTimeMs,
      eventsLog,
      frontierByLevel,
      maxFrontierSize,
      maxParallelBranches,
      avgBranchLength,
      shortestAcceptingPath,
      longestPath,
      memoryUsageEstimate: memoryUsageEstimate.toFixed(1),
      duplicateStateEliminations,
    };
  }, [nfa, testString]);

  const {
    nodes,
    nodeMap,
    paths,
    maxDepth,
    executionTimeMs,
    eventsLog,
    frontierByLevel,
    maxFrontierSize,
    maxParallelBranches,
    avgBranchLength,
    shortestAcceptingPath,
    longestPath,
    memoryUsageEstimate,
    duplicateStateEliminations,
  } = treeData;

  const acceptedPaths = useMemo(() => paths.filter((p) => p.status === 'ACCEPTED'), [paths]);
  const rejectedPaths = useMemo(() => paths.filter((p) => p.status === 'REJECTED'), [paths]);
  const deadPaths = useMemo(() => paths.filter((p) => p.status === 'DEAD'), [paths]);
  const activePaths = useMemo(() => paths.filter((p) => p.status === 'ACTIVE'), [paths]);

  // Selected Node & Path Details
  const selectedNode = selectedNodeId ? nodeMap.get(selectedNodeId) || nodes[0] : nodes[0];
  const selectedPath = selectedPathId
    ? paths.find((p) => p.id === selectedPathId) || paths[0]
    : paths[0];

  // Active Frontier Nodes for current step index
  const activeNodesAtCurrentStep = useMemo(() => {
    return nodes.filter((n) => n.depth === currentStepIndex);
  }, [nodes, currentStepIndex]);

  // Active Frontier States array
  const currentFrontierStates = useMemo(() => {
    return Array.from(new Set(activeNodesAtCurrentStep.map((n) => n.state)));
  }, [activeNodesAtCurrentStep]);

  // Current simulation status badge
  const simulationStatus = useMemo(() => {
    if (isPlaying) return { label: 'RUNNING', color: 'bg-sky-950 text-sky-300 border-sky-500/50' };
    if (currentStepIndex === maxDepth) {
      if (acceptedPaths.length > 0) return { label: 'ACCEPTED', color: 'bg-emerald-950 text-emerald-300 border-emerald-500/50' };
      return { label: 'REJECTED', color: 'bg-rose-950 text-rose-300 border-rose-500/50' };
    }
    return { label: 'PAUSED', color: 'bg-amber-950 text-amber-300 border-amber-500/50' };
  }, [isPlaying, currentStepIndex, maxDepth, acceptedPaths.length]);

  // --------------------------------------------------------------------------
  // 2. PLAYBACK TIMER EFFECT
  // --------------------------------------------------------------------------
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (isPlaying) {
      interval = setInterval(() => {
        setCurrentStepIndex((prev) => {
          if (prev >= maxDepth) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, playbackSpeed);
    }
    return () => clearInterval(interval);
  }, [isPlaying, maxDepth, playbackSpeed]);

  // Reset step index when test string changes
  useEffect(() => {
    setCurrentStepIndex(0);
    setIsPlaying(autoPlayOnStart);
  }, [testString, autoPlayOnStart]);

  // Auto-scroll execution logs
  useEffect(() => {
    if (autoScrollLogs && logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [eventsLog, autoScrollLogs, currentStepIndex]);

  // --------------------------------------------------------------------------
  // 3. SVG PAN & ZOOM CONTROLS (CENTERED BY DEFAULT)
  // --------------------------------------------------------------------------
  const handleZoomIn = () => setZoomLevel((prev) => Math.min(prev + 0.25, 2.5));
  const handleZoomOut = () => setZoomLevel((prev) => Math.max(prev - 0.25, 0.4));

  const handleFitView = useCallback(() => {
    if (!svgRef.current || nodes.length === 0) return;
    const xs = nodes.map((n) => n.x);
    const ys = nodes.map((n) => n.y);
    const minX = Math.min(...xs) - 80;
    const maxX = Math.max(...xs) + 80;
    const minY = Math.min(...ys) - 60;
    const maxY = Math.max(...ys) + 80;

    const width = maxX - minX;
    const height = maxY - minY;

    const svgWidth = svgRef.current.clientWidth || 800;
    const svgHeight = svgRef.current.clientHeight || 500;

    const scaleX = svgWidth / width;
    const scaleY = svgHeight / height;
    const fitScale = Math.min(scaleX, scaleY, 1.2);

    setZoomLevel(Math.max(fitScale, 0.5));
    setPanPos({
      x: svgWidth / 2 - ((minX + maxX) / 2) * fitScale,
      y: 50 - minY * fitScale,
    });
  }, [nodes]);

  const handleResetZoom = () => {
    handleFitView();
  };

  // Auto-center and fit tree by default on load, NFA change, or input string change
  useEffect(() => {
    handleFitView();
    const timer = setTimeout(() => {
      handleFitView();
    }, 100);
    return () => clearTimeout(timer);
  }, [handleFitView, testString, nfa]);

  const handleCenterNode = (nodeId: string) => {
    const node = nodeMap.get(nodeId);
    if (!node || !svgRef.current) return;
    const svgWidth = svgRef.current.clientWidth || 800;
    const svgHeight = svgRef.current.clientHeight || 500;
    setPanPos({
      x: svgWidth / 2 - node.x * zoomLevel,
      y: svgHeight / 2 - node.y * zoomLevel,
    });
  };

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

  // Toggle Collapse on a Node
  const toggleCollapseNode = (nodeId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setCollapsedNodes((prev) => ({ ...prev, [nodeId]: !prev[nodeId] }));
  };

  // --------------------------------------------------------------------------
  // 4. UNIFIED FILTER & SORT LOGIC FOR BRANCH TABLE
  // --------------------------------------------------------------------------
  const filteredAndSortedPaths = useMemo(() => {
    let result = [...paths];

    // Filter by chip
    if (branchFilter === 'active') result = result.filter((p) => p.status === 'ACTIVE');
    else if (branchFilter === 'accepted') result = result.filter((p) => p.status === 'ACCEPTED');
    else if (branchFilter === 'rejected') result = result.filter((p) => p.status === 'REJECTED');
    else if (branchFilter === 'dead') result = result.filter((p) => p.status === 'DEAD');

    // Search query
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (p) =>
          p.id.toLowerCase().includes(q) ||
          p.finalState.toLowerCase().includes(q) ||
          p.status.toLowerCase().includes(q) ||
          p.states.some((s) => s.toLowerCase().includes(q))
      );
    }

    // Sort
    result.sort((a, b) => {
      if (sortBy === 'length') return b.length - a.length;
      if (sortBy === 'depth') return b.depth - a.depth;
      if (sortBy === 'acceptance') return a.status.localeCompare(b.status);
      if (sortBy === 'creation' || sortBy === 'execution') return a.id.localeCompare(b.id, undefined, { numeric: true });
      return a.id.localeCompare(b.id, undefined, { numeric: true });
    });

    return result;
  }, [paths, branchFilter, searchQuery, sortBy]);

  // Filtered Execution Event Logs
  const filteredLogs = useMemo(() => {
    if (logFilter === 'all') return eventsLog;
    return eventsLog.filter((e) => e.type === logFilter);
  }, [eventsLog, logFilter]);

  // --------------------------------------------------------------------------
  // 5. EXPORT HANDLERS
  // --------------------------------------------------------------------------
  const handleExportSVG = () => {
    if (!svgRef.current) return;
    const svgData = new XMLSerializer().serializeToString(svgRef.current);
    downloadFile(`nfa-branch-tree-${testString}.svg`, svgData, 'image/svg+xml');
  };

  const handleExportJSON = () => {
    const payload = {
      automaton: {
        states: nfa.states,
        alphabet: nfa.alphabet,
        startState: nfa.startState,
        acceptStates: nfa.acceptStates,
      },
      inputString: testString,
      summary: {
        totalBranches: paths.length,
        acceptedCount: acceptedPaths.length,
        rejectedCount: rejectedPaths.length,
        deadCount: deadPaths.length,
        maxDepth,
        maxFrontierSize,
        maxParallelBranches,
        avgBranchLength,
        executionTimeMs,
      },
      treeNodes: nodes,
      paths: filteredAndSortedPaths,
      executionLogs: eventsLog,
    };
    downloadFile(`nfa-branch-report-${testString}.json`, JSON.stringify(payload, null, 2), 'application/json');
  };

  const handleExportReport = () => {
    let report = `==========================================================\n`;
    report += ` NFA BRANCH TREE & UNIFIED EXPLORER SIMULATION REPORT\n`;
    report += `==========================================================\n\n`;
    report += `Input String: "${testString}" (Length: ${testString.length})\n`;
    report += `NFA Start State: ${nfa.startState}\n`;
    report += `NFA Accept States: [${nfa.acceptStates.join(', ')}]\n\n`;

    report += `----------------------------------------------------------\n`;
    report += ` EXECUTION METRICS & SUMMARY\n`;
    report += `----------------------------------------------------------\n`;
    report += `Total Branch Paths: ${paths.length}\n`;
    report += `Accepted Paths: ${acceptedPaths.length}\n`;
    report += `Rejected Paths: ${rejectedPaths.length}\n`;
    report += `Dead Hops: ${deadPaths.length}\n`;
    report += `Maximum Tree Depth: ${maxDepth}\n`;
    report += `Maximum Frontier Size: ${maxFrontierSize}\n`;
    report += `Branching Factor: ${(paths.length / Math.max(1, maxDepth)).toFixed(2)}\n`;
    report += `Execution Time: ${executionTimeMs} ms\n\n`;

    report += `----------------------------------------------------------\n`;
    report += ` ENUMERATED BRANCH PATHS (${branchFilter.toUpperCase()} FILTER)\n`;
    report += `----------------------------------------------------------\n`;
    filteredAndSortedPaths.forEach((p, idx) => {
      report += `Path #${idx + 1} (${p.id}): [${p.status}]\n`;
      report += `  Parent Branch: ${p.parentBranchId || 'None (Root)'}\n`;
      report += `  State Sequence: ${p.stateSequence.join(' -> ')}\n`;
      report += `  Consumed: "${p.consumedPrefix}" | Remaining: "${p.remainingInput}"\n`;
      report += `  Terminal Reason: ${p.terminalReason}\n`;
      report += `  Acceptance Proof: ${p.acceptanceProof}\n\n`;
    });

    report += `----------------------------------------------------------\n`;
    report += ` EXECUTION EVENT LOGS (${eventsLog.length} Events)\n`;
    report += `----------------------------------------------------------\n`;
    eventsLog.forEach((evt) => {
      report += `[${evt.timestamp}] [Step ${evt.step}] [${evt.type}] ${evt.message}\n`;
    });

    downloadFile(`nfa-branch-report-${testString}.txt`, report, 'text/plain');
  };

  // Branch Replay Stepper handler
  const handleStartReplay = (p: BranchPath) => {
    setReplayPath(p);
    setReplayStep(0);
    setIsReplaying(true);
  };

  // --------------------------------------------------------------------------
  // RENDER PIPELINE
  // --------------------------------------------------------------------------
  return (
    <div className="space-y-6 text-slate-100 font-sans">
      {/* ────────────────────────────────────────────────────────────────── */}
      {/* 1. HEADER BANNER & REAL-TIME BADGES                               */}
      {/* ────────────────────────────────────────────────────────────────── */}
      <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl flex flex-wrap items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-sky-600/20 border border-sky-500/40 text-sky-400 rounded-2xl">
            <GitFork className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base font-extrabold text-white flex items-center gap-2">
              🌳 NFA Branch Tree Laboratory & Unified Explorer
            </h2>
            <p className="text-xs text-slate-400">
              Interactive execution debugger with real-time tree expansion, branch inspection, event logging, and analytical stats.
            </p>
          </div>
        </div>

        {/* Real-time Badges */}
        <div className="flex items-center gap-2 flex-wrap font-mono text-[11px]">
          <span className="px-2.5 py-1 bg-slate-950 border border-slate-800 rounded-xl text-slate-300 font-bold">
            Total Branches: <span className="text-sky-300">{paths.length}</span>
          </span>
          <span className="px-2.5 py-1 bg-emerald-950/80 border border-emerald-500/40 rounded-xl text-emerald-300 font-bold">
            Accepted: {acceptedPaths.length}
          </span>
          <span className="px-2.5 py-1 bg-rose-950/80 border border-rose-500/40 rounded-xl text-rose-300 font-bold">
            Rejected: {rejectedPaths.length}
          </span>
          <span className="px-2.5 py-1 bg-amber-950/80 border border-amber-500/40 rounded-xl text-amber-300 font-bold">
            Dead: {deadPaths.length}
          </span>
          <span className={`px-2.5 py-1 rounded-xl font-bold border ${simulationStatus.color}`}>
            Status: {simulationStatus.label}
          </span>
        </div>
      </div>

      {/* ────────────────────────────────────────────────────────────────── */}
      {/* 2. SIMULATION PLAYBACK CONTROLS BAR                               */}
      {/* ────────────────────────────────────────────────────────────────── */}
      <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl space-y-3 shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-4 font-sans text-xs">
          {/* Input string tester */}
          <div className="flex items-center gap-3">
            <span className="font-bold text-slate-300">Input String:</span>
            <input
              type="text"
              value={testString}
              onChange={(e) => {
                setTestString(e.target.value);
                setCurrentStepIndex(0);
                setIsPlaying(false);
              }}
              className="px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-indigo-300 focus:outline-none focus:border-sky-500 w-44 font-bold"
              placeholder="e.g. 0101"
            />
          </div>

          {/* Stepper Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setCurrentStepIndex(0);
                setIsPlaying(false);
              }}
              title="Reset Simulation"
              className="p-2 bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 rounded-xl transition cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            <button
              onClick={() => {
                setCurrentStepIndex((prev) => Math.max(0, prev - 1));
                setIsPlaying(false);
              }}
              disabled={currentStepIndex === 0}
              title="Previous Step"
              className="p-2 bg-slate-950 hover:bg-slate-800 disabled:opacity-40 border border-slate-800 text-slate-300 rounded-xl transition cursor-pointer"
            >
              <SkipBack className="w-4 h-4" />
            </button>

            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className={`px-4 py-2 rounded-xl font-bold flex items-center gap-2 text-xs transition border cursor-pointer ${
                isPlaying
                  ? 'bg-amber-600 border-amber-400 text-white shadow-lg shadow-amber-600/30'
                  : 'bg-sky-600 border-sky-400 text-white shadow-lg shadow-sky-600/30'
              }`}
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-current" />}
              <span>{isPlaying ? 'Pause' : 'Play'}</span>
            </button>

            <button
              onClick={() => {
                setCurrentStepIndex((prev) => Math.min(maxDepth, prev + 1));
                setIsPlaying(false);
              }}
              disabled={currentStepIndex >= maxDepth}
              title="Next Step"
              className="p-2 bg-slate-950 hover:bg-slate-800 disabled:opacity-40 border border-slate-800 text-slate-300 rounded-xl transition cursor-pointer"
            >
              <SkipForward className="w-4 h-4" />
            </button>

            {/* Speed Selector */}
            <div className="flex items-center gap-1 bg-slate-950 border border-slate-800 rounded-xl p-1 font-mono text-[11px]">
              {[
                { label: '0.5×', speed: 2000 },
                { label: '1×', speed: 1000 },
                { label: '2×', speed: 500 },
                { label: '5×', speed: 200 },
              ].map((s) => (
                <button
                  key={s.label}
                  onClick={() => setPlaybackSpeed(s.speed)}
                  className={`px-2 py-0.5 rounded-lg font-bold transition cursor-pointer ${
                    playbackSpeed === s.speed ? 'bg-sky-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>

            {/* Auto Play Toggle */}
            <button
              onClick={() => setAutoPlayOnStart(!autoPlayOnStart)}
              className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition cursor-pointer ${
                autoPlayOnStart
                  ? 'bg-purple-950 border-purple-500/50 text-purple-300'
                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              Auto Play: {autoPlayOnStart ? 'ON' : 'OFF'}
            </button>
          </div>
        </div>

        {/* Input String Progress Track Line */}
        <div className="p-3 bg-slate-950 border border-slate-800/80 rounded-xl flex items-center justify-between font-mono text-xs">
          <div className="flex items-center gap-1">
            <span className="text-slate-500 font-sans font-bold text-[11px] mr-2">Input Track:</span>
            <span className="text-emerald-400 font-bold tracking-widest">{testString.slice(0, currentStepIndex)}</span>
            {currentStepIndex < testString.length && (
              <span className="px-2 py-0.5 bg-sky-600 text-white rounded font-extrabold shadow-md shadow-sky-600/40 animate-pulse">
                {testString[currentStepIndex]}
              </span>
            )}
            <span className="text-slate-400 opacity-60 tracking-widest">
              {testString.slice(currentStepIndex + (currentStepIndex < testString.length ? 1 : 0))}
            </span>
          </div>

          <div className="text-[11px] text-slate-400 font-sans font-bold flex items-center gap-2">
            <span>
              Frontier Active: <strong className="text-amber-400 font-mono">{activeNodesAtCurrentStep.length}</strong>
            </span>
          </div>
        </div>
      </div>

      {/* ────────────────────────────────────────────────────────────────── */}
      {/* 3. SIMULATION SUMMARY DASHBOARD CARD                             */}
      {/* ────────────────────────────────────────────────────────────────── */}
      <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl space-y-3 shadow-xl font-sans text-xs">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
          <span className="font-bold text-sky-300 flex items-center gap-2 text-sm">
            <Activity className="w-4 h-4 text-sky-400" /> Simulation Summary
          </span>
          <span className="text-slate-400 text-[11px]">Engine Computed Metrics</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5 font-mono text-[11px]">
          <div className="p-2.5 bg-slate-950 border border-slate-800/80 rounded-xl space-y-1">
            <span className="text-[10px] text-slate-400 font-sans uppercase font-bold block">Input String</span>
            <span className="text-white font-bold tracking-wider">"{testString || 'ε'}"</span>
          </div>

          <div className="p-2.5 bg-slate-950 border border-slate-800/80 rounded-xl space-y-1">
            <span className="text-[10px] text-slate-400 font-sans uppercase font-bold block">Current Step</span>
            <span className="text-indigo-300 font-bold">{currentStepIndex} / {maxDepth}</span>
          </div>

          <div className="p-2.5 bg-slate-950 border border-slate-800/80 rounded-xl space-y-1">
            <span className="text-[10px] text-slate-400 font-sans uppercase font-bold block">Current Symbol</span>
            <span className="text-amber-300 font-bold">'{testString[currentStepIndex] || 'EOF'}'</span>
          </div>

          <div className="p-2.5 bg-slate-950 border border-slate-800/80 rounded-xl space-y-1">
            <span className="text-[10px] text-slate-400 font-sans uppercase font-bold block">Consumed / Rem.</span>
            <span className="text-emerald-400 font-bold">"{testString.slice(0, currentStepIndex)}"</span>
          </div>

          <div className="p-2.5 bg-slate-950 border border-slate-800/80 rounded-xl space-y-1">
            <span className="text-[10px] text-slate-400 font-sans uppercase font-bold block">Active Frontier</span>
            <span className="text-purple-300 font-bold font-mono">
              &#123;{currentFrontierStates.join(', ') || '∅'}&#125;
            </span>
          </div>

          <div className="p-2.5 bg-slate-950 border border-slate-800/80 rounded-xl space-y-1">
            <span className="text-[10px] text-slate-400 font-sans uppercase font-bold block">Total Branches</span>
            <span className="text-sky-300 font-bold">{paths.length}</span>
          </div>

          <div className="p-2.5 bg-slate-950 border border-slate-800/80 rounded-xl space-y-1">
            <span className="text-[10px] text-slate-400 font-sans uppercase font-bold block">Max Parallel</span>
            <span className="text-pink-300 font-bold">{maxParallelBranches}</span>
          </div>
        </div>
      </div>

      {/* ────────────────────────────────────────────────────────────────── */}
      {/* 4. EXECUTION TREE CANVAS & NODE INSPECTOR PANEL (2 COLUMNS)       */}
      {/* ────────────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* LEFT 2 COLUMNS: INTERACTIVE SVG EXECUTION TREE CANVAS */}
        <div className="lg:col-span-2 bg-slate-900/95 border border-slate-800 rounded-2xl flex flex-col relative overflow-hidden shadow-2xl min-h-[560px]">
          {/* Canvas Toolbar Controls */}
          <div className="p-3 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between z-10 font-sans text-xs flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <TreeDeciduous className="w-4 h-4 text-sky-400" />
              <span className="font-bold text-white">Interactive NFA Execution Tree</span>
              <span className="text-[10px] text-slate-400 font-mono">({nodes.length} Nodes)</span>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setHeatmapMode(!heatmapMode)}
                title="Toggle Execution Heatmap Intensity"
                className={`p-1.5 border rounded-lg cursor-pointer flex items-center gap-1 text-[11px] font-bold transition ${
                  heatmapMode
                    ? 'bg-rose-950 border-rose-500 text-rose-300'
                    : 'bg-slate-900 border-slate-700 text-slate-300 hover:text-white'
                }`}
              >
                <Flame className="w-3.5 h-3.5" /> Heatmap
              </button>

              <button
                onClick={handleZoomIn}
                title="Zoom In"
                className="p-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 rounded-lg cursor-pointer"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={handleZoomOut}
                title="Zoom Out"
                className="p-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 rounded-lg cursor-pointer"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={handleFitView}
                title="Fit View to Screen"
                className="p-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 rounded-lg cursor-pointer flex items-center gap-1 text-[11px] font-bold"
              >
                <Maximize2 className="w-3.5 h-3.5" /> Fit
              </button>
              <button
                onClick={handleResetZoom}
                title="Reset Pan & Zoom"
                className="p-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 rounded-lg cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Interactive SVG Tree Area */}
          <div
            className="flex-1 w-full h-full relative cursor-grab active:cursor-grabbing select-none overflow-hidden bg-slate-950 min-h-[500px]"
            onMouseDown={handleMouseDownSvg}
            onMouseMove={handleMouseMoveSvg}
            onMouseUp={handleMouseUpSvg}
            onMouseLeave={handleMouseUpSvg}
          >
            <svg
              ref={svgRef}
              className="w-full h-full min-h-[500px]"
              style={{ touchAction: 'none' }}
            >
              <defs>
                <pattern id="branch-grid" width="30" height="30" patternUnits="userSpaceOnUse">
                  <circle cx="15" cy="15" r="1" fill="#334155" opacity="0.4" />
                </pattern>
                <marker
                  id="tree-arrow"
                  viewBox="0 0 10 10"
                  refX="22"
                  refY="5"
                  markerWidth="6"
                  markerHeight="6"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 0 L 10 5 L 0 10 z" fill="#64748b" />
                </marker>
              </defs>

              <rect width="100%" height="100%" fill="url(#branch-grid)" />

              {/* Transform Layer for Zoom & Pan */}
              <g transform={`translate(${panPos.x}, ${panPos.y}) scale(${zoomLevel})`}>
                {/* 1. EDGES / BRANCHES */}
                {nodes.map((node) => {
                  if (!node.parentId) return null;
                  const parent = nodeMap.get(node.parentId);
                  if (!parent) return null;

                  if (collapsedNodes[parent.id]) return null;

                  const isHighlighted =
                    selectedPath && selectedPath.nodeIds.includes(node.id) && selectedPath.nodeIds.includes(parent.id);

                  const dx = node.x - parent.x;
                  const dy = node.y - parent.y;
                  const pathD = `M ${parent.x} ${parent.y} C ${parent.x} ${parent.y + dy * 0.5}, ${node.x} ${node.y - dy * 0.5}, ${node.x} ${node.y}`;

                  return (
                    <g key={`edge-${node.id}`}>
                      <path
                        d={pathD}
                        fill="none"
                        stroke={
                          isHighlighted
                            ? '#38bdf8'
                            : node.isEpsilon
                            ? '#c084fc'
                            : node.status === 'ACCEPTED'
                            ? '#10b981'
                            : node.status === 'REJECTED'
                            ? '#f43f5e'
                            : node.status === 'DEAD'
                            ? '#475569'
                            : '#64748b'
                        }
                        strokeWidth={isHighlighted ? 3.5 : node.isEpsilon ? 2 : 1.8}
                        strokeDasharray={node.isEpsilon ? '5,5' : 'none'}
                        markerEnd="url(#tree-arrow)"
                        className="transition-all duration-300"
                      />
                      {/* Transition Symbol Label */}
                      <g transform={`translate(${(parent.x + node.x) / 2}, ${(parent.y + node.y) / 2})`}>
                        <rect
                          x="-10"
                          y="-9"
                          width="20"
                          height="18"
                          rx="4"
                          fill="#0f172a"
                          stroke={node.isEpsilon ? '#c084fc' : '#334155'}
                          strokeWidth="1"
                        />
                        <text
                          textAnchor="middle"
                          dy="3.5"
                          fontSize="10"
                          fontWeight="bold"
                          fontFamily="monospace"
                          fill={node.isEpsilon ? '#c084fc' : '#e2e8f0'}
                        >
                          {node.symbol || 'ε'}
                        </text>
                      </g>
                    </g>
                  );
                })}

                {/* 2. NODES */}
                {nodes.map((node) => {
                  let parentId = node.parentId;
                  let isHidden = false;
                  while (parentId) {
                    if (collapsedNodes[parentId]) {
                      isHidden = true;
                      break;
                    }
                    const p = nodeMap.get(parentId);
                    parentId = p ? p.parentId : null;
                  }

                  if (isHidden) return null;

                  const isSelected = selectedNodeId === node.id;
                  const isPathSelected = selectedPath && selectedPath.nodeIds.includes(node.id);
                  const isStepActive = node.depth === currentStepIndex;

                  let nodeColor = '#334155';
                  let strokeColor = '#64748b';

                  if (node.status === 'ACCEPTED') {
                    nodeColor = '#065f46';
                    strokeColor = '#10b981';
                  } else if (node.status === 'REJECTED') {
                    nodeColor = '#881337';
                    strokeColor = '#f43f5e';
                  } else if (node.status === 'DEAD') {
                    nodeColor = '#1e293b';
                    strokeColor = '#475569';
                  } else if (isStepActive) {
                    nodeColor = '#854d0e';
                    strokeColor = '#eab308';
                  }

                  if (heatmapMode) {
                    const intensity = Math.min(1, node.visitCount / 4);
                    nodeColor = `rgba(225, 29, 72, ${0.3 + intensity * 0.7})`;
                    strokeColor = '#fda4af';
                  }

                  if (isSelected || isPathSelected) {
                    strokeColor = '#38bdf8';
                  }

                  return (
                    <g
                      key={node.id}
                      transform={`translate(${node.x}, ${node.y})`}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedNodeId(node.id);
                      }}
                      className="cursor-pointer group"
                    >
                      {/* Glow ring for active step node */}
                      {isStepActive && (
                        <circle
                          r="24"
                          fill="none"
                          stroke="#eab308"
                          strokeWidth="2"
                          opacity="0.6"
                          className="animate-ping"
                        />
                      )}

                      {/* Node background circle */}
                      <circle
                        r="18"
                        fill={nodeColor}
                        stroke={strokeColor}
                        strokeWidth={isSelected ? 3.5 : isStepActive ? 3 : 2}
                        className="transition-all duration-200 group-hover:scale-110"
                      />

                      {/* State Label */}
                      <text
                        textAnchor="middle"
                        dy="4"
                        fontSize="11"
                        fontWeight="bold"
                        fontFamily="monospace"
                        fill="#ffffff"
                      >
                        {node.state}
                      </text>

                      {/* Heatmap Visit Counter */}
                      {heatmapMode && (
                        <g transform="translate(0, -22)">
                          <rect x="-12" y="-8" width="24" height="14" rx="4" fill="#0f172a" stroke="#e2e8f0" strokeWidth="1" />
                          <text textAnchor="middle" dy="2" fontSize="9" fontWeight="bold" fill="#f43f5e">
                            {node.visitCount}x
                          </text>
                        </g>
                      )}

                      {/* Expand / Collapse Button if Node has Children */}
                      {node.childrenIds.length > 0 && (
                        <g
                          transform="translate(14, -14)"
                          onClick={(e) => toggleCollapseNode(node.id, e)}
                          className="cursor-pointer"
                        >
                          <circle r="7" fill="#0f172a" stroke="#64748b" strokeWidth="1" />
                          <text
                            textAnchor="middle"
                            dy="3"
                            fontSize="10"
                            fontWeight="bold"
                            fill="#ffffff"
                          >
                            {collapsedNodes[node.id] ? '+' : '-'}
                          </text>
                        </g>
                      )}
                    </g>
                  );
                })}
              </g>
            </svg>

            {/* Persistent Branch Legend Overlay */}
            <div className="absolute bottom-3 left-3 bg-slate-900/90 border border-slate-800 rounded-xl p-2.5 backdrop-blur-md shadow-xl text-[10.5px] font-sans font-bold flex flex-wrap items-center gap-3 z-10">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-sm shadow-amber-500/50" />
                <span>🟢 Active</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/50" />
                <span>✅ Accept</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-sm shadow-rose-500/50" />
                <span>❌ Reject</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-600" />
                <span>⚫ Dead</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-purple-400" />
                <span>🟣 ε-Edge</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-sky-400" />
                <span>🔵 Selected</span>
              </span>
            </div>
          </div>
        </div>

        {/* RIGHT 1 COLUMN: NODE INSPECTOR & CURRENT FRONTIER PANEL */}
        <div className="space-y-5">
          {/* NODE INFORMATION INSPECTOR CARD */}
          <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl space-y-3 shadow-xl font-mono text-xs">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2 font-sans">
              <span className="font-bold text-sky-300 flex items-center gap-2">
                <Info className="w-4 h-4 text-sky-400" /> Selected Node Inspector
              </span>
              <button
                onClick={() => handleCenterNode(selectedNode.id)}
                title="Center Node in Tree View"
                className="text-[10px] text-sky-400 hover:text-sky-300 font-mono font-bold flex items-center gap-1 bg-slate-950 px-2 py-0.5 rounded border border-slate-800 cursor-pointer"
              >
                <Eye className="w-3 h-3" /> {selectedNode.id}
              </button>
            </div>

            <div className="space-y-2 text-[11px]">
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400 font-sans">State:</span>
                <span className="font-bold text-white bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                  {selectedNode.state}
                </span>
              </div>

              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400 font-sans">Depth (Input Pos):</span>
                <span className="font-bold text-indigo-300">{selectedNode.depth} / {maxDepth}</span>
              </div>

              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400 font-sans">Consumed Prefix:</span>
                <span className="font-bold text-emerald-400">"{selectedNode.consumed || 'ε'}"</span>
              </div>

              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400 font-sans">Remaining Input:</span>
                <span className="font-bold text-amber-300">"{selectedNode.remaining || 'ε'}"</span>
              </div>

              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400 font-sans">Incoming Symbol:</span>
                <span className="font-bold text-purple-300">'{selectedNode.symbol || 'START'}'</span>
              </div>

              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400 font-sans">Branch Status:</span>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    selectedNode.status === 'ACCEPTED'
                      ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/40'
                      : selectedNode.status === 'REJECTED'
                      ? 'bg-rose-950 text-rose-300 border border-rose-500/40'
                      : selectedNode.status === 'DEAD'
                      ? 'bg-slate-800 text-slate-400'
                      : 'bg-amber-950 text-amber-300 border border-amber-500/40'
                  }`}
                >
                  {selectedNode.status}
                </span>
              </div>
            </div>
          </div>

          {/* CURRENT FRONTIER PANEL */}
          <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl space-y-3 shadow-xl font-sans text-xs">
            <span className="font-bold text-amber-300 block flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-amber-400" /> Current Frontier Panel
              </span>
              <span className="text-[10px] text-slate-400 font-mono">Step {currentStepIndex}</span>
            </span>

            <div className="space-y-2">
              <div className="p-2.5 bg-slate-950 border border-slate-800 rounded-xl space-y-1.5 font-mono text-[11px]">
                <span className="text-[10px] text-slate-400 uppercase font-sans font-bold block">Frontier Set at Depth {currentStepIndex}</span>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {currentFrontierStates.length === 0 ? (
                    <span className="text-slate-500 italic">∅ (Empty Set)</span>
                  ) : (
                    currentFrontierStates.map((st) => (
                      <span key={st} className="px-2 py-0.5 bg-amber-950/80 border border-amber-500/40 text-amber-300 font-bold rounded">
                        {st}
                      </span>
                    ))
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
                <div className="p-2 bg-slate-950 border border-slate-800/80 rounded-lg">
                  <span className="text-slate-400 text-[10px] font-sans block">Frontier Size</span>
                  <span className="font-bold text-amber-300">{currentFrontierStates.length}</span>
                </div>
                <div className="p-2 bg-slate-950 border border-slate-800/80 rounded-lg">
                  <span className="text-slate-400 text-[10px] font-sans block">Max Frontier</span>
                  <span className="font-bold text-purple-300">{maxFrontierSize}</span>
                </div>
              </div>
            </div>
          </div>


        </div>
      </div>

      {/* ────────────────────────────────────────────────────────────────── */}
      {/* 5. ALGORITHM PROGRESS TRACKER PIPELINE                             */}
      {/* ────────────────────────────────────────────────────────────────── */}
      <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl space-y-3 shadow-xl font-sans text-xs">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
          <span className="font-bold text-indigo-300 flex items-center gap-2">
            <Cpu className="w-4 h-4 text-indigo-400" /> NFA Execution Algorithm Progress Pipeline
          </span>
          <span className="text-[10px] text-slate-400 font-mono">Deterministic Step Execution</span>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
          {[
            { stage: 1, title: 'Read Symbol', desc: `'${testString[currentStepIndex] || 'EOF'}'` },
            { stage: 2, title: 'MOVE()', desc: 'Transition Lookup' },
            { stage: 3, title: 'ε-Closure', desc: 'Epsilon Expansion' },
            { stage: 4, title: 'Generate Branches', desc: 'Fork Parallel Paths' },
            { stage: 5, title: 'Merge Duplicates', desc: `${duplicateStateEliminations} Eliminated` },
            { stage: 6, title: 'Update Frontier', desc: `${currentFrontierStates.length} Active` },
          ].map((stepItem, idx) => {
            const isActive = (currentStepIndex % 6) + 1 === stepItem.stage || (currentStepIndex === maxDepth && stepItem.stage === 6);
            return (
              <React.Fragment key={stepItem.stage}>
                <div
                  className={`p-2.5 rounded-xl border flex flex-col gap-1 min-w-[130px] shrink-0 transition-all ${
                    isActive
                      ? 'bg-indigo-950/90 border-indigo-500 text-white shadow-lg shadow-indigo-600/30 ring-1 ring-indigo-500'
                      : 'bg-slate-950 border-slate-800 text-slate-400'
                  }`}
                >
                  <span className="text-[10px] font-mono text-indigo-400 font-bold uppercase">Stage {stepItem.stage}</span>
                  <span className="font-bold text-xs">{stepItem.title}</span>
                  <span className="text-[10px] text-slate-400 font-mono">{stepItem.desc}</span>
                </div>
                {idx < 5 && <ChevronRight className="w-4 h-4 text-slate-600 shrink-0" />}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* ────────────────────────────────────────────────────────────────── */}
      {/* 6. UNIFIED BRANCH EXPLORER                                         */}
      {/* ────────────────────────────────────────────────────────────────── */}
      <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl space-y-5 shadow-2xl font-sans text-xs">
        {/* Top Header & Filter Chips */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-sky-400" />
            <h3 className="text-sm font-bold text-white">Unified Branch Explorer</h3>
          </div>

          {/* Filter Chips Bar */}
          <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 rounded-xl p-1 font-mono text-[11px] flex-wrap">
            {[
              { id: 'all' as const, label: 'All', count: paths.length, color: 'text-sky-300' },
              { id: 'active' as const, label: 'Active', count: activePaths.length, color: 'text-amber-300' },
              { id: 'accepted' as const, label: 'Accepted', count: acceptedPaths.length, color: 'text-emerald-300' },
              { id: 'rejected' as const, label: 'Rejected', count: rejectedPaths.length, color: 'text-rose-300' },
              { id: 'dead' as const, label: 'Dead', count: deadPaths.length, color: 'text-slate-400' },
              { id: 'statistics' as const, label: 'Statistics', icon: BarChart3 },
            ].map((chip) => {
              const isSel = branchFilter === chip.id;
              return (
                <button
                  key={chip.id}
                  onClick={() => setBranchFilter(chip.id)}
                  className={`px-3 py-1 rounded-lg font-bold transition flex items-center gap-1.5 cursor-pointer ${
                    isSel
                      ? 'bg-sky-600 text-white shadow-md shadow-sky-600/30'
                      : 'text-slate-400 hover:text-white hover:bg-slate-900'
                  }`}
                >
                  <span>{chip.label}</span>
                  {chip.count !== undefined && (
                    <span className={`px-1.5 py-0.2 rounded text-[10px] ${isSel ? 'bg-white/20 text-white' : 'bg-slate-900 ' + chip.color}`}>
                      {chip.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* STATISTICS DASHBOARD VIEW (WHEN STATISTICS CHIP SELECTED) */}
        {branchFilter === 'statistics' ? (
          <div className="space-y-4 font-mono text-xs pt-2">
            <h4 className="text-xs font-bold text-sky-300 font-sans flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-sky-400" /> Comprehensive Branching Analytics
            </h4>

            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
              <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl space-y-1">
                <span className="text-[10px] text-slate-400 uppercase font-sans font-bold block">Total Paths</span>
                <span className="text-xl font-bold text-white">{paths.length}</span>
              </div>
              <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl space-y-1">
                <span className="text-[10px] text-emerald-400 uppercase font-sans font-bold block">Accepted</span>
                <span className="text-xl font-bold text-emerald-400">{acceptedPaths.length}</span>
              </div>
              <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl space-y-1">
                <span className="text-[10px] text-rose-400 uppercase font-sans font-bold block">Rejected</span>
                <span className="text-xl font-bold text-rose-400">{rejectedPaths.length}</span>
              </div>
              <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl space-y-1">
                <span className="text-[10px] text-amber-400 uppercase font-sans font-bold block">Dead Hops</span>
                <span className="text-xl font-bold text-amber-400">{deadPaths.length}</span>
              </div>
              <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl space-y-1">
                <span className="text-[10px] text-purple-400 uppercase font-sans font-bold block">Max Frontier</span>
                <span className="text-xl font-bold text-purple-300">{maxFrontierSize}</span>
              </div>
              <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl space-y-1">
                <span className="text-[10px] text-pink-400 uppercase font-sans font-bold block">Max Parallel</span>
                <span className="text-xl font-bold text-pink-300">{maxParallelBranches}</span>
              </div>
              <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl space-y-1">
                <span className="text-[10px] text-indigo-400 uppercase font-sans font-bold block">Avg Branch Length</span>
                <span className="text-xl font-bold text-indigo-300">{avgBranchLength}</span>
              </div>
              <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl space-y-1">
                <span className="text-[10px] text-sky-400 uppercase font-sans font-bold block">Branching Factor</span>
                <span className="text-xl font-bold text-sky-300">
                  {(paths.length / Math.max(1, maxDepth)).toFixed(2)}
                </span>
              </div>
              <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl space-y-1">
                <span className="text-[10px] text-teal-400 uppercase font-sans font-bold block">Shortest Acc. Path</span>
                <span className="text-xl font-bold text-teal-300">{shortestAcceptingPath || 'N/A'}</span>
              </div>
              <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl space-y-1">
                <span className="text-[10px] text-orange-400 uppercase font-sans font-bold block">Longest Path</span>
                <span className="text-xl font-bold text-orange-300">{longestPath}</span>
              </div>
              <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl space-y-1">
                <span className="text-[10px] text-slate-400 uppercase font-sans font-bold block">Memory Estimate</span>
                <span className="text-xl font-bold text-slate-200">{memoryUsageEstimate} KB</span>
              </div>
              <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl space-y-1">
                <span className="text-[10px] text-cyan-400 uppercase font-sans font-bold block">Execution Time</span>
                <span className="text-xl font-bold text-cyan-300">{executionTimeMs} ms</span>
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* SEARCH & SORTING TOOLBAR */}
            <div className="flex flex-wrap items-center justify-between gap-3 font-sans text-xs bg-slate-950 p-3 rounded-xl border border-slate-800">
              <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                <Search className="w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by Branch ID, State, or Status..."
                  className="bg-transparent border-none text-xs text-white focus:outline-none w-full font-mono placeholder:text-slate-500"
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery('')} className="text-slate-400 hover:text-white cursor-pointer">
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-slate-400 font-bold text-[11px]">Sort By:</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortField)}
                  className="px-2.5 py-1 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-200 font-mono focus:outline-none cursor-pointer font-bold"
                >
                  <option value="id">Branch ID</option>
                  <option value="creation">Creation Order</option>
                  <option value="length">Branch Length</option>
                  <option value="depth">Depth</option>
                  <option value="acceptance">Status / Acceptance</option>
                </select>
              </div>
            </div>

            {/* UNIFIED BRANCH TABLE */}
            <div className="overflow-x-auto rounded-xl border border-slate-800 font-mono text-xs">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-950 border-b border-slate-800 text-slate-400 font-sans text-[11px]">
                    <th className="p-3">Branch ID</th>
                    <th className="p-3">Parent</th>
                    <th className="p-3">Final State</th>
                    <th className="p-3">Depth</th>
                    <th className="p-3">Consumed</th>
                    <th className="p-3">Remaining</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Terminal Reason</th>
                    <th className="p-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-200">
                  {filteredAndSortedPaths.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="p-6 text-center text-slate-500 font-sans italic">
                        No execution branches match search/filter parameters.
                      </td>
                    </tr>
                  ) : (
                    filteredAndSortedPaths.map((p) => {
                      const isSel = selectedPathId === p.id;
                      return (
                        <tr
                          key={p.id}
                          onClick={() => {
                            setSelectedPathId(p.id);
                            if (p.nodeIds.length > 0) {
                              const lastNId = p.nodeIds[p.nodeIds.length - 1];
                              setSelectedNodeId(lastNId);
                              handleCenterNode(lastNId);
                            }
                          }}
                          className={`transition cursor-pointer ${
                            isSel ? 'bg-sky-950/80 text-white font-bold' : 'hover:bg-slate-800/60'
                          }`}
                        >
                          <td className="p-3 font-bold text-sky-300">{p.id}</td>
                          <td className="p-3 text-slate-400">{p.parentBranchId || 'Root'}</td>
                          <td className="p-3">
                            <span className="px-2 py-0.5 bg-slate-950 border border-slate-800 rounded font-bold text-indigo-300">
                              {p.finalState}
                            </span>
                          </td>
                          <td className="p-3">{p.depth}</td>
                          <td className="p-3 text-emerald-400 font-bold">"{p.consumedPrefix || 'ε'}"</td>
                          <td className="p-3 text-amber-400 font-bold">"{p.remainingInput || 'ε'}"</td>
                          <td className="p-3">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                p.status === 'ACCEPTED'
                                  ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/40'
                                  : p.status === 'REJECTED'
                                  ? 'bg-rose-950 text-rose-300 border border-rose-500/40'
                                  : p.status === 'DEAD'
                                  ? 'bg-slate-800 text-slate-400'
                                  : 'bg-amber-950 text-amber-300 border border-amber-500/40'
                              }`}
                            >
                              {p.status}
                            </span>
                          </td>
                          <td className="p-3 text-[11px] text-slate-400 font-sans italic max-w-xs truncate">{p.terminalReason}</td>
                          <td className="p-3 text-right">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleStartReplay(p);
                              }}
                              className="px-2 py-1 bg-slate-950 hover:bg-slate-800 border border-slate-700 text-sky-400 hover:text-sky-300 rounded text-[10px] font-bold transition cursor-pointer"
                            >
                              Replay
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* COLLAPSIBLE BRANCH DETAILS PANEL */}
            {selectedPath && (
              <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-3 font-mono text-xs">
                <div className="flex items-center justify-between font-sans border-b border-slate-800/80 pb-2">
                  <span className="font-bold text-sky-300 flex items-center gap-2">
                    <Info className="w-4 h-4 text-sky-400" /> Branch Details Panel ({selectedPath.id})
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleStartReplay(selectedPath)}
                      className="px-2.5 py-1 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                    >
                      <PlayCircle className="w-3.5 h-3.5" /> Replay Branch
                    </button>
                    <button
                      onClick={() => {
                        setComparePathA(selectedPath);
                        setIsCompareModalOpen(true);
                      }}
                      className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-purple-300 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                    >
                      <Scale className="w-3.5 h-3.5" /> Compare Branch
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 text-[11px]">
                  <div className="p-2.5 bg-slate-900 border border-slate-800 rounded-lg space-y-1">
                    <span className="text-slate-400 font-sans text-[10px] block">State Sequence</span>
                    <span className="text-indigo-300 font-bold">{selectedPath.stateSequence.join(' → ')}</span>
                  </div>

                  <div className="p-2.5 bg-slate-900 border border-slate-800 rounded-lg space-y-1">
                    <span className="text-slate-400 font-sans text-[10px] block">Parent & Child Lineage</span>
                    <span className="text-slate-200">
                      Parent: <strong className="text-sky-300">{selectedPath.parentBranchId || 'Root'}</strong> | Children: <strong className="text-purple-300">{selectedPath.childBranchIds.length}</strong>
                    </span>
                  </div>

                  <div className="p-2.5 bg-slate-900 border border-slate-800 rounded-lg space-y-1">
                    <span className="text-slate-400 font-sans text-[10px] block">Depth & Visit Count</span>
                    <span className="text-slate-200">
                      Depth: <strong className="text-amber-300">{selectedPath.depth}</strong> | Visits: <strong className="text-emerald-300">{selectedPath.visitCount}</strong>
                    </span>
                  </div>

                  <div className="p-2.5 bg-slate-900 border border-slate-800 rounded-lg space-y-1">
                    <span className="text-slate-400 font-sans text-[10px] block">Acceptance Proof</span>
                    <span className="text-emerald-300 font-bold">{selectedPath.acceptanceProof}</span>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* ────────────────────────────────────────────────────────────────── */}
      {/* 7. EXECUTION EVENT LOG (DEBUGGER CONSOLE)                         */}
      {/* ────────────────────────────────────────────────────────────────── */}
      <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl space-y-3 shadow-xl font-mono text-xs">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-2 font-sans">
          <span className="font-bold text-emerald-400 flex items-center gap-2">
            <Terminal className="w-4 h-4 text-emerald-400" /> Execution Event Log (Debugger Console)
          </span>

          <div className="flex items-center gap-2">
            {/* Filter Log Chips */}
            <div className="flex items-center gap-1 bg-slate-950 border border-slate-800 rounded-xl p-1 text-[10px]">
              {['all', 'CREATION', 'ACCEPTANCE', 'REJECTION', 'DEAD', 'EPSILON'].map((f) => (
                <button
                  key={f}
                  onClick={() => setLogFilter(f)}
                  className={`px-2 py-0.5 rounded-md font-bold transition cursor-pointer ${
                    logFilter === f ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>

            <button
              onClick={() => setAutoScrollLogs(!autoScrollLogs)}
              className={`px-2 py-1 rounded-lg text-[10px] font-bold border transition cursor-pointer ${
                autoScrollLogs ? 'bg-emerald-950 border-emerald-500/50 text-emerald-300' : 'bg-slate-950 border-slate-800 text-slate-400'
              }`}
            >
              Auto-Scroll: {autoScrollLogs ? 'ON' : 'OFF'}
            </button>
          </div>
        </div>

        <div
          ref={logContainerRef}
          className="bg-slate-950 border border-slate-800/80 rounded-xl p-3 h-44 overflow-y-auto font-mono text-[11px] space-y-1"
        >
          {filteredLogs.length === 0 ? (
            <p className="text-slate-500 italic">No execution events match filter.</p>
          ) : (
            filteredLogs.map((evt) => (
              <div key={evt.id} className="flex items-start gap-2 leading-relaxed">
                <span className="text-slate-500 text-[10px] shrink-0">{evt.timestamp}</span>
                <span className="text-indigo-400 font-bold shrink-0">[Step {evt.step}]</span>
                <span
                  className={`px-1.5 py-0.2 rounded text-[9px] font-bold shrink-0 ${
                    evt.type === 'CREATION'
                      ? 'bg-sky-950 text-sky-300 border border-sky-500/30'
                      : evt.type === 'ACCEPTANCE'
                      ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/30'
                      : evt.type === 'REJECTION'
                      ? 'bg-rose-950 text-rose-300 border border-rose-500/30'
                      : evt.type === 'DEAD'
                      ? 'bg-amber-950 text-amber-300 border border-amber-500/30'
                      : 'bg-purple-950 text-purple-300 border border-purple-500/30'
                  }`}
                >
                  {evt.type}
                </span>
                <span className="text-slate-300">{evt.message}</span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* ────────────────────────────────────────────────────────────────── */}
      {/* 8. SINGLE BRANCH REPLAY MODAL                                      */}
      {/* ────────────────────────────────────────────────────────────────── */}
      {isReplaying && replayPath && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 max-w-xl w-full space-y-4 shadow-2xl font-sans">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-extrabold text-white text-base flex items-center gap-2">
                <PlayCircle className="w-5 h-5 text-sky-400" /> Single Branch Replay ({replayPath.id})
              </h3>
              <button
                onClick={() => setIsReplaying(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 font-mono text-xs">
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
                <div className="flex justify-between text-[11px]">
                  <span className="text-slate-400">Current Step:</span>
                  <span className="font-bold text-sky-300">{replayStep} / {replayPath.states.length - 1}</span>
                </div>
                <div className="flex justify-between text-[11px]">
                  <span className="text-slate-400">Current State:</span>
                  <span className="font-bold text-indigo-300">{replayPath.states[replayStep] || 'q0'}</span>
                </div>
                <div className="flex justify-between text-[11px]">
                  <span className="text-slate-400">Evaluated Symbol:</span>
                  <span className="font-bold text-amber-300">'{replayPath.symbols[replayStep - 1] || 'START'}'</span>
                </div>
              </div>

              {/* Transition Stepper Progress */}
              <div className="flex items-center gap-2 overflow-x-auto p-2 bg-slate-950 rounded-xl border border-slate-800">
                {replayPath.states.map((st, idx) => (
                  <React.Fragment key={idx}>
                    <span
                      className={`px-2.5 py-1 rounded-lg font-bold text-xs shrink-0 ${
                        replayStep === idx
                          ? 'bg-sky-600 text-white shadow-lg shadow-sky-600/40 ring-2 ring-sky-400'
                          : idx < replayStep
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/30'
                          : 'bg-slate-900 text-slate-500'
                      }`}
                    >
                      {st}
                    </span>
                    {idx < replayPath.states.length - 1 && (
                      <span className="text-[10px] text-slate-500 font-sans">
                        '{replayPath.symbols[idx] || 'ε'}' →
                      </span>
                    )}
                  </React.Fragment>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                onClick={() => setReplayStep(0)}
                className="px-3 py-1.5 bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 rounded-xl text-xs font-bold cursor-pointer"
              >
                Reset
              </button>

              <div className="flex items-center gap-2">
                <button
                  disabled={replayStep === 0}
                  onClick={() => setReplayStep((prev) => Math.max(0, prev - 1))}
                  className="px-3 py-1.5 bg-slate-950 hover:bg-slate-800 disabled:opacity-40 border border-slate-800 text-slate-300 rounded-xl text-xs font-bold cursor-pointer"
                >
                  Prev
                </button>
                <button
                  disabled={replayStep >= replayPath.states.length - 1}
                  onClick={() => setReplayStep((prev) => Math.min(replayPath.states.length - 1, prev + 1))}
                  className="px-4 py-1.5 bg-sky-600 hover:bg-sky-500 disabled:opacity-40 text-white rounded-xl text-xs font-bold cursor-pointer shadow-md"
                >
                  Next Step
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────── */}
      {/* 9. BRANCH COMPARISON MATRIX MODAL                                  */}
      {/* ────────────────────────────────────────────────────────────────── */}
      {isCompareModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 max-w-2xl w-full space-y-4 shadow-2xl font-sans">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-extrabold text-white text-base flex items-center gap-2">
                <Scale className="w-5 h-5 text-purple-400" /> Branch Comparison Matrix
              </h3>
              <button
                onClick={() => setIsCompareModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="text-slate-400 font-bold text-[11px] block mb-1">Select Branch A:</label>
                <select
                  value={comparePathA?.id || ''}
                  onChange={(e) => {
                    const p = paths.find((x) => x.id === e.target.value);
                    setComparePathA(p || null);
                  }}
                  className="w-full p-2 bg-slate-950 border border-slate-800 rounded-xl font-mono text-xs text-sky-300 font-bold"
                >
                  {paths.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.id} ({p.status} - Final {p.finalState})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-slate-400 font-bold text-[11px] block mb-1">Select Branch B:</label>
                <select
                  value={comparePathB?.id || paths[1]?.id || ''}
                  onChange={(e) => {
                    const p = paths.find((x) => x.id === e.target.value);
                    setComparePathB(p || null);
                  }}
                  className="w-full p-2 bg-slate-950 border border-slate-800 rounded-xl font-mono text-xs text-purple-300 font-bold"
                >
                  {paths.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.id} ({p.status} - Final {p.finalState})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {comparePathA && (comparePathB || paths[1]) && (
              <div className="overflow-x-auto rounded-xl border border-slate-800 font-mono text-xs">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-950 border-b border-slate-800 text-slate-400 font-sans text-[11px]">
                      <th className="p-3">Property</th>
                      <th className="p-3 text-sky-300">Branch A ({comparePathA.id})</th>
                      <th className="p-3 text-purple-300">Branch B ({(comparePathB || paths[1]).id})</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 text-slate-200">
                    <tr>
                      <td className="p-3 font-sans font-bold text-slate-400">Final State</td>
                      <td className="p-3 font-bold text-indigo-300">{comparePathA.finalState}</td>
                      <td className="p-3 font-bold text-indigo-300">{(comparePathB || paths[1]).finalState}</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-sans font-bold text-slate-400">Status</td>
                      <td className="p-3">{comparePathA.status}</td>
                      <td className="p-3">{(comparePathB || paths[1]).status}</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-sans font-bold text-slate-400">Depth / Length</td>
                      <td className="p-3">{comparePathA.depth} / {comparePathA.length}</td>
                      <td className="p-3">{(comparePathB || paths[1]).depth} / {(comparePathB || paths[1]).length}</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-sans font-bold text-slate-400">State Sequence</td>
                      <td className="p-3 text-[11px]">{comparePathA.stateSequence.join(' → ')}</td>
                      <td className="p-3 text-[11px]">{(comparePathB || paths[1]).stateSequence.join(' → ')}</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-sans font-bold text-slate-400">Terminal Reason</td>
                      <td className="p-3 text-[10px] text-slate-400 italic">{comparePathA.terminalReason}</td>
                      <td className="p-3 text-[10px] text-slate-400 italic">{(comparePathB || paths[1]).terminalReason}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Educational Footer */}
      <NFABottomEducationalPanel
        nfa={nfa}
        toolKey="branch_tree"
        toolTitle="Branch Tree Explorer"
      />
    </div>
  );
};
