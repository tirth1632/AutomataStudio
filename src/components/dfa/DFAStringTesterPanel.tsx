import React, { useState, useEffect, useCallback } from 'react';
import { Play, Check, X, Layers, PlayCircle, Trash2, RotateCcw, Sparkles, BookOpen } from 'lucide-react';
import type { AutomatonGraph } from '../../types/automata';
import { simulateNFA } from '../../algorithms/nfaSimulator';
import { useAutomata } from '../../context/AutomataContext';
import { generateDeterministicQuestionExplanation } from '../../services/aiExplanationService';

interface DFAStringTesterPanelProps {
  graph: AutomatonGraph;
  promptDescription?: string;
}

interface TestResult {
  id: string;
  input: string;
  isAccepted: boolean;
  finalState: string;
  path: string[];
}

import { getRelevantTestString } from '../../utils/testStringHelper';

export const DFAStringTesterPanel: React.FC<DFAStringTesterPanelProps> = ({
  graph,
  promptDescription,
}) => {
  const { setInputString, runSimulation } = useAutomata();
  const question = promptDescription || graph.name || 'Binary strings pattern matching';

  const [mode, setMode] = useState<'single' | 'batch'>('single');
  const [singleInput, setSingleInput] = useState<string>(() => getRelevantTestString(graph));

  useEffect(() => {
    if (graph && graph.states.length > 0) {
      setSingleInput(getRelevantTestString(graph));
    }
  }, [graph]);

  const [batchInput, setBatchInput] = useState<string>('101\n1101\n000101\n111\n100\n10');

  const [testResults, setTestResults] = useState<TestResult[]>([]);

  // Execute simulation for a given input string on current DFA graph
  const testString = useCallback(
    (inputStr: string): TestResult => {
      const steps = simulateNFA(graph, inputStr);
      const lastStep = steps[steps.length - 1];
      const isAccepted = lastStep ? lastStep.isAccepting : false;
      const finalState = lastStep && lastStep.currentStateIds[0] ? lastStep.currentStateIds[0] : '∅';

      const path: string[] = [];
      steps.forEach((step) => {
        if (step.currentStateIds[0]) {
          path.push(step.currentStateIds[0]);
        }
      });

      return {
        id: `${inputStr}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        input: inputStr,
        isAccepted,
        finalState,
        path,
      };
    },
    [graph]
  );

  // Automatically refresh test content whenever the graph or question prompt changes
  const refreshQuestionContent = useCallback(() => {
    const explanation = generateDeterministicQuestionExplanation(question, graph);
    const sampleInputs = Array.from(
      new Set([...explanation.acceptedExamples, ...explanation.rejectedExamples])
    );

    // Keep test history empty at start until user clicks Test String
    setTestResults([]);

    if (sampleInputs.length > 0) {
      if (sampleInputs[0] !== undefined) {
        setSingleInput(sampleInputs[0]);
      }
      setBatchInput(sampleInputs.join('\n'));
    }
  }, [question, graph]);

  useEffect(() => {
    refreshQuestionContent();
  }, [graph.id, question, refreshQuestionContent]);

  const handleTestSingle = () => {
    const trimmed = singleInput.trim();
    const result = testString(trimmed);
    setTestResults((prev) => [result, ...prev]);
    setInputString(trimmed);
    runSimulation();
  };

  const handleTestBatch = () => {
    const lines = batchInput
      .split(/[\n,]+/)
      .map((s) => s.trim())
      .filter((s) => s.length >= 0);

    const results = lines.map((str) => testString(str));
    setTestResults((prev) => [...results, ...prev]);
    if (lines.length > 0) {
      setInputString(lines[0]);
      runSimulation();
    }
  };

  const handleReplayInSimulator = (input: string) => {
    setInputString(input);
    runSimulation();
  };

  const handleDeleteItem = (id: string) => {
    setTestResults((prev) => prev.filter((r) => r.id !== id));
  };

  const handleClearHistory = () => {
    setTestResults([]);
  };

  const acceptedCount = testResults.filter((r) => r.isAccepted).length;
  const rejectedCount = testResults.filter((r) => !r.isAccepted).length;

  return (
    <div className="p-4 sm:p-5 space-y-4 bg-slate-900/95 text-slate-100 rounded-2xl border border-slate-800 text-sm shadow-xl">
      {/* Header with Target Question Banner & Mode Selector */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3 gap-2 flex-wrap">
        <div className="flex items-center gap-2.5 font-bold text-base text-indigo-300">
          <Play className="w-5 h-5 text-indigo-400 shrink-0" />
          String Tester & Question Validator
        </div>

        <div>
          <div className="flex items-center gap-1.5 p-1 bg-slate-950 rounded-xl border border-slate-800">
            <button
              onClick={() => setMode('single')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                mode === 'single'
                  ? 'bg-indigo-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Single Test
            </button>
            <button
              onClick={() => setMode('batch')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                mode === 'batch'
                  ? 'bg-indigo-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Batch Test
            </button>
          </div>
        </div>
      </div>

      {/* Target Question Context Box */}
      <div className="px-3.5 py-2.5 bg-slate-950/80 border border-indigo-500/30 rounded-xl flex items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 min-w-0">
          <BookOpen className="w-4 h-4 text-indigo-400 shrink-0" />
          <span className="text-slate-400 font-semibold shrink-0">Target Question:</span>
          <span className="font-mono font-bold text-indigo-200 truncate">"{question}"</span>
        </div>
        <div className="flex items-center gap-1.5 text-[11px] text-purple-300 bg-purple-950/60 border border-purple-500/30 px-2 py-0.5 rounded-lg shrink-0 font-medium">
          <Sparkles className="w-3 h-3 text-purple-400" />
          Active Question
        </div>
      </div>

      {/* Input Section */}
      {mode === 'single' ? (
        <div className="flex gap-2">
          <input
            type="text"
            value={singleInput}
            onChange={(e) => setSingleInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleTestSingle()}
            placeholder="Enter input string (e.g. 101)..."
            className="flex-1 px-3.5 py-2 bg-slate-950 border border-slate-700/80 rounded-xl font-mono text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
          <button
            onClick={handleTestSingle}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition shadow"
          >
            <Play className="w-3.5 h-3.5" /> Test String
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          <label className="text-xs font-semibold text-slate-300">
            Paste multiple strings (separated by newlines or commas):
          </label>
          <textarea
            rows={3}
            value={batchInput}
            onChange={(e) => setBatchInput(e.target.value)}
            placeholder="101&#10;1101&#10;000101&#10;111"
            className="w-full p-3 bg-slate-950 border border-slate-700/80 rounded-xl font-mono text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 resize-none"
          />
          <button
            onClick={handleTestBatch}
            className="w-full py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition shadow"
          >
            <Layers className="w-3.5 h-3.5" /> Run Batch Test
          </button>
        </div>
      )}

      {/* Summary Counters */}
      {testResults.length > 0 && (
        <div className="flex items-center justify-between p-3 bg-slate-950/80 rounded-xl border border-slate-800 text-xs font-semibold">
          <div className="flex items-center gap-4">
            <span className="text-slate-400">Total Tested: <strong className="text-white">{testResults.length}</strong></span>
            <span className="text-emerald-400 flex items-center gap-1"><Check className="w-3.5 h-3.5" /> Accepted: <strong>{acceptedCount}</strong></span>
            <span className="text-rose-400 flex items-center gap-1"><X className="w-3.5 h-3.5" /> Rejected: <strong>{rejectedCount}</strong></span>
          </div>

          <button
            onClick={handleClearHistory}
            className="p-1 hover:bg-slate-800 text-slate-400 hover:text-rose-300 rounded transition flex items-center gap-1 text-xs"
          >
            <Trash2 className="w-3.5 h-3.5" /> Clear History
          </button>
        </div>
      )}

      {/* Results History List (Section 13) */}
      <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
        {testResults.length === 0 ? (
          <div className="p-6 text-center text-slate-500 text-xs border border-dashed border-slate-800 rounded-xl">
            No strings tested yet. Enter a string above and click Test.
          </div>
        ) : (
          testResults.map((res) => (
            <div
              key={res.id}
              className={`p-3 rounded-xl border transition flex items-center justify-between gap-3 ${
                res.isAccepted
                  ? 'bg-emerald-950/20 border-emerald-500/30'
                  : 'bg-rose-950/20 border-rose-500/30'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <span
                  className={`px-2 py-1 rounded text-xs font-bold font-mono flex items-center gap-1 shrink-0 ${
                    res.isAccepted
                      ? 'bg-emerald-600/30 text-emerald-300 border border-emerald-500/40'
                      : 'bg-rose-600/30 text-rose-300 border border-rose-500/40'
                  }`}
                >
                  {res.isAccepted ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                  {res.isAccepted ? 'Accepted' : 'Rejected'}
                </span>

                <div className="min-w-0">
                  <div className="font-mono text-sm font-bold text-white truncate">
                    "{res.input}"
                  </div>
                  <div className="text-xs text-slate-400 font-mono truncate flex items-center gap-1.5">
                    <span>Path: {res.path.join(' → ')}</span>
                    <span className="text-slate-500">|</span>
                    <span>Final State: <strong className="text-indigo-300">{res.finalState}</strong></span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  onClick={() => handleReplayInSimulator(res.input)}
                  title="Replay simulation in visualizer"
                  className="p-1.5 bg-slate-800 hover:bg-indigo-600 text-slate-300 hover:text-white rounded-lg transition text-xs flex items-center gap-1"
                >
                  <PlayCircle className="w-3.5 h-3.5" /> Replay
                </button>
                <button
                  onClick={() => handleDeleteItem(res.id)}
                  className="p-1.5 hover:bg-rose-950 text-slate-500 hover:text-rose-400 rounded-lg transition"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
