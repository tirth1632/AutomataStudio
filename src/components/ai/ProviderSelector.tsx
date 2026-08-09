import React, { useState } from 'react';
import { Key, Check, ChevronDown, Zap, Globe, Cpu, Trash2, Eye, EyeOff, X } from 'lucide-react';
import { useAutomata } from '../../context/AutomataContext';
import type { AIProvider, APIKeys } from '../../types/automata';
import { saveAPIKeys } from '../../services/aiProviders';

interface ProviderMeta {
  id: AIProvider;
  name: string;
  model: string;
  icon: React.ReactNode;
  color: string;
  badge: string;
  keyName: keyof APIKeys | null;
  placeholder: string;
}

const PROVIDERS: ProviderMeta[] = [
  {
    id: 'AUTO',
    name: 'AUTO (Fallback)',
    model: 'OpenAI → Claude → Gemini → Groq',
    icon: <Zap className="w-3.5 h-3.5 text-amber-400" />,
    color: '#f59e0b',
    badge: 'Auto Fallback',
    keyName: null,
    placeholder: '',
  },
  {
    id: 'OPENAI',
    name: 'OpenAI',
    model: 'gpt-4o',
    icon: <Globe className="w-3.5 h-3.5 text-emerald-400" />,
    color: '#10a37f',
    badge: 'OpenAI',
    keyName: 'openai',
    placeholder: 'sk-proj-...',
  },
  {
    id: 'CLAUDE',
    name: 'Claude',
    model: 'claude-3-5-sonnet',
    icon: <Cpu className="w-3.5 h-3.5 text-amber-400" />,
    color: '#d97706',
    badge: 'Anthropic',
    keyName: 'claude',
    placeholder: 'sk-ant-api...',
  },
  {
    id: 'GEMINI',
    name: 'Gemini',
    model: 'gemini-2.5-flash',
    icon: <Cpu className="w-3.5 h-3.5 text-blue-400" />,
    color: '#4285f4',
    badge: 'Google',
    keyName: 'gemini',
    placeholder: 'AIzaSy...',
  },
  {
    id: 'GROQ',
    name: 'Groq',
    model: 'llama-3.3-70b',
    icon: <Zap className="w-3.5 h-3.5 text-orange-400" />,
    color: '#f97316',
    badge: 'Ultra-Fast',
    keyName: 'groq',
    placeholder: 'gsk_...',
  },
  {
    id: 'openrouter',
    name: 'OpenRouter',
    model: 'gpt-4o-mini',
    icon: <Globe className="w-3.5 h-3.5 text-cyan-400" />,
    color: '#06b6d4',
    badge: 'Multi-Model',
    keyName: 'openrouter',
    placeholder: 'sk-or-v1-...',
  },
];

function maskKey(key: string): string {
  if (!key) return '';
  if (key.length <= 8) return '••••••••';
  return `••••${key.slice(-4)}`;
}

export const ProviderSelector: React.FC = () => {
  const { aiProvider, setAIProvider, apiKeys, setApiKeys, setApiKey } = useAutomata();
  const [open, setOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showPlainKeys, setShowPlainKeys] = useState<Record<string, boolean>>({});

  // Local state for batch editing keys in the modal
  const [localKeys, setLocalKeys] = useState<APIKeys>({ ...apiKeys });

  const current = PROVIDERS.find((p) => p.id === aiProvider) || PROVIDERS[0];
  const currentKeyName = current.keyName;
  const currentHasKey = currentKeyName
    ? !!apiKeys[currentKeyName]
    : Object.values(apiKeys).some(Boolean);

  const openKeyModal = () => {
    setLocalKeys({ ...apiKeys });
    setIsModalOpen(true);
    setOpen(false);
  };

  const handleSaveAllKeys = () => {
    setApiKeys(localKeys);
    saveAPIKeys(localKeys);
    setIsModalOpen(false);
  };

  const handleClearKey = (keyName: keyof APIKeys) => {
    const updated = { ...localKeys, [keyName]: '' };
    setLocalKeys(updated);
    setApiKey(keyName, '');
  };

  const toggleShowKey = (keyName: string) => {
    setShowPlainKeys((prev) => ({ ...prev, [keyName]: !prev[keyName] }));
  };

  return (
    <div className="relative">
      {/* Selector trigger button */}
      <div className="flex items-center gap-1.5">
        <button
          onClick={() => setOpen((v) => !v)}
          className="flex-1 flex items-center justify-between bg-slate-900 border border-slate-700/80 hover:border-slate-600 px-3 py-1.5 rounded-xl text-xs font-medium text-slate-200 transition shadow-sm"
        >
          <div className="flex items-center gap-2">
            <span
              className="w-2 h-2 rounded-full shrink-0"
              style={{ backgroundColor: current.color }}
            />
            <span className="font-semibold">{current.name}</span>
            <span className="text-[10px] text-slate-400 font-mono hidden sm:inline">
              ({current.model})
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span
              className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                currentHasKey
                  ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                  : 'bg-amber-950 text-amber-300 border border-amber-800'
              }`}
            >
              {currentHasKey ? 'Ready' : 'No Key'}
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 ml-0.5" />
          </div>
        </button>

        {/* Global Configure Keys Button */}
        <button
          onClick={openKeyModal}
          title="Configure API key for each provider"
          className="p-1.5 bg-slate-900 border border-slate-700/80 hover:border-slate-600 rounded-xl text-slate-400 hover:text-slate-200 transition shrink-0"
        >
          <Key className="w-3.5 h-3.5 text-indigo-400" />
        </button>
      </div>

      {/* Dropdown Menu */}
      {open && (
        <div className="absolute left-0 right-0 top-full mt-1.5 w-full min-w-[280px] bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl z-50 p-2 text-xs space-y-1">
          <div className="flex items-center justify-between px-2 py-1 border-b border-slate-800/60 pb-1.5 mb-1">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              Select AI Provider
            </span>
            <button
              onClick={openKeyModal}
              className="text-[10px] text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1"
            >
              <Key className="w-2.5 h-2.5" /> Manage Keys
            </button>
          </div>

          {PROVIDERS.map((p) => {
            const isSel = p.id === aiProvider;
            const pKeyName = p.keyName;
            const pHasKey = pKeyName ? !!apiKeys[pKeyName] : Object.values(apiKeys).some(Boolean);

            return (
              <div
                key={p.id}
                onClick={() => {
                  setAIProvider(p.id);
                  setOpen(false);
                }}
                className={`flex items-center justify-between p-2 rounded-xl cursor-pointer transition ${
                  isSel
                    ? 'bg-indigo-950/80 border border-indigo-500/40 text-white font-semibold'
                    : 'hover:bg-slate-800/60 text-slate-300'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span style={{ color: p.color }} className="shrink-0">{p.icon}</span>
                  <div className="min-w-0 truncate">
                    <div className="flex items-center gap-1.5">
                      <span className="truncate">{p.name}</span>
                      <span className="text-[9px] bg-slate-800 px-1.5 py-0.2 rounded text-slate-400 shrink-0">
                        {p.badge}
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono truncate">{p.model}</div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 ml-2">
                  {/* Per-Provider Key Status Badge */}
                  <span
                    onClick={(e) => {
                      e.stopPropagation();
                      openKeyModal();
                    }}
                    title={pHasKey ? `Key configured for ${p.name}` : `No key for ${p.name}. Click to add.`}
                    className={`flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[9px] font-mono cursor-pointer transition ${
                      pHasKey
                        ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800/60 hover:bg-emerald-900/60'
                        : 'bg-slate-800 text-slate-400 border border-slate-700 hover:text-amber-300 hover:border-amber-700'
                    }`}
                  >
                    <Key className="w-2.5 h-2.5" />
                    {pHasKey ? 'Key Set' : 'No Key'}
                  </span>

                  {isSel && <Check className="w-3.5 h-3.5 text-indigo-400 shrink-0" />}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Multi-Provider Key Configuration Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-slate-700/80 p-5 rounded-3xl shadow-2xl w-full max-w-lg text-slate-100 space-y-4 max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Key className="w-5 h-5 text-indigo-400" />
                <div>
                  <h3 className="text-base font-bold">API Key Manager</h3>
                  <p className="text-[11px] text-slate-400">Add or edit API key for each AI provider</p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 hover:bg-slate-800 rounded-xl text-slate-400 hover:text-white transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Provider Key Inputs list */}
            <div className="space-y-3">
              {PROVIDERS.filter((p) => p.keyName !== null).map((p) => {
                const kName = p.keyName!;
                const currentVal = localKeys[kName] || '';
                const isShow = !!showPlainKeys[kName];

                return (
                  <div
                    key={kName}
                    className="p-3 bg-slate-950/70 border border-slate-800 rounded-2xl space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span style={{ color: p.color }}>{p.icon}</span>
                        <span className="font-bold text-xs">{p.name}</span>
                        <span className="text-[10px] text-slate-500 font-mono">({p.badge})</span>
                      </div>
                      {currentVal ? (
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-800 px-1.5 py-0.5 rounded">
                            {maskKey(currentVal)}
                          </span>
                          <button
                            onClick={() => handleClearKey(kName)}
                            title="Clear Key"
                            className="p-1 hover:bg-rose-950 text-slate-400 hover:text-rose-400 rounded transition"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <span className="text-[10px] font-mono text-amber-400 bg-amber-950/60 border border-amber-800 px-1.5 py-0.5 rounded">
                          No Key Added
                        </span>
                      )}
                    </div>

                    <div className="relative flex items-center">
                      <input
                        type={isShow ? 'text' : 'password'}
                        value={currentVal}
                        onChange={(e) =>
                          setLocalKeys((prev) => ({ ...prev, [kName]: e.target.value.trim() }))
                        }
                        placeholder={p.placeholder}
                        className="w-full px-3 py-1.5 pr-8 bg-slate-900 border border-slate-700/80 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 font-mono"
                      />
                      <button
                        type="button"
                        onClick={() => toggleShowKey(kName)}
                        className="absolute right-2 text-slate-500 hover:text-slate-300"
                      >
                        {isShow ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            <p className="text-[10px] text-slate-400 leading-relaxed bg-slate-950/50 p-2.5 border border-slate-800 rounded-xl">
              💡 API keys are stored safely in your browser's local storage and used directly for API calls.
            </p>

            {/* Footer Actions */}
            <div className="flex justify-end gap-2 pt-1 border-t border-slate-800">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveAllKeys}
                className="px-5 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-xl text-xs font-bold transition shadow-lg shadow-indigo-600/30"
              >
                Save All Keys
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
