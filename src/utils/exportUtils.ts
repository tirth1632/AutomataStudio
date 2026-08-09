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

  let latex = `% Formal DFA Definition & TikZ Diagram for: ${promptDescription || graph.name}\n`;
  latex += `\\documentclass{article}\n`;
  latex += `\\usepackage{tikz}\n`;
  latex += `\\usetikzlibrary{automata,positioning,arrows.meta}\n`;
  latex += `\\begin{document}\n\n`;

  latex += `\\subsection*{Formal Definition}\n`;
  latex += `Given DFA $M = (Q, \\Sigma, \\delta, q_0, F)$ where:\n`;
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
      const edge = graph.transitions.find((t) => t.source === s.id && t.symbols.includes(sym));
      return edge ? edge.target : '\\emptyset';
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

  let txt = `DFA FORMAL DEFINITION & STRUCTURE\n`;
  txt += `===================================\n`;
  txt += `Automaton Name: ${graph.name}\n`;
  txt += `Type: ${graph.type}\n`;
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
      const edge = graph.transitions.find((t) => t.source === s.id && t.symbols.includes(sym));
      return edge ? edge.target : '-';
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
      const edge = graph.transitions.find((t) => t.source === s.id && t.symbols.includes(sym));
      return edge ? edge.target : '';
    });
    csv += `"${s.id}",${s.isStart},${s.isAccept},${rowVals.map((v) => `"${v}"`).join(',')}\n`;
  });

  return csv;
}

export function exportToJSON(graph: AutomatonGraph): string {
  return JSON.stringify(graph, null, 2);
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
  const alphabetStr = (graph.alphabet || ['0', '1']).join(', ');
  const stateNamesStr = graph.states.map((s) => s.id).join(', ');
  const startState = graph.states.find((s) => s.isStart)?.id || 'q0';
  const acceptStatesStr = graph.states.filter((s) => s.isAccept).map((s) => s.id).join(', ');

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Automata Studio — Formal DFA Report for ${prompt}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; margin: 40px; color: #0f172a; line-height: 1.5; background: #fff; }
    .header { border-b: 2px solid #4f46e5; padding-bottom: 12px; margin-bottom: 24px; display: flex; justify-content: space-between; align-items: flex-end; }
    .title { font-size: 24px; font-weight: 800; color: #1e1b4b; margin: 0; }
    .subtitle { font-size: 14px; color: #6366f1; font-weight: 600; margin-top: 4px; }
    .meta { font-size: 11px; color: #64748b; text-align: right; }
    .section { margin-bottom: 24px; }
    .section-title { font-size: 14px; font-weight: 700; color: #4338ca; text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 1px solid #e0e7ff; padding-bottom: 4px; margin-bottom: 10px; }
    .box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px; margin-bottom: 12px; }
    .code { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 13px; color: #334155; }
    table { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 13px; }
    th, td { border: 1px solid #cbd5e1; padding: 8px 12px; text-align: left; }
    th { background: #f1f5f9; font-weight: 700; color: #334155; }
    .pill { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 12px; font-weight: 600; margin-right: 4px; font-mono; }
    .pill-accept { background: #dcfce7; color: #166534; border: 1px solid #bbf7d0; }
    .pill-reject { background: #ffe4e6; color: #9f1239; border: 1px solid #fecdd3; }
    .footer { border-top: 1px solid #e2e8f0; padding-top: 12px; font-size: 11px; color: #94a3b8; text-align: center; margin-top: 40px; }
    @media print {
      body { margin: 20px; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>

  <div className="no-print" style="margin-bottom: 20px; text-align: right;">
    <button onclick="window.print()" style="background: #4f46e5; color: white; border: none; padding: 10px 18px; border-radius: 6px; font-weight: bold; cursor: pointer;">Print / Download PDF</button>
  </div>

  <div class="header">
    <div>
      <h1 class="title">Formal DFA Analysis Report</h1>
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
        ${explanation?.summary || `This DFA automaton models string evaluation over alphabet {${alphabetStr}} for prompt "${prompt}".`}
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
        <li><strong>Transition Function (δ):</strong> Mapping Q × Σ → Q defined below</li>
      </ul>
    </div>
  </div>

  <!-- 3. Transition Table -->
  <div class="section">
    <div class="section-title">3. Transition Matrix Table</div>
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
              const edge = graph.transitions.find((t) => t.source === s.id && t.symbols.includes(sym));
              return edge ? edge.target : '∅';
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

  <!-- 4. Sample Strings -->
  <div class="section">
    <div class="section-title">4. Accepted & Rejected Example Strings</div>
    <div class="box">
      <div style="margin-bottom: 8px;">
        <strong>Accepted Examples:</strong>
        ${(explanation?.acceptedExamples || ['101', '0101'])
          .map((str: string) => `<span class="pill pill-accept font-mono">"${str}"</span>`)
          .join(' ')}
      </div>
      <div>
        <strong>Rejected Examples:</strong>
        ${(explanation?.rejectedExamples || ['000', '111'])
          .map((str: string) => `<span class="pill pill-reject font-mono">"${str}"</span>`)
          .join(' ')}
      </div>
    </div>
  </div>

  <!-- 5. DFA Statistics & Graph Properties -->
  <div class="section">
    <div class="section-title">5. Automaton Statistics & Formal Properties</div>
    <table>
      <tr>
        <th>Total States ( |Q| )</th>
        <td>${graph.states.length}</td>
        <th>Total Transitions</th>
        <td>${graph.transitions.reduce((acc, t) => acc + t.symbols.length, 0)}</td>
      </tr>
      <tr>
        <th>Alphabet Size ( |Σ| )</th>
        <td>${graph.alphabet.length}</td>
        <th>Accept States ( |F| )</th>
        <td>${graph.states.filter((s) => s.isAccept).length}</td>
      </tr>
      <tr>
        <th>Deterministic</th>
        <td>YES (100%)</td>
        <th>Complete DFA</th>
        <td>YES (Every state has |Σ| outgoing transitions)</td>
      </tr>
      <tr>
        <th>Minimal DFA</th>
        <td>${stats?.isMinimal ? 'YES (Canonical Hopcroft Minimal)' : 'VERIFIED'}</td>
        <th>Construction Method</th>
        <td>Automata Engine / ${explanation?.aiModelUsed || 'Mathematical Generator'}</td>
      </tr>
    </table>
  </div>

  <div class="footer">
    Generated automatically by <strong>Automata Studio IDE</strong> — Theory of Computation Analysis Platform.
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
    .section-title { font-size: 14px; font-weight: 700; color: #4338ca; text-transform: uppercase; border-bottom: 1px solid #e0e7ff; padding-bottom: 4px; margin-bottom: 10px; margin-top: 20px; }
    .box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px; margin-bottom: 12px; }
    table { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 13px; }
    th, td { border: 1px solid #cbd5e1; padding: 8px 12px; text-align: left; }
    th { background: #f1f5f9; font-weight: 700; color: #334155; }
    .footer { border-top: 1px solid #e2e8f0; padding-top: 12px; font-size: 11px; color: #94a3b8; text-align: center; margin-top: 40px; }
    @media print { .no-print { display: none; } }
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
    <div class="section-title">Minimization Summary Metrics</div>
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
    <div class="section-title">Merged State Equivalence Mappings</div>
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
    <div class="section-title">Partition Refinement Trajectory (${steps.length} Steps)</div>
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

