import React, { useState, useMemo } from 'react';
import {
  BookOpen,
  BarChart3,
  Code,
  Sigma,
  Table as TableIcon,
  ShieldCheck,
  Cpu,
  Sparkles,
} from 'lucide-react';
import type { AutomatonGraph } from '../../../types/automata';
import { inspectDFA } from '../../../utils/dfaInspectorEngine';
import { useSmoothTabScroll } from '../../../hooks/useSmoothTabScroll';
import { StateSemanticsCard } from './StateSemanticsCard';
import { TabOverview } from './TabOverview';
import { TabStatistics } from './TabStatistics';
import { TabLanguage } from './TabLanguage';
import { TabFormalDefinition } from './TabFormalDefinition';
import { TabTransitionTable } from './TabTransitionTable';
import { TabProperties } from './TabProperties';
import { TabConstruction } from './TabConstruction';

export type InspectorTab =
  | 'overview'
  | 'stats'
  | 'language'
  | 'formal'
  | 'transitions'
  | 'properties'
  | 'construction';

interface DFAInspectorPanelProps {
  graph: AutomatonGraph;
  selectedStateId: string | null;
  currentSimStateId?: string | null;
  onSelectState: (stateId: string | null) => void;
  activeTab?: InspectorTab;
  onTabChange?: (tab: InspectorTab) => void;
}

const tabItems: { id: InspectorTab; label: string; icon: React.FC<{ className?: string }> }[] = [
  { id: 'overview', label: 'Overview', icon: BookOpen },
  { id: 'stats', label: 'Statistics', icon: BarChart3 },
  { id: 'language', label: 'Language', icon: Code },
  { id: 'formal', label: 'Formal Definition', icon: Sigma },
  { id: 'transitions', label: 'Transitions', icon: TableIcon },
  { id: 'properties', label: 'Properties', icon: ShieldCheck },
  { id: 'construction', label: 'Construction', icon: Cpu },
];

export const DFAInspectorPanel: React.FC<DFAInspectorPanelProps> = ({
  graph,
  selectedStateId,
  currentSimStateId,
  onSelectState,
  activeTab: externalTab,
  onTabChange,
}) => {
  const [internalTab, setInternalTab] = useState<InspectorTab>('overview');
  const activeTab = externalTab ?? internalTab;

  const {
    containerRef: tabsRef,
    isMouseDown,
    hasDragged,
    handleWheel,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleMouseLeave,
  } = useSmoothTabScroll<HTMLDivElement>({
    activeTab,
    autoCenterOnSelect: true,
  });

  const setTab = (tab: InspectorTab) => {
    if (hasDragged) return;
    setInternalTab(tab);
    if (onTabChange) onTabChange(tab);
  };

  // Run deep analysis engine on graph
  const inspectorData = useMemo(() => inspectDFA(graph), [graph]);

  // Selected State Semantics (with prefix & label fallback matching)
  const selectedSemantics = useMemo(() => {
    if (!selectedStateId) return null;
    if (inspectorData.semanticsMap[selectedStateId]) {
      return inspectorData.semanticsMap[selectedStateId];
    }
    const cleanSel = selectedStateId.replace(/^[AB]_/, '');
    const foundKey = Object.keys(inspectorData.semanticsMap).find((key) => {
      const cleanKey = key.replace(/^[AB]_/, '');
      const sem = inspectorData.semanticsMap[key];
      return (
        cleanKey === cleanSel ||
        key === selectedStateId ||
        sem.label === selectedStateId ||
        key.includes(cleanSel)
      );
    });
    return foundKey ? inspectorData.semanticsMap[foundKey] : null;
  }, [selectedStateId, inspectorData]);

  return (
    <div className="h-full flex flex-col bg-slate-950 text-slate-100 border-l border-slate-800 shadow-2xl font-sans select-none overflow-hidden">
      {/* Inspector Header */}
      <div className="px-3.5 py-2.5 bg-slate-950 border-b border-slate-800 flex items-center justify-between gap-2 shrink-0 select-none">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="p-1.5 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-indigo-400 shrink-0 shadow-sm">
            <Sparkles className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h2 className="text-xs font-extrabold text-white uppercase tracking-wider leading-none mb-1">
              DFA Inspector
            </h2>
            <span className="text-[11px] text-slate-400 font-medium truncate block leading-none max-w-[280px]" title={inspectorData.languageInfo.name}>
              {inspectorData.languageInfo.name}
            </span>
          </div>
        </div>

        <span className="px-2.5 py-1 bg-indigo-950/90 text-indigo-300 border border-indigo-500/30 text-[11px] font-bold font-mono rounded-full whitespace-nowrap shrink-0 shadow-sm">
          {inspectorData.statistics.totalStates} States
        </span>
      </div>



      {/* ── IDE Pill-Style Tab Navigation Bar ── */}
      <div className="relative bg-slate-950 border-b border-slate-800 shrink-0 py-1.5 px-2">
        {/* Scrollable Tabs Container */}
        <div
          ref={tabsRef}
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
          onMouseLeave={handleMouseLeave}
          onMouseUp={handleMouseUp}
          onMouseMove={handleMouseMove}
          className="flex items-center gap-1 overflow-x-auto no-scrollbar w-full px-1 touch-pan-x cursor-grab active:cursor-grabbing"
        >
          {tabItems.map((tab) => {
            const Icon = tab.icon;
            const isSel = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                data-tab={tab.id}
                type="button"
                onClick={() => setTab(tab.id)}
                className={`px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all duration-200 flex items-center gap-1.5 shrink-0 active:scale-95 ${
                  isSel
                    ? 'bg-indigo-600 text-white font-bold shadow-md shadow-indigo-600/30 border border-indigo-400/30'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-slate-900/80 border border-transparent'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isSel ? 'text-white' : 'text-slate-400'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Content Body */}
      <div className="flex-1 overflow-y-auto p-3 text-xs no-scrollbar">
        {activeTab === 'overview' && <TabOverview data={inspectorData} />}
        {activeTab === 'stats' && <TabStatistics data={inspectorData} />}
        {activeTab === 'language' && <TabLanguage data={inspectorData} />}
        {activeTab === 'formal' && <TabFormalDefinition data={inspectorData} />}
        {activeTab === 'transitions' && (
          <TabTransitionTable
            data={inspectorData}
            selectedStateId={selectedStateId}
            currentSimStateId={currentSimStateId}
            onSelectState={onSelectState}
          />
        )}
        {activeTab === 'properties' && <TabProperties data={inspectorData} />}
        {activeTab === 'construction' && <TabConstruction data={inspectorData} />}
      </div>
    </div>
  );
};
