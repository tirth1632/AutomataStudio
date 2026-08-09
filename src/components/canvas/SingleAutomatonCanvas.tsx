import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  ReactFlow,
  Background,
  MiniMap,
  BackgroundVariant,
  MarkerType,
  type Node,
  type Edge,
  type ReactFlowInstance,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Focus, X, Download } from 'lucide-react';

import { AutomataNode } from './AutomataNode';
import { AutomataEdge } from './AutomataEdge';
import type { AutomatonGraph, StateNodeData } from '../../types/automata';
import { applyDagreLayout } from '../../services/layoutEngine';
import { exportCanvasToPng, exportCanvasToSvg } from '../../utils/exportImage';

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

interface SingleAutomatonCanvasProps {
  graph: AutomatonGraph;
  activeStateIds?: string[];
  prevStateIds?: string[];
  activeSymbol?: string | null;
  subsetMap?: Record<string, string[]>;
  hoveredStateId?: string | null;
  onHoverState?: (stateId: string | null) => void;
  containerId?: string;
  title?: string;
  colorScheme?: 'purple' | 'sky';
}

export const SingleAutomatonCanvas: React.FC<SingleAutomatonCanvasProps> = ({
  graph: rawGraph,
  activeStateIds = [],
  prevStateIds = [],
  activeSymbol = null,
  subsetMap = {},
  hoveredStateId = null,
  onHoverState,
  containerId = 'single-canvas-container',
  title = 'Automaton Graph',
  colorScheme = 'purple',
}) => {
  const [rfInstance, setRfInstance] = useState<ReactFlowInstance | null>(null);
  const [showMiniMap, setShowMiniMap] = useState<boolean>(false);
  const [showLabels, setShowLabels] = useState<boolean>(true);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  // Close modal on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen]);

  // Apply dagre layout
  const layoutedGraph = useMemo(() => applyDagreLayout(rawGraph), [rawGraph]);

  const activeSet = useMemo(() => new Set(activeStateIds), [activeStateIds]);
  const prevSet = useMemo(() => new Set(prevStateIds), [prevStateIds]);

  // Convert states to ReactFlow nodes
  const initialNodes: Node[] = useMemo(() => {
    return layoutedGraph.states.map((st, idx) => {
      const isCurrent = activeSet.has(st.id);
      const isHovered = hoveredStateId === st.id;
      const subComp = subsetMap[st.id];

      const nodeData: StateNodeData = {
        stateId: st.id,
        label: showLabels ? st.label : st.id,
        isStart: st.isStart,
        isAccept: st.isAccept,
        isCurrent: isCurrent || isHovered,
        stateIndex: idx,
        colorScheme: colorScheme === 'purple' ? 'indigo' : 'emerald',
        dfaTag: title,
        subsetEquivalent: subComp ? `{ ${subComp.join(', ')} }` : undefined,
      };

      return {
        id: st.id,
        type: 'automataNode',
        position: { x: st.x, y: st.y },
        data: nodeData as any,
      };
    });
  }, [layoutedGraph.states, activeSet, hoveredStateId, subsetMap, showLabels, colorScheme, title]);

  // Convert transitions to ReactFlow edges
  const initialEdges: Edge[] = useMemo(() => {
    const nodePosMap = new Map<string, { x: number; y: number }>();
    for (const n of layoutedGraph.states) {
      nodePosMap.set(n.id, { x: n.x, y: n.y });
    }

    return layoutedGraph.transitions.map((t) => {
      const srcPos = nodePosMap.get(t.source) || { x: 0, y: 0 };
      const tgtPos = nodePosMap.get(t.target) || { x: 0, y: 0 };
      const isSelfLoop = t.source === t.target;

      const { sourceHandle, targetHandle } = getOptimalHandles(srcPos, tgtPos, isSelfLoop);

      const isActiveEdge =
        prevSet.size > 0
          ? prevSet.has(t.source) &&
            activeSet.has(t.target) &&
            (!activeSymbol ||
              (t.symbols &&
                (t.symbols.includes(activeSymbol) ||
                  t.symbols.includes('ε') ||
                  t.symbols.includes('epsilon'))))
          : activeSet.has(t.source) && activeSet.has(t.target);

      const color = colorScheme === 'purple' ? '#c084fc' : '#38bdf8';

      return {
        id: t.id,
        type: 'automataEdge',
        source: t.source,
        target: t.target,
        sourceHandle,
        targetHandle,
        data: {
          symbols: t.symbols || [],
          isSelfLoop,
          color,
          isActive: isActiveEdge,
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: isActiveEdge ? (colorScheme === 'purple' ? '#a855f7' : '#38bdf8') : '#64748b',
          width: 16,
          height: 16,
        },
      };
    });
  }, [layoutedGraph.transitions, layoutedGraph.states, activeSet, prevSet, activeSymbol, colorScheme]);

  const lastHoveredIdRef = React.useRef<string | null>(null);

  const handleNodeMouseEnter = useCallback(
    (_: React.MouseEvent, node: Node) => {
      if (onHoverState && lastHoveredIdRef.current !== node.id) {
        lastHoveredIdRef.current = node.id;
        requestAnimationFrame(() => {
          if (lastHoveredIdRef.current === node.id && onHoverState) {
            onHoverState(node.id);
          }
        });
      }
    },
    [onHoverState]
  );

  const handleNodeMouseLeave = useCallback(() => {
    if (onHoverState && lastHoveredIdRef.current !== null) {
      lastHoveredIdRef.current = null;
      requestAnimationFrame(() => {
        if (lastHoveredIdRef.current === null && onHoverState) {
          onHoverState(null);
        }
      });
    }
  }, [onHoverState]);

  return (
    <>
      <div
        id={containerId}
        className={`relative w-full rounded-2xl border bg-slate-950 overflow-hidden font-sans transition-all ${
          colorScheme === 'purple' ? 'border-purple-500/30' : 'border-sky-500/30'
        } h-[300px]`}
      >
        {/* Main ReactFlow Graph Container */}
        <ReactFlow
          nodes={initialNodes}
          edges={initialEdges}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          onNodeMouseEnter={handleNodeMouseEnter}
          onNodeMouseLeave={handleNodeMouseLeave}
          onInit={setRfInstance}
          fitView
          minZoom={0.2}
          maxZoom={2.5}
          proOptions={{ hideAttribution: true }}
        >
          <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#334155" />
          {showMiniMap && (
            <MiniMap
              style={{ backgroundColor: '#090d16', borderRadius: '12px', border: '1px solid #1e293b' }}
              nodeColor={() => (colorScheme === 'purple' ? '#a855f7' : '#0284c7')}
              maskColor="rgba(15, 23, 42, 0.7)"
            />
          )}
        </ReactFlow>
      </div>

      {/* Dedicated Separate Fullscreen Canvas Modal */}
      {isFullscreen &&
        createPortal(
          <div className="fixed inset-0 z-[9999] bg-slate-950/95 backdrop-blur-2xl p-4 sm:p-6 flex flex-col font-sans animate-fade-in">
            {/* Modal Top Bar */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-800 shrink-0">
              <div className="flex items-center gap-3">
                <div className="px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-xl flex items-center gap-2 shadow-md">
                  <span className={`w-3 h-3 rounded-full ${colorScheme === 'purple' ? 'bg-purple-400 shadow-md shadow-purple-500/50' : 'bg-sky-400 shadow-md shadow-sky-500/50'}`} />
                  <span className="font-bold text-sm text-white">{title} — Expanded Viewport Canvas</span>
                </div>
                <span className="text-xs text-slate-400 font-mono hidden sm:inline-block">
                  {rawGraph.states.length} States • {rawGraph.transitions.length} Transitions
                </span>
              </div>

              <div className="flex items-center gap-2">
                {/* Modal Export Controls */}
                <button
                  onClick={() => exportCanvasToPng(containerId, title.toLowerCase().replace(/\s+/g, '_'))}
                  className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-emerald-300 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-sm"
                  title="Export PNG Image"
                >
                  <Download className="w-3.5 h-3.5 text-emerald-400" />
                  <span>PNG</span>
                </button>

                <button
                  onClick={() => exportCanvasToSvg(containerId, title.toLowerCase().replace(/\s+/g, '_'))}
                  className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-sky-300 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-sm"
                  title="Export SVG Image"
                >
                  <Download className="w-3.5 h-3.5 text-sky-400" />
                  <span>SVG</span>
                </button>

                <div className="w-px h-5 bg-slate-800 my-auto mx-1" />

                {/* Close Modal Button */}
                <button
                  onClick={() => setIsFullscreen(false)}
                  className="px-3.5 py-1.5 bg-rose-950/80 hover:bg-rose-900/90 border border-rose-500/50 text-rose-200 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-lg shadow-rose-950/40"
                  title="Close Fullscreen Canvas (Esc)"
                >
                  <X className="w-4 h-4 text-rose-300" />
                  <span>Exit Canvas (Esc)</span>
                </button>
              </div>
            </div>

            {/* Modal Canvas Viewport */}
            <div className="flex-1 w-full relative rounded-2xl border border-slate-800/80 bg-slate-950 overflow-hidden mt-4 shadow-2xl">
              <ReactFlow
                nodes={initialNodes}
                edges={initialEdges}
                nodeTypes={nodeTypes}
                edgeTypes={edgeTypes}
                onNodeMouseEnter={handleNodeMouseEnter}
                onNodeMouseLeave={handleNodeMouseLeave}
                fitView
                minZoom={0.1}
                maxZoom={3}
                proOptions={{ hideAttribution: true }}
              >
                <Background variant={BackgroundVariant.Dots} gap={24} size={1.5} color="#334155" />
                <MiniMap
                  style={{ backgroundColor: '#090d16', borderRadius: '12px', border: '1px solid #1e293b' }}
                  nodeColor={() => (colorScheme === 'purple' ? '#a855f7' : '#0284c7')}
                  maskColor="rgba(15, 23, 42, 0.7)"
                />
              </ReactFlow>
            </div>
          </div>,
          document.body
        )}
    </>
  );
};
