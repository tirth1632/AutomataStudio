import React, { useState, useEffect, useMemo } from 'react';
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  useNodesState,
  useEdgesState,
  MarkerType,
  ReactFlowProvider,
} from '@xyflow/react';
import type { Node, Edge, ReactFlowInstance } from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { ZoomIn, ZoomOut, Maximize2, RotateCcw } from 'lucide-react';
import type { AutomatonGraph, StateNodeData } from '../../types/automata';
import type { DFA } from '../../types/dfa';
import { dfaToGraph } from '../../utils/dfaAdapter';
import { applyDagreLayout } from '../../services/layoutEngine';
import { AutomataNode } from '../canvas/AutomataNode';
import { AutomataEdge } from '../canvas/AutomataEdge';

const nodeTypes = { automataNode: AutomataNode };
const edgeTypes = { automataEdge: AutomataEdge };

function getOptimalHandles(
  srcPos: { x: number; y: number },
  tgtPos: { x: number; y: number },
  isSelfLoop: boolean
): { sourceHandle: string; targetHandle: string } {
  if (isSelfLoop) {
    return { sourceHandle: 'top-source', targetHandle: 'top-target' };
  }

  const dx = tgtPos.x - srcPos.x;
  const dy = tgtPos.y - srcPos.y;

  if (Math.abs(dx) >= Math.abs(dy)) {
    if (dx >= 0) {
      return { sourceHandle: 'right-source', targetHandle: 'left-target' };
    } else {
      return { sourceHandle: 'left-source', targetHandle: 'right-target' };
    }
  } else {
    if (dy >= 0) {
      return { sourceHandle: 'bottom-source', targetHandle: 'top-target' };
    } else {
      return { sourceHandle: 'top-source', targetHandle: 'bottom-target' };
    }
  }
}

export interface MiniAutomataGraphProps {
  graph?: AutomatonGraph;
  dfa?: DFA;
  title: string;
  accentColor: string;
  highlightState?: string;
  highlightEdge?: { from: string; to: string; sym?: string };
  svgW?: number;
  svgH?: number;
  className?: string;
  hideTitle?: boolean;
  hideControls?: boolean;
  onNodeClick?: (stateId: string) => void;
  onEnlarge?: () => void;
  onInitReactFlow?: (rfInstance: ReactFlowInstance) => void;
}

const MiniAutomataGraphInternal: React.FC<MiniAutomataGraphProps> = ({
  graph: graphProp,
  dfa: dfaProp,
  title,
  accentColor,
  highlightState,
  highlightEdge,
  svgH: _svgH = 260,
  className = '',
  hideTitle = false,
  hideControls = false,
  onNodeClick,
  onEnlarge,
  onInitReactFlow,
}) => {
  const [rfInstance, setRfInstance] = useState<ReactFlowInstance | null>(null);

  const handleInit = (instance: ReactFlowInstance) => {
    setRfInstance(instance);
    onInitReactFlow?.(instance);
  };

  const effectiveGraph = useMemo(() => {
    if (graphProp) return graphProp;
    if (dfaProp) return dfaToGraph(dfaProp, title);
    return { id: 'empty', name: title, type: 'DFA', alphabet: [], states: [], transitions: [] } as AutomatonGraph;
  }, [graphProp, dfaProp, title]);

  const laidOutGraph = useMemo(() => {
    try {
      return applyDagreLayout(effectiveGraph);
    } catch {
      return effectiveGraph;
    }
  }, [effectiveGraph]);

  // Generate React Flow Nodes
  const initialNodes: Node[] = useMemo(() => {
    return (laidOutGraph.states || []).map((s, index) => {
      const isCurr = highlightState === s.id;
      const nodeData: StateNodeData = {
        stateId: s.id,
        label: s.label || s.id,
        isStart: s.isStart,
        isAccept: s.isAccept,
        isCurrent: isCurr,
        isVisited: isCurr,
        isRejected: false,
        stateIndex: index,
        dfaTag: s.dfaTag,
        colorScheme: s.colorScheme,
      };

      return {
        id: s.id,
        type: 'automataNode',
        position: { x: s.x, y: s.y },
        data: nodeData as unknown as Record<string, unknown>,
      };
    });
  }, [laidOutGraph.states, highlightState]);

  // Generate React Flow Edges
  const initialEdges: Edge[] = useMemo(() => {
    const consolidatedMap = new Map<
      string,
      { id: string; source: string; target: string; symbols: Set<string> }
    >();

    for (const t of laidOutGraph.transitions || []) {
      const src = String(t.source).trim();
      const tgt = String(t.target).trim();
      const key = `${src}→${tgt}`;

      if (!consolidatedMap.has(key)) {
        consolidatedMap.set(key, {
          id: `edge_${src}_${tgt}`,
          source: src,
          target: tgt,
          symbols: new Set((t.symbols || []).map((s) => String(s).trim())),
        });
      } else {
        const existing = consolidatedMap.get(key)!;
        (t.symbols || []).forEach((sym) => existing.symbols.add(String(sym).trim()));
      }
    }

    const consolidatedList = Array.from(consolidatedMap.values());
    const pairSet = new Set(consolidatedList.map((t) => `${t.source}→${t.target}`));

    const statePosMap = new Map<string, { x: number; y: number }>();
    laidOutGraph.states.forEach((s) => {
      statePosMap.set(s.id, { x: s.x + 40, y: s.y + 40 });
    });

    return consolidatedList.map((t) => {
      const isSelfLoop = t.source === t.target;
      const rev = `${t.target}→${t.source}`;
      const isBidirectional = !isSelfLoop && pairSet.has(rev);
      const symbolsSorted = Array.from(t.symbols).sort();

      const sourceCenter = statePosMap.get(t.source) || { x: 0, y: 0 };
      const targetCenter = statePosMap.get(t.target) || { x: 0, y: 0 };

      const handles = getOptimalHandles(
        { x: sourceCenter.x - 40, y: sourceCenter.y - 40 },
        { x: targetCenter.x - 40, y: targetCenter.y - 40 },
        isSelfLoop
      );

      const isActive = !!(
        highlightEdge &&
        highlightEdge.from === t.source &&
        highlightEdge.to === t.target
      );

      return {
        id: `edge_${t.source}_${t.target}`,
        source: t.source,
        target: t.target,
        sourceHandle: handles.sourceHandle,
        targetHandle: handles.targetHandle,
        type: 'automataEdge',
        data: {
          symbols: symbolsSorted,
          isActive,
          isSelfLoop,
          isBidirectional,
          sourceCenter,
          targetCenter,
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          width: 16,
          height: 16,
          color: isActive ? '#38bdf8' : '#94a3b8',
        },
      };
    });
  }, [laidOutGraph.transitions, laidOutGraph.states, highlightEdge]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  useEffect(() => {
    setNodes(initialNodes);
  }, [initialNodes, setNodes]);

  useEffect(() => {
    setEdges(initialEdges);
  }, [initialEdges, setEdges]);

  // Fit view automatically on graph change or init
  useEffect(() => {
    if (rfInstance && nodes.length > 0) {
      const timer = setTimeout(() => {
        rfInstance.fitView({ padding: 0.3, duration: 300 });
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [nodes.length, laidOutGraph.id, rfInstance]);

  return (
    <div className={`flex flex-col w-full h-full min-h-0 ${className}`}>
      {!hideTitle && (
        <div
          className="relative z-20 shrink-0 self-center flex items-center gap-2 px-3.5 py-1.5 rounded-full mb-2 shadow-sm"
          style={{
            background: `${accentColor}20`,
            border: `1px solid ${accentColor}55`,
            boxShadow: `0 0 18px ${accentColor}18`,
          }}
        >
          <span className="w-2 h-2 rounded-full shrink-0" style={{ background: accentColor }} />
          <span
            className="text-[10px] font-bold tracking-wide whitespace-nowrap"
            style={{ color: accentColor, fontFamily: 'ui-monospace, monospace' }}
          >
            {title}
          </span>
        </div>
      )}

      {/* Canvas Sheet Container */}
      <div
        className="relative flex-1 w-full h-full min-h-0 overflow-hidden rounded-2xl bg-[#040810] border border-slate-800/80 shadow-inner group"
      >
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeClick={(_, node) => onNodeClick?.(node.id)}
          onInit={handleInit}
          fitView
          minZoom={0.2}
          maxZoom={3}
          proOptions={{ hideAttribution: true }}
        >
          <Background variant={BackgroundVariant.Dots} gap={18} size={1.2} color="#334155" />
        </ReactFlow>

        {/* Mini Canvas Sheet Overlay Controls */}
        {!hideControls && (
          <div className="absolute top-2 right-2 z-30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 bg-slate-900/90 border border-slate-700/80 p-1 rounded-xl shadow-lg backdrop-blur-md">
            <button
              onClick={() => rfInstance?.zoomIn()}
              title="Zoom In"
              className="p-1 hover:bg-slate-800 text-slate-300 rounded-lg transition cursor-pointer"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => rfInstance?.zoomOut()}
              title="Zoom Out"
              className="p-1 hover:bg-slate-800 text-slate-300 rounded-lg transition cursor-pointer"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            {onEnlarge ? (
              <button
                onClick={onEnlarge}
                title="Enlarge Canvas in Mini Window"
                className="p-1 hover:bg-slate-800 text-slate-300 rounded-lg transition cursor-pointer"
              >
                <Maximize2 className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                onClick={() => rfInstance?.fitView({ padding: 0.3 })}
                title="Reset / Fit View"
                className="p-1 hover:bg-slate-800 text-slate-300 rounded-lg transition cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export const MiniAutomataGraph: React.FC<MiniAutomataGraphProps> = (props) => (
  <ReactFlowProvider>
    <MiniAutomataGraphInternal {...props} />
  </ReactFlowProvider>
);

export function computeMiniGraphHeight(stateCount: number, min = 260): number {
  if (stateCount <= 2) return min;
  if (stateCount <= 4) return min + 30;
  return Math.max(min, Math.ceil(Math.sqrt(stateCount)) * 80 + 60);
}
