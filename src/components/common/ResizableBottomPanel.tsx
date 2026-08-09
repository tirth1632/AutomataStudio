import React, { useState, useEffect, useRef } from 'react';
import { ChevronUp, ChevronDown, Maximize2, Minimize2, RotateCcw } from 'lucide-react';

interface ResizableBottomPanelProps {
  children: React.ReactNode;
  tabsHeader: React.ReactNode;
  defaultHeight?: number;
  minHeight?: number;
  maxHeightRatio?: number; // e.g. 0.85 (85% of screen height)
  storageKey?: string;
}

export const ResizableBottomPanel: React.FC<ResizableBottomPanelProps> = ({
  children,
  tabsHeader,
  defaultHeight = 420,
  minHeight = 120,
  maxHeightRatio = 0.85,
  storageKey = 'automata_studio_panel_height',
}) => {
  const [height, setHeight] = useState<number>(() => {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      const parsed = parseInt(saved, 10);
      if (!isNaN(parsed) && parsed >= minHeight) return parsed;
    }
    return defaultHeight;
  });

  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [isMaximized, setIsMaximized] = useState<boolean>(false);
  const [isMinimized, setIsMinimized] = useState<boolean>(false);

  const prevHeightRef = useRef<number>(height);
  const dragStartYRef = useRef<number>(0);
  const startHeightRef = useRef<number>(height);

  // Save height to localStorage
  useEffect(() => {
    if (!isMaximized && !isMinimized) {
      localStorage.setItem(storageKey, height.toString());
    }
  }, [height, isMaximized, isMinimized, storageKey]);

  // Handle Drag Start
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    dragStartYRef.current = e.clientY;
    startHeightRef.current = height;
    setIsMaximized(false);
    setIsMinimized(false);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      setIsDragging(true);
      dragStartYRef.current = e.touches[0].clientY;
      startHeightRef.current = height;
      setIsMaximized(false);
      setIsMinimized(false);
    }
  };

  // Drag Movement Listener
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      const deltaY = dragStartYRef.current - e.clientY; // Drag up increases height
      const maxAllowed = Math.floor(window.innerHeight * maxHeightRatio);
      const newHeight = Math.min(maxAllowed, Math.max(minHeight, startHeightRef.current + deltaY));
      setHeight(newHeight);
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isDragging || e.touches.length !== 1) return;
      const deltaY = dragStartYRef.current - e.touches[0].clientY;
      const maxAllowed = Math.floor(window.innerHeight * maxHeightRatio);
      const newHeight = Math.min(maxAllowed, Math.max(minHeight, startHeightRef.current + deltaY));
      setHeight(newHeight);
    };

    const handleMouseUp = () => {
      if (isDragging) {
        setIsDragging(false);
      }
    };

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      window.addEventListener('touchmove', handleTouchMove);
      window.addEventListener('touchend', handleMouseUp);
      document.body.style.cursor = 'ns-resize';
      document.body.style.userSelect = 'none';
    } else {
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isDragging, minHeight, maxHeightRatio]);

  // Maximize / Minimize / Reset Actions
  const toggleMaximize = () => {
    if (isMaximized) {
      setHeight(prevHeightRef.current || defaultHeight);
      setIsMaximized(false);
    } else {
      prevHeightRef.current = height;
      const maxAllowed = Math.floor(window.innerHeight * maxHeightRatio);
      setHeight(maxAllowed);
      setIsMaximized(true);
      setIsMinimized(false);
    }
  };

  const toggleMinimize = () => {
    if (isMinimized) {
      setHeight(prevHeightRef.current || defaultHeight);
      setIsMinimized(false);
    } else {
      prevHeightRef.current = height;
      setHeight(minHeight);
      setIsMinimized(true);
      setIsMaximized(false);
    }
  };

  const resetHeight = () => {
    setHeight(defaultHeight);
    setIsMaximized(false);
    setIsMinimized(false);
  };

  return (
    <div
      style={{ height: `${height}px` }}
      className={`bg-slate-900 border-t border-slate-800 flex flex-col shrink-0 overflow-hidden relative transition-all duration-75 ${
        isDragging ? 'select-none ring-2 ring-indigo-500/50 shadow-2xl' : ''
      }`}
    >
      {/* ── Dynamic Resizer Drag Handle Bar ── */}
      <div
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        onDoubleClick={toggleMaximize}
        className={`w-full h-7 bg-slate-950/95 hover:bg-slate-900/90 border-b border-slate-800/80 cursor-ns-resize flex items-center justify-between px-3 group transition-all duration-200 select-none shrink-0 relative ${
          isDragging ? 'bg-indigo-950/40 border-indigo-500/50 shadow-inner' : ''
        }`}
        title="Drag up/down to resize panel • Double-click to maximize"
      >
        {/* Left Side: Height / Drag Status Badge */}
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 group-hover:animate-pulse"></span>
          <span className="text-xs font-mono text-slate-400 group-hover:text-indigo-300 transition-colors font-semibold">
            {isDragging ? `Height: ${height}px` : '↕ Drag to Resize Panel'}
          </span>
        </div>

        {/* Center Pill Handle Bar */}
        <div className="absolute left-1/2 -translate-x-1/2 flex items-center justify-center">
          <div className="w-16 group-hover:w-28 h-1 rounded-full bg-slate-700 group-hover:bg-indigo-400 group-hover:shadow-[0_0_10px_rgba(99,102,241,0.5)] transition-all duration-300"></div>
        </div>

        {/* Right Side: Quick Action Controls */}
        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={resetHeight}
            title="Reset height to default"
            className="p-1 hover:bg-slate-800 text-slate-400 hover:text-slate-200 rounded-md transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={toggleMinimize}
            title={isMinimized ? 'Expand panel' : 'Collapse panel'}
            className="p-1 hover:bg-slate-800 text-slate-400 hover:text-sky-300 rounded-md transition-colors"
          >
            {isMinimized ? <ChevronUp className="w-3.5 h-3.5 text-sky-400" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={toggleMaximize}
            title={isMaximized ? 'Restore height' : 'Maximize panel'}
            className="p-1 hover:bg-slate-800 text-slate-400 hover:text-indigo-300 rounded-md transition-colors"
          >
            {isMaximized ? <Minimize2 className="w-3.5 h-3.5 text-indigo-400" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* ── Tab Navigation Header ── */}
      <div className="shrink-0">{tabsHeader}</div>

      {/* ── Tab Content Container ── */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-4">{children}</div>
    </div>
  );
};
