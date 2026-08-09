import React from 'react';
import { AlertCircle, AlertTriangle } from 'lucide-react';
import { useAutomata } from '../../context/AutomataContext';

export const ValidationAlerts: React.FC = () => {
  const { validationErrors } = useAutomata();

  if (validationErrors.length === 0) {
    return null;
  }

  const errors = validationErrors.filter((e) => e.severity === 'error');
  const warnings = validationErrors.filter((e) => e.severity !== 'error');

  return (
    <div className="absolute top-4 right-4 z-20 max-w-sm flex flex-col gap-2 pointer-events-auto">
      {errors.slice(0, 3).map((err) => (
        <div
          key={err.id}
          className="flex items-start gap-2.5 p-3 bg-rose-950/90 border border-rose-500/50 text-rose-200 rounded-2xl shadow-2xl backdrop-blur-xl text-xs animate-in fade-in slide-in-from-top-2 duration-200"
        >
          <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <span className="font-semibold text-rose-100 block mb-0.5">DFA Error</span>
            <p className="text-rose-200/90 leading-relaxed">{err.message}</p>
          </div>
        </div>
      ))}

      {warnings.slice(0, 2).map((warn) => (
        <div
          key={warn.id}
          className="flex items-start gap-2.5 p-3 bg-amber-950/90 border border-amber-500/50 text-amber-200 rounded-2xl shadow-2xl backdrop-blur-xl text-xs animate-in fade-in slide-in-from-top-2 duration-200"
        >
          <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <span className="font-semibold text-amber-100 block mb-0.5">Warning</span>
            <p className="text-amber-200/90 leading-relaxed">{warn.message}</p>
          </div>
        </div>
      ))}
    </div>
  );
};
