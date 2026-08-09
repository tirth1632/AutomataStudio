import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';

import type {
  AutomatonGraph,
  AutomatonState,
  AutomatonTransition,
  AppSettings,
  SimulationStep,
  ValidationError,
  AIProvider,
  APIKeys,
  GeneratedAutomatonResult,
} from '../types/automata';
import { SAMPLE_AUTOMATA } from '../utils/sampleAutomata';
import { simulateNFA } from '../algorithms/nfaSimulator';
import { AutomataEngine } from '../algorithms/AutomataEngine/AutomataEngine';
import { IntentParser } from '../algorithms/AutomataEngine/Parser/IntentParser';
import { DFAValidator } from '../algorithms/AutomataEngine/Validation/DFAValidator';
import { generateDFAWithAIFallback } from '../algorithms/AutomataEngine/AI/AIFallback';
import { NFAIntentParser } from '../algorithms/nfa/parser/NFAIntentParser';
import { NFAGeneratorRegistry } from '../algorithms/nfa/generators/NFAGeneratorRegistry';
import { nfaToAutomatonGraph } from '../algorithms/nfa/renderer/NFARenderer';
import { validateNFA } from '../algorithms/nfa/validation/NFAValidator';
import { dfaToGeneratedResult } from '../utils/dfaAdapter';
import { getActiveGraphFromStorage, saveProjectToStorage } from '../utils/storage';
import { normalizeAutomatonGraph } from '../utils/graphNormalizer';
import { getRelevantTestString } from '../utils/testStringHelper';

export type PageId =
  | 'home'
  | 'dfa'
  | 'nfa'
  | 'advanced-dfa'
  | 'advanced-nfa'
  | 'mealy'
  | 'moore'
  | 'enfa'
  | 'canvas'
  | 'simulator'
  | 'nfa-to-dfa'
  | 'minimizer'
  | 'regex-to-nfa'
  | 'quiz';

interface AutomataContextType {
  // Navigation
  activePage: PageId;
  setActivePage: (page: PageId) => void;

  // Workspace Mode & Prompt Input
  workspaceMode: any;
  setWorkspaceMode: (mode: any) => void;
  promptInput: string;
  setPromptInput: (input: string) => void;

  // Graph State
  graph: AutomatonGraph;
  setGraph: (graph: AutomatonGraph, saveToHistory?: boolean) => void;
  updateState: (id: string, updates: Partial<AutomatonState>) => void;
  addState: (state?: Partial<AutomatonState>) => void;
  deleteState: (id: string) => void;
  toggleStartState: (id: string) => void;
  toggleAcceptState: (id: string) => void;
  duplicateState: (id: string) => void;
  clearCanvas: () => void;
  loadSample: (sampleId: string) => void;

  addTransition: (source: string, target: string, symbol: string) => void;
  updateTransitionSymbols: (id: string, symbols: string[]) => void;
  deleteTransition: (id: string) => void;

  // Simulator State
  inputString: string;
  setInputString: (str: string) => void;
  simulationSteps: SimulationStep[];
  currentStepIndex: number;
  setCurrentStepIndex: (index: number | ((prev: number) => number)) => void;
  isPlaying: boolean;
  setIsPlaying: (playing: boolean) => void;
  stepSpeed: number;
  setStepSpeed: (speed: number | ((prev: number) => number)) => void;
  stepForward: () => void;
  stepBackward: () => void;
  resetSimulation: () => void;
  runSimulation: () => void;

  // Validation
  validationErrors: ValidationError[];

  // Settings & History
  settings: AppSettings;
  updateSettings: (newSettings: Partial<AppSettings>) => void;
  canUndo: boolean;
  canRedo: boolean;
  undo: () => void;
  redo: () => void;

  // AI & Generation State
  aiProvider: AIProvider;
  setAiProvider: (provider: AIProvider) => void;
  setAIProvider: (provider: AIProvider) => void;
  apiKeys: APIKeys;
  setApiKey: (provider: keyof APIKeys, key: string) => void;
  setApiKeys: (keys: APIKeys) => void;
  isGenerating: boolean;
  generationError: string | null;
  generatedInfo: GeneratedAutomatonResult | null;
  generateFromPrompt: (promptStr: string) => void;
  generateNFAFromPrompt: (promptStr: string) => void;
}

const AutomataContext = createContext<AutomataContextType | undefined>(undefined);

export const AutomataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [activePage, setActivePage] = useState<PageId>('home');
  const [workspaceMode, setWorkspaceMode] = useState<any>('ai');
  const [promptInput, setPromptInput] = useState<string>('');

  const INITIAL_EMPTY_GRAPH: AutomatonGraph = {
    id: 'graph_initial_empty',
    name: 'Empty Canvas',
    type: 'DFA',
    states: [],
    transitions: [],
    alphabet: ['0', '1'],
  };

  const [graph, setGraphState] = useState<AutomatonGraph>(() => {
    const saved = getActiveGraphFromStorage();
    const normalized = saved ? normalizeAutomatonGraph(saved) : null;
    return normalized || INITIAL_EMPTY_GRAPH;
  });

  const [history, setHistory] = useState<AutomatonGraph[]>([graph]);
  const [historyIndex, setHistoryIndex] = useState<number>(0);

  const [inputString, setInputString] = useState<string>(() => getRelevantTestString(graph));
  const [simulationSteps, setSimulationSteps] = useState<SimulationStep[]>([]);
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [stepSpeed, setStepSpeed] = useState<number>(500);

  const [validationErrors] = useState<ValidationError[]>([]);

  const [aiProvider, setAiProvider] = useState<AIProvider>('AUTO');
  const [apiKeys, setApiKeysState] = useState<APIKeys>({
    openai: localStorage.getItem('OPENAI_API_KEY') || '',
    claude: localStorage.getItem('CLAUDE_API_KEY') || '',
    gemini: localStorage.getItem('GEMINI_API_KEY') || import.meta.env.VITE_GEMINI_API_KEY || '',
    groq: localStorage.getItem('GROQ_API_KEY') || import.meta.env.VITE_GROQ_API_KEY || '',
    openrouter: localStorage.getItem('OPENROUTER_API_KEY') || import.meta.env.VITE_OPENROUTER_API_KEY || '',
  });

  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [generatedInfo, setGeneratedInfo] = useState<GeneratedAutomatonResult | null>(null);

  const [settings, setSettings] = useState<AppSettings>(() => ({
    theme: (localStorage.getItem('automata_theme') as any) || 'dark',
    accentColor: 'indigo',
    animationSpeed: 500,
    simulationSpeed: 500,
    snapToGrid: false,
    showGrid: true,
    autoValidate: true,
    autoLayout: true,
    aiModel: 'auto',
  }));

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', settings.theme);
    localStorage.setItem('automata_theme', settings.theme);
  }, [settings.theme]);

  const setApiKey = (provider: keyof APIKeys, key: string) => {
    const updated = { ...apiKeys, [provider]: key };
    setApiKeysState(updated);
    localStorage.setItem(`${provider.toUpperCase()}_API_KEY`, key);
  };

  const setApiKeys = (keys: APIKeys) => {
    setApiKeysState(keys);
    Object.entries(keys).forEach(([p, k]) => {
      if (k) localStorage.setItem(`${p.toUpperCase()}_API_KEY`, k);
    });
  };

  const updateSettings = (newSettings: Partial<AppSettings>) => {
    setSettings((prev) => ({ ...prev, ...newSettings }));
  };

  const setGraph = useCallback(
    (newGraph: AutomatonGraph, saveToHistory: boolean = true) => {
      const normalized = normalizeAutomatonGraph(newGraph);
      if (!normalized) {
        console.error('Invalid graph structure provided to setGraph:', newGraph);
        return;
      }
      setGraphState(normalized);
      saveProjectToStorage(normalized);
      if (saveToHistory) {
        setHistory((prev) => {
          const sliced = prev.slice(0, historyIndex + 1);
          return [...sliced, normalized];
        });
        setHistoryIndex((prev) => prev + 1);
      }
    },
    [historyIndex]
  );

  const loadSample = useCallback(
    (sampleId: string) => {
      const sample = SAMPLE_AUTOMATA.find((s) => s.id === sampleId) || SAMPLE_AUTOMATA[0];
      setGraph(sample);
    },
    [setGraph]
  );

  // ── Generation via AutomataEngine Architecture ──
  const generateFromPrompt = useCallback(
    async (promptStr: string) => {
      setIsGenerating(true);
      setGenerationError(null);

      await new Promise((resolve) => setTimeout(resolve, 450));

      const engine = new AutomataEngine();
      const parsedIntent = IntentParser.parse(promptStr);

      if (parsedIntent) {
        try {
          const dfa = engine.generate(parsedIntent);
          const validation = DFAValidator.validate(dfa);

          if (validation.isValid) {
            const res = dfaToGeneratedResult(dfa, promptStr);
            setGeneratedInfo(res);
            setGraphState(res.graph);
            saveProjectToStorage(res.graph);
            if (res.acceptedSamples && res.acceptedSamples.length > 0) {
              setInputString(res.acceptedSamples[0]);
            }
            setIsGenerating(false);
            return;
          }
        } catch (err: any) {
          console.warn('AutomataEngine error, trying AI fallback:', err);
        }
      }

      try {
        const fallbackDfa = await generateDFAWithAIFallback(promptStr, aiProvider);
        if (fallbackDfa) {
          const res = dfaToGeneratedResult(fallbackDfa, promptStr);
          setGeneratedInfo(res);
          setGraphState(res.graph);
          saveProjectToStorage(res.graph);
          if (res.acceptedSamples && res.acceptedSamples.length > 0) {
            setInputString(res.acceptedSamples[0]);
          }
        } else {
          setGenerationError('Unable to generate automaton. Please check AI provider keys or try a standard query.');
        }
      } catch (err: any) {
        setGenerationError(err.message || 'AI Generation Failed.');
      } finally {
        setIsGenerating(false);
      }
    },
    [aiProvider]
  );

  const generateNFAFromPrompt = useCallback(async (promptStr: string) => {
    setIsGenerating(true);
    setGenerationError(null);
    await new Promise((resolve) => setTimeout(resolve, 350));

    try {
      const intent = NFAIntentParser.parse(promptStr);
      if (intent) {
        const registry = new NFAGeneratorRegistry();
        const rawNFA = registry.generate(intent);
        if (rawNFA) {
          const valResult = validateNFA(rawNFA);
          const nfaGraph = nfaToAutomatonGraph(rawNFA, promptStr);

          const relTestStr = getRelevantTestString(nfaGraph);
          setGraphState(nfaGraph);
          saveProjectToStorage(nfaGraph);
          setInputString(relTestStr);
          setGeneratedInfo({
            graph: nfaGraph,
            explanation: `Algorithmically generated NFA for prompt "${promptStr}". Valid NFA: ${valResult.length === 0}.`,
            stateDescriptions: {},
            transitionTable: [],
            acceptedSamples: [relTestStr],
            rejectedSamples: ['000', '1111'],
          });
          setIsGenerating(false);
          return;
        }
      }

      // Default NFA dynamic fallback
      const defaultIntent = { type: 'CONTAINS' as const, pattern: '110' };
      const registry = new NFAGeneratorRegistry();
      const rawNFA = registry.generate(defaultIntent);
      const nfaGraph = nfaToAutomatonGraph(rawNFA, promptStr);
      setGraphState(nfaGraph);
      saveProjectToStorage(nfaGraph);
    } catch (err: any) {
      setGenerationError(err.message || 'NFA Generation Failed');
    } finally {
      setIsGenerating(false);
    }
  }, []);

  const updateState = (id: string, updates: Partial<AutomatonState>) => {
    setGraph({
      ...graph,
      states: graph.states.map((s) => (s.id === id ? { ...s, ...updates } : s)),
    });
  };

  const addState = (stateProps?: Partial<AutomatonState>) => {
    const nextIdx = graph.states.length;
    const newState: AutomatonState = {
      id: `q${nextIdx}`,
      label: `q${nextIdx}`,
      x: 150 + (nextIdx % 4) * 120,
      y: 150 + Math.floor(nextIdx / 4) * 100,
      isStart: graph.states.length === 0,
      isAccept: false,
      ...stateProps,
    };
    setGraph({
      ...graph,
      states: [...graph.states, newState],
    });
  };

  const deleteState = (id: string) => {
    setGraph({
      ...graph,
      states: graph.states.filter((s) => s.id !== id),
      transitions: graph.transitions.filter((t) => t.source !== id && t.target !== id),
    });
  };

  const toggleStartState = (id: string) => {
    setGraph({
      ...graph,
      states: graph.states.map((s) => ({
        ...s,
        isStart: s.id === id,
      })),
    });
  };

  const toggleAcceptState = (id: string) => {
    setGraph({
      ...graph,
      states: graph.states.map((s) => (s.id === id ? { ...s, isAccept: !s.isAccept } : s)),
    });
  };

  const duplicateState = (id: string) => {
    const orig = graph.states.find((s) => s.id === id);
    if (!orig) return;
    addState({
      label: `${orig.label}_copy`,
      isAccept: orig.isAccept,
      isStart: false,
      x: orig.x + 40,
      y: orig.y + 40,
    });
  };

  const clearCanvas = () => {
    const emptyGraph: AutomatonGraph = {
      id: `graph_empty_${Date.now()}`,
      name: 'Empty Canvas',
      type: graph.type || 'DFA',
      states: [],
      transitions: [],
      alphabet: ['0', '1'],
    };
    setGraphState(emptyGraph);
    saveProjectToStorage(emptyGraph);
    setHistory([emptyGraph]);
    setHistoryIndex(0);
    setSimulationSteps([]);
    setCurrentStepIndex(0);
  };

  const addTransition = (source: string, target: string, symbol: string) => {
    const existing = graph.transitions.find((t) => t.source === source && t.target === target);
    if (existing) {
      if (!existing.symbols.includes(symbol)) {
        updateTransitionSymbols(existing.id, [...existing.symbols, symbol]);
      }
    } else {
      const newT: AutomatonTransition = {
        id: `t_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
        source,
        target,
        symbols: [symbol],
      };
      setGraph({
        ...graph,
        transitions: [...graph.transitions, newT],
      });
    }
  };

  const updateTransitionSymbols = (id: string, symbols: string[]) => {
    setGraph({
      ...graph,
      transitions: graph.transitions.map((t) => (t.id === id ? { ...t, symbols } : t)),
    });
  };

  const deleteTransition = (id: string) => {
    setGraph({
      ...graph,
      transitions: graph.transitions.filter((t) => t.id !== id),
    });
  };

  const runSimulation = useCallback(() => {
    const steps = simulateNFA(graph, inputString);
    setSimulationSteps(steps);
    setCurrentStepIndex(0);
  }, [graph, inputString]);

  useEffect(() => {
    runSimulation();
  }, [graph, inputString, runSimulation]);

  const stepForward = () => {
    setCurrentStepIndex((prev) => Math.min(prev + 1, simulationSteps.length - 1));
  };

  const stepBackward = () => {
    setCurrentStepIndex((prev) => Math.max(prev - 1, 0));
  };

  const resetSimulation = () => {
    setCurrentStepIndex(0);
    setIsPlaying(false);
  };

  const undo = () => {
    if (historyIndex > 0) {
      const prevIdx = historyIndex - 1;
      setHistoryIndex(prevIdx);
      setGraphState(history[prevIdx]);
    }
  };

  const redo = () => {
    if (historyIndex < history.length - 1) {
      const nextIdx = historyIndex + 1;
      setHistoryIndex(nextIdx);
      setGraphState(history[nextIdx]);
    }
  };

  return (
    <AutomataContext.Provider
      value={{
        activePage,
        setActivePage,
        workspaceMode,
        setWorkspaceMode,
        promptInput,
        setPromptInput,
        graph,
        setGraph,
        updateState,
        addState,
        deleteState,
        toggleStartState,
        toggleAcceptState,
        duplicateState,
        clearCanvas,
        loadSample,
        addTransition,
        updateTransitionSymbols,
        deleteTransition,
        inputString,
        setInputString,
        simulationSteps,
        currentStepIndex,
        setCurrentStepIndex,
        isPlaying,
        setIsPlaying,
        stepSpeed,
        setStepSpeed,
        stepForward,
        stepBackward,
        resetSimulation,
        runSimulation,
        validationErrors,
        settings,
        updateSettings,
        canUndo: historyIndex > 0,
        canRedo: historyIndex < history.length - 1,
        undo,
        redo,
        aiProvider,
        setAiProvider,
        setAIProvider: setAiProvider,
        apiKeys,
        setApiKey,
        setApiKeys,
        isGenerating,
        generationError,
        generatedInfo,
        generateFromPrompt,
        generateNFAFromPrompt,
      }}
    >
      {children}
    </AutomataContext.Provider>
  );
};

export const useAutomata = () => {
  const context = useContext(AutomataContext);
  if (!context) {
    throw new Error('useAutomata must be used within an AutomataProvider');
  }
  return context;
};
