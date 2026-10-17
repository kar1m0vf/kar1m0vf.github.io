import { useEffect, useId, useRef, useState, type KeyboardEvent, type PointerEvent, type ReactNode } from 'react';
import './OverlayScrollArea.css';

interface OverlayScrollAreaProps {
  active: boolean;
  ariaLabel: string;
  children: ReactNode;
  className?: string;
  viewportClassName?: string;
  viewportLabel?: string;
}

interface ScrollMetrics {
  maximum: number;
  thumbHeight: number;
  travel: number;
}

interface DragState {
  pointerId: number;
  startY: number;
  startScroll: number;
}

const clamp = (value: number, maximum: number) => Math.min(maximum, Math.max(0, value));

/** Keeps native content scrolling, with a shared rail for the site's overlays. */
export function OverlayScrollArea({ active, ariaLabel, children, className, viewportClassName, viewportLabel }: OverlayScrollAreaProps) {
  const viewportId = useId();
  const viewportRef = useRef<HTMLDivElement>(null);
  const railRef = useRef<HTMLDivElement>(null);
  const thumbRef = useRef<HTMLDivElement>(null);
  const metricsRef = useRef<ScrollMetrics>({ maximum: 0, thumbHeight: 0, travel: 0 });
  const dragRef = useRef<DragState | null>(null);
  const overflowRef = useRef(false);
  const [hasOverflow, setHasOverflow] = useState(false);

  useEffect(() => {
    const viewport = viewportRef.current;
    const rail = railRef.current;
    const thumb = thumbRef.current;
    if (!active || !viewport || !rail || !thumb) {
      if (overflowRef.current) {
        overflowRef.current = false;
        setHasOverflow(false);
      }
      return;
    }

    let frame = 0;
    let observing = false;
    const measure = () => {
      frame = 0;
      const viewportHeight = viewport.clientHeight;
      const contentHeight = viewport.scrollHeight;
      const railHeight = rail.clientHeight;
      const maximum = Math.max(0, contentHeight - viewportHeight);
      const overflowing = viewportHeight > 0 && maximum > 1;
      const thumbHeight = contentHeight > 0 ? Math.min(railHeight, Math.max(32, railHeight * viewportHeight / contentHeight)) : 0;
      const travel = Math.max(0, railHeight - thumbHeight);
      const progress = maximum > 0 ? clamp(viewport.scrollTop, maximum) / maximum : 0;

      metricsRef.current = { maximum, thumbHeight, travel };
      if (overflowRef.current !== overflowing) {
        overflowRef.current = overflowing;
        setHasOverflow(overflowing);
      }
      thumb.style.height = `${thumbHeight}px`;
      thumb.style.transform = `translateY(${progress * travel}px)`;
      thumb.setAttribute('aria-valuenow', String(Math.round(progress * 100)));
      thumb.setAttribute('aria-valuetext', `${Math.round(progress * 100)}% scrolled`);
    };
    const scheduleMeasure = () => {
      if (!frame && !document.hidden) frame = window.requestAnimationFrame(measure);
    };
    const resizeObserver = new ResizeObserver(scheduleMeasure);
    const handleRailWheel = (event: WheelEvent) => {
      if (event.ctrlKey) return;
      const unit = event.deltaMode === WheelEvent.DOM_DELTA_PAGE ? viewport.clientHeight
        : event.deltaMode === WheelEvent.DOM_DELTA_LINE ? 16 : 1;
      viewport.scrollTop += event.deltaY * unit;
      event.preventDefault();
    };
    const observeContent = () => {
      resizeObserver.disconnect();
      resizeObserver.observe(viewport);
      resizeObserver.observe(rail);
      for (const child of viewport.children) resizeObserver.observe(child);
      scheduleMeasure();
    };
    // Direct children retain their layout (including grid and sticky elements).
    const mutationObserver = new MutationObserver(observeContent);
    const stopDragging = () => {
      const drag = dragRef.current;
      dragRef.current = null;
      rail.removeAttribute('data-dragging');
      if (drag && rail.hasPointerCapture(drag.pointerId)) rail.releasePointerCapture(drag.pointerId);
    };
    const pause = () => {
      if (frame) window.cancelAnimationFrame(frame);
      frame = 0;
      resizeObserver.disconnect();
      mutationObserver.disconnect();
      viewport.removeEventListener('scroll', scheduleMeasure);
      rail.removeEventListener('wheel', handleRailWheel);
      observing = false;
      stopDragging();
    };
    const resume = () => {
      if (observing || document.hidden) return;
      observing = true;
      viewport.addEventListener('scroll', scheduleMeasure, { passive: true });
      rail.addEventListener('wheel', handleRailWheel, { passive: false });
      mutationObserver.observe(viewport, { childList: true });
      observeContent();
    };
    const handleVisibility = () => { if (document.hidden) pause(); else resume(); };
    document.addEventListener('visibilitychange', handleVisibility);
    resume();
    return () => {
      pause();
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [active]);

  const startDrag = (event: PointerEvent<HTMLDivElement>) => {
    const viewport = viewportRef.current;
    const thumb = thumbRef.current;
    const { maximum, thumbHeight, travel } = metricsRef.current;
    if (!viewport || !thumb || !hasOverflow || !event.isPrimary || event.button !== 0 || travel <= 0) return;
    event.preventDefault();
    thumb.focus({ preventScroll: true });
    if (event.target !== thumb) {
      const relativeY = event.clientY - event.currentTarget.getBoundingClientRect().top - thumbHeight / 2;
      viewport.scrollTop = clamp(relativeY / travel * maximum, maximum);
    }
    dragRef.current = { pointerId: event.pointerId, startY: event.clientY, startScroll: viewport.scrollTop };
    event.currentTarget.dataset.dragging = 'true';
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const moveDrag = (event: PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    const viewport = viewportRef.current;
    const { maximum, travel } = metricsRef.current;
    if (!drag || drag.pointerId !== event.pointerId || !viewport || travel <= 0) return;
    event.preventDefault();
    viewport.scrollTop = clamp(drag.startScroll + (event.clientY - drag.startY) / travel * maximum, maximum);
  };

  const endDrag = (event: PointerEvent<HTMLDivElement>) => {
    if (dragRef.current?.pointerId !== event.pointerId) return;
    dragRef.current = null;
    event.currentTarget.removeAttribute('data-dragging');
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const viewport = viewportRef.current;
    if (!viewport || event.altKey || event.ctrlKey || event.metaKey) return;
    const page = viewport.clientHeight * .85;
    const destinations: Record<string, number> = {
      ArrowUp: viewport.scrollTop - 40,
      ArrowDown: viewport.scrollTop + 40,
      PageUp: viewport.scrollTop - page,
      PageDown: viewport.scrollTop + page,
      Home: 0,
      End: metricsRef.current.maximum,
    };
    const destination = destinations[event.key];
    if (destination === undefined) return;
    event.preventDefault();
    event.stopPropagation();
    viewport.scrollTop = clamp(destination, metricsRef.current.maximum);
  };

  return (
    <div className={['overlay-scroll-area', className].filter(Boolean).join(' ')}>
      <div aria-label={viewportLabel} className={['overlay-scroll-area__viewport', viewportClassName].filter(Boolean).join(' ')}
        id={viewportId} ref={viewportRef} role={viewportLabel ? 'region' : undefined} tabIndex={0}>
        {children}
      </div>
      <div className="overlay-scroll-area__rail" hidden={!hasOverflow} onLostPointerCapture={endDrag}
        onPointerCancel={endDrag} onPointerDown={startDrag} onPointerMove={moveDrag} onPointerUp={endDrag} ref={railRef}>
        <div aria-controls={viewportId} aria-label={ariaLabel} aria-orientation="vertical"
          aria-valuemax={100} aria-valuemin={0} aria-valuenow={0} className="overlay-scroll-area__thumb"
          aria-disabled={!hasOverflow || undefined} onKeyDown={handleKeyDown} ref={thumbRef} role="scrollbar" tabIndex={hasOverflow ? 0 : -1} />
      </div>
    </div>
  );
}
