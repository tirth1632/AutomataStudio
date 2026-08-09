import React, { memo } from 'react';
import { EdgeLabelRenderer, useNodes } from '@xyflow/react';
import type { EdgeProps } from '@xyflow/react';

const NODE_RADIUS = 40; // 80px circle / 2
const ARROW_OFFSET = 1.5; // Setback to ensure arrowhead tip touches outer node border seamlessly

interface ExtendedEdgeData {
  symbols?: string[];
  isActive?: boolean;
  isSelfLoop?: boolean;
  isBidirectional?: boolean;
  color?: string;
  sourceCenter?: { x: number; y: number };
  targetCenter?: { x: number; y: number };
}

/**
 * Pushes edge label pill coordinates outward if they land within 56px of any state node center,
 * guaranteeing edge labels never float inside or overlap state circles.
 */
function keepLabelClearOfNodes(
  lx: number,
  ly: number,
  srcCenter: { x: number; y: number },
  tgtCenter: { x: number; y: number }
): { x: number; y: number } {
  const MIN_DIST = 58; // 40px radius + 18px clearance margin

  let outX = lx;
  let outY = ly;

  // Check source node clearance
  const dsx = outX - srcCenter.x;
  const dsy = outY - srcCenter.y;
  const distS = Math.sqrt(dsx * dsx + dsy * dsy);
  if (distS < MIN_DIST && distS > 0) {
    const push = MIN_DIST - distS + 8;
    outX += (dsx / distS) * push;
    outY += (dsy / distS) * push;
  }

  // Check target node clearance
  const dtx = outX - tgtCenter.x;
  const dty = outY - tgtCenter.y;
  const distT = Math.sqrt(dtx * dtx + dty * dty);
  if (distT < MIN_DIST && distT > 0) {
    const push = MIN_DIST - distT + 8;
    outX += (dtx / distT) * push;
    outY += (dty / distT) * push;
  }

  return { x: outX, y: outY };
}

/**
 * Computes smooth curved circle-to-circle paths with exact perimeter connections
 * so arrowheads connect seamlessly to state node borders facing exact curve tangents.
 */
function getClearEdgePath(
  srcCenter: { x: number; y: number },
  tgtCenter: { x: number; y: number },
  isSelfLoop: boolean,
  isBidirectional: boolean
): { path: string; labelX: number; labelY: number } {
  const sx = srcCenter.x;
  const sy = srcCenter.y;
  const tx = tgtCenter.x;
  const ty = tgtCenter.y;

  if (isSelfLoop) {
    // Teardrop self-loop floating above top border of the node circle
    const thetaA = -Math.PI / 2 - 0.45;
    const thetaB = -Math.PI / 2 + 0.45;

    const Ax = sx + NODE_RADIUS * Math.cos(thetaA);
    const Ay = sy + NODE_RADIUS * Math.sin(thetaA);
    const Bx = sx + NODE_RADIUS * Math.cos(thetaB);
    const By = sy + NODE_RADIUS * Math.sin(thetaB);

    const nAx = Math.cos(thetaA);
    const nAy = Math.sin(thetaA);
    const nBx = Math.cos(thetaB);
    const nBy = Math.sin(thetaB);

    const loopH = 54;
    const C1x = Ax + nAx * loopH;
    const C1y = Ay + nAy * loopH;
    const C2x = Bx + nBx * loopH;
    const C2y = By + nBy * loopH;

    const path = `M ${Ax} ${Ay} C ${C1x} ${C1y} ${C2x} ${C2y} ${Bx} ${By}`;

    return {
      path,
      labelX: sx,
      labelY: sy - NODE_RADIUS - loopH - 12,
    };
  }

  // Vector from source center to target center
  const dx = tx - sx;
  const dy = ty - sy;
  const dist = Math.sqrt(dx * dx + dy * dy) || 1;

  // Unit vector along direction of travel
  const ux = dx / dist;
  const uy = dy / dist;

  // Right-hand normal vector (rotated 90deg clockwise: (ux, uy) -> (uy, -ux))
  const rx = uy;
  const ry = -ux;

  const archH = isBidirectional ? 28 : 18;

  // Midpoint between centers
  const mx = (sx + tx) / 2;
  const my = (sy + ty) / 2;

  // Curve control point P1 offset along normal
  const cpx = mx + rx * archH;
  const cpy = my + ry * archH;

  // Vector from P1 to target node center
  const vTgtX = tx - cpx;
  const vTgtY = ty - cpy;
  const lenTgt = Math.sqrt(vTgtX * vTgtX + vTgtY * vTgtY) || 1;
  const uTgtX = vTgtX / lenTgt;
  const uTgtY = vTgtY / lenTgt;

  // Target border endpoint P2 (tip lands on perimeter of node circle facing tangent)
  const endX = tx - uTgtX * (NODE_RADIUS + ARROW_OFFSET);
  const endY = ty - uTgtY * (NODE_RADIUS + ARROW_OFFSET);

  // Vector from source node center to P1
  const vSrcX = cpx - sx;
  const vSrcY = cpy - sy;
  const lenSrc = Math.sqrt(vSrcX * vSrcX + vSrcY * vSrcY) || 1;
  const uSrcX = vSrcX / lenSrc;
  const uSrcY = vSrcY / lenSrc;

  // Source border endpoint P0
  const startX = sx + uSrcX * (NODE_RADIUS + 2);
  const startY = sy + uSrcY * (NODE_RADIUS + 2);

  const path = `M ${startX} ${startY} Q ${cpx} ${cpy} ${endX} ${endY}`;

  // Quadratic Bezier midpoint at t = 0.5 offset along normal
  const rawLabelX = 0.25 * startX + 0.5 * cpx + 0.25 * endX + rx * 10;
  const rawLabelY = 0.25 * startY + 0.5 * cpy + 0.25 * endY + ry * 10;

  const { x: labelX, y: labelY } = keepLabelClearOfNodes(rawLabelX, rawLabelY, srcCenter, tgtCenter);

  return { path, labelX, labelY };
}

export const AutomataEdge: React.FC<EdgeProps> = memo(({ id, source, target, selected, markerEnd, data }) => {
  const nodes = useNodes();
  const sourceNode = nodes.find((n) => n.id === source);
  const targetNode = nodes.find((n) => n.id === target);

  const edgeData = (data || {}) as ExtendedEdgeData;
  const {
    symbols = ['0'],
    isActive = false,
    isSelfLoop = false,
    isBidirectional = false,
    sourceCenter,
    targetCenter,
  } = edgeData;

  const effectiveSourceCenter = sourceNode
    ? { x: sourceNode.position.x + NODE_RADIUS, y: sourceNode.position.y + NODE_RADIUS }
    : sourceCenter;

  const effectiveTargetCenter = targetNode
    ? { x: targetNode.position.x + NODE_RADIUS, y: targetNode.position.y + NODE_RADIUS }
    : targetCenter;

  const label = symbols.join(', ');

  if (!effectiveSourceCenter || !effectiveTargetCenter) {
    return null;
  }

  const { path: edgePath, labelX, labelY } = getClearEdgePath(
    effectiveSourceCenter,
    effectiveTargetCenter,
    isSelfLoop,
    isBidirectional
  );

  const isPurpleScheme = edgeData.color === '#c084fc' || edgeData.color === '#a855f7';

  const strokeColor = isActive
    ? isPurpleScheme ? '#c084fc' : '#38bdf8' // active simulation edge glow
    : selected
    ? '#818cf8' // selected edge (indigo-400)
    : '#94a3b8'; // default crisp slate-400 edge

  const strokeWidth = isActive ? 3.5 : selected ? 3 : 2;

  return (
    <>
      {/* Outer glow during active simulation */}
      {isActive && (
        <path
          d={edgePath}
          fill="none"
          stroke={isPurpleScheme ? '#9333ea' : '#0284c7'}
          strokeWidth={8}
          strokeOpacity={0.5}
          markerEnd={markerEnd}
        />
      )}

      {/* Main edge path */}
      <path
        id={id}
        d={edgePath}
        fill="none"
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        markerEnd={markerEnd}
        style={{ transition: 'stroke 0.2s, stroke-width 0.2s' }}
      />

      {/* Animated Flowing Particles on Active Edge */}
      {isActive && (
        <path
          d={edgePath}
          fill="none"
          stroke="#ffffff"
          strokeWidth={2.5}
          strokeDasharray="6 6"
          style={{ animation: 'edge-flow 0.5s linear infinite' }}
        />
      )}

      {/* Edge label pill */}
      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            pointerEvents: 'all',
            zIndex: 30,
          }}
          className="nodrag nopan"
        >
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '4px 10px',
              borderRadius: 9999,
              fontSize: 13,
              fontWeight: 700,
              fontFamily: '"JetBrains Mono", "Fira Code", monospace',
              background: '#090d16',
              color: isActive ? '#38bdf8' : selected ? '#a5b4fc' : '#f1f5f9',
              border: `1.5px solid ${isActive ? '#38bdf8' : selected ? '#818cf8' : '#334155'}`,
              boxShadow: isActive
                ? '0 0 12px rgba(56, 189, 248, 0.4), 0 2px 6px rgba(0,0,0,0.6)'
                : '0 4px 12px rgba(0, 0, 0, 0.6)',
              whiteSpace: 'nowrap',
              lineHeight: 1,
              backdropFilter: 'blur(8px)',
            }}
          >
            {label}
          </div>
        </div>
      </EdgeLabelRenderer>
    </>
  );
});

AutomataEdge.displayName = 'AutomataEdge';
