import React, { useState } from 'react';
import { ShieldCheck, CheckCircle, AlertTriangle, XCircle, Info, HelpCircle } from 'lucide-react';
import type { DFAInspectorData, PropertyItem } from '../../../utils/dfaInspectorEngine';

interface TabPropertiesProps {
  data: DFAInspectorData;
}

export const TabProperties: React.FC<TabPropertiesProps> = ({ data }) => {
  const { properties, validationList } = data;
  const [hoveredPropertyId, setHoveredPropertyId] = useState<string | null>(null);

  const getStatusBadgeStyle = (status: PropertyItem['status']) => {
    switch (status) {
      case 'passed':
        return 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40';
      case 'warning':
        return 'bg-amber-950/80 text-amber-300 border-amber-500/40';
      case 'failed':
        return 'bg-rose-950/80 text-rose-300 border-rose-500/40';
      case 'info':
      default:
        return 'bg-indigo-950/80 text-indigo-300 border-indigo-500/40';
    }
  };

  const getValidationIcon = (status: PropertyItem['status']) => {
    switch (status) {
      case 'passed':
        return <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />;
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-rose-400 shrink-0" />;
      case 'info':
      default:
        return <Info className="w-4 h-4 text-cyan-400 shrink-0" />;
    }
  };

  return (
    <div className="space-y-4 font-sans text-xs">
      {/* ── VALIDATION PANEL ── */}
      <div className="p-3.5 bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950/60 border border-slate-800 rounded-xl space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="font-bold text-indigo-300 text-xs flex items-center gap-1.5 uppercase tracking-wider">
            <ShieldCheck className="w-4 h-4 text-emerald-400" /> Formal Validation Panel
          </span>
          <span className="px-2 py-0.5 bg-emerald-950 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold rounded-md">
            PASSED VERIFICATION
          </span>
        </div>

        <div className="space-y-2 pt-1">
          {validationList.map((val) => (
            <div key={val.id} className="p-2.5 bg-slate-950/80 border border-slate-800/80 rounded-lg space-y-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {getValidationIcon(val.status)}
                  <span className="font-bold text-white text-xs">{val.title}</span>
                </div>
                <span className={`px-2 py-0.5 border text-[10px] font-bold font-mono rounded ${getStatusBadgeStyle(val.status)}`}>
                  {val.statusBadge}
                </span>
              </div>
              <p className="text-[11px] text-slate-300 pl-6 leading-relaxed">{val.validationExplanation}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── VERIFICATION CARDS WITH MATHEMATICAL TOOLTIPS ── */}
      <div className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <span className="text-[11px] font-bold text-indigo-400 uppercase tracking-wider block">
            Formal Automata Properties
          </span>
          <span className="text-[10px] text-slate-500">Hover for math meaning</span>
        </div>

        <div className="space-y-2">
          {properties.map((prop) => (
            <div
              key={prop.id}
              onMouseEnter={() => setHoveredPropertyId(prop.id)}
              onMouseLeave={() => setHoveredPropertyId(null)}
              className="p-3 bg-slate-950/90 border border-slate-800 hover:border-indigo-500/40 rounded-xl space-y-1.5 transition relative group"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 font-bold text-slate-200 text-xs">
                  <span>{prop.title}</span>
                  <HelpCircle className="w-3.5 h-3.5 text-slate-500 group-hover:text-indigo-400 transition" />
                </div>
                <span className={`px-2 py-0.5 border text-[10px] font-bold font-mono rounded ${getStatusBadgeStyle(prop.status)}`}>
                  {prop.statusBadge}
                </span>
              </div>

              <p className="text-[11px] text-slate-400 leading-snug">{prop.shortExplanation}</p>

              {/* Hover Tooltip explaining mathematical meaning */}
              {hoveredPropertyId === prop.id && (
                <div className="p-2 bg-indigo-950/95 border border-indigo-500/50 rounded-lg text-[10px] text-indigo-200 font-mono space-y-0.5 animate-in fade-in duration-150">
                  <span className="font-bold font-sans text-indigo-300 block">Mathematical Formal Definition:</span>
                  <span>{prop.mathMeaning}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
