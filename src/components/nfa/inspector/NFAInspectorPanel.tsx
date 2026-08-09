import React, { useState, useMemo } from 'react';
import {
  BookOpen,
  BarChart3,
  Activity,
  Zap,
  Play,
  Table,
  Layers,
  GitFork,
  FileCode,
  Columns,
  Terminal,
} from 'lucide-react';
import type { NFA } from '../../../algorithms/nfa/NFA';
import type { AutomatonGraph } from '../../../types/automata';
import { useSmoothTabScroll } from '../../../hooks/useSmoothTabScroll';
import { NFAEpsilonClosureExplorer } from '../NFAEpsilonClosureExplorer';
import { NFABranchTreeVisualizer } from '../NFABranchTreeVisualizer';
import { NFATransitionTablePanel } from '../NFATransitionTablePanel';
import { NFALanguageExplanationPanel } from '../NFALanguageExplanationPanel';
import { NFAFormalDefinitionPanel } from '../NFAFormalDefinitionPanel';
import { NFAStateInspectorPanel } from '../NFAStateInspectorPanel';
import { NFALanguageAnalysisPanel } from '../NFALanguageAnalysisPanel';
import { NFAThompsonAnimationPanel } from '../NFAThompsonAnimationPanel';
import { NFASubsetConstructionPanel } from '../NFASubsetConstructionPanel';
import { NFAComparisonView } from '../NFAComparisonView';

export type NFAInspectorTab =
  | 'overview'
  | 'statistics'
  | 'language'
  | 'transitions'
  | 'subset'
  | 'comparison'
  | 'debug';

interface NFAInspectorPanelProps {
  nfa: NFA;
  graph?: AutomatonGraph;
  promptDescription?: string;
  activeTab?: NFAInspectorTab;
  onTabChange?: (tab: NFAInspectorTab) => void;
  inputString?: string;
}

export const NFAInspectorPanel: React.FC<NFAInspectorPanelProps> = ({
  nfa,
  graph,
  promptDescription = 'Nondeterministic Finite Automaton',
  activeTab: activeTabProp,
  onTabChange,
  inputString = '',
}) => {
  const [internalTab, setInternalTab] = useState<NFAInspectorTab>('overview');
  const activeTab = activeTabProp !== undefined ? activeTabProp : internalTab;

  const handleTabSelect = (tab: NFAInspectorTab) => {
    setInternalTab(tab);
    onTabChange?.(tab);
  };

  const {
    containerRef: tabsRef,
    handleWheel,
    handleMouseDown,
    handleMouseLeave,
    handleMouseUp,
    handleMouseMove,
  } = useSmoothTabScroll<HTMLDivElement>({
    activeTab,
    autoCenterOnSelect: true,
  });

  // Calculate NFA metrics
  const stats = useMemo(() => {
    let totalTransitions = 0;
    let epsilonTransitions = 0;
    let maxBranching = 0;
    const branchingStates = new Set<string>();

    Object.entries(nfa.transitions || {}).forEach(([src, symMap]: [string, any]) => {
      Object.entries(symMap).forEach(([sym, tgts]: [string, any]) => {
        const tgtList = Array.isArray(tgts) ? tgts : [tgts];
        totalTransitions += tgtList.length;

        if (sym === 'ε' || sym === 'epsilon' || sym === 'e' || sym === '') {
          epsilonTransitions += tgtList.length;
          branchingStates.add(src);
        }

        if (tgtList.length > 1) {
          branchingStates.add(src);
        }

        maxBranching = Math.max(maxBranching, tgtList.length);
      });
    });

    return {
      totalStates: nfa.states?.length || 0,
      acceptStatesCount: nfa.acceptStates?.length || 0,
      totalTransitions,
      epsilonTransitions,
      branchingStatesCount: branchingStates.size,
      maxBranching,
    };
  }, [nfa]);

  const tabs: { id: NFAInspectorTab; label: string; icon: any }[] = [
    { id: 'overview', label: 'Overview', icon: BookOpen },
    { id: 'statistics', label: 'Statistics', icon: BarChart3 },
    { id: 'language', label: 'Language', icon: Activity },
    { id: 'transitions', label: 'Transitions', icon: Table },
    { id: 'subset', label: 'Subset Construction', icon: Layers },
    { id: 'comparison', label: 'Comparison', icon: Columns },
    { id: 'debug', label: 'Debug & Theory', icon: Terminal },
  ];

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-900/95 text-slate-100 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl font-sans">
      {/* Inspector Tabs Navigation Bar */}
      <div
        ref={tabsRef}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseLeave={handleMouseLeave}
        onMouseUp={handleMouseUp}
        onMouseMove={handleMouseMove}
        className="flex items-center gap-1.5 px-3 py-2 bg-slate-950/90 border-b border-slate-800 overflow-x-auto no-scrollbar shrink-0 touch-pan-x cursor-grab active:cursor-grabbing select-none"
      >
        {tabs.map((t) => {
          const Icon = t.icon;
          const isSel = activeTab === t.id;
          return (
            <button
              key={t.id}
              data-tab={t.id}
              onClick={() => handleTabSelect(t.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 cursor-pointer active:scale-95 ${
                isSel
                  ? 'bg-sky-600 text-white shadow-md shadow-sky-600/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800 border border-transparent'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Tab Body Content */}
      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
        {activeTab === 'overview' && (
          <div className="space-y-4">
            <NFAFormalDefinitionPanel nfa={nfa} promptDescription={promptDescription} />
          </div>
        )}

        {activeTab === 'statistics' && (
          <div className="p-4 bg-slate-950/90 rounded-2xl border border-slate-800 space-y-4 font-mono text-xs">
            <div className="flex items-center gap-2 font-bold text-sm text-sky-300 font-sans border-b border-slate-800 pb-2">
              <BarChart3 className="w-4 h-4 text-sky-400" /> NFA Architectural Statistics
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="p-3 bg-slate-900 rounded-xl border border-slate-800">
                <span className="text-[9px] text-slate-400 uppercase font-sans font-bold block">Total States</span>
                <span className="text-base text-slate-100 font-bold">{stats.totalStates}</span>
              </div>
              <div className="p-3 bg-slate-900 rounded-xl border border-slate-800">
                <span className="text-[9px] text-slate-400 uppercase font-sans font-bold block">Accept States</span>
                <span className="text-base text-emerald-400 font-bold">{stats.acceptStatesCount}</span>
              </div>
              <div className="p-3 bg-slate-900 rounded-xl border border-slate-800">
                <span className="text-[9px] text-slate-400 uppercase font-sans font-bold block">Total Transitions</span>
                <span className="text-base text-slate-100 font-bold">{stats.totalTransitions}</span>
              </div>
              <div className="p-3 bg-slate-900 rounded-xl border border-slate-800">
                <span className="text-[9px] text-purple-400 uppercase font-sans font-bold block">ε-Transitions</span>
                <span className="text-base text-purple-300 font-bold">{stats.epsilonTransitions}</span>
              </div>
              <div className="p-3 bg-slate-900 rounded-xl border border-slate-800">
                <span className="text-[9px] text-amber-400 uppercase font-sans font-bold block">Branching States</span>
                <span className="text-base text-amber-300 font-bold">{stats.branchingStatesCount}</span>
              </div>
              <div className="p-3 bg-slate-900 rounded-xl border border-slate-800">
                <span className="text-[9px] text-sky-400 uppercase font-sans font-bold block">Max Branching Factor</span>
                <span className="text-base text-sky-300 font-bold">{stats.maxBranching}</span>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'language' && <NFALanguageAnalysisPanel nfa={nfa} />}

        {activeTab === 'transitions' && <NFATransitionTablePanel nfa={nfa} />}

        {activeTab === 'subset' && <NFASubsetConstructionPanel nfa={nfa} />}

        {activeTab === 'comparison' && <NFAComparisonView nfa={nfa} promptDescription={promptDescription} />}

        {activeTab === 'debug' && <NFALanguageExplanationPanel nfa={nfa} promptDescription={promptDescription} />}
      </div>
    </div>
  );
};
