import { forwardRef, useEffect, useImperativeHandle, useLayoutEffect, useRef, useState, type PointerEvent } from 'react';
import type { ProjectMedia } from '../types';
import { ResponsiveImage } from './ResponsiveImage';

export interface LightboxImageHandle {
  changeZoom: (value: number) => void;
  focus: () => void;
}

interface LightboxImageProps {
  active: boolean;
  index: number;
  media: ProjectMedia;
  onDisposed: (index: number) => void;
  onFailed: (index: number) => void;
  onReady: (index: number) => void;
  onStep: (direction: -1 | 1) => void;
  onZoomChange: (zoom: number) => void;
  suppressClick: () => void;
}

export const LightboxImage = forwardRef<LightboxImageHandle, LightboxImageProps>(function LightboxImage({
  active, index, media, onDisposed, onFailed, onReady, onStep, onZoomChange, suppressClick,
}, ref) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const captureRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ pointer: number; x: number; y: number; left: number; top: number } | null>(null);
  const gestureRef = useRef<{ pointer: number; x: number; y: number; fitted: boolean; moved: boolean } | null>(null);
  const anchorRef = useRef<{ x: number; y: number } | null>(null);
  const decodeVersionRef = useRef(0);
  const readyRef = useRef(false);
  const wasActiveRef = useRef(active);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [zoom, setZoom] = useState(1);
  const [dragging, setDragging] = useState(false);
  const fitWidth = Math.min(size.width, size.height * media.width / media.height, media.width);
  const imageWidth = fitWidth * zoom;
  const imageHeight = imageWidth * media.height / media.width;

  useLayoutEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const measure = () => {
      const width = viewport.clientWidth;
      const height = viewport.clientHeight;
      setSize(previous => previous.width === width && previous.height === height ? previous : { width, height });
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(viewport);
    return () => observer.disconnect();
  }, []);

  useLayoutEffect(() => {
    const viewport = viewportRef.current;
    const anchor = anchorRef.current;
    if (!viewport || !anchor) return;
    viewport.scrollLeft = anchor.x * imageWidth + Math.max(0, (size.width - imageWidth) / 2) - size.width / 2;
    viewport.scrollTop = anchor.y * imageHeight + Math.max(0, (size.height - imageHeight) / 2) - size.height / 2;
    anchorRef.current = null;
  }, [imageWidth, imageHeight, size.width, size.height]);

  useLayoutEffect(() => {
    if (active) onZoomChange(zoom);
  }, [active, onZoomChange, zoom]);

  useLayoutEffect(() => {
    if (active && !wasActiveRef.current) {
      anchorRef.current = null;
      gestureRef.current = null;
      dragRef.current = null;
      setDragging(false);
      setZoom(1);
      const viewport = viewportRef.current;
      if (viewport) { viewport.scrollLeft = 0; viewport.scrollTop = 0; }
    }
    wasActiveRef.current = active;
  }, [active]);

  // Decode the actual <picture> candidate chosen for this viewport, not a separate
  // preload that could select a different resolution or format.
  useEffect(() => {
    const image = captureRef.current?.querySelector('img');
    if (!image || !fitWidth) return;
    let disposed = false;
    const decode = () => {
      if (!image.complete || !image.naturalWidth || readyRef.current) return;
      const version = ++decodeVersionRef.current;
      const source = image.currentSrc;
      void image.decode().catch(() => undefined).then(() => {
        if (disposed || version !== decodeVersionRef.current || !image.complete || !image.naturalWidth
          || image.currentSrc !== source || readyRef.current) return;
        readyRef.current = true;
        onReady(index);
      });
    };
    const fail = () => { if (!disposed && !readyRef.current) onFailed(index); };
    image.addEventListener('load', decode);
    image.addEventListener('error', fail);
    if (image.complete && !image.naturalWidth) fail();
    else decode();
    return () => {
      disposed = true;
      decodeVersionRef.current++;
      image.removeEventListener('load', decode);
      image.removeEventListener('error', fail);
    };
  }, [fitWidth, index, onFailed, onReady]);

  useEffect(() => () => onDisposed(index), [index, onDisposed]);

  const changeZoom = (value: number) => {
    const viewport = viewportRef.current;
    const next = Math.max(1, Math.min(4, value));
    if (next === zoom || !viewport || !imageWidth || !imageHeight) return;
    anchorRef.current = {
      x: (viewport.scrollLeft + size.width / 2 - Math.max(0, (size.width - imageWidth) / 2)) / imageWidth,
      y: (viewport.scrollTop + size.height / 2 - Math.max(0, (size.height - imageHeight) / 2)) / imageHeight,
    };
    setZoom(next);
  };

  useImperativeHandle(ref, () => ({
    changeZoom,
    focus: () => viewportRef.current?.focus({ preventScroll: true }),
  }));

  const startDrag = (event: PointerEvent<HTMLDivElement>) => {
    if (!active) return;
    if (!event.isPrimary) {
      gestureRef.current = null;
      suppressClick();
      return;
    }
    if (event.button !== 0) return;
    gestureRef.current = { pointer: event.pointerId, x: event.clientX, y: event.clientY, fitted: zoom === 1, moved: false };
    if (zoom === 1) {
      event.currentTarget.setPointerCapture(event.pointerId);
      return;
    }
    // Touch retains the viewport's native scrolling, momentum and bounds.
    if (event.pointerType === 'touch') return;
    event.preventDefault();
    const viewport = event.currentTarget;
    viewport.focus({ preventScroll: true });
    dragRef.current = { pointer: event.pointerId, x: event.clientX, y: event.clientY, left: viewport.scrollLeft, top: viewport.scrollTop };
    viewport.setPointerCapture(event.pointerId);
    setDragging(true);
  };

  const moveDrag = (event: PointerEvent<HTMLDivElement>) => {
    const gesture = gestureRef.current;
    if (gesture?.pointer === event.pointerId && Math.hypot(event.clientX - gesture.x, event.clientY - gesture.y) > 8) {
      gesture.moved = true;
    }
    const drag = dragRef.current;
    if (!drag || drag.pointer !== event.pointerId) return;
    event.currentTarget.scrollLeft = drag.left - (event.clientX - drag.x);
    event.currentTarget.scrollTop = drag.top - (event.clientY - drag.y);
  };

  const endPointer = (event: PointerEvent<HTMLDivElement>) => {
    gestureRef.current = null;
    dragRef.current = null;
    setDragging(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  };

  const stopDrag = (event: PointerEvent<HTMLDivElement>) => {
    const gesture = gestureRef.current;
    if (!active || gesture?.pointer !== event.pointerId) return;
    const dx = event.clientX - gesture.x;
    const dy = event.clientY - gesture.y;
    if (gesture.moved || Math.hypot(dx, dy) > 8) suppressClick();
    const threshold = Math.max(40, Math.min(80, size.width * .15));
    const swiped = gesture.fitted && zoom === 1 && Math.abs(dx) >= threshold && Math.abs(dx) > Math.abs(dy) * 1.25;
    endPointer(event);
    if (swiped) onStep(dx < 0 ? 1 : -1);
  };

  const cancelDrag = (event: PointerEvent<HTMLDivElement>) => {
    if (gestureRef.current?.pointer !== event.pointerId) return;
    suppressClick();
    endPointer(event);
  };

  return (
    <div
      aria-label={zoom === 1
        ? 'Project image. Swipe left or right to change photos. Enlarge with the zoom controls to explore.'
        : 'Enlarged project image. Scroll or drag to explore. Use Previous and Next to change photos.'}
      className="media-lightbox__image"
      data-dragging={dragging}
      data-zoom={zoom}
      onDoubleClick={() => { if (active) changeZoom(zoom === 1 ? 2.5 : 1); }}
      onLostPointerCapture={() => { gestureRef.current = null; dragRef.current = null; setDragging(false); }}
      onPointerCancel={cancelDrag}
      onPointerDown={startDrag}
      onPointerMove={moveDrag}
      onPointerUp={stopDrag}
      ref={viewportRef}
      role="region"
      tabIndex={active && zoom > 1 ? 0 : -1}
    >
      <div className="media-lightbox__canvas" style={{ width: Math.max(size.width, imageWidth), height: Math.max(size.height, imageHeight) }}>
        <div className="media-lightbox__capture" ref={captureRef} style={{ width: imageWidth, height: imageHeight }}>
          <ResponsiveImage eager media={media} sizes={`${Math.max(1, Math.ceil(imageWidth))}px`} />
        </div>
      </div>
    </div>
  );
});
