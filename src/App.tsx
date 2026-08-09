import React from 'react';
import { AutomataProvider, useAutomata } from './context/AutomataContext';
import { Navbar } from './components/common/Navbar';
import { HomePage } from './pages/HomePage';
import { AutomataCanvas } from './components/canvas/AutomataCanvas';
import { SimulatorBar } from './components/simulator/SimulatorBar';
import { AIExplainerCard } from './components/simulator/AIExplainerCard';
import { StepTimeline } from './components/simulator/StepTimeline';
import { AIGeneratorPanel } from './components/ai/AIGeneratorPanel';
import { NfaToDfaView } from './components/converters/NfaToDfaView';
import { DfaMinimizerView } from './components/converters/DfaMinimizerView';
import { DFAWorkspace } from './components/workspaces/DFAWorkspace';
import { NFAWorkspace } from './components/workspaces/NFAWorkspace';
import { AdvancedDFAView } from './components/views/AdvancedDFAView';
import { AdvancedNFAView } from './components/views/AdvancedNFAView';
import { TheoryWorkspaceView } from './components/views/TheoryWorkspaceView';
import { ErrorBoundary } from './components/common/ErrorBoundary';

/**
 * SimulatorWorkspace: Full split-panel layout for DFA / NFA / ε-NFA simulators.
 * Left: AI Generator Panel (scrollable)
 * Right: Interactive React Flow canvas + bottom toolbar
 */
const SimulatorWorkspace: React.FC = () => {
  return (
    <div className="flex-1 flex overflow-hidden">
      {/* ── Left Panel ── */}
      <div className="w-80 lg:w-96 shrink-0 overflow-y-auto border-r border-slate-800/80 flex flex-col">
        <AIGeneratorPanel />
      </div>

      {/* ── Right Panel: Canvas + step bar + simulator bar ── */}
      <div className="flex-1 flex flex-col relative overflow-hidden">
        {/* Canvas fills remaining space */}
        <div className="flex-1 relative">
          <AutomataCanvas />
          {/* AI Explainer floating card over canvas */}
          <div className="absolute bottom-4 right-4 z-20 max-w-xs pointer-events-auto">
            <AIExplainerCard />
          </div>
        </div>

        {/* Step timeline strip */}
        <StepTimeline />

        {/* Simulator control bar */}
        <SimulatorBar />
      </div>
    </div>
  );
};

const MainContent: React.FC = () => {
  const { activePage } = useAutomata();

  return (
    <div className="flex-1 min-h-0 flex flex-col relative overflow-hidden">
      {activePage === 'home' && <HomePage />}

      {activePage === 'dfa' && <DFAWorkspace />}

      {activePage === 'enfa' && <SimulatorWorkspace />}

      {activePage === 'nfa' && <NFAWorkspace />}

      {activePage === 'advanced-dfa' && <AdvancedDFAView />}

      {activePage === 'advanced-nfa' && <AdvancedNFAView />}

      {(activePage === 'mealy' || activePage === 'moore') && (
        <TheoryWorkspaceView pageId={activePage} />
      )}
      {activePage === 'nfa-to-dfa' && <NfaToDfaView />}
      {activePage === 'minimizer' && <DfaMinimizerView />}
    </div>
  );
};

export function App() {
  return (
    <ErrorBoundary>
      <AutomataProvider>
        <div className="w-screen h-screen flex flex-col bg-slate-950 text-slate-100 font-sans antialiased overflow-hidden select-none">
          <Navbar />
          <MainContent />
        </div>
      </AutomataProvider>
    </ErrorBoundary>
  );
}

export default App;
