import React, { useState, useEffect } from 'react';
import {
  FolderHeart,
  X,
  Search,
  Download,
  Upload,
  Play,
  Trash2,
  Image as ImageIcon,
  Check,
  Sparkles,
  Info,
  Clock,
  Layers,
} from 'lucide-react';
import { useAutomata } from '../../context/AutomataContext';
import {
  getAllProjects,
  deleteProjectFromStorage,
  saveProjectToStorage,
  downloadJsonFile,
} from '../../utils/storage';
import { exportCanvasToPng } from '../../utils/exportImage';
import type { ProjectData } from '../../types/automata';
import { normalizeAutomatonGraph } from '../../utils/graphNormalizer';

interface SavedStatesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSavedDiagramLoaded?: () => void;
}

export const SavedStatesModal: React.FC<SavedStatesModalProps> = ({
  isOpen,
  onClose,
  onSavedDiagramLoaded,
}) => {
  const { graph, setGraph } = useAutomata();
  const [projects, setProjects] = useState<ProjectData[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setProjects(getAllProjects());
    }
  }, [isOpen]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  if (!isOpen) return null;

  const handleDelete = (id: string, name: string) => {
    if (confirm(`Are you sure you want to delete "${name}"?`)) {
      deleteProjectFromStorage(id);
      setProjects(getAllProjects());
      showToast(`Deleted "${name}"`);
    }
  };

  const handleLoad = (p: ProjectData) => {
    setGraph(p.graph);
    showToast(`Loaded "${p.name}" onto canvas!`);
    if (onSavedDiagramLoaded) onSavedDiagramLoaded();
    onClose();
  };

  const handleDownloadJson = (p: ProjectData) => {
    const cleanName = (p.name || 'DFA_Diagram').replace(/[^a-zA-Z0-9_-]/g, '_');
    downloadJsonFile(`${cleanName}.json`, {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      name: p.name,
      graph: p.graph,
    });
    showToast(`Downloaded ${cleanName}.json to your folder!`);
  };

  const handleDownloadPng = (p: ProjectData) => {
    setGraph(p.graph);
    setTimeout(() => {
      exportCanvasToPng('automata-canvas-container', `${p.name || 'DFA_Diagram'}`);
      showToast(`Exported PNG to your folder!`);
    }, 150);
  };

  const handleSaveCurrent = () => {
    saveProjectToStorage(graph);
    setProjects(getAllProjects());
    const cleanName = (graph.name || 'DFA_Diagram').replace(/[^a-zA-Z0-9_-]/g, '_');
    downloadJsonFile(`${cleanName}_saved.json`, {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      name: graph.name || 'DFA Diagram',
      graph,
    });
    showToast(`Current diagram saved & downloaded to folder!`);
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
        setProjects(getAllProjects());
        showToast(`Imported & loaded "${importedGraph.name || file.name}"!`);
        if (onSavedDiagramLoaded) onSavedDiagramLoaded();
        onClose();
      } catch (err) {
        alert('Failed to parse JSON file.');
      }
      if (e.target) e.target.value = '';
    };
    reader.readAsText(file);
  };

  const filteredProjects = projects.filter(
    (p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.graph.states.some((s) => s.id.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-in fade-in">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-6 right-6 z-50 flex items-center gap-2 px-4 py-3 bg-emerald-600 text-white font-medium text-xs rounded-xl shadow-2xl animate-fade-in border border-emerald-400">
          <Check className="w-4 h-4" />
          {toastMessage}
        </div>
      )}

      <div className="relative w-full max-w-4xl max-h-[85vh] bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-600/20 border border-indigo-500/30 rounded-xl text-indigo-400">
              <FolderHeart className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
                Saved States & Diagrams Library
                <span className="px-2 py-0.5 bg-indigo-500/20 text-indigo-300 text-xs rounded-full font-mono font-semibold">
                  {projects.length} Saved
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                View, restore, download, and manage your saved DFA state automata
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleSaveCurrent}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-indigo-600/30 transition"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Save Current Canvas
            </button>

            <label className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold cursor-pointer border border-slate-700 transition">
              <Upload className="w-3.5 h-3.5 text-sky-400" />
              Import JSON
              <input type="file" accept=".json" onChange={handleImportFile} className="hidden" />
            </label>

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-xl transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="px-6 py-3 border-b border-slate-800/80 bg-slate-900/50 flex items-center justify-between gap-4">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search saved states by name or state ID..."
              className="w-full pl-9 pr-4 py-1.5 bg-slate-950/80 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition"
            />
          </div>
          <div className="text-xs text-slate-400 flex items-center gap-1">
            <Info className="w-3.5 h-3.5 text-indigo-400" />
            Diagrams automatically save to your local folder on export
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
          {filteredProjects.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center space-y-3">
              <div className="p-4 bg-slate-800/50 rounded-2xl border border-slate-700/50 text-slate-400">
                <FolderHeart className="w-10 h-10 stroke-1 text-slate-500" />
              </div>
              <h3 className="text-sm font-semibold text-slate-300">No Saved Diagrams Found</h3>
              <p className="text-xs text-slate-500 max-w-sm">
                Save your current DFA state diagram to automatically store it in your library and local folder.
              </p>
              <button
                onClick={handleSaveCurrent}
                className="mt-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition shadow-lg"
              >
                Save Current Canvas Now
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredProjects.map((p) => {
                const stateCount = p.graph.states?.length || 0;
                const transitionCount = p.graph.transitions?.length || 0;
                const acceptCount = p.graph.states?.filter((s) => s.isAccept).length || 0;
                const startState = p.graph.states?.find((s) => s.isStart)?.id || 'q0';
                const alphabet = (p.graph.alphabet || ['0', '1']).join(', ');

                return (
                  <div
                    key={p.id}
                    className="p-4 bg-slate-950/60 border border-slate-800 hover:border-indigo-500/50 rounded-2xl transition group flex flex-col justify-between space-y-3"
                  >
                    {/* Header */}
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="text-sm font-bold text-slate-100 group-hover:text-indigo-300 transition line-clamp-1">
                          {p.name || 'Untitled DFA'}
                        </h4>
                        <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mt-0.5">
                          <Clock className="w-3 h-3 text-slate-500" />
                          <span>{new Date(p.updatedAt).toLocaleDateString()}</span>
                          <span>•</span>
                          <span>{new Date(p.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                      </div>

                      <span className="px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold rounded-full">
                        DFA
                      </span>
                    </div>

                    {/* Necessary Info Badges */}
                    <div className="grid grid-cols-2 gap-2 p-2.5 bg-slate-900/80 border border-slate-800/80 rounded-xl text-xs">
                      <div className="flex items-center gap-1.5 text-slate-300">
                        <Layers className="w-3.5 h-3.5 text-indigo-400" />
                        <span className="text-[11px]">States ($|Q|$): <b>{stateCount}</b></span>
                      </div>

                      <div className="flex items-center gap-1.5 text-slate-300">
                        <span className="text-[11px] font-mono text-sky-400">q₀</span>
                        <span className="text-[11px]">Start: <b>{startState}</b></span>
                      </div>

                      <div className="flex items-center gap-1.5 text-slate-300">
                        <span className="text-[11px] font-mono text-purple-400">Σ</span>
                        <span className="text-[11px]">Alphabet: <b>{alphabet}</b></span>
                      </div>

                      <div className="flex items-center gap-1.5 text-slate-300">
                        <span className="text-[11px] font-mono text-emerald-400 font-bold">F</span>
                        <span className="text-[11px]">Accept: <b>{acceptCount}</b> ({transitionCount} δ)</span>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center justify-between pt-1 border-t border-slate-800/60">
                      <button
                        onClick={() => handleLoad(p)}
                        className="flex items-center gap-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-md transition"
                        title="Load this diagram onto the active canvas"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                        Load onto Canvas
                      </button>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleDownloadJson(p)}
                          title="Download JSON file to your folder"
                          className="p-1.5 text-slate-400 hover:text-sky-400 hover:bg-slate-800 rounded-lg transition"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => handleDownloadPng(p)}
                          title="Export PNG image to your folder"
                          className="p-1.5 text-slate-400 hover:text-emerald-400 hover:bg-slate-800 rounded-lg transition"
                        >
                          <ImageIcon className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => handleDelete(p.id, p.name)}
                          title="Delete from saved library"
                          className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
