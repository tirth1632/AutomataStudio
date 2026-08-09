import React, { useRef, useState } from 'react';

export interface PromptItem {
  category: string;
  label: string;
  prompt: string;
}

interface ScrollablePromptRowProps {
  prompts: PromptItem[];
  onSelectPrompt: (prompt: string) => void;
  accentColor?: 'indigo' | 'sky';
}

export const ScrollablePromptRow: React.FC<ScrollablePromptRowProps> = ({
  prompts,
  onSelectPrompt,
  accentColor = 'indigo',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isMouseDown, setIsMouseDown] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [hasDragged, setHasDragged] = useState(false);

  // Convert vertical mouse wheel scrolling to horizontal scroll
  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
      return;
    }
    if (e.deltaY !== 0) {
      containerRef.current.scrollLeft += e.deltaY * 0.9;
    }
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    setIsMouseDown(true);
    setHasDragged(false);
    setStartX(e.pageX - containerRef.current.offsetLeft);
    setScrollLeft(containerRef.current.scrollLeft);
  };

  const handleMouseLeave = () => {
    setIsMouseDown(false);
  };

  const handleMouseUp = () => {
    setIsMouseDown(false);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isMouseDown || !containerRef.current) return;
    e.preventDefault();
    const x = e.pageX - containerRef.current.offsetLeft;
    const walk = (x - startX) * 1.8;
    if (Math.abs(walk) > 5) {
      setHasDragged(true);
    }
    containerRef.current.scrollLeft = scrollLeft - walk;
  };

  const isSky = accentColor === 'sky';

  return (
    <div className="relative flex items-center my-1 w-full">
      {/* Scrollable Container (Edge-to-edge without side arrows) */}
      <div
        ref={containerRef}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseLeave={handleMouseLeave}
        onMouseUp={handleMouseUp}
        onMouseMove={handleMouseMove}
        style={{ overscrollBehaviorX: 'contain' }}
        className="flex items-center gap-2 overflow-x-auto py-1 px-1 touch-pan-x select-none cursor-grab active:cursor-grabbing w-full no-scrollbar"
      >
        {prompts.map((item) => (
          <button
            key={item.category + item.label}
            type="button"
            onClick={() => {
              if (!hasDragged) {
                onSelectPrompt(item.prompt);
              }
            }}
            title={`Generate: "${item.prompt}"`}
            className={`px-3 py-1.5 bg-slate-900/90 ${
              isSky ? 'hover:bg-sky-950/90 hover:border-sky-500/60' : 'hover:bg-indigo-950/90 hover:border-indigo-500/60'
            } border border-slate-800 rounded-xl text-xs font-semibold text-slate-200 hover:text-white shrink-0 transition-all flex items-center gap-1.5 shadow-sm active:scale-95 group cursor-pointer`}
          >
            <span
              className={`px-1.5 py-0.5 ${
                isSky
                  ? 'bg-sky-950 text-sky-300 border-sky-500/40 group-hover:bg-sky-600'
                  : 'bg-indigo-950 text-indigo-300 border-indigo-500/40 group-hover:bg-indigo-600'
              } border rounded-md text-[9px] font-bold uppercase tracking-wider group-hover:text-white transition`}
            >
              {item.category}
            </span>
            <span className="truncate max-w-[140px] font-semibold">{item.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
};
