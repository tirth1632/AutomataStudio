import React, { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import type { NodeProps } from '@xyflow/react';
import type { StateNodeData } from '../../types/automata';

function getDynamicStateDescription(
  rawId: string,
  label: string,
  isStart?: boolean,
  isAccept?: boolean
): string {
  let text = '';

  // 1. If label is provided and is a custom description like "Got 101" or "Ends with 0", use label directly
  if (label && label.trim() !== rawId && !label.startsWith('(')) {
    text = label.trim();
  }
  // 2. Handle explicit even/odd state identifiers ONLY if explicitly named q_EE, q_EO, q_OE, q_OO
  else if (rawId === 'q_EE') {
    text = 'Even 0s, Even 1s';
  } else if (rawId === 'q_EO') {
    text = 'Even 0s, Odd 1s';
  } else if (rawId === 'q_OE') {
    text = 'Odd 0s, Even 1s';
  } else if (rawId === 'q_OO') {
    text = 'Odd 0s, Odd 1s';
  } else if (isStart && isAccept) {
    text = 'Start, Accept';
  } else if (isStart) {
    text = 'Start';
  } else if (isAccept) {
    text = 'Accept';
  }

  if (!text) return '';

  if (text.startsWith('(') && text.endsWith(')')) {
    text = text.slice(1, -1).trim();
  }

  return `(${text})`;
}

export const AutomataNode: React.FC<NodeProps> = memo(({ data, selected }) => {
  const nd = data as unknown as StateNodeData;
  const { stateId, label, isStart, isAccept, isCurrent, isVisited, isRejected, stateIndex = 0, dfaTag, colorScheme, isAnnotation } = nd;

  if (isAnnotation) {
    const isEmerald = colorScheme === 'emerald' || dfaTag === 'DFA B' || stateId.startsWith('B_');
    return (
      <div
        className={`px-4 py-2 rounded-2xl font-sans font-bold text-xs shadow-2xl border backdrop-blur-xl flex items-center justify-center gap-2 cursor-default select-none transition-all duration-200 whitespace-nowrap ${
          isEmerald
            ? 'bg-emerald-950/95 text-emerald-300 border-emerald-500/60 shadow-emerald-950/60 ring-1 ring-emerald-500/30'
            : 'bg-indigo-950/95 text-indigo-300 border-indigo-500/60 shadow-indigo-950/60 ring-1 ring-indigo-500/30'
        }`}
      >
        <span className={`w-2.5 h-2.5 rounded-full ${isEmerald ? 'bg-emerald-400' : 'bg-indigo-400'}`} />
        <span className="font-mono text-xs font-bold uppercase tracking-wider">{label || stateId}</span>
      </div>
    );
  }

  const rawId = (stateId || 'q0').trim();

  // Clean raw ID for display inside circle (remove A_ or B_ prefix)
  const cleanIdForDisplay = rawId.replace(/^[AB]_/, '');

  // Detect complex/tuple state IDs like "(q0, q0)", "{q0, q1}", "q0_q1"
  const isComplexState =
    cleanIdForDisplay.includes('(') ||
    cleanIdForDisplay.includes('{') ||
    cleanIdForDisplay.includes(',') ||
    (cleanIdForDisplay.includes('_') && !cleanIdForDisplay.startsWith('q_') && !/^q\d+_\w+$/.test(cleanIdForDisplay));

  // 1. Primary Title inside circle: Simple q0, q1, q2...
  const displayTitle = isComplexState ? `q${stateIndex}` : cleanIdForDisplay;

  // 2. Subtitle Description inside circle: Wrapped in parens e.g. (Start), (Got 1), (Got 101)
  const secondaryText = getDynamicStateDescription(cleanIdForDisplay, label, isStart, isAccept);

  const displayDesc = secondaryText.length > 24 ? secondaryText.slice(0, 23) + '…)' : secondaryText;
  const titleFontSize = displayTitle.length > 8 ? 12 : displayTitle.length > 5 ? 14 : 18;

  const isPurpleScheme = colorScheme === 'indigo' || dfaTag === 'Original NFA';

  const borderColor = isCurrent
    ? (isPurpleScheme ? '#a855f7' : '#38bdf8')
    : isRejected
      ? '#ef4444'
      : selected
        ? '#818cf8'
        : isStart
          ? '#3b82f6'
          : isAccept
            ? '#10b981'
            : isVisited
              ? '#60a5fa'
              : '#475569';

  const bg = isCurrent
    ? (isPurpleScheme ? '#3b0764' : '#082f49')
    : isRejected
      ? '#450a0a'
      : isStart
        ? '#1e3a8a'
        : isAccept
          ? '#062e25'
          : isVisited
            ? '#1e293b'
            : '#1e293b';

  const glow = isCurrent
    ? (isPurpleScheme
        ? '0 0 0 5px rgba(168,85,247,0.7), 0 0 30px rgba(168,85,247,0.6)'
        : '0 0 0 5px rgba(56,189,248,0.7), 0 0 30px rgba(56,189,248,0.6)')
    : isRejected
      ? '0 0 0 4px rgba(239,68,68,0.6), 0 0 22px rgba(239,68,68,0.4)'
      : selected
        ? '0 0 0 3px rgba(129,140,248,0.7)'
        : isStart
          ? '0 0 0 3px rgba(59,130,246,0.4), 0 0 15px rgba(59,130,246,0.3)'
          : isAccept
            ? '0 0 0 2px rgba(16,185,129,0.4), 0 0 12px rgba(16,185,129,0.2)'
            : '0 2px 8px rgba(0,0,0,0.4)';

  const primaryColor = isCurrent ? (isPurpleScheme ? '#e9d5ff' : '#bae6fd') : isRejected ? '#fca5a5' : '#f8fafc';
  const descColor = isCurrent ? (isPurpleScheme ? '#c084fc' : '#38bdf8') : isRejected ? '#f87171' : '#94a3b8';

  return (
    <div
      style={{
        width: 80,
        height: 80,
        borderRadius: 9999,
        border: `3px solid ${borderColor}`,
        background: bg,
        boxShadow: glow,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        cursor: 'grab',
        userSelect: 'none',
        transition: 'all 0.2s ease',
        zIndex: 20,
      }}
    >
      {/* ── 4 Cardinal Connection Handle Dots on Border to Extend Transitions ── */}
      {/* TOP HANDLE DOT */}
      <Handle
        type="target"
        position={Position.Top}
        id="top-target"
        style={{
          width: 6,
          height: 6,
          borderRadius: 9999,
          background: '#0f172a',
          border: '1.5px solid #38bdf8',
          boxShadow: '0 0 4px rgba(56, 189, 248, 0.7)',
          top: -3,
          left: '50%',
          transform: 'translateX(-50%)',
          cursor: 'crosshair',
          zIndex: 35,
        }}
        title="Drag to extend transition"
      />
      <Handle
        type="source"
        position={Position.Top}
        id="top-source"
        style={{
          width: 6,
          height: 6,
          borderRadius: 9999,
          background: '#38bdf8',
          border: '1.5px solid #ffffff',
          boxShadow: '0 0 5px rgba(56, 189, 248, 0.8)',
          top: -3,
          left: '50%',
          transform: 'translateX(-50%)',
          cursor: 'crosshair',
          zIndex: 40,
        }}
        title="Drag to extend transition"
      />

      {/* RIGHT HANDLE DOT */}
      <Handle
        type="target"
        position={Position.Right}
        id="right-target"
        style={{
          width: 6,
          height: 6,
          borderRadius: 9999,
          background: '#0f172a',
          border: '1.5px solid #38bdf8',
          boxShadow: '0 0 4px rgba(56, 189, 248, 0.7)',
          right: -3,
          top: '50%',
          transform: 'translateY(-50%)',
          cursor: 'crosshair',
          zIndex: 35,
        }}
        title="Drag to extend transition"
      />
      <Handle
        type="source"
        position={Position.Right}
        id="right-source"
        style={{
          width: 6,
          height: 6,
          borderRadius: 9999,
          background: '#38bdf8',
          border: '1.5px solid #ffffff',
          boxShadow: '0 0 5px rgba(56, 189, 248, 0.8)',
          right: -3,
          top: '50%',
          transform: 'translateY(-50%)',
          cursor: 'crosshair',
          zIndex: 40,
        }}
        title="Drag to extend transition"
      />

      {/* BOTTOM HANDLE DOT */}
      <Handle
        type="target"
        position={Position.Bottom}
        id="bottom-target"
        style={{
          width: 6,
          height: 6,
          borderRadius: 9999,
          background: '#0f172a',
          border: '1.5px solid #38bdf8',
          boxShadow: '0 0 4px rgba(56, 189, 248, 0.7)',
          bottom: -3,
          left: '50%',
          transform: 'translateX(-50%)',
          cursor: 'crosshair',
          zIndex: 35,
        }}
        title="Drag to extend transition"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="bottom-source"
        style={{
          width: 6,
          height: 6,
          borderRadius: 9999,
          background: '#38bdf8',
          border: '1.5px solid #ffffff',
          boxShadow: '0 0 5px rgba(56, 189, 248, 0.8)',
          bottom: -3,
          left: '50%',
          transform: 'translateX(-50%)',
          cursor: 'crosshair',
          zIndex: 40,
        }}
        title="Drag to extend transition"
      />

      {/* LEFT HANDLE DOT */}
      <Handle
        type="target"
        position={Position.Left}
        id="left-target"
        style={{
          width: 6,
          height: 6,
          borderRadius: 9999,
          background: '#0f172a',
          border: '1.5px solid #38bdf8',
          boxShadow: '0 0 4px rgba(56, 189, 248, 0.7)',
          left: -3,
          top: '50%',
          transform: 'translateY(-50%)',
          cursor: 'crosshair',
          zIndex: 35,
        }}
        title="Drag to extend transition"
      />
      <Handle
        type="source"
        position={Position.Left}
        id="left-source"
        style={{
          width: 6,
          height: 6,
          borderRadius: 9999,
          background: '#38bdf8',
          border: '1.5px solid #ffffff',
          boxShadow: '0 0 5px rgba(56, 189, 248, 0.8)',
          left: -3,
          top: '50%',
          transform: 'translateY(-50%)',
          cursor: 'crosshair',
          zIndex: 40,
        }}
        title="Drag to extend transition"
      />

      {/* START STATE ARROW BADGE (Absolute positioned to the left of the node circle) */}
      {isStart && (
        <div
          style={{
            position: 'absolute',
            right: 'calc(100% + 10px)',
            top: '50%',
            transform: 'translateY(-50%)',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            pointerEvents: 'none',
            whiteSpace: 'nowrap',
            zIndex: 30,
          }}
        >
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: '#93c5fd',
              background: '#1e3a8a',
              border: '1.5px solid #3b82f6',
              borderRadius: 9999,
              padding: '2px 8px',
              boxShadow: '0 2px 6px rgba(0,0,0,0.4)',
              letterSpacing: '0.02em',
            }}
          >
            start
          </span>
          <svg width="22" height="16" viewBox="0 0 22 16" fill="none">
            <path
              d="M1 8h17M12 2l9 6-9 6"
              stroke="#3b82f6"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      )}

      {/* ACCEPT STATE DOUBLE CIRCLE */}
      {isAccept && (
        <div
          style={{
            position: 'absolute',
            inset: 5,
            borderRadius: 9999,
            border: `2px solid ${isCurrent ? '#60a5fa' : '#10b981'}`,
            pointerEvents: 'none',
          }}
        />
      )}

      {/* STATE TEXT */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          zIndex: 25,
          lineHeight: 1.15,
          width: '100%',
        }}
      >
        <span
          style={{
            fontSize: titleFontSize,
            fontWeight: 800,
            color: primaryColor,
            fontFamily: '"JetBrains Mono", "Fira Code", monospace',
            letterSpacing: '-0.01em',
            maxWidth: 68,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {displayTitle}
        </span>

        {displayDesc ? (
          <span
            style={{
              fontSize: 10,
              fontWeight: 600,
              color: descColor,
              fontFamily: 'Inter, system-ui, sans-serif',
              marginTop: 2,
              wordBreak: 'break-word',
              overflowWrap: 'break-word',
              maxWidth: 68,
            }}
          >
            {displayDesc}
          </span>
        ) : null}
      </div>

      {/* CURRENT STATE ANIMATED PULSE */}
      {isCurrent && (
        <div
          style={{
            position: 'absolute',
            inset: -6,
            borderRadius: 9999,
            border: `2px solid ${isPurpleScheme ? 'rgba(168, 85, 247, 0.7)' : 'rgba(56, 189, 248, 0.7)'}`,
            animation: 'ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite',
            pointerEvents: 'none',
          }}
        />
      )}
    </div>
  );
});

AutomataNode.displayName = 'AutomataNode';
