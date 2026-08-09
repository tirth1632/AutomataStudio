import { useRef, useState, useEffect, useCallback } from 'react';

interface UseSmoothTabScrollOptions {
  activeTab: string;
  autoCenterOnSelect?: boolean;
}

export function useSmoothTabScroll<T extends HTMLElement>({
  activeTab,
  autoCenterOnSelect = true,
}: UseSmoothTabScrollOptions) {
  const containerRef = useRef<T | null>(null);
  const isInitialMountRef = useRef(true);

  // Dragging state
  const isDraggingRef = useRef(false);
  const startXRef = useRef(0);
  const startScrollLeftRef = useRef(0);
  const hasDraggedRef = useRef(false);
  const [isMouseDown, setIsMouseDown] = useState(false);

  // Velocity & Animation RAF
  const velocityRef = useRef(0);
  const lastXRef = useRef(0);
  const lastTimeRef = useRef(0);
  const targetScrollLeftRef = useRef<number | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // Stop any active animation frame
  const cancelAnim = useCallback(() => {
    if (animFrameRef.current !== null) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
  }, []);

  // Smooth Lerp Animation Loop
  const animateScroll = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;

    let keepsGoing = false;

    // 1. Target Lerp (from wheel scroll or tab auto-center)
    if (targetScrollLeftRef.current !== null) {
      const diff = targetScrollLeftRef.current - el.scrollLeft;
      if (Math.abs(diff) > 0.5) {
        el.scrollLeft += diff * 0.18; // Smooth easing factor
        keepsGoing = true;
      } else {
        el.scrollLeft = targetScrollLeftRef.current;
        targetScrollLeftRef.current = null;
      }
    }
    // 2. Drag Momentum Inertia
    else if (Math.abs(velocityRef.current) > 0.2) {
      el.scrollLeft -= velocityRef.current;
      velocityRef.current *= 0.91; // Inertia friction decay
      keepsGoing = true;
    } else {
      velocityRef.current = 0;
    }

    if (keepsGoing) {
      animFrameRef.current = requestAnimationFrame(animateScroll);
    } else {
      animFrameRef.current = null;
    }
  }, []);

  // Start smooth animation loop
  const startAnim = useCallback(() => {
    cancelAnim();
    animFrameRef.current = requestAnimationFrame(animateScroll);
  }, [cancelAnim, animateScroll]);

  // Smooth Auto-Center on Tab Switch (robust bounding rect calculation)
  const scrollToTab = useCallback(
    (tabId: string, smooth = true) => {
      const el = containerRef.current;
      if (!el) return;
      const targetBtn = el.querySelector(`[data-tab="${tabId}"]`) as HTMLElement | null;
      if (!targetBtn) return;

      const containerRect = el.getBoundingClientRect();
      const btnRect = targetBtn.getBoundingClientRect();

      // Accurate offset relative to the scroll container
      const btnOffsetRelativeToContainer = btnRect.left - containerRect.left + el.scrollLeft;

      const containerWidth = el.clientWidth;
      const btnWidth = targetBtn.offsetWidth;
      const idealTarget = btnOffsetRelativeToContainer - containerWidth / 2 + btnWidth / 2;
      const maxScroll = el.scrollWidth - containerWidth;
      const clampedTarget = Math.max(0, Math.min(maxScroll, idealTarget));

      if (smooth && Math.abs(el.scrollLeft - clampedTarget) > 1) {
        cancelAnim();
        velocityRef.current = 0;
        targetScrollLeftRef.current = clampedTarget;
        startAnim();
      } else {
        cancelAnim();
        targetScrollLeftRef.current = null;
        el.scrollLeft = clampedTarget;
      }
    },
    [cancelAnim, startAnim]
  );

  // Auto-scroll when activeTab changes (instant on mount, smooth on select)
  useEffect(() => {
    if (autoCenterOnSelect) {
      if (isInitialMountRef.current) {
        isInitialMountRef.current = false;
        // Schedule after DOM layout paint
        const timer = setTimeout(() => {
          scrollToTab(activeTab, false);
        }, 20);
        return () => clearTimeout(timer);
      } else {
        scrollToTab(activeTab, true);
      }
    }
  }, [activeTab, autoCenterOnSelect, scrollToTab]);

  // Wheel Scroll Listener with 60fps Acceleration
  const handleWheel = useCallback(
    (e: React.WheelEvent<T>) => {
      const el = containerRef.current;
      if (!el) return;

      const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
      if (Math.abs(delta) < 1) return;

      const maxScroll = el.scrollWidth - el.clientWidth;
      const currentBase = targetScrollLeftRef.current ?? el.scrollLeft;
      const newTarget = Math.max(0, Math.min(maxScroll, currentBase + delta * 1.35));

      targetScrollLeftRef.current = newTarget;
      velocityRef.current = 0;
      startAnim();
    },
    [startAnim]
  );

  // Mouse Drag Handlers
  const handleMouseDown = useCallback(
    (e: React.MouseEvent<T>) => {
      const el = containerRef.current;
      if (!el) return;

      cancelAnim();
      targetScrollLeftRef.current = null;
      velocityRef.current = 0;

      isDraggingRef.current = true;
      setIsMouseDown(true);
      hasDraggedRef.current = false;
      startXRef.current = e.pageX;
      startScrollLeftRef.current = el.scrollLeft;
      lastXRef.current = e.pageX;
      lastTimeRef.current = performance.now();
    },
    [cancelAnim]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<T>) => {
      if (!isDraggingRef.current || !containerRef.current) return;

      const now = performance.now();
      const dt = Math.max(1, now - lastTimeRef.current);
      const dx = e.pageX - lastXRef.current;

      // Track velocity for inertia momentum
      velocityRef.current = (dx / dt) * 14;

      lastXRef.current = e.pageX;
      lastTimeRef.current = now;

      const totalDist = e.pageX - startXRef.current;
      if (Math.abs(totalDist) > 3) {
        hasDraggedRef.current = true;
      }

      containerRef.current.scrollLeft = startScrollLeftRef.current - totalDist;
    },
    []
  );

  const handleMouseUpOrLeave = useCallback(() => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;
    setIsMouseDown(false);

    // Launch momentum animation if velocity is present
    if (Math.abs(velocityRef.current) > 0.5) {
      startAnim();
    }
  }, [startAnim]);

  // Clean up animation frame on unmount
  useEffect(() => {
    return () => cancelAnim();
  }, [cancelAnim]);

  return {
    containerRef,
    isMouseDown,
    hasDragged: hasDraggedRef.current,
    handleWheel,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp: handleMouseUpOrLeave,
    handleMouseLeave: handleMouseUpOrLeave,
    scrollToTab,
  };
}
