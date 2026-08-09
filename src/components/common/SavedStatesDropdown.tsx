import React, { useState, useEffect, useRef } from 'react';
import {
  FolderHeart,
  Save,
  Upload,
  ChevronDown,
  Play,
  Download,
  Trash2,
  ExternalLink,
  Check,
  Layers,
} from 'lucide-react';
import { useAutomata } from '../../context/AutomataContext';
import {
  getAllProjects,
  saveDiagramAndDownload,
  saveProjectToStorage,
  deleteProjectFromStorage,
  downloadJsonFile,
} from '../../utils/storage';
import { SavedStatesModal } from '../modals/SavedStatesModal';
import type { ProjectData } from '../../types/automata';
import { normalizeAutomatonGraph } from '../../utils/graphNormalizer';

function getThemeStyles(theme?: string, accentColor?: string) {
  if (theme === 'cyberpunk') {
    return {
      btn: 'from-pink-500/15 via-pink-500/25 to-pink-500/15 hover:from-pink-500/25 hover:to-pink-500/35 border-pink-500/40 text-pink-300',
      icon: 'text-pink-400',
      badge: 'bg-pink-500/30 text-pink-200',
    };
  }

  if (accentColor === 'emerald') {
    return {
      btn: 'from-emerald-500/15 via-emerald-500/25 to-emerald-500/15 hover:from-emerald-500/25 hover:to-emerald-500/35 border-emerald-500/40 text-emerald-300',
      icon: 'text-emerald-400',
      badge: 'bg-emerald-500/30 text-emerald-200',
    };
  }

  if (accentColor === 'amber') {
    return {
      btn: 'from-amber-500/15 via-amber-500/25 to-amber-500/15 hover:from-amber-500/25 hover:to-amber-500/35 border-amber-500/40 text-amber-300',
      icon: 'text-amber-400',
      badge: 'bg-amber-500/30 text-amber-200',
    };
  }

  if (accentColor === 'blue') {
    return {
      btn: 'from-sky-500/15 via-sky-500/25 to-sky-500/15 hover:from-sky-500/25 hover:to-sky-500/35 border-sky-500/40 text-sky-300',
      icon: 'text-sky-400',
      badge: 'bg-sky-500/30 text-sky-200',
    };
  }

  if (accentColor === 'violet') {
    return {
      btn: 'from-purple-500/15 via-purple-500/25 to-purple-500/15 hover:from-purple-500/25 hover:to-purple-500/35 border-purple-500/40 text-purple-300',
      icon: 'text-purple-400',
      badge: 'bg-purple-500/30 text-purple-200',
    };
  }

  // Default Indigo Theme
  return {
    btn: 'from-indigo-500/15 via-indigo-500/25 to-indigo-500/15 hover:from-indigo-500/25 hover:to-indigo-500/35 border-indigo-500/40 text-indigo-300',
    icon: 'text-indigo-400',
    badge: 'bg-indigo-500/30 text-indigo-200',
  };
}

export const SavedStatesDropdown: React.FC = () => {
  const { graph, setGraph, settings } = useAutomata();
  const [isOpen, setIsOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [projects, setProjects] = useState<ProjectData[]>([]);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const themeStyles = getThemeStyles(settings?.theme, settings?.accentColor);

  const refreshProjects = () => {
    setProjects(getAllProjects());
  };

  useEffect(() => {
    refreshProjects();
  }, []);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  const handleSaveCurrent = () => {
    saveDiagramAndDownload(graph);
    refreshProjects();
    showToast('Saved & downloaded to your folder!');
  };

  const handleLoadDiagram = (p: ProjectData) => {
    setGraph(p.graph);
    showToast(`Loaded "${p.name}" onto canvas!`);
    setIsOpen(false);
  };

  const handleDeleteDiagram = (id: string, name: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm(`Delete "${name}" from saved states?`)) {
      deleteProjectFromStorage(id);
      refreshProjects();
      showToast(`Deleted "${name}"`);
    }
  };

  const handleDownloadJson = (p: ProjectData, e: React.MouseEvent) => {
    e.stopPropagation();
    const cleanName = (p.name || 'DFA_Diagram').replace(/[^a-zA-Z0-9_-]/g, '_');
    downloadJsonFile(`${cleanName}.json`, {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      name: p.name,
      graph: p.graph,
    });
    showToast(`Downloaded ${cleanName}.json!`);
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        const importedGraph = normalizeAutomatonGraph(parsed);
        if (!importedGraph) {
          alert('Invalid DFA diagram file structure.');
          return;
        }
        saveProjectToStorage(importedGraph);
        setGraph(importedGraph);
        refreshProjects();
        showToast(`Imported & loaded "${importedGraph.name || file.name}"!`);
        setIsOpen(false);
      } catch (err) {
        alert('Failed to parse JSON file.');
      }
      if (e.target) e.target.value = '';
    };
    reader.readAsText(file);
  };

  return (
    <div className="relative w-full" ref={dropdownRef}>
      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed bottom-6 left-6 z-50 flex items-center gap-2 px-3.5 py-2 bg-emerald-600/90 text-white font-medium text-xs rounded-xl shadow-xl border border-emerald-400 animate-fade-in backdrop-blur-md">
          <Check className="w-4 h-4 text-emerald-100" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Main Trigger Button with Dynamic Theme Styling */}
      <button
        onClick={() => {
          refreshProjects();
          setIsOpen((prev) => !prev);
        }}
        className={`w-full py-2.5 px-3 bg-gradient-to-r ${themeStyles.btn} font-bold rounded-xl text-xs shadow-md transition flex items-center justify-between cursor-pointer`}
      >
        <div className="flex items-center gap-2">
          <FolderHeart className={`w-4 h-4 ${themeStyles.icon}`} />
          <span>Saved States & Diagrams</span>
        </div>
        <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Menu Panel */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-1.5 bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl p-2 z-40 space-y-2 animate-in fade-in zoom-in-95">
          {/* Quick Action Bar */}
          <div className="grid grid-cols-2 gap-1.5 text-xs font-semibold">
            <button
              onClick={handleSaveCurrent}
              className="px-2.5 py-2 bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-300 rounded-xl flex items-center justify-center gap-1.5 transition cursor-pointer"
              title="Save current diagram and download JSON to folder"
            >
              <Save className="w-3.5 h-3.5 text-emerald-400" />
              Save Diagram
            </button>

            <label className="px-2.5 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 rounded-xl flex items-center justify-center gap-1.5 transition cursor-pointer">
              <Upload className="w-3.5 h-3.5 text-sky-400" />
              Import JSON
              <input type="file" accept=".json" onChange={handleImportFile} className="hidden" />
            </label>
          </div>

          <div className="h-[1px] bg-slate-800 my-1" />

          {/* Saved Diagrams List (up to 25 items) */}
          <div className="max-h-60 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
            {projects.length === 0 ? (
              <div className="py-4 text-center text-xs text-slate-400">
                No saved states found. Click "Save Diagram" to save!
              </div>
            ) : (
              projects.slice(0, 25).map((p) => {
                const stateCount = p.graph.states?.length || 0;
                return (
                  <div
                    key={p.id}
                    onClick={() => handleLoadDiagram(p)}
                    className="p-2 bg-slate-950/70 hover:bg-slate-800/80 border border-slate-800/80 hover:border-indigo-500/40 rounded-xl transition cursor-pointer flex items-center justify-between group"
                  >
                    <div className="flex items-center gap-2 overflow-hidden">
                      <div className="p-1 bg-indigo-600/20 rounded-lg text-indigo-400 shrink-0">
                        <Play className="w-3 h-3 fill-current" />
                      </div>
                      <div className="truncate">
                        <h5 className="text-xs font-bold text-slate-200 group-hover:text-indigo-300 truncate">
                          {p.name || 'Untitled DFA'}
                        </h5>
                        <div className="flex items-center gap-1 text-[10px] text-slate-500">
                          <Layers className="w-3 h-3 text-slate-400" />
                          <span>{stateCount} states</span>
                          <span>•</span>
                          <span>{new Date(p.updatedAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0 opacity-80 group-hover:opacity-100">
                      <button
                        onClick={(e) => handleDownloadJson(p, e)}
                        title="Download JSON file"
                        className="p-1 text-slate-400 hover:text-sky-400 hover:bg-slate-800 rounded-md transition"
                      >
                        <Download className="w-3 h-3" />
                      </button>

                      <button
                        onClick={(e) => handleDeleteDiagram(p.id, p.name, e)}
                        title="Delete from saved states"
                        className="p-1 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-md transition"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="h-[1px] bg-slate-800 my-1" />

          {/* View Full Library Button */}
          <button
            onClick={() => {
              setIsOpen(false);
              setIsModalOpen(true);
            }}
            className="w-full py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-xl text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
          >
            <ExternalLink className="w-3.5 h-3.5 text-amber-400" />
            Open Full Saved States Library
          </button>
        </div>
      )}

      {/* SAVED STATES MODAL */}
      <SavedStatesModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          refreshProjects();
        }}
        onSavedDiagramLoaded={refreshProjects}
      />
    </div>
  );
};
