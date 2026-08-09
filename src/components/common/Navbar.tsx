import React, { useState, useRef } from 'react';
import {
  Cpu,
  Download,
  Upload,
  Image as ImageIcon,
  FolderOpen,
  Settings as SettingsIcon,
  ChevronDown,
  FileCode,
} from 'lucide-react';
import { useAutomata } from '../../context/AutomataContext';
import type { PageId } from '../../context/AutomataContext';
import { saveProjectToStorage, downloadJsonFile } from '../../utils/storage';
import { exportCanvasToPng, exportCanvasToSvg } from '../../utils/exportImage';
import { parseJFLAP, exportToJFLAP } from '../../algorithms/jflapParser';
import { normalizeAutomatonGraph } from '../../utils/graphNormalizer';
import { SettingsModal } from './SettingsModal';

export const Navbar: React.FC = () => {
  const { activePage, setActivePage, graph, setGraph } = useAutomata();

  const [isProjectMenuOpen, setIsProjectMenuOpen] = useState<boolean>(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [isAdvancedMenuOpen, setIsAdvancedMenuOpen] = useState<boolean>(false);
  const [isMachinesMenuOpen, setIsMachinesMenuOpen] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const mainPages: { id: PageId; label: string; icon?: any }[] = [
    { id: 'dfa', label: 'DFA' },
    { id: 'nfa', label: 'NFA' },
  ];

  const isAdvancedActive = activePage === 'advanced-dfa' || activePage === 'advanced-nfa';
  const isMachinesActive = activePage === 'mealy' || activePage === 'moore';

  const handleJsonUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        if (file.name.endsWith('.jff') || text.includes('<structure>')) {
          // JFLAP import
          const importedGraph = parseJFLAP(text);
          const normalized = normalizeAutomatonGraph(importedGraph);
          if (normalized) {
            setGraph(normalized);
          } else {
            alert('Could not parse JFLAP structure into a valid automaton graph.');
          }
        } else {
          // JSON import
          const parsed = JSON.parse(text);
          const normalized = normalizeAutomatonGraph(parsed);
          if (normalized) {
            setGraph(normalized);
          } else {
            alert('Invalid automaton JSON structure. Please upload a valid JSON diagram file.');
          }
        }
      } catch (err) {
        alert('Invalid file format. Please upload a valid Automata Studio JSON or JFLAP .jff file.');
      }
      if (e.target) e.target.value = '';
    };
    reader.readAsText(file);
  };

  const handleExportJFLAP = () => {
    const xml = exportToJFLAP(graph);
    const blob = new Blob([xml], { type: 'application/xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${graph.name || 'automaton'}.jff`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <nav className="w-full bg-slate-950 border-b border-slate-800/80 px-4 py-2.5 backdrop-blur-xl sticky top-0 z-50 flex items-center justify-between gap-4">
        {/* Brand Logo */}
        <div
          onClick={() => setActivePage('home')}
          className="flex items-center gap-2.5 cursor-pointer group shrink-0"
        >
          <div className="w-9 h-9 rounded-xl overflow-hidden shadow-lg shadow-indigo-600/40 group-hover:scale-105 transition border border-indigo-500/40 shrink-0 bg-slate-950 flex items-center justify-center">
            <img src="/logo.png" alt="Automata Studio Logo" className="w-full h-full object-cover" />
          </div>
          <div>
            <h1 className="text-base font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent flex items-center gap-1.5">
              Automata Studio
              <span className="text-[10px] font-semibold px-1.5 py-0.2 bg-indigo-950/80 border border-indigo-500/40 text-indigo-300 rounded-full font-mono">
                PRO
              </span>
            </h1>
          </div>
        </div>

        {/* Navigation Links - Hidden on home page */}
        {activePage !== 'home' && (
          <div className="hidden lg:flex items-center gap-1 bg-[#0a0e1a]/90 backdrop-blur-2xl p-1.5 px-2 border border-slate-800/90 rounded-full shadow-2xl shadow-indigo-950/30">
            {/* DFA & NFA Buttons */}
            {mainPages.map((p) => {
              const isAct = activePage === p.id;
              return (
                <button
                  key={p.id}
                  onClick={() => {
                    setIsAdvancedMenuOpen(false);
                    setIsMachinesMenuOpen(false);
                    setActivePage(p.id);
                  }}
                  className={`px-4 py-1.5 rounded-full text-xs transition-all duration-200 flex items-center gap-1.5 cursor-pointer font-bold ${isAct
                      ? 'bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-500/35 ring-1 ring-white/20 scale-[1.02]'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/70'
                    }`}
                >
                  {p.label}
                </button>
              );
            })}

            {/* Advanced Dropdown */}
            <div
              className="relative group"
              onMouseEnter={() => setIsAdvancedMenuOpen(true)}
              onMouseLeave={() => setIsAdvancedMenuOpen(false)}
            >
              <button
                onClick={() => {
                  if (activePage !== 'advanced-dfa' && activePage !== 'advanced-nfa') {
                    setActivePage('advanced-dfa');
                  }
                }}
                className={`px-3.5 py-1.5 rounded-full text-xs transition-all duration-200 flex items-center justify-center cursor-pointer font-semibold ${isAdvancedActive
                    ? 'bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-500/35 ring-1 ring-white/20 scale-[1.02] font-bold'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/70'
                  }`}
              >
                Advanced
              </button>

              <div className="absolute left-0 top-full pt-1.5 w-44 z-50 opacity-0 invisible group-hover:opacity-100 group-hover:visible translate-y-1 group-hover:translate-y-0 transition-all duration-200 pointer-events-none group-hover:pointer-events-auto">
                <div className="bg-[#0d1322] border border-slate-700/60 backdrop-blur-3xl shadow-2xl rounded-2xl p-1.5 text-xs font-medium text-slate-200 font-sans space-y-1 ring-1 ring-white/10">
                  <button
                    onClick={() => {
                      setIsAdvancedMenuOpen(false);
                      setActivePage('advanced-dfa');
                    }}
                    className={`w-full text-left px-3 py-2 rounded-xl transition flex items-center gap-2 font-medium cursor-pointer ${activePage === 'advanced-dfa'
                        ? 'bg-indigo-600/30 text-indigo-300 font-bold border border-indigo-500/40 shadow-inner'
                        : 'hover:bg-indigo-600/20 hover:text-indigo-200 text-slate-300'
                      }`}
                  >
                    <span className="w-2 h-2 rounded-full bg-indigo-400 shrink-0 shadow-sm shadow-indigo-400/50" />
                    Advanced DFA
                  </button>
                  <button
                    onClick={() => {
                      setIsAdvancedMenuOpen(false);
                      setActivePage('advanced-nfa');
                    }}
                    className={`w-full text-left px-3 py-2 rounded-xl transition flex items-center gap-2 font-medium cursor-pointer ${activePage === 'advanced-nfa'
                        ? 'bg-indigo-600/30 text-indigo-300 font-bold border border-indigo-500/40 shadow-inner'
                        : 'hover:bg-purple-600/20 hover:text-purple-200 text-slate-300'
                      }`}
                  >
                    <span className="w-2 h-2 rounded-full bg-purple-400 shrink-0 shadow-sm shadow-purple-400/50" />
                    Advanced NFA
                  </button>
                </div>
              </div>
            </div>

            {/* Machines Dropdown */}
            <div
              className="relative group"
              onMouseEnter={() => setIsMachinesMenuOpen(true)}
              onMouseLeave={() => setIsMachinesMenuOpen(false)}
            >
              <button
                onClick={() => {
                  if (activePage !== 'mealy' && activePage !== 'moore') {
                    setActivePage('mealy');
                  }
                }}
                className={`px-3.5 py-1.5 rounded-full text-xs transition-all duration-200 flex items-center justify-center cursor-pointer font-semibold ${isMachinesActive
                    ? 'bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-500/35 ring-1 ring-white/20 scale-[1.02] font-bold'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/70'
                  }`}
              >
                Machines
              </button>

              <div className="absolute left-0 top-full pt-1.5 w-36 z-50 opacity-0 invisible group-hover:opacity-100 group-hover:visible translate-y-1 group-hover:translate-y-0 transition-all duration-200 pointer-events-none group-hover:pointer-events-auto">
                <div className="bg-[#0d1322] border border-slate-700/60 backdrop-blur-3xl shadow-2xl rounded-2xl p-1.5 text-xs font-medium text-slate-200 font-sans space-y-1 ring-1 ring-white/10">
                  <button
                    onClick={() => {
                      setIsMachinesMenuOpen(false);
                      setActivePage('mealy');
                    }}
                    className={`w-full text-left px-3 py-2 rounded-xl transition flex items-center gap-2 font-medium cursor-pointer ${activePage === 'mealy'
                        ? 'bg-indigo-600/30 text-indigo-300 font-bold border border-indigo-500/40 shadow-inner'
                        : 'hover:bg-emerald-600/20 hover:text-emerald-200 text-slate-300'
                      }`}
                  >
                    <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0 shadow-sm shadow-emerald-400/50" />
                    Mealy
                  </button>
                  <button
                    onClick={() => {
                      setIsMachinesMenuOpen(false);
                      setActivePage('moore');
                    }}
                    className={`w-full text-left px-3 py-2 rounded-xl transition flex items-center gap-2 font-medium cursor-pointer ${activePage === 'moore'
                        ? 'bg-indigo-600/30 text-indigo-300 font-bold border border-indigo-500/40 shadow-inner'
                        : 'hover:bg-sky-600/20 hover:text-sky-200 text-slate-300'
                      }`}
                  >
                    <span className="w-2 h-2 rounded-full bg-sky-400 shrink-0 shadow-sm shadow-sky-400/50" />
                    Moore
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons: Save/Export, Settings */}
        <div className="flex items-center gap-2">

          {/* Project Save / Load / Export Dropdown (Only visible when active automaton is present) */}
          {activePage !== 'home' && (
            <div className="relative">
              <button
                onClick={() => setIsProjectMenuOpen(!isProjectMenuOpen)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600/20 border border-indigo-500/30 hover:bg-indigo-600/30 rounded-xl text-xs font-semibold text-indigo-300 transition"
              >
                <FolderOpen className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Save & Export</span>
                <ChevronDown className="w-3 h-3" />
              </button>

              {isProjectMenuOpen && (
                <div
                  className="absolute right-0 mt-2 w-56 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-1.5 z-50 text-xs font-medium text-slate-200 animate-in fade-in zoom-in-95 duration-150"
                  onClick={() => setIsProjectMenuOpen(false)}
                >
                  <button
                    onClick={() => {
                      saveProjectToStorage(graph);
                      alert(`" ${graph.name || 'Automaton'} " successfully saved to LocalStorage!`);
                    }}
                    className="w-full text-left px-3 py-2 hover:bg-slate-800 rounded-xl transition flex items-center gap-2"
                  >
                    <FolderOpen className="w-4 h-4 text-indigo-400" /> Save to LocalStorage
                  </button>

                  <button
                    onClick={() => downloadJsonFile(`${graph.name || 'automaton'}.json`, graph)}
                    className="w-full text-left px-3 py-2 hover:bg-slate-800 rounded-xl transition flex items-center gap-2"
                  >
                    <Download className="w-4 h-4 text-sky-400" /> Export Project JSON
                  </button>

                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full text-left px-3 py-2 hover:bg-slate-800 rounded-xl transition flex items-center gap-2"
                  >
                    <Upload className="w-4 h-4 text-emerald-400" /> Upload JSON / JFLAP
                  </button>

                  <div className="my-1 border-t border-slate-800" />

                  <button
                    onClick={() => exportCanvasToPng('automata-canvas-container', graph.name || 'automaton')}
                    className="w-full text-left px-3 py-2 hover:bg-slate-800 rounded-xl transition flex items-center gap-2"
                  >
                    <ImageIcon className="w-4 h-4 text-purple-400" /> Download Canvas PNG
                  </button>

                  <button
                    onClick={() => exportCanvasToSvg('automata-canvas-container', graph.name || 'automaton')}
                    className="w-full text-left px-3 py-2 hover:bg-slate-800 rounded-xl transition flex items-center gap-2"
                  >
                    <ImageIcon className="w-4 h-4 text-purple-400" /> Download Canvas SVG
                  </button>

                  <div className="my-1 border-t border-slate-800" />

                  <button
                    onClick={handleExportJFLAP}
                    className="w-full text-left px-3 py-2 hover:bg-slate-800 rounded-xl transition flex items-center gap-2 text-amber-300"
                  >
                    <FileCode className="w-4 h-4 text-amber-400" /> Export JFLAP (.jff)
                  </button>
                </div>
              )}
            </div>
          )}

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleJsonUpload}
            accept=".json,.jff,.xml"
            className="hidden"
          />

          {/* Settings Trigger */}
          <button
            onClick={() => setIsSettingsOpen(true)}
            className="p-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl text-slate-400 hover:text-slate-200 transition"
            title="Settings"
          >
            <SettingsIcon className="w-4 h-4" />
          </button>
        </div>
      </nav>

      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
    </>
  );
};
