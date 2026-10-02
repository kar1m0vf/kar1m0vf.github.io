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

function ImageViewer({ media, onClose, onStep, suppressClick }: {
  media: ProjectMedia;
  onClose: () => void;
  onStep: (direction: -1 | 1) => void;
  suppressClick: () => void;
}) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ pointer: number; x: number; y: number; left: number; top: number } | null>(null);
  const gestureRef = useRef<{ pointer: number; x: number; y: number; fitted: boolean; moved: boolean } | null>(null);
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
    // Touch uses the viewport's native scrolling, including momentum and bounds.
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
    if (gesture?.pointer !== event.pointerId) return;
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
        aria-label={zoom === 1
          ? 'Project image. Swipe left or right to change photos. Enlarge with the zoom controls to explore.'
          : 'Enlarged project image. Scroll or drag to explore. Use Previous and Next to change photos.'}
        className="media-lightbox__image"
        data-dragging={dragging}
        data-zoom={zoom}
        onDoubleClick={() => changeZoom(zoom === 1 ? 2.5 : 1)}
        onLostPointerCapture={() => { gestureRef.current = null; dragRef.current = null; setDragging(false); }}
        onPointerCancel={cancelDrag}
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
  const suppressClickUntilRef = useRef(0);
  const isOpen = activeIndex !== null;

  useEffect(() => {
    activeIndexRef.current = activeIndex;
  }, [activeIndex]);

  useEffect(() => {
    if (!isOpen) return;
    suppressClickUntilRef.current = 0;
    const dialog = dialogRef.current;
    const previousOverflow = document.body.style.overflow;
    const inerted = Array.from(document.body.children)
      .filter((child): child is HTMLElement => child instanceof HTMLElement && child !== dialog)
      .map((element) => ({ element, inert: element.inert, ariaHidden: element.getAttribute('aria-hidden') }));

    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      const currentIndex = activeIndexRef.current;
      if (currentIndex === null) return;
      if (event.key === 'Escape') onChange(null);
      const image = dialog?.querySelector<HTMLElement>('.media-lightbox__image');
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
          onClickCapture={(event) => {
            // Changing the image unmounts the swipe target before the browser's following click.
            if (event.detail > 0 && performance.now() < suppressClickUntilRef.current &&
                !(event.target instanceof Element && event.target.closest('button, a'))) {
              event.preventDefault();
              event.stopPropagation();
            }
          }}
          onClick={(event) => {
            if (!(event.target instanceof Element) ||
                event.target.closest('button, a, .media-lightbox__zoom, .media-lightbox__footer strong, .media-lightbox__footer span')) return;
            const image = event.target.closest('.media-lightbox__image')?.querySelector('.media-lightbox__capture');
            const bounds = image?.getBoundingClientRect();
            if (bounds && event.clientX >= bounds.left && event.clientX <= bounds.right &&
                event.clientY >= bounds.top && event.clientY <= bounds.bottom) return;
            onChange(null);
          }}
          ref={dialogRef}
          role="dialog"
        >
          <ImageViewer
            key={media[activeIndex].src}
            media={media[activeIndex]}
            onClose={() => onChange(null)}
            onStep={(direction) => onChange((activeIndex + direction + media.length) % media.length)}
            suppressClick={() => { suppressClickUntilRef.current = performance.now() + 350; }}
          />
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
