import type { AutomatonGraph } from '../types/automata';
import { exportToJFLAP } from '../algorithms/jflapParser';

export { exportToJFLAP };

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    document.body.appendChild(textarea);
    textarea.select();
    const success = document.execCommand('copy');
    document.body.removeChild(textarea);
    return success;
  }
}

export function downloadFile(filename: string, content: string, mimeType = 'text/plain') {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Converts AutomatonGraph into formal LaTeX TikZ package syntax for research papers & course homework.
 */
export function exportToLaTeX(graph: AutomatonGraph, promptDescription = ''): string {
  const stateNames = graph.states.map((s) => s.id).join(', ');
  const alphabetStr = (graph.alphabet || ['0', '1']).join(', ');
  const startState = graph.states.find((s) => s.isStart)?.id || 'q0';
  const acceptStates = graph.states.filter((s) => s.isAccept).map((s) => s.id).join(', ');

  let latex = `% Formal ${graph.type || 'Automaton'} Definition & TikZ Diagram for: ${promptDescription || graph.name}\n`;
  latex += `\\documentclass{article}\n`;
  latex += `\\usepackage{tikz}\n`;
  latex += `\\usetikzlibrary{automata,positioning,arrows.meta}\n`;
  latex += `\\begin{document}\n\n`;

  latex += `\\subsection*{Formal Definition}\n`;
  latex += `Given Automaton $M = (Q, \\Sigma, \\delta, q_0, F)$ where:\n`;
  latex += `\\begin{itemize}\n`;
  latex += `  \\item $Q = \\{ ${stateNames} \\}$\n`;
  latex += `  \\item $\\Sigma = \\{ ${alphabetStr} \\}$\n`;
  latex += `  \\item $q_0 = ${startState}$\n`;
  latex += `  \\item $F = \\{ ${acceptStates} \\}$\n`;
  latex += `\\end{itemize}\n\n`;

  latex += `\\subsection*{Transition Function $\\delta$}\n`;
  latex += `\\begin{tabular}{|c|${(graph.alphabet || ['0', '1']).map(() => 'c').join('|')}|}\n`;
  latex += `\\hline\n State & ${ (graph.alphabet || ['0', '1']).join(' & ') } \\\\\n\\hline\n`;

  graph.states.forEach((s) => {
    const rowHeader = `${s.isStart ? '$\\rightarrow$ ' : ''}${s.isAccept ? '*' : ''}${s.id}`;
    const cols = (graph.alphabet || ['0', '1']).map((sym) => {
      const edges = graph.transitions.filter((t) => t.source === s.id && t.symbols.includes(sym));
      if (edges.length === 0) return '\\emptyset';
      const targets = Array.from(new Set(edges.map((e) => e.target)));
      return targets.length === 1 ? targets[0] : `\\{ ${targets.join(', ')} \\}`;
    });
    latex += `${rowHeader} & ${cols.join(' & ')} \\\\\n`;
  });

  latex += `\\hline\n\\end{tabular}\n\n`;

  latex += `\\subsection*{Automaton TikZ Diagram}\n`;
  latex += `\\begin{tikzpicture}[shorten >=1pt,node distance=2.5cm,on grid,auto,>={Stealth[length=2mm]}]\n`;

  graph.states.forEach((s, idx) => {
    const opts: string[] = ['state'];
    if (s.isStart) opts.push('initial');
    if (s.isAccept) opts.push('accepting');
    const pos = idx === 0 ? '' : `, right=of ${graph.states[idx - 1].id}`;
    latex += `  \\node[${opts.join(', ')}] (${s.id})${pos} {$${s.label || s.id}$};\n`;
  });

  latex += `  \\path[->]\n`;

  graph.transitions.forEach((t) => {
    const syms = t.symbols.join(',');
    if (t.source === t.target) {
      latex += `    (${t.source}) edge [loop above] node {${syms}} (${t.target})\n`;
    } else {
      latex += `    (${t.source}) edge node {${syms}} (${t.target})\n`;
    }
  });

  latex += `  ;\n`;
  latex += `\\end{tikzpicture}\n\n`;
  latex += `\\end{document}\n`;

  return latex;
}

export function exportToText(graph: AutomatonGraph): string {
  const states = graph.states.map((s) => s.id).join(', ');
  const alphabet = (graph.alphabet || ['0', '1']).join(', ');
  const start = graph.states.find((s) => s.isStart)?.id || 'q0';
  const accepts = graph.states.filter((s) => s.isAccept).map((s) => s.id).join(', ');

  let txt = `${graph.type || 'DFA'} FORMAL DEFINITION & STRUCTURE\n`;
  txt += `===================================\n`;
  txt += `Automaton Name: ${graph.name}\n`;
  txt += `Type: ${graph.type || 'DFA'}\n`;
  txt += `States (Q): { ${states} }\n`;
  txt += `Alphabet (Σ): { ${alphabet} }\n`;
  txt += `Start State (q0): ${start}\n`;
  txt += `Accept States (F): { ${accepts} }\n\n`;

  txt += `TRANSITION FUNCTION TABLE\n`;
  txt += `---------------------------\n`;
  txt += `State\t|\t${(graph.alphabet || ['0', '1']).join('\t|\t')}\n`;
  txt += `-----\t+${(graph.alphabet || ['0', '1']).map(() => '\t-------').join('')}\n`;

  graph.states.forEach((s) => {
    const prefix = `${s.isStart ? '-> ' : ''}${s.isAccept ? '*' : ''}`;
    const rowVals = (graph.alphabet || ['0', '1']).map((sym) => {
      const edges = graph.transitions.filter((t) => t.source === s.id && t.symbols.includes(sym));
      if (edges.length === 0) return '-';
      const targets = Array.from(new Set(edges.map((e) => e.target)));
      return targets.length === 1 ? targets[0] : `{${targets.join(',')}}`;
    });
    txt += `${prefix}${s.id}\t|\t${rowVals.join('\t|\t')}\n`;
  });

  return txt;
}

export function exportToCSV(graph: AutomatonGraph): string {
  const alphabet = graph.alphabet || ['0', '1'];
  let csv = `State,IsStart,IsAccept,${alphabet.join(',')}\n`;

  graph.states.forEach((s) => {
    const rowVals = alphabet.map((sym) => {
      const edges = graph.transitions.filter((t) => t.source === s.id && t.symbols.includes(sym));
      if (edges.length === 0) return '';
      const targets = Array.from(new Set(edges.map((e) => e.target)));
      return targets.length === 1 ? targets[0] : `{${targets.join('; ')}}`;
    });
    csv += `"${s.id}",${s.isStart},${s.isAccept},${rowVals.map((v) => `"${v}"`).join(',')}\n`;
  });

  return csv;
}

export function exportToJSON(graph: AutomatonGraph): string {
  return JSON.stringify(graph, null, 2);
}

/* ── Graph Simulation & Path Trajectory Helpers ── */

export interface StringEvaluationResult {
  accepted: boolean;
  path: string[];
  trajectory: Array<{ from: string; symbol: string; to: string }>;
}

export function simulateGraphStringWithPath(
  graph: AutomatonGraph,
  inputStr: string
): StringEvaluationResult {
  const startState = graph.states.find((s) => s.isStart)?.id || graph.states[0]?.id || 'q0';
  const acceptSet = new Set(graph.states.filter((s) => s.isAccept).map((s) => s.id));

  const hasEpsilon = graph.transitions.some((t) =>
    t.symbols.some((sym) => sym === 'ε' || sym === 'e' || sym === 'epsilon')
  );

  if (!hasEpsilon && (graph.type === 'DFA' || !graph.type)) {
    let current = startState;
    const path = [current];
    const trajectory: Array<{ from: string; symbol: string; to: string }> = [];

    for (const sym of inputStr) {
      const edge = graph.transitions.find(
        (t) => t.source === current && t.symbols.includes(sym)
      );
      if (!edge) {
        return { accepted: false, path, trajectory };
      }
      trajectory.push({ from: current, symbol: sym, to: edge.target });
      current = edge.target;
      path.push(current);
    }

    return {
      accepted: acceptSet.has(current),
      path,
      trajectory,
    };
  } else {
    // NFA / ε-NFA Simulation with Path Trajectory
    const getEpsilonClosure = (states: Set<string>): Set<string> => {
      const closure = new Set(states);
      const queue = Array.from(states);
      while (queue.length > 0) {
        const curr = queue.shift()!;
        const epsEdges = graph.transitions.filter(
          (t) =>
            t.source === curr &&
            t.symbols.some((sym) => sym === 'ε' || sym === 'e' || sym === 'epsilon')
        );
        for (const edge of epsEdges) {
          if (!closure.has(edge.target)) {
            closure.add(edge.target);
            queue.push(edge.target);
          }
        }
      }
      return closure;
    };

    type QueueNode = {
      state: string;
      strIndex: number;
      path: string[];
      trajectory: Array<{ from: string; symbol: string; to: string }>;
    };

    const initialClosure = getEpsilonClosure(new Set([startState]));
    const queue: QueueNode[] = Array.from(initialClosure).map((st) => ({
      state: st,
      strIndex: 0,
      path: [startState, ...(st !== startState ? [st] : [])],
      trajectory: st !== startState ? [{ from: startState, symbol: 'ε', to: st }] : [],
    }));

    let bestFailedResult: StringEvaluationResult = {
      accepted: false,
      path: [startState],
      trajectory: [],
    };

    const visited = new Set<string>();

    while (queue.length > 0) {
      const { state, strIndex, path, trajectory } = queue.shift()!;
      const key = `${state}:${strIndex}`;
      if (visited.has(key)) continue;
      visited.add(key);

      if (strIndex === inputStr.length) {
        if (acceptSet.has(state)) {
          return { accepted: true, path, trajectory };
        }
        bestFailedResult = { accepted: false, path, trajectory };
        continue;
      }

      const sym = inputStr[strIndex];
      const edges = graph.transitions.filter((t) => t.source === state);
      for (const edge of edges) {
        if (edge.symbols.includes(sym)) {
          const nextClosure = getEpsilonClosure(new Set([edge.target]));
          for (const nextSt of nextClosure) {
            const nextPath = [...path, edge.target];
            const nextTraj = [...trajectory, { from: state, symbol: sym, to: edge.target }];
            if (nextSt !== edge.target) {
              nextPath.push(nextSt);
              nextTraj.push({ from: edge.target, symbol: 'ε', to: nextSt });
            }
            queue.push({
              state: nextSt,
              strIndex: strIndex + 1,
              path: nextPath,
              trajectory: nextTraj,
            });
          }
        }
      }
    }

    return bestFailedResult;
  }
}

export interface SampleStringItem {
  input: string;
  displayInput: string;
  accepted: boolean;
  path: string[];
  trajectory: Array<{ from: string; symbol: string; to: string }>;
}

export function getGraphSampleStrings(graph: AutomatonGraph): {
  accepted: SampleStringItem[];
  rejected: SampleStringItem[];
} {
  const symbolSet = new Set<string>();
  (graph.alphabet || []).forEach((s) => {
    if (s && s !== 'ε' && s !== 'e' && s !== 'epsilon') symbolSet.add(s.trim());
  });
  graph.transitions.forEach((t) => {
    t.symbols.forEach((s) => {
      if (s && s !== 'ε' && s !== 'e' && s !== 'epsilon') symbolSet.add(s.trim());
    });
  });
  const alphabet = symbolSet.size > 0 ? Array.from(symbolSet).sort() : ['0', '1'];

  const acceptedList: SampleStringItem[] = [];
  const rejectedList: SampleStringItem[] = [];

  const queue: string[] = [''];
  const visitedStrings = new Set<string>();

  while (queue.length > 0 && (acceptedList.length < 4 || rejectedList.length < 4)) {
    const currStr = queue.shift()!;
    if (visitedStrings.has(currStr)) continue;
    visitedStrings.add(currStr);

    const evalResult = simulateGraphStringWithPath(graph, currStr);
    const displayInput = currStr === '' ? 'ε (empty string)' : currStr;

    const item: SampleStringItem = {
      input: currStr,
      displayInput,
      accepted: evalResult.accepted,
      path: evalResult.path,
      trajectory: evalResult.trajectory,
    };

    if (evalResult.accepted) {
      if (acceptedList.length < 4) acceptedList.push(item);
    } else {
      if (rejectedList.length < 4) rejectedList.push(item);
    }

    if (currStr.length < 6 && visitedStrings.size < 256) {
      for (const sym of alphabet) {
        queue.push(currStr + sym);
      }
    }
  }

  return { accepted: acceptedList, rejected: rejectedList };
}

export function analyzeGraphProperties(graph: AutomatonGraph) {
  const symbolSet = new Set<string>();
  (graph.alphabet || []).forEach((s) => {
    if (s && s !== 'ε' && s !== 'e' && s !== 'epsilon') symbolSet.add(s.trim());
  });
  graph.transitions.forEach((t) => {
    t.symbols.forEach((s) => {
      if (s && s !== 'ε' && s !== 'e' && s !== 'epsilon') symbolSet.add(s.trim());
    });
  });
  const alphabet = symbolSet.size > 0 ? Array.from(symbolSet).sort() : ['0', '1'];

  const states = graph.states.map((s) => s.id);
  const startState = graph.states.find((s) => s.isStart)?.id || states[0] || 'q0';

  let isDeterministic = true;
  let nonDeterministicReason = '';

  const hasEpsilon = graph.transitions.some((t) =>
    t.symbols.some((sym) => sym === 'ε' || sym === 'e' || sym === 'epsilon')
  );

  if (hasEpsilon) {
    isDeterministic = false;
    nonDeterministicReason = 'Contains ε-transitions';
  } else {
    for (const stateId of states) {
      for (const sym of alphabet) {
        const matching = graph.transitions.filter(
          (t) => t.source === stateId && t.symbols.includes(sym)
        );
        if (matching.length > 1) {
          isDeterministic = false;
          nonDeterministicReason = `State ${stateId} has ${matching.length} outgoing transitions on symbol '${sym}'`;
          break;
        }
      }
      if (!isDeterministic) break;
    }
  }

  const missingPairs: string[] = [];
  for (const stateId of states) {
    for (const sym of alphabet) {
      const hasTrans = graph.transitions.some(
        (t) => t.source === stateId && t.symbols.includes(sym)
      );
      if (!hasTrans) {
        missingPairs.push(`${stateId} on '${sym}'`);
      }
    }
  }

  const isComplete = missingPairs.length === 0;

  const reachable = new Set<string>([startState]);
  const queue = [startState];
  while (queue.length > 0) {
    const curr = queue.shift()!;
    const outgoing = graph.transitions.filter((t) => t.source === curr);
    for (const edge of outgoing) {
      if (!reachable.has(edge.target)) {
        reachable.add(edge.target);
        queue.push(edge.target);
      }
    }
  }

  const totalTransitions = graph.transitions.reduce(
    (acc, t) => acc + (t.symbols ? t.symbols.length : 1),
    0
  );

  return {
    isDeterministic,
    nonDeterministicReason,
    isComplete,
    missingPairsCount: missingPairs.length,
    missingPairs,
    allReachable: reachable.size === states.length,
    unreachableCount: states.length - reachable.size,
    totalTransitions,
    alphabet,
  };
}

export function renderSVGAutomatonGraph(graph: AutomatonGraph): string {
  if (!graph.states || graph.states.length === 0) return '';

  const numStates = graph.states.length;
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  let allZero = true;

  graph.states.forEach((s) => {
    const x = s.x || 0;
    const y = s.y || 0;
    if (x !== 0 || y !== 0) allZero = false;
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
  });

  const statePosMap = new Map<string, { x: number; y: number }>();
  let width = 680;
  let height = 240;

  const isLinearChain = (maxY - minY) < 60;

  if (allZero) {
    const itemsPerRow = Math.min(numStates, 5);
    graph.states.forEach((s, idx) => {
      const col = idx % itemsPerRow;
      const row = Math.floor(idx / itemsPerRow);
      statePosMap.set(s.id, { x: 115 + col * 140, y: 90 + row * 120 });
    });
    width = Math.max(640, 115 + (itemsPerRow - 1) * 140 + 105);
    height = Math.max(220, 90 + (Math.ceil(numStates / itemsPerRow) - 1) * 120 + 75);
  } else {
    const paddingLeft = 115;
    const paddingTop = 90;
    const paddingRight = 105;
    const paddingBottom = 65;

    const rawW = maxX - minX;
    const rawH = maxY - minY;

    // Scale horizontal spacing if linear chain is very wide (> 550px) to fit comfortably in max 720px
    let xMultiplier = 1;
    if (rawW > 550 && isLinearChain) {
      xMultiplier = 520 / rawW;
    }

    graph.states.forEach((s) => {
      const x = ((s.x || 0) - minX) * xMultiplier + paddingLeft;
      const y = (s.y || 0) - minY + paddingTop;
      statePosMap.set(s.id, { x, y });
    });

    width = Math.max(620, Math.round(rawW * xMultiplier + paddingLeft + paddingRight));
    height = Math.max(220, Math.round(rawH + paddingTop + paddingBottom));
  }

  let svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" style="width: 100%; height: auto; background: #0f172a; border-radius: 12px; border: 1px solid #334155; margin-top: 10px; margin-bottom: 10px; box-sizing: border-box; display: block;">
    <defs>
      <marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="8" markerHeight="8" orient="auto">
        <path d="M 0 1.5 L 8 5 L 0 8.5 Z" fill="#818cf8" stroke="#818cf8" stroke-width="0.5" />
      </marker>
      <marker id="arrow-start" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto">
        <path d="M 0 1.5 L 8 5 L 0 8.5 Z" fill="#38bdf8" stroke="#38bdf8" stroke-width="0.5" />
      </marker>
    </defs>`;

  graph.transitions.forEach((t) => {
    const srcPos = statePosMap.get(t.source);
    const tgtPos = statePosMap.get(t.target);
    if (!srcPos || !tgtPos) return;

    const symbolsStr = (t.symbols || []).join(',');

    if (t.source === t.target) {
      const cx = srcPos.x;
      const cy = srcPos.y - 26;
      const pathD = `M ${cx - 14} ${cy - 8} A 22 22 0 1 1 ${cx + 14} ${cy - 8}`;
      const badgeW = Math.max(38, symbolsStr.length * 9 + 14);

      svgContent += `
        <path d="${pathD}" fill="none" stroke="#818cf8" stroke-width="2.2" marker-end="url(#arrow)" />
        <rect x="${cx - badgeW / 2}" y="${cy - 46}" width="${badgeW}" height="20" rx="5" fill="#1e1b4b" stroke="#6366f1" stroke-width="1.5"/>
        <text x="${cx}" y="${cy - 32}" fill="#e0e7ff" font-size="12" font-weight="bold" font-family="monospace" text-anchor="middle">${symbolsStr}</text>
      `;
    } else {
      const dx = tgtPos.x - srcPos.x;
      const dy = tgtPos.y - srcPos.y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      const ux = dx / dist;
      const uy = dy / dist;

      const hasReverse = graph.transitions.some(
        (rev) => rev.source === t.target && rev.target === t.source
      );

      let pathD = '';
      let midX = (srcPos.x + tgtPos.x) / 2;
      let midY = (srcPos.y + tgtPos.y) / 2;

      if (hasReverse || Math.abs(dy) > 50) {
        const nx = -dy / dist;
        const ny = dx / dist;
        const curveOffset = Math.abs(dy) > 50 ? 32 : 24;
        const ctrlX = midX + nx * curveOffset;
        const ctrlY = midY + ny * curveOffset;

        const tdx = tgtPos.x - ctrlX;
        const tdy = tgtPos.y - ctrlY;
        const tdist = Math.sqrt(tdx * tdx + tdy * tdy) || 1;
        const tux = tdx / tdist;
        const tuy = tdy / tdist;

        const sdx = ctrlX - srcPos.x;
        const sdy = ctrlY - srcPos.y;
        const sdist = Math.sqrt(sdx * sdx + sdy * sdy) || 1;
        const sux = sdx / sdist;
        const suy = sdy / sdist;

        const startX = srcPos.x + sux * 26;
        const startY = srcPos.y + suy * 26;
        const endX = tgtPos.x - tux * 27;
        const endY = tgtPos.y - tuy * 27;

        pathD = `M ${startX} ${startY} Q ${ctrlX} ${ctrlY} ${endX} ${endY}`;
        midX = ctrlX;
        midY = ctrlY;
      } else {
        const startX = srcPos.x + ux * 26;
        const startY = srcPos.y + uy * 26;
        const endX = tgtPos.x - ux * 27;
        const endY = tgtPos.y - uy * 27;
        pathD = `M ${startX} ${startY} L ${endX} ${endY}`;
      }

      const badgeW = Math.max(32, symbolsStr.length * 8 + 12);
      svgContent += `
        <path d="${pathD}" fill="none" stroke="#818cf8" stroke-width="2.2" marker-end="url(#arrow)" />
        <rect x="${midX - badgeW / 2}" y="${midY - 10}" width="${badgeW}" height="20" rx="5" fill="#1e1b4b" stroke="#6366f1" stroke-width="1.5"/>
        <text x="${midX}" y="${midY + 4}" fill="#e0e7ff" font-size="12" font-weight="bold" font-family="monospace" text-anchor="middle">${symbolsStr}</text>
      `;
    }
  });

  graph.states.forEach((s) => {
    const pos = statePosMap.get(s.id)!;

    if (s.isStart) {
      svgContent += `
        <rect x="${pos.x - 85}" y="${pos.y - 12}" width="46" height="24" rx="6" fill="#0284c7" stroke="#38bdf8" stroke-width="1.5"/>
        <text x="${pos.x - 62}" y="${pos.y + 4}" fill="#ffffff" font-size="11" font-weight="bold" font-family="sans-serif" text-anchor="middle">START</text>
        <path d="M ${pos.x - 39} ${pos.y} L ${pos.x - 27} ${pos.y}" fill="none" stroke="#38bdf8" stroke-width="2.5" marker-end="url(#arrow-start)" />
      `;
    }

    const nodeBg = s.isAccept ? '#1e1b4b' : '#1e293b';
    const strokeColor = s.isAccept ? '#10b981' : s.isStart ? '#38bdf8' : '#6366f1';

    svgContent += `
      <circle cx="${pos.x}" cy="${pos.y}" r="25" fill="${nodeBg}" stroke="${strokeColor}" stroke-width="3" />
    `;

    if (s.isAccept) {
      svgContent += `
        <circle cx="${pos.x}" cy="${pos.y}" r="19" fill="none" stroke="#10b981" stroke-width="2" />
      `;
    }

    const displayLabel = s.label && s.label !== s.id ? `${s.id}` : s.id;
    svgContent += `
      <text x="${pos.x}" y="${pos.y + 5}" fill="#f8fafc" font-size="13" font-weight="800" font-family="monospace" text-anchor="middle">${displayLabel}</text>
    `;
  });

  svgContent += `</svg>`;
  return svgContent;
}

export function renderStringExecutionGraph(item: SampleStringItem, acceptSet: Set<string>): string {
  if (!item.path || item.path.length === 0) {
    return `<span class="pill ${item.accepted ? 'pill-accept' : 'pill-reject'}">"${item.displayInput}"</span>`;
  }

  let flowHtml = `<div class="execution-flow-box">`;
  flowHtml += `<div className="flow-title">String "${item.displayInput}":</div>`;
  flowHtml += `<div class="flow-path">`;

  item.path.forEach((stateId, idx) => {
    const isAcc = acceptSet.has(stateId);
    const isStart = idx === 0;
    const isLast = idx === item.path.length - 1;

    let stateClass = 'flow-node';
    if (isAcc) stateClass += ' flow-node-accept';
    if (isStart) stateClass += ' flow-node-start';

    flowHtml += `<span class="${stateClass}">${stateId}</span>`;

    if (idx < item.path.length - 1 && item.trajectory[idx]) {
      const step = item.trajectory[idx];
      flowHtml += `<span class="flow-arrow">──(${step.symbol})──&gt;</span>`;
    }
  });

  const badgeClass = item.accepted ? 'badge-accept' : 'badge-reject';
  const badgeText = item.accepted ? '✓ ACCEPTED' : '✗ REJECTED';
  flowHtml += `<span class="flow-result ${badgeClass}">${badgeText}</span>`;
  flowHtml += `</div></div>`;

  return flowHtml;
}

/**
 * Generates an academic PDF report document and triggers print/PDF saving dialog.
 */
export function generateAcademicPDFReport(
  graph: AutomatonGraph,
  prompt: string,
  explanation?: any,
  stats?: any
) {
  const printWindow = window.open('', '_blank', 'width=1000,height=900');
  if (!printWindow) return;

  const now = new Date().toLocaleString();
  const graphType = graph.type || 'DFA';
  const alphabetStr = (graph.alphabet || ['0', '1']).join(', ');
  const stateNamesStr = graph.states.map((s) => s.id).join(', ');
  const startState = graph.states.find((s) => s.isStart)?.id || 'q0';
  const acceptStates = graph.states.filter((s) => s.isAccept).map((s) => s.id);
  const acceptStatesStr = acceptStates.join(', ');
  const acceptSet = new Set(acceptStates);

  const { accepted, rejected } = getGraphSampleStrings(graph);
  const graphProps = analyzeGraphProperties(graph);
  const svgDiagram = renderSVGAutomatonGraph(graph);

  const isDFA = graphType === 'DFA';
  const mappingFunctionSig = isDFA && graphProps.isDeterministic
    ? 'Mapping Q × Σ → Q'
    : 'Mapping Q × (Σ ∪ {ε}) → 2^Q';

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Automata Studio — Formal ${graphType} Report for ${prompt}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; margin: 40px; color: #0f172a; line-height: 1.5; background: #fff; }
    .header { border-bottom: 2px solid #4f46e5; padding-bottom: 12px; margin-bottom: 24px; display: flex; justify-content: space-between; align-items: flex-end; }
    .title { font-size: 24px; font-weight: 800; color: #1e1b4b; margin: 0; }
    .subtitle { font-size: 14px; color: #6366f1; font-weight: 600; margin-top: 4px; }
    .meta { font-size: 11px; color: #64748b; text-align: right; }
    .section { margin-bottom: 24px; page-break-inside: avoid; }
    .section-title { font-size: 14px; font-weight: 700; color: #4338ca; text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 1px solid #e0e7ff; padding-bottom: 4px; margin-bottom: 10px; }
    .box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px; margin-bottom: 12px; }
    .code { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 13px; color: #334155; }
    table { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 13px; page-break-inside: avoid; }
    th, td { border: 1px solid #cbd5e1; padding: 8px 12px; text-align: left; }
    th { background: #f1f5f9; font-weight: 700; color: #334155; }
    .pill { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 12px; font-weight: 600; margin-right: 4px; font-family: monospace; }
    .pill-accept { background: #dcfce7; color: #166534; border: 1px solid #bbf7d0; }
    .pill-reject { background: #ffe4e6; color: #9f1239; border: 1px solid #fecdd3; }
    
    .execution-flow-box { margin-bottom: 10px; padding: 8px 12px; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 6px; }
    .flow-title { font-weight: bold; font-size: 12px; color: #334155; margin-bottom: 4px; font-family: monospace; }
    .flow-path { display: flex; align-items: center; flex-wrap: wrap; gap: 4px; font-family: monospace; font-size: 12px; }
    .flow-node { padding: 2px 8px; border-radius: 12px; background: #e2e8f0; color: #334155; font-weight: bold; border: 1px solid #cbd5e1; }
    .flow-node-start { background: #e0f2fe; color: #0369a1; border-color: #7dd3fc; }
    .flow-node-accept { background: #dcfce7; color: #15803d; border-color: #86efac; outline: 1px solid #16a34a; }
    .flow-arrow { color: #6366f1; font-weight: bold; font-size: 11px; }
    .flow-result { margin-left: auto; padding: 2px 8px; border-radius: 4px; font-weight: bold; font-size: 11px; }
    .badge-accept { background: #16a34a; color: white; }
    .badge-reject { background: #dc2626; color: white; }

    .footer { border-top: 1px solid #e2e8f0; padding-top: 12px; font-size: 11px; color: #94a3b8; text-align: center; margin-top: 40px; }
    @media print {
      body { margin: 20px; }
      .no-print { display: none; }
      .section { page-break-inside: avoid; }
    }
  </style>
</head>
<body>

  <div class="no-print" style="margin-bottom: 20px; text-align: right;">
    <button onclick="window.print()" style="background: #4f46e5; color: white; border: none; padding: 10px 18px; border-radius: 6px; font-weight: bold; cursor: pointer;">Print / Save PDF</button>
  </div>

  <div class="header">
    <div>
      <h1 class="title">Formal ${graphType} Analysis Report</h1>
      <div class="subtitle">Question Prompt: "${prompt}"</div>
    </div>
    <div class="meta">
      <div><strong>Exported By:</strong> Automata Studio</div>
      <div><strong>Date:</strong> ${now}</div>
    </div>
  </div>

  <!-- 1. Recognized Language -->
  <div class="section">
    <div class="section-title">1. Recognized Language Specification</div>
    <div class="box">
      <div class="code"><strong>Language Definition L:</strong> ${explanation?.languageDescription || `L = { w ∈ {${alphabetStr}}* | w satisfies prompt "${prompt}" }`}</div>
      <p style="margin-top: 8px; margin-bottom: 0; color: #475569; font-size: 13px;">
        ${explanation?.summary || `This ${graphType} automaton models string evaluation over alphabet {${alphabetStr}} for prompt "${prompt}".`}
      </p>
    </div>
  </div>

  <!-- 2. Formal Definition -->
  <div class="section">
    <div class="section-title">2. Formal 5-Tuple Definition M = (Q, Σ, δ, q₀, F)</div>
    <div class="box">
      <ul style="margin: 0; padding-left: 20px; font-size: 13px;">
        <li><strong>States Set (Q):</strong> { ${stateNamesStr} }</li>
        <li><strong>Alphabet (Σ):</strong> { ${alphabetStr} }</li>
        <li><strong>Start State (q₀):</strong> ${startState}</li>
        <li><strong>Accept States Set (F):</strong> { ${acceptStatesStr} }</li>
        <li><strong>Transition Function (δ):</strong> ${mappingFunctionSig} defined below</li>
      </ul>
    </div>
  </div>

  <!-- 3. Automaton Graph Diagram -->
  <div class="section">
    <div class="section-title">3. Automaton Visual Graph Representation</div>
    ${svgDiagram}
  </div>

  <!-- 4. Transition Table -->
  <div class="section">
    <div class="section-title">4. Transition Matrix Table</div>
    <table>
      <thead>
        <tr>
          <th>State ID</th>
          <th>State Label</th>
          <th>Type</th>
          ${(graph.alphabet || ['0', '1']).map((s) => `<th>Input '${s}'</th>`).join('')}
        </tr>
      </thead>
      <tbody>
        ${graph.states
          .map((s) => {
            const isStart = s.isStart;
            const isAccept = s.isAccept;
            const typeStr = `${isStart ? 'Start ' : ''}${isAccept ? 'Accept' : isStart ? '' : 'Intermediate'}`;
            const cols = (graph.alphabet || ['0', '1']).map((sym) => {
              const edges = graph.transitions.filter((t) => t.source === s.id && t.symbols.includes(sym));
              if (edges.length === 0) return '∅';
              const targets = Array.from(new Set(edges.map((e) => e.target)));
              return targets.length === 1 ? targets[0] : `{ ${targets.join(', ')} }`;
            });
            return `<tr>
              <td><strong>${s.id}</strong></td>
              <td>${s.label || s.id}</td>
              <td>${typeStr}</td>
              ${cols.map((c) => `<td>${c}</td>`).join('')}
            </tr>`;
          })
          .join('')}
      </tbody>
    </table>
  </div>

  <!-- 5. Sample Strings with Execution Flow Graph -->
  <div class="section">
    <div class="section-title">5. Sample Strings & Execution Path Graphs</div>
    <div class="box">
      <div style="margin-bottom: 16px;">
        <strong style="color: #15803d; display: block; margin-bottom: 6px;">Accepted Example Strings & State Trajectories:</strong>
        ${accepted.length > 0
          ? accepted.map((item) => renderStringExecutionGraph(item, acceptSet)).join('')
          : '<em style="font-size: 12px; color: #64748b;">None found (Language is Empty ∅)</em>'}
      </div>
      <div>
        <strong style="color: #b91c1c; display: block; margin-bottom: 6px;">Rejected Example Strings & State Trajectories:</strong>
        ${rejected.length > 0
          ? rejected.map((item) => renderStringExecutionGraph(item, acceptSet)).join('')
          : '<em style="font-size: 12px; color: #64748b;">None found (Language accepts all strings Σ*)</em>'}
      </div>
    </div>
  </div>

  <!-- 6. Statistics & Properties -->
  <div class="section">
    <div class="section-title">6. Automaton Statistics & Formal Properties</div>
    <table>
      <tr>
        <th>Total States ( |Q| )</th>
        <td>${graph.states.length}</td>
        <th>Total Transitions</th>
        <td>${graphProps.totalTransitions}</td>
      </tr>
      <tr>
        <th>Alphabet Size ( |Σ| )</th>
        <td>${graphProps.alphabet.length}</td>
        <th>Accept States ( |F| )</th>
        <td>${acceptStates.length}</td>
      </tr>
      <tr>
        <th>Deterministic</th>
        <td>${graphProps.isDeterministic ? 'YES (100% Deterministic)' : `NO (${graphProps.nonDeterministicReason || 'Nondeterministic NFA'})`}</td>
        <th>Complete DFA</th>
        <td>${graphProps.isComplete ? 'YES (Every state has |Σ| transitions)' : `NO (Incomplete — ${graphProps.missingPairsCount} missing transition(s) to implicit trap)`}</td>
      </tr>
      <tr>
        <th>Reachable States</th>
        <td>${graphProps.allReachable ? 'YES (100% Reachable)' : `NO (${graphProps.unreachableCount} unreachable state(s))`}</td>
        <th>Construction Method</th>
        <td>Automata Studio Engine / ${explanation?.aiModelUsed || 'Formal Specification Generator'}</td>
      </tr>
    </table>
  </div>

  <div class="footer">
    Generated automatically by <strong>Automata Studio IDE</strong> — Theory of Computation Formal Analysis Platform.
  </div>

</body>
</html>`;

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
}

/**
 * Generates an academic Hopcroft Minimization PDF Report with step trajectory and state reduction metrics.
 */
export function generateMinimizationPDFReport(
  originalGraph: AutomatonGraph,
  minimizationResult: any
) {
  const printWindow = window.open('', '_blank', 'width=1000,height=900');
  if (!printWindow) return;

  const now = new Date().toLocaleString();
  const { steps, minimizedGraph, mergedPairs, executionTimeMs } = minimizationResult;

  const origSvg = renderSVGAutomatonGraph(originalGraph);
  const minSvg = renderSVGAutomatonGraph(minimizedGraph);

  const { accepted, rejected } = getGraphSampleStrings(minimizedGraph);
  const acceptSet = new Set<string>(
    (minimizedGraph.states || []).filter((s: any) => s.isAccept).map((s: any) => s.id)
  );

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Automata Studio — Hopcroft DFA Minimization Report</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; margin: 40px; color: #0f172a; line-height: 1.5; background: #fff; }
    .header { border-bottom: 2px solid #4f46e5; padding-bottom: 12px; margin-bottom: 24px; display: flex; justify-content: space-between; align-items: flex-end; }
    .title { font-size: 24px; font-weight: 800; color: #1e1b4b; margin: 0; }
    .subtitle { font-size: 14px; color: #6366f1; font-weight: 600; margin-top: 4px; }
    .section { margin-bottom: 24px; page-break-inside: avoid; }
    .section-title { font-size: 14px; font-weight: 700; color: #4338ca; text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 1px solid #e0e7ff; padding-bottom: 4px; margin-bottom: 10px; margin-top: 20px; }
    .box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px; margin-bottom: 12px; }
    table { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 13px; page-break-inside: avoid; }
    th, td { border: 1px solid #cbd5e1; padding: 8px 12px; text-align: left; }
    th { background: #f1f5f9; font-weight: 700; color: #334155; }
    
    .execution-flow-box { margin-bottom: 10px; padding: 8px 12px; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 6px; }
    .flow-title { font-weight: bold; font-size: 12px; color: #334155; margin-bottom: 4px; font-family: monospace; }
    .flow-path { display: flex; align-items: center; flex-wrap: wrap; gap: 4px; font-family: monospace; font-size: 12px; }
    .flow-node { padding: 2px 8px; border-radius: 12px; background: #e2e8f0; color: #334155; font-weight: bold; border: 1px solid #cbd5e1; }
    .flow-node-start { background: #e0f2fe; color: #0369a1; border-color: #7dd3fc; }
    .flow-node-accept { background: #dcfce7; color: #15803d; border-color: #86efac; outline: 1px solid #16a34a; }
    .flow-arrow { color: #6366f1; font-weight: bold; font-size: 11px; }
    .flow-result { margin-left: auto; padding: 2px 8px; border-radius: 4px; font-weight: bold; font-size: 11px; }
    .badge-accept { background: #16a34a; color: white; }
    .badge-reject { background: #dc2626; color: white; }

    .footer { border-top: 1px solid #e2e8f0; padding-top: 12px; font-size: 11px; color: #94a3b8; text-align: center; margin-top: 40px; }
    @media print { .no-print { display: none; } .section { page-break-inside: avoid; } }
  </style>
</head>
<body>
  <div class="no-print" style="margin-bottom: 20px; text-align: right;">
    <button onclick="window.print()" style="background: #4f46e5; color: white; border: none; padding: 8px 16px; font-weight: bold; border-radius: 6px; cursor: pointer;">
      Print / Save as PDF
    </button>
  </div>

  <div class="header">
    <div>
      <h1 class="title">Hopcroft DFA Minimization Report</h1>
      <div class="subtitle">Equivalence Reduction for: ${originalGraph.name || 'Automaton'}</div>
    </div>
    <div style="font-size: 11px; color: #64748b; text-align: right;">
      Generated: ${now}<br>
      Time Complexity: O(n log n)<br>
      Execution Time: ${executionTimeMs} ms
    </div>
  </div>

  <div class="section">
    <div class="section-title">1. Minimization Summary Metrics</div>
    <table>
      <tr>
        <th>Original States</th>
        <td>${originalGraph.states.length}</td>
        <th>Minimal States</th>
        <td>${minimizedGraph.states.length}</td>
      </tr>
      <tr>
        <th>States Eliminated</th>
        <td>${originalGraph.states.length - minimizedGraph.states.length}</td>
        <th>State Reduction %</th>
        <td>${Math.round(((originalGraph.states.length - minimizedGraph.states.length) / Math.max(1, originalGraph.states.length)) * 100)}%</td>
      </tr>
    </table>
  </div>

  <div class="section">
    <div class="section-title">2. Original Un-Minimized Automaton Graph</div>
    ${origSvg}
  </div>

  <div class="section">
    <div class="section-title">3. Minimal Canonical Automaton Graph</div>
    ${minSvg}
  </div>

  <div class="section">
    <div class="section-title">4. Merged State Equivalence Mappings</div>
    <table>
      <thead>
        <tr>
          <th>Minimal State</th>
          <th>Merged Original States</th>
          <th>Accepting Status</th>
        </tr>
      </thead>
      <tbody>
        ${mergedPairs.map((p: any) => `
          <tr>
            <td><strong>${p.newId}</strong></td>
            <td>{ ${p.oldIds.join(', ')} }</td>
            <td>${p.isAccept ? 'ACCEPTING' : 'NON-ACCEPTING'}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  </div>

  <div class="section">
    <div class="section-title">5. Sample String Trajectories on Minimized DFA</div>
    <div class="box">
      <div style="margin-bottom: 16px;">
        <strong style="color: #15803d; display: block; margin-bottom: 6px;">Accepted String Trajectories:</strong>
        ${accepted.length > 0
          ? accepted.map((item) => renderStringExecutionGraph(item, acceptSet)).join('')
          : '<em style="font-size: 12px; color: #64748b;">None found (Language is Empty ∅)</em>'}
      </div>
      <div>
        <strong style="color: #b91c1c; display: block; margin-bottom: 6px;">Rejected String Trajectories:</strong>
        ${rejected.length > 0
          ? rejected.map((item) => renderStringExecutionGraph(item, acceptSet)).join('')
          : '<em style="font-size: 12px; color: #64748b;">None found (Language accepts all strings Σ*)</em>'}
      </div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">6. Partition Refinement Trajectory (${steps.length} Steps)</div>
    <table>
      <thead>
        <tr>
          <th>Step</th>
          <th>Phase</th>
          <th>Description</th>
        </tr>
      </thead>
      <tbody>
        ${steps.map((s: any) => `
          <tr>
            <td><strong>P${s.stepIndex}</strong></td>
            <td>${s.phase}</td>
            <td>${s.description}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  </div>

  <div class="footer">
    Generated automatically by <strong>Automata Studio IDE</strong> — Hopcroft DFA Minimization Engine.
  </div>
</body>
</html>`;

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
}

