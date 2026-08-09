import React from 'react';
import { X, Moon, Sparkles, Sliders, Keyboard, Zap } from 'lucide-react';
import { useAutomata } from '../../context/AutomataContext';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const { settings, updateSettings } = useAutomata();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700/80 p-6 rounded-3xl shadow-2xl w-full max-w-lg text-slate-100 space-y-6">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2">
            <Sliders className="w-5 h-5 text-indigo-400" />
            <h3 className="text-lg font-bold">Studio Settings</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-slate-800 rounded-xl text-slate-400 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Theme Selector */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-slate-300 block uppercase tracking-wider">
            Color Theme
          </label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: 'dark', label: 'Dark Mode', icon: Moon },
              { id: 'oled', label: 'OLED Black', icon: Zap },
              { id: 'cyberpunk', label: 'Cyberpunk', icon: Sparkles },
            ].map((th) => {
              const Icon = th.icon;
              const isSel = settings.theme === th.id;
              return (
                <button
                  key={th.id}
                  onClick={() => updateSettings({ theme: th.id as any })}
                  className={`p-3 rounded-2xl border text-xs font-semibold flex flex-col items-center gap-2 transition ${
                    isSel
                      ? 'bg-indigo-600 text-white border-indigo-400 shadow-lg shadow-indigo-600/30'
                      : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {th.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Canvas Grid Options */}
        <div className="space-y-3 border-t border-slate-800 pt-4">
          <label className="text-xs font-semibold text-slate-300 block uppercase tracking-wider">
            Canvas Options
          </label>

          <div className="flex items-center justify-between p-3 bg-slate-950/60 border border-slate-800 rounded-2xl text-xs">
            <span className="font-semibold">Snap to Grid</span>
            <input
              type="checkbox"
              checked={settings.snapToGrid}
              onChange={(e) => updateSettings({ snapToGrid: e.target.checked })}
              className="accent-indigo-500 w-4 h-4 cursor-pointer"
            />
          </div>

          <div className="flex items-center justify-between p-3 bg-slate-950/60 border border-slate-800 rounded-2xl text-xs">
            <span className="font-semibold">Auto-Validate Graph Rules</span>
            <input
              type="checkbox"
              checked={settings.autoValidate}
              onChange={(e) => updateSettings({ autoValidate: e.target.checked })}
              className="accent-indigo-500 w-4 h-4 cursor-pointer"
            />
          </div>
        </div>

        {/* Keyboard Shortcuts Cheatsheet */}
        <div className="space-y-2 border-t border-slate-800 pt-4">
          <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5 uppercase tracking-wider">
            <Keyboard className="w-4 h-4 text-indigo-400" />
            Keyboard Shortcuts
          </label>

          <div className="grid grid-cols-2 gap-2 text-xs font-mono text-slate-300">
            <div className="p-2 bg-slate-950/80 rounded-xl border border-slate-800 flex justify-between">
              <span>Undo</span> <code className="text-indigo-400">Ctrl + Z</code>
            </div>
            <div className="p-2 bg-slate-950/80 rounded-xl border border-slate-800 flex justify-between">
              <span>Redo</span> <code className="text-indigo-400">Ctrl + Y</code>
            </div>
            <div className="p-2 bg-slate-950/80 rounded-xl border border-slate-800 flex justify-between">
              <span>Delete</span> <code className="text-indigo-400">Del / Backspace</code>
            </div>
            <div className="p-2 bg-slate-950/80 rounded-xl border border-slate-800 flex justify-between">
              <span>Connect</span> <code className="text-indigo-400">Drag Handles</code>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
