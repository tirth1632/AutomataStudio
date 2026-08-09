import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  ReactFlow,
  Background,
  MiniMap,
  useNodesState,
  useEdgesState,
  BackgroundVariant,
  MarkerType,
} from '@xyflow/react';
import type {
  Connection,
  Edge,
  Node,
  ReactFlowInstance,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { useAutomata } from '../../context/AutomataContext';
import { AutomataNode } from './AutomataNode';
import { AutomataEdge } from './AutomataEdge';
import { CanvasToolbar } from './CanvasToolbar';
import { ValidationAlerts } from './ValidationAlerts';
import { ContextMenu } from './ContextMenu';
import { StateInspectorCard } from './StateInspectorCard';
import type { StateNodeData, AutomatonGraph } from '../../types/automata';
import { applyDagreLayout } from '../../services/layoutEngine';

const nodeTypes = { automataNode: AutomataNode };
const edgeTypes = { automataEdge: AutomataEdge };

/**
 * Computes optimal source and target handles based on relative node positions
 * to guarantee direct border-to-border connections without mid-air gaps.
 */
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

  // Compare absolute dx vs dy to choose horizontal or vertical handle pair
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

interface AutomataCanvasProps {
  customGraph?: AutomatonGraph;
  selectedStateId?: string | null;
  onSelectState?: (stateId: string | null) => void;
  onNodePositionChange?: (stateId: string, x: number, y: number) => void;
  customActiveStateIds?: Set<string>;
  customActiveEdgeIds?: Set<string>;
  title?: string;
  badge?: string;
  badgeColor?: string;
  hideToolbar?: boolean;
}

export const AutomataCanvas: React.FC<AutomataCanvasProps> = ({
  customGraph,
  selectedStateId,
  onSelectState,
  onNodePositionChange,
  customActiveStateIds,
  customActiveEdgeIds,
  title,
  badge,
  badgeColor = 'indigo',
  hideToolbar,
}) => {
  const contextData = useAutomata();
  const graph = customGraph || contextData.graph;
  const showToolbar = !hideToolbar && !customGraph;

  const {
    setGraph,
    updateState,
    addTransition,
    updateTransitionSymbols,
    deleteTransition,
    simulationSteps,
    currentStepIndex,
    settings,
  } = contextData;

  const [rfInstance, setRfInstance] = useState<ReactFlowInstance | null>(null);
  const [showMiniMap, setShowMiniMap] = useState<boolean>(false);

  // Context Menu State
  const [menu, setMenu] = useState<{ x: number; y: number; nodeId: string | null } | null>(null);

  // Symbol Edit Dialog State
  const [edgeSymbolModal, setEdgeSymbolModal] = useState<{
    edgeId?: string;
    source?: string;
    target?: string;
    symbolsStr: string;
  } | null>(null);

  // State Rename Modal State
  const [renameModal, setRenameModal] = useState<{ nodeId: string; currentLabel: string } | null>(
    null
  );

  // Smoothly reset viewport zoom and auto-fit graph to center when graph changes
  useEffect(() => {
    if (!rfInstance) return;
    if (graph.states.length === 0) {
      rfInstance.setViewport({ x: 0, y: 0, zoom: 1 }, { duration: 350 });
    } else {
      const timer = setTimeout(() => {
        rfInstance.fitView({ padding: 0.35, duration: 350 });
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [graph.id, graph.states.length, rfInstance]);

  // Current simulation step active state and edge IDs
  const activeStep = simulationSteps[currentStepIndex];
  const activeStateIds = useMemo(() => {
    if (customActiveStateIds) return customActiveStateIds;
    return new Set(activeStep?.currentStateIds || []);
  }, [customActiveStateIds, activeStep]);

  const activeEdgeIds = useMemo(() => {
    if (customActiveEdgeIds) return customActiveEdgeIds;
    return new Set(activeStep?.activeEdgeIds || []);
  }, [customActiveEdgeIds, activeStep]);

  // Map state center positions for radial circle calculations (nodes are 80x80 circles)
  const statePosMap = useMemo(() => {
    const map = new Map<string, { x: number; y: number }>();
    graph.states.forEach((s) => {
      map.set(s.id, { x: s.x + 40, y: s.y + 40 });
    });
    return map;
  }, [graph.states]);

  // Convert graph states to React Flow nodes
  const initialNodes: Node[] = useMemo(() => {
    return graph.states
      .filter((s) => !s.isAnnotation && !s.id.includes('CAPTION'))
      .map((s, index) => {
      const isCurr = activeStateIds.has(s.id);
      const isSel = selectedStateId === s.id;
      const nodeData: StateNodeData = {
        stateId: s.id,
        label: s.label,
        isStart: s.isStart,
        isAccept: s.isAccept,
        isCurrent: isCurr,
        isSelected: isSel,
        isVisited: isCurr,
        isRejected: activeStep?.isRejected && isCurr,
        stateIndex: index,
        dfaTag: s.dfaTag,
        colorScheme: s.colorScheme,
      };

      return {
        id: s.id,
        type: 'automataNode',
        position: { x: s.x, y: s.y },
        selected: isSel,
        data: nodeData as unknown as Record<string, unknown>,
      };
    });
  }, [graph.states, activeStateIds, activeStep, selectedStateId]);

  // ── Convert graph transitions to React Flow edges with DIRECT BORDER CONNECTIONS ──
  const initialEdges: Edge[] = useMemo(() => {
    // Step 1: Consolidate multiple transitions between the exact same (source, target) into a single edge
    const consolidatedMap = new Map<
      string,
      { id: string; source: string; target: string; symbols: Set<string>; isActive: boolean }
    >();

    for (const t of graph.transitions) {
      const src = String(t.source).trim();
      const tgt = String(t.target).trim();
      const key = `${src}→${tgt}`;
      const isActive = activeEdgeIds.has(t.id);

      if (!consolidatedMap.has(key)) {
        consolidatedMap.set(key, {
          id: `edge_${src}_${tgt}`,
          source: src,
          target: tgt,
          symbols: new Set((t.symbols || []).map((s) => String(s).trim())),
          isActive,
        });
      } else {
        const existing = consolidatedMap.get(key)!;
        (t.symbols || []).forEach((sym) => existing.symbols.add(String(sym).trim()));
        if (isActive) existing.isActive = true;
      }
    }

    const consolidatedList = Array.from(consolidatedMap.values());
    const pairSet = new Set(consolidatedList.map((t) => `${t.source}→${t.target}`));

    // Step 2: Build React Flow edges with exact node center geometry
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

      return {
        id: `edge_${t.source}_${t.target}`,
        source: t.source,
        target: t.target,
        sourceHandle: handles.sourceHandle,
        targetHandle: handles.targetHandle,
        type: 'automataEdge',
        data: {
          symbols: symbolsSorted,
          isActive: t.isActive,
          isSelfLoop,
          isBidirectional,
          sourceCenter,
          targetCenter,
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          width: 18,
          height: 18,
          color: t.isActive ? '#38bdf8' : '#cbd5e1',
        },
      };
    });
  }, [graph.transitions, activeEdgeIds, statePosMap]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  useEffect(() => {
    setNodes(initialNodes);
  }, [initialNodes, setNodes]);

  useEffect(() => {
    setEdges(initialEdges);
  }, [initialEdges, setEdges]);

  // Inspected Node ID for floating State Inspector Card
  const [inspectedNodeId, setInspectedNodeId] = useState<string | null>(null);

  // ── AUTOMATIC BEAUTIFICATION (Auto layout + Center + Fit viewport) ──
  useEffect(() => {
    if (rfInstance && graph.states.length > 0) {
      const timer = setTimeout(() => {
        rfInstance.fitView({ padding: 0.25, duration: 300 });
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [graph.id, rfInstance]);

  // Node Drag Stop handler -> sync coordinates to graph
  const onNodeDragStop = useCallback(
    (_: any, node: Node) => {
      if (onNodePositionChange) {
        onNodePositionChange(node.id, node.position.x, node.position.y);
      } else {
        updateState(node.id, { x: node.position.x, y: node.position.y });
      }
    },
    [updateState, onNodePositionChange]
  );

  // Edge Connection Handler
  const onConnect = useCallback(
    (params: Connection) => {
      if (params.source && params.target) {
        setEdgeSymbolModal({
          source: params.source,
          target: params.target,
          symbolsStr: '0',
        });
      }
    },
    []
  );

  // Edge Click Handler -> edit symbols or delete
  const onEdgeClick = useCallback(
    (_: any, edge: Edge) => {
      const t = graph.transitions.find(
        (item) => item.source === edge.source && item.target === edge.target
      );
      if (t) {
        setEdgeSymbolModal({
          edgeId: t.id,
          source: edge.source,
          target: edge.target,
          symbolsStr: t.symbols.join(', '),
        });
      }
    },
    [graph.transitions]
  );

  // Context Menu Handlers
  const onNodeContextMenu = useCallback(
    (event: any, node: Node) => {
      event.preventDefault();
      setMenu({
        x: event.clientX,
        y: event.clientY,
        nodeId: node.id,
      });
    },
    []
  );

  const onPaneContextMenu = useCallback((event: any) => {
    event.preventDefault();
    setMenu({
      x: event.clientX,
      y: event.clientY,
      nodeId: null,
    });
  }, []);

  const closeContextMenu = useCallback(() => {
    setMenu(null);
  }, []);

  // ── BEAUTIFY GRAPH (Dagre layout + fit view) ──
  const handleAutoLayout = useCallback(() => {
    const laidOut = applyDagreLayout(graph);
    setGraph(laidOut);
    setTimeout(() => {
      rfInstance?.fitView({ padding: 0.25, duration: 400 });
    }, 60);
  }, [graph, setGraph, rfInstance]);

  return (
    <div id="automata-canvas-container" className="relative w-full h-full bg-slate-950 overflow-hidden select-none">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeDragStop={onNodeDragStop}
        onConnect={onConnect}
        onEdgeClick={onEdgeClick}
        onNodeClick={(_, node) => {
          setInspectedNodeId(node.id);
          onSelectState?.(node.id);
        }}
        onNodeContextMenu={onNodeContextMenu}
        onPaneContextMenu={onPaneContextMenu}
        onPaneClick={() => {
          closeContextMenu();
          setInspectedNodeId(null);
          onSelectState?.(null);
        }}
        onInit={setRfInstance}
        fitView
        minZoom={0.01}
        maxZoom={15}
        snapToGrid={settings.snapToGrid}
        snapGrid={[15, 15]}
        proOptions={{ hideAttribution: true }}
      >
        {settings.showGrid && (
          <Background
            variant={BackgroundVariant.Dots}
            gap={20}
            size={1.5}
            color="#334155"
          />
        )}

        {showToolbar && (
          <CanvasToolbar
            onZoomIn={() => rfInstance?.zoomIn()}
            onZoomOut={() => rfInstance?.zoomOut()}
            onFitView={() => rfInstance?.fitView({ padding: 0.25 })}
            onAutoLayout={handleAutoLayout}
            showMiniMap={showMiniMap}
            setShowMiniMap={setShowMiniMap}
          />
        )}

        {showToolbar && <ValidationAlerts />}

        {showMiniMap && (
          <MiniMap
            nodeColor={(node) => {
              const d = node.data as unknown as StateNodeData;
              if (d?.isAccept) return '#10b981';
              if (d?.isStart) return '#3b82f6';
              return '#475569';
            }}
            maskColor="rgba(15, 23, 42, 0.7)"
            className="!bottom-4 !left-4 !bg-slate-900 !border !border-slate-800 !rounded-xl !overflow-hidden shadow-xl"
          />
        )}
      </ReactFlow>

      {/* Floating State Inspector Card on Canvas Node Click */}
      {inspectedNodeId && (
        <div className="absolute top-4 right-4 z-40 max-w-sm w-full">
          <StateInspectorCard
            nodeId={inspectedNodeId}
            graph={graph}
            onClose={() => setInspectedNodeId(null)}
          />
        </div>
      )}

      {/* Context Menu */}
      {menu && (
        <ContextMenu
          x={menu.x}
          y={menu.y}
          nodeId={menu.nodeId}
          onClose={closeContextMenu}
          onRename={(nodeId) => {
            const st = graph.states.find((s) => s.id === nodeId);
            if (st) setRenameModal({ nodeId, currentLabel: st.label });
          }}
        />
      )}

      {/* Symbol Edit Modal */}
      {edgeSymbolModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-700/80 p-6 rounded-2xl shadow-2xl w-80 max-w-full text-slate-100">
            <h3 className="text-base font-semibold mb-2">Transition Symbols</h3>
            <p className="text-xs text-slate-400 mb-4">
              Enter comma-separated symbols (e.g., <code className="bg-slate-800 px-1 py-0.5 rounded text-indigo-300">0, 1</code> or <code className="bg-slate-800 px-1 py-0.5 rounded text-indigo-300">a, b, ε</code>).
            </p>
            <input
              type="text"
              value={edgeSymbolModal.symbolsStr}
              onChange={(e) =>
                setEdgeSymbolModal({ ...edgeSymbolModal, symbolsStr: e.target.value })
              }
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  const syms = edgeSymbolModal.symbolsStr.split(',').map((s) => s.trim());
                  if (edgeSymbolModal.edgeId) {
                    updateTransitionSymbols(edgeSymbolModal.edgeId, syms);
                  } else if (edgeSymbolModal.source && edgeSymbolModal.target) {
                    syms.forEach((sym) => addTransition(edgeSymbolModal.source!, edgeSymbolModal.target!, sym));
                  }
                  setEdgeSymbolModal(null);
                }
              }}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500 mb-4"
            />
            <div className="flex justify-between gap-2">
              {edgeSymbolModal.edgeId && (
                <button
                  onClick={() => {
                    deleteTransition(edgeSymbolModal.edgeId!);
                    setEdgeSymbolModal(null);
                  }}
                  className="px-3 py-2 bg-rose-950/80 hover:bg-rose-900 text-rose-300 rounded-xl text-xs font-medium transition"
                >
                  Delete Transition
                </button>
              )}
              <div className="flex gap-2 ml-auto">
                <button
                  onClick={() => setEdgeSymbolModal(null)}
                  className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-medium transition"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    const syms = edgeSymbolModal.symbolsStr.split(',').map((s) => s.trim());
                    if (edgeSymbolModal.edgeId) {
                      updateTransitionSymbols(edgeSymbolModal.edgeId, syms);
                    } else if (edgeSymbolModal.source && edgeSymbolModal.target) {
                      syms.forEach((sym) => addTransition(edgeSymbolModal.source!, edgeSymbolModal.target!, sym));
                    }
                    setEdgeSymbolModal(null);
                  }}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-medium transition"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Rename State Modal */}
      {renameModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-700/80 p-6 rounded-2xl shadow-2xl w-80 max-w-full text-slate-100">
            <h3 className="text-base font-semibold mb-2">Rename State</h3>
            <input
              type="text"
              value={renameModal.currentLabel}
              onChange={(e) =>
                setRenameModal({ ...renameModal, currentLabel: e.target.value })
              }
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  updateState(renameModal.nodeId, { label: renameModal.currentLabel });
                  setRenameModal(null);
                }
              }}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500 mb-4"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setRenameModal(null)}
                className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-medium transition"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  updateState(renameModal.nodeId, { label: renameModal.currentLabel });
                  setRenameModal(null);
                }}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-medium transition"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
