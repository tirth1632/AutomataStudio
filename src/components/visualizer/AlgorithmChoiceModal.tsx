import React from 'react';
import { Zap, BookOpen, X, Sparkles } from 'lucide-react';

interface AlgorithmChoiceModalProps {
  title: string;
  description: string;
  onBuildInstantly: () => void;
  onAnimateAndLearn: () => void;
  onClose: () => void;
}

export const AlgorithmChoiceModal: React.FC<AlgorithmChoiceModalProps> = ({
  title,
  description,
  onBuildInstantly,
  onAnimateAndLearn,
  onClose,
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in font-sans">
      <div className="bg-slate-900 border border-slate-700/80 text-slate-100 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-5 relative">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 p-2 rounded-xl transition cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="p-3 bg-indigo-600/20 border border-indigo-500/40 rounded-2xl text-indigo-400">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <h2 className="font-bold text-base text-white">{title}</h2>
            <p className="text-xs text-slate-400 font-medium">{description}</p>
          </div>
        </div>

        {/* Choice Options */}
        <div className="space-y-3 pt-2">
          {/* Option 1: Build Instantly */}
          <button
            onClick={() => {
              onBuildInstantly();
              onClose();
            }}
            className="w-full p-4 bg-slate-950 hover:bg-indigo-950/60 border border-slate-800 hover:border-indigo-500/60 rounded-2xl transition flex items-center gap-4 text-left group cursor-pointer shadow-md"
          >
            <div className="p-3 bg-indigo-600 text-white rounded-xl group-hover:scale-105 transition">
              <Zap className="w-5 h-5 fill-current" />
            </div>
            <div>
              <div className="font-bold text-sm text-slate-100 group-hover:text-indigo-300">⚡ Build Instantly</div>
              <div className="text-xs text-slate-400">Execute algorithm immediately and load result onto the canvas.</div>
            </div>
          </button>

          {/* Option 2: Animate & Learn */}
          <button
            onClick={() => {
              onAnimateAndLearn();
              onClose();
            }}
            className="w-full p-4 bg-slate-950 hover:bg-emerald-950/60 border border-slate-800 hover:border-emerald-500/60 rounded-2xl transition flex items-center gap-4 text-left group cursor-pointer shadow-md"
          >
            <div className="p-3 bg-emerald-600 text-white rounded-xl group-hover:scale-105 transition">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <div className="font-bold text-sm text-slate-100 group-hover:text-emerald-300">📖 Animate & Learn</div>
              <div className="text-xs text-slate-400">Launch step-by-step interactive algorithm visualizer with explanations.</div>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};
