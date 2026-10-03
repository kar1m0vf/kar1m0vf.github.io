import { useCallback, useEffect, useLayoutEffect, useRef, useState, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'motion/react';
import type { ProjectMedia } from '../types';
import { LightboxImage, type LightboxImageHandle } from './LightboxImage';

interface MediaLightboxProps {
  activeIndex: number | null;
  media: readonly ProjectMedia[];
  onChange: (index: number | null) => void;
  returnFocusRef: RefObject<HTMLButtonElement | null>;
}

const photoFadeDuration = 380;

function ImageViewer({ activeIndex, media, onClose, onStep, onDisplayedChange, suppressClick }: {
  activeIndex: number;
  media: readonly ProjectMedia[];
  onClose: () => void;
  onStep: (direction: -1 | 1) => void;
  onDisplayedChange: (index: number) => void;
  suppressClick: () => void;
}) {
  const stageRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<LightboxImageHandle>(null);
  const readyRef = useRef(new Set<number>());
  const requestedRef = useRef(activeIndex);
  const [display, setDisplay] = useState({ current: activeIndex, previous: null as number | null });
  const [readyVersion, setReadyVersion] = useState(0);
  const [failedIndex, setFailedIndex] = useState<number | null>(null);
  const [reduced, setReduced] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const [zoom, setZoom] = useState(1);
  requestedRef.current = activeIndex;

  useEffect(() => {
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduced(preference.matches);
    update();
    preference.addEventListener('change', update);
    return () => preference.removeEventListener('change', update);
  }, []);

  useLayoutEffect(() => {
    onDisplayedChange(display.current);
    const frames = stageRef.current?.querySelectorAll<HTMLElement>('.media-lightbox__frame');
    let transferFocus = false;
    frames?.forEach(frame => {
      const inactive = frame.dataset.current !== 'true';
      // A programmatically focused zoomed viewport must not become hidden from
      // assistive technology while retaining focus.
      if (inactive && frame.contains(document.activeElement)) transferFocus = true;
      frame.inert = inactive;
    });
    if (transferFocus) imageRef.current?.focus();
  }, [display.current, display.previous, activeIndex, onDisplayedChange]);

  const handleReady = useCallback((index: number) => {
    if (readyRef.current.has(index)) return;
    readyRef.current.add(index);
    setFailedIndex(previous => previous === index ? null : previous);
    setReadyVersion(version => version + 1);
  }, []);
  const handleDisposed = useCallback((index: number) => { readyRef.current.delete(index); }, []);
  const handleFailed = useCallback((index: number) => {
    if (index === requestedRef.current) setFailedIndex(index);
  }, []);

  useEffect(() => {
    if (display.previous !== null || activeIndex === display.current || !readyRef.current.has(activeIndex)) return;
    const incoming = stageRef.current?.querySelector<HTMLElement>(`[data-photo-index="${activeIndex}"]`);
    if (incoming) {
      // Resolve the pending layer's zero opacity before changing its role. This
      // also gives cached images and rapid reversals a real opacity transition.
      void getComputedStyle(incoming).opacity;
    }
    setDisplay({ current: activeIndex, previous: reduced ? null : display.current });
  }, [activeIndex, display, readyVersion, reduced]);

  useEffect(() => {
    if (display.previous === null) return;
    const finish = () => setDisplay(current => current === display ? { ...current, previous: null } : current);
    if (reduced) {
      finish();
      return;
    }
    const timer = window.setTimeout(finish, photoFadeDuration + 40);
    return () => window.clearTimeout(timer);
  }, [display, reduced]);

  const frames = Array.from(new Set([display.previous, display.current, activeIndex])).filter((index): index is number => index !== null);
  const shownMedia = media[display.current] ?? media[activeIndex];
  const loading = activeIndex !== display.current && failedIndex !== activeIndex;
  if (!shownMedia) return null;

  return (
    <>
      <div className="media-lightbox__header">
        <div aria-label="Image zoom controls" className="media-lightbox__zoom">
          <button aria-label="Zoom out" disabled={zoom === 1} onClick={() => imageRef.current?.changeZoom(zoom - .5)} type="button">−</button>
          <output aria-label="Image zoom" aria-live="polite">{Math.round(zoom * 100)}%</output>
          <button aria-label="Zoom in" disabled={zoom === 4} onClick={() => imageRef.current?.changeZoom(zoom + .5)} type="button">+</button>
          <button aria-label="Fit image" disabled={zoom === 1} onClick={() => imageRef.current?.changeZoom(1)} type="button">Fit</button>
        </div>
        <button className="media-lightbox__close" onClick={onClose} type="button">Close</button>
      </div>
      <div aria-busy={loading} className="media-lightbox__stage" data-transitioning={display.previous !== null} ref={stageRef}>
        {frames.map(index => {
          const photo = media[index];
          if (!photo) return null;
          const current = index === display.current;
          return (
            <div aria-hidden={!current} className="media-lightbox__frame" data-current={current}
              data-photo-index={index} data-previous={index === display.previous} key={photo.src}>
              <LightboxImage active={current} index={index} media={photo} onDisposed={handleDisposed}
                onFailed={handleFailed} onReady={handleReady} onStep={onStep} onZoomChange={setZoom}
                ref={current ? imageRef : undefined} suppressClick={suppressClick} />
            </div>
          );
        })}
      </div>
      <div className="media-lightbox__footer">
        <span>{String(display.current + 1).padStart(2, '0')} / {String(media.length).padStart(2, '0')}</span>
        <strong aria-live="polite" aria-atomic="true">{shownMedia.caption}</strong>
        {media.length > 1 ? (
          <div>
            <button onClick={() => onStep(-1)} type="button">Previous</button>
            <button onClick={() => onStep(1)} type="button">Next</button>
          </div>
        ) : null}
        <span className="sr-only" role="status">{failedIndex === activeIndex ? 'This image could not be loaded. Try another photo.' : ''}</span>
      </div>
    </>
  );
}

export function MediaLightbox({ activeIndex, media, onChange, returnFocusRef }: MediaLightboxProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const activeIndexRef = useRef(activeIndex);
  const suppressClickUntilRef = useRef(0);
  const [displayedIndex, setDisplayedIndex] = useState<number | null>(activeIndex);
  const isOpen = activeIndex !== null;

  useEffect(() => {
    activeIndexRef.current = activeIndex;
    if (activeIndex === null) setDisplayedIndex(null);
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
      const image = dialog?.querySelector<HTMLElement>('.media-lightbox__frame[data-current="true"] .media-lightbox__image');
      const panning = image && image.dataset.zoom !== '1';
      if (!panning && (event.key === 'ArrowLeft' || event.key === 'ArrowRight')) {
        event.preventDefault();
        onChange((currentIndex + (event.key === 'ArrowLeft' ? -1 : 1) + media.length) % media.length);
      }

      if (event.key === 'Tab' && dialog) {
        const focusable = Array.from(
          dialog.querySelectorAll<HTMLElement>('button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])'),
        ).filter((element) => !element.hasAttribute('hidden') && !element.closest('[inert], [aria-hidden="true"]'));
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
          aria-label={`${media[displayedIndex ?? activeIndex]?.caption ?? media[activeIndex]?.caption ?? 'Project'} image viewer`}
          aria-modal="true"
          className="media-lightbox"
          exit={{ opacity: 0 }}
          initial={{ opacity: 0 }}
          onClickCapture={(event) => {
            // A completed swipe must not turn its following click into a backdrop close.
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
            activeIndex={activeIndex}
            media={media}
            onClose={() => onChange(null)}
            onDisplayedChange={setDisplayedIndex}
            onStep={(direction) => onChange((activeIndex + direction + media.length) % media.length)}
            suppressClick={() => { suppressClickUntilRef.current = performance.now() + 350; }}
          />
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}
