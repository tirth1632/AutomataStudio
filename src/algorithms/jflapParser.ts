import type { AutomatonGraph, AutomatonState } from '../types/automata';

/**
 * Parses JFLAP XML string (.jff) into an AutomatonGraph structure.
 */
export function parseJFLAP(xmlContent: string): AutomatonGraph {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlContent, 'text/xml');

  const statesNodes = xmlDoc.querySelectorAll('state');
  const transitionNodes = xmlDoc.querySelectorAll('transition');

  const states: AutomatonState[] = [];
  const alphabetSet = new Set<string>();

  statesNodes.forEach((node) => {
    const id = node.getAttribute('id') || `q${states.length}`;
    const name = node.getAttribute('name') || id;
    const xNode = node.querySelector('x');
    const yNode = node.querySelector('y');
    const isStart = node.querySelector('initial') !== null;
    const isAccept = node.querySelector('final') !== null;

    const x = xNode ? parseFloat(xNode.textContent || '100') : 100 + states.length * 120;
    const y = yNode ? parseFloat(yNode.textContent || '200') : 200;

    states.push({
      id: `s_${id}`,
      label: name,
      isStart,
      isAccept,
      x,
      y,
    });
  });

  const rawTransitions: { source: string; target: string; symbol: string }[] = [];

  transitionNodes.forEach((node) => {
    const from = node.querySelector('from')?.textContent || '';
    const to = node.querySelector('to')?.textContent || '';
    const read = node.querySelector('read')?.textContent || '';

    const symbol = read.trim() === '' ? 'ε' : read.trim();
    if (symbol !== 'ε') {
      alphabetSet.add(symbol);
    }

    rawTransitions.push({
      source: `s_${from}`,
      target: `s_${to}`,
      symbol,
    });
  });

  // Group transitions between same source and target
  const edgeMap: { [key: string]: { id: string; source: string; target: string; symbols: string[] } } = {};

  rawTransitions.forEach((t) => {
    const key = `${t.source}->${t.target}`;
    if (!edgeMap[key]) {
      edgeMap[key] = {
        id: `t_${t.source}_${t.target}`,
        source: t.source,
        target: t.target,
        symbols: [t.symbol],
      };
    } else {
      if (!edgeMap[key].symbols.includes(t.symbol)) {
        edgeMap[key].symbols.push(t.symbol);
      }
    }
  });

  const transitions = Object.values(edgeMap);

  return {
    id: `jflap_import_${Date.now()}`,
    name: 'JFLAP Imported Automaton',
    type: alphabetSet.size > 0 ? 'DFA' : 'NFA',
    alphabet: Array.from(alphabetSet),
    states,
    transitions,
  };
}

/**
 * Exports an AutomatonGraph into JFLAP .jff XML string.
 */
export function exportToJFLAP(graph: AutomatonGraph): string {
  let xml = `<?xml version="1.0" encoding="UTF-8" standalone="no"?>\n`;
  xml += `<structure>\n`;
  xml += `\t<type>fa</type>\n`;
  xml += `\t<automaton>\n`;

  // States
  graph.states.forEach((s, idx) => {
    const cleanId = s.id.replace('s_', '').replace(/[^0-9]/g, '') || `${idx}`;
    xml += `\t\t<state id="${cleanId}" name="${s.label}">\n`;
    xml += `\t\t\t<x>${Math.round(s.x)}</x>\n`;
    xml += `\t\t\t<y>${Math.round(s.y)}</y>\n`;
    if (s.isStart) xml += `\t\t\t<initial/>\n`;
    if (s.isAccept) xml += `\t\t\t<final/>\n`;
    xml += `\t\t</state>\n`;
  });

  // Transitions
  graph.transitions.forEach((t) => {
    const fromId = t.source.replace('s_', '').replace(/[^0-9]/g, '') || '0';
    const toId = t.target.replace('s_', '').replace(/[^0-9]/g, '') || '0';

    t.symbols.forEach((sym) => {
      const readVal = sym === 'ε' || sym === 'e' ? '' : sym;
      xml += `\t\t<transition>\n`;
      xml += `\t\t\t<from>${fromId}</from>\n`;
      xml += `\t\t\t<to>${toId}</to>\n`;
      xml += `\t\t\t<read>${readVal}</read>\n`;
      xml += `\t\t</transition>\n`;
    });
  });

  xml += `\t</automaton>\n`;
  xml += `</structure>`;

  return xml;
}
