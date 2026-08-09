import React from 'react';
import { X, BookOpen, Lightbulb, CheckCircle2 } from 'lucide-react';
import { WHY_EXPLANATIONS } from '../../utils/dfaEducationalUtils';

interface WhyExplanationModalProps {
  topicKey: keyof typeof WHY_EXPLANATIONS | null;
  onClose: () => void;
}

export const WhyExplanationModal: React.FC<WhyExplanationModalProps> = ({ topicKey, onClose }) => {
  if (!topicKey || !WHY_EXPLANATIONS[topicKey]) return null;

  const data = WHY_EXPLANATIONS[topicKey];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-700/80 text-slate-100 rounded-3xl max-w-xl w-full p-6 shadow-2xl space-y-5 relative">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 p-2 rounded-xl transition cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
          <div className="p-3 bg-amber-500/20 border border-amber-500/40 rounded-2xl text-amber-400">
            <Lightbulb className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-bold text-lg text-slate-100">{data.title}</h3>
            <p className="text-xs text-amber-400 font-semibold">{data.question}</p>
          </div>
        </div>

        {/* Educational Explanation */}
        <div className="space-y-4">
          <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-2xl leading-relaxed text-sm text-slate-300">
            {data.explanation}
          </div>

          {/* Mathematical Formula Card */}
          <div className="p-4 bg-indigo-950/40 border border-indigo-500/30 rounded-2xl flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold text-indigo-300">
              <BookOpen className="w-4 h-4 text-indigo-400" /> Formal Set Definition:
            </div>
            <code className="font-mono text-sm font-bold text-emerald-300 bg-emerald-950/60 px-3 py-1.5 rounded-xl border border-emerald-500/30">
              {data.formula}
            </code>
          </div>

          {/* Time Complexity */}
          <div className="flex items-center justify-between px-4 py-3 bg-slate-950/60 border border-slate-800/80 rounded-xl text-xs">
            <span className="text-slate-400 font-medium">Algorithmic Complexity:</span>
            <span className="font-mono font-bold text-sky-400">{data.complexity}</span>
          </div>
        </div>

        {/* Footer Action */}
        <div className="flex justify-end pt-2">
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg transition cursor-pointer"
          >
            <CheckCircle2 className="w-4 h-4" /> Got it! Close Explanation
          </button>
        </div>
      </div>
    </div>
  );
};
