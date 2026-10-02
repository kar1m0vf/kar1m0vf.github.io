import { useEffect, useLayoutEffect, useRef, useState, type PointerEvent, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'motion/react';
import type { ProjectMedia } from '../types';
import { ResponsiveImage } from './ResponsiveImage';

interface MediaLightboxProps {
  activeIndex: number | null;
  media: readonly ProjectMedia[];
  onChange: (index: number | null) => void;
  returnFocusRef: RefObject<HTMLButtonElement | null>;
}

function ImageViewer({ media, onClose }: { media: ProjectMedia; onClose: () => void }) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ pointer: number; x: number; y: number; left: number; top: number } | null>(null);
  const anchorRef = useRef<{ x: number; y: number } | null>(null);
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
      setSize((previous) => previous.width === width && previous.height === height ? previous : { width, height });
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

  const startDrag = (event: PointerEvent<HTMLDivElement>) => {
    // Touch uses the viewport's native scrolling, including momentum and bounds.
    if (zoom === 1 || event.pointerType === 'touch' || event.button !== 0) return;
    event.preventDefault();
    const viewport = event.currentTarget;
    viewport.focus({ preventScroll: true });
    dragRef.current = { pointer: event.pointerId, x: event.clientX, y: event.clientY, left: viewport.scrollLeft, top: viewport.scrollTop };
    viewport.setPointerCapture(event.pointerId);
    setDragging(true);
  };

  const moveDrag = (event: PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointer !== event.pointerId) return;
    event.currentTarget.scrollLeft = drag.left - (event.clientX - drag.x);
    event.currentTarget.scrollTop = drag.top - (event.clientY - drag.y);
  };

  const stopDrag = (event: PointerEvent<HTMLDivElement>) => {
    if (dragRef.current?.pointer !== event.pointerId) return;
    dragRef.current = null;
    setDragging(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  };

  return (
    <>
      <div className="media-lightbox__header">
        <div aria-label="Image zoom controls" className="media-lightbox__zoom">
          <button aria-label="Zoom out" disabled={zoom === 1} onClick={() => changeZoom(zoom - .5)} type="button">−</button>
          <output aria-label="Image zoom" aria-live="polite">{Math.round(zoom * 100)}%</output>
          <button aria-label="Zoom in" disabled={zoom === 4} onClick={() => changeZoom(zoom + .5)} type="button">+</button>
          <button aria-label="Fit image" disabled={zoom === 1} onClick={() => changeZoom(1)} type="button">Fit</button>
        </div>
        <button className="media-lightbox__close" onClick={onClose} type="button">Close</button>
      </div>
      <div
        aria-label="Project image. Enlarge with the zoom controls, then scroll or drag to explore."
        className="media-lightbox__image"
        data-dragging={dragging}
        data-zoom={zoom}
        onDoubleClick={() => changeZoom(zoom === 1 ? 2.5 : 1)}
        onLostPointerCapture={() => { dragRef.current = null; setDragging(false); }}
        onPointerCancel={stopDrag}
        onPointerDown={startDrag}
        onPointerMove={moveDrag}
        onPointerUp={stopDrag}
        ref={viewportRef}
        role="region"
        tabIndex={zoom > 1 ? 0 : -1}
      >
        <div className="media-lightbox__canvas" style={{ width: Math.max(size.width, imageWidth), height: Math.max(size.height, imageHeight) }}>
          <div className="media-lightbox__capture" style={{ width: imageWidth, height: imageHeight }}>
            <ResponsiveImage eager media={media} sizes={`${Math.max(1, Math.ceil(imageWidth))}px`} />
          </div>
        </div>
      </div>
    </>
  );
}

export function MediaLightbox({ activeIndex, media, onChange, returnFocusRef }: MediaLightboxProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const activeIndexRef = useRef(activeIndex);
  const isOpen = activeIndex !== null;

  useEffect(() => {
    activeIndexRef.current = activeIndex;
  }, [activeIndex]);

  useEffect(() => {
    if (!isOpen) return;
    const dialog = dialogRef.current;
    const previousOverflow = document.body.style.overflow;
    const inerted = Array.from(document.body.children)
      .filter((child): child is HTMLElement => child instanceof HTMLElement && child !== dialog)
      .map((element) => ({ element, inert: element.inert, ariaHidden: element.getAttribute('aria-hidden') }));

    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      const currentIndex = activeIndexRef.current;
      if (currentIndex === null) return;
      if (event.key === 'Escape') onChange(null);
      const image = event.target instanceof HTMLElement ? event.target.closest<HTMLElement>('.media-lightbox__image') : null;
      const panning = image && image.dataset.zoom !== '1';
      if (!panning && (event.key === 'ArrowLeft' || event.key === 'ArrowRight')) {
        event.preventDefault();
        onChange((currentIndex + (event.key === 'ArrowLeft' ? -1 : 1) + media.length) % media.length);
      }

      if (event.key === 'Tab' && dialog) {
        const focusable = Array.from(
          dialog.querySelectorAll<HTMLElement>('button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])'),
        ).filter((element) => !element.hasAttribute('hidden'));
        const first = focusable[0];
        const last = focusable.at(-1);
        if (!first || !last) return;
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };

    inerted.forEach(({ element }) => {
      element.inert = true;
      element.setAttribute('aria-hidden', 'true');
    });
    document.body.style.overflow = 'hidden';
    dialog?.querySelector<HTMLButtonElement>('.media-lightbox__close')?.focus();
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
      inerted.forEach(({ element, inert, ariaHidden }) => {
        element.inert = inert;
        if (ariaHidden === null) element.removeAttribute('aria-hidden');
        else element.setAttribute('aria-hidden', ariaHidden);
      });
      returnFocusRef.current?.focus({ preventScroll: true });
    };
  }, [isOpen, media.length, onChange, returnFocusRef]);

  return createPortal(
    <AnimatePresence>
      {activeIndex !== null && media[activeIndex] ? (
        <motion.div
          animate={{ opacity: 1 }}
          aria-label={`${media[activeIndex].caption} image viewer`}
          aria-modal="true"
          className="media-lightbox"
          exit={{ opacity: 0 }}
          initial={{ opacity: 0 }}
          onMouseDown={(event) => { if (event.currentTarget === event.target) onChange(null); }}
          ref={dialogRef}
          role="dialog"
        >
          <ImageViewer key={media[activeIndex].src} media={media[activeIndex]} onClose={() => onChange(null)} />
          <div className="media-lightbox__footer">
            <span>{String(activeIndex + 1).padStart(2, '0')} / {String(media.length).padStart(2, '0')}</span>
            <strong>{media[activeIndex].caption}</strong>
            {media.length > 1 ? (
              <div>
                <button onClick={() => onChange((activeIndex - 1 + media.length) % media.length)} type="button">Previous</button>
                <button onClick={() => onChange((activeIndex + 1) % media.length)} type="button">Next</button>
              </div>
            ) : null}
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}
