import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { createPortal } from 'react-dom';
import { useReducedMotion } from 'motion/react';
import { useSound } from '../audio/SoundProvider';
import type { ProjectWorld } from '../types';
import { isControlOverlayOpen, isSceneTransitionActive, setControlOverlayOpen } from '../utils/controlOverlay';
import { focusWithoutScrolling } from '../utils/sceneNavigation';
import { ArrowIcon, ArrowRightIcon, CloseIcon } from './Icons';
import './ProjectBuildDetails.css';

export function ProjectBuildDetails({ project }: { project: ProjectWorld }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeTimerRef = useRef<number | undefined>(undefined);
  const outsidePointerRef = useRef(false);
  const [isOpen, setIsOpen] = useState(false);
  const reducedMotion = useReducedMotion();
  const { playSound } = useSound();
  const dialogId = `${project.id}-build-details`;

  useEffect(() => {
    const dialog = dialogRef.current;
    return () => {
      window.clearTimeout(closeTimerRef.current);
      if (dialog?.open) {
        dialog.close();
        setControlOverlayOpen(false);
      }
    };
  }, []);

  const openDetails = () => {
    const dialog = dialogRef.current;
    if (!dialog || dialog.open || isControlOverlayOpen() || isSceneTransitionActive()
      || document.querySelector('dialog[open], [aria-modal="true"]')) return;
    window.clearTimeout(closeTimerRef.current);
    outsidePointerRef.current = false;
    dialog.dataset.state = 'open';
    dialog.showModal();
    const body = dialog.querySelector<HTMLElement>('.project-build__body');
    if (body) body.scrollTop = 0;
    setControlOverlayOpen(true);
    setIsOpen(true);
    dialog.querySelector<HTMLButtonElement>('.project-build__close')?.focus({ preventScroll: true });
    playSound('open');
  };

  const closeDetails = () => {
    const dialog = dialogRef.current;
    if (!dialog?.open || dialog.dataset.state === 'closing') return;
    playSound('close');
    const surface = dialog.querySelector<HTMLElement>('.project-build__surface');
    if (surface) {
      const style = getComputedStyle(surface);
      surface.style.setProperty('--exit-opacity', style.opacity);
      surface.style.setProperty('--exit-transform', style.transform);
    }
    dialog.style.setProperty('--exit-backdrop-opacity', getComputedStyle(dialog, '::backdrop').opacity);
    dialog.dataset.state = 'closing';
    if (reducedMotion) dialog.close();
    else {
      // A bounded fallback also releases the modal in background tabs.
      closeTimerRef.current = window.setTimeout(() => dialog.close(), 320);
    }
  };

  const handleClose = () => {
    if (dialogRef.current?.open) return;
    window.clearTimeout(closeTimerRef.current);
    setControlOverlayOpen(false);
    setIsOpen(false);
    if (triggerRef.current?.isConnected) focusWithoutScrolling(triggerRef.current);
  };

  const trapFocus = (event: KeyboardEvent<HTMLDialogElement>) => {
    if (event.key !== 'Tab') return;
    const controls = event.currentTarget.querySelectorAll<HTMLButtonElement>('button:not(:disabled), a[href]');
    const first = controls[0];
    const last = controls[controls.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault(); last?.focus({ preventScroll: true });
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault(); first?.focus({ preventScroll: true });
    }
  };

  return (
    <>
      <button aria-controls={dialogId} aria-expanded={isOpen} aria-haspopup="dialog"
        className="project-build-trigger" data-builder-zone="flow" onClick={openDetails}
        ref={triggerRef} type="button">
        <span>See how I built it</span><ArrowIcon />
      </button>
      {createPortal(
        <dialog aria-labelledby={`${dialogId}-title`} aria-describedby={`${dialogId}-project`}
          className="project-build" id={dialogId} ref={dialogRef}
          onCancel={(event) => { event.preventDefault(); closeDetails(); }}
          onClose={handleClose} onKeyDown={trapFocus}
          onPointerDown={(event) => { outsidePointerRef.current = event.target === event.currentTarget; }}
          onPointerUp={(event) => {
            if (outsidePointerRef.current && event.target === event.currentTarget) closeDetails();
            outsidePointerRef.current = false;
          }}
          onPointerCancel={() => { outsidePointerRef.current = false; }}>
          <div className="project-build__surface" onAnimationEnd={(event) => {
            if (event.target === event.currentTarget && event.animationName === 'project-build-exit') dialogRef.current?.close();
          }}>
            <header className="project-build__header">
              <div className="project-build__intro">
                <p id={`${dialogId}-project`}><span>{project.index}</span>{project.title}</p>
                <h2 id={`${dialogId}-title`}>How I <em>built it.</em></h2>
              </div>
              <button aria-label="Close project details" className="project-build__close" onClick={closeDetails} type="button"><CloseIcon /></button>
            </header>
            <div className="project-build__body">
              <ol aria-label={`${project.title} loop`} className="project-build__flow">
                {project.flow.map((step, index) => (
                  <li key={step}><span>{String(index + 1).padStart(2, '0')}</span><strong>{step}</strong>
                    {index < project.flow.length - 1 ? <ArrowRightIcon /> : null}</li>
                ))}
              </ol>
              <div className="project-build__decision">
                <p className="project-build__label">A decision that mattered</p>
                <blockquote>{project.decision}</blockquote>
                {project.releaseNote ? <p className="project-build__release">{project.releaseNote}</p> : null}
              </div>
              <dl className="project-build__meta">
                <div><dt>My part</dt><dd>{project.role}</dd></div>
                <div><dt>Built with</dt><dd>{project.stack.join(' · ')}</dd></div>
              </dl>
            </div>
            <footer className="project-build__footer">
              <span>{project.year}</span>
              <button onClick={closeDetails} type="button">Back to project<ArrowRightIcon /></button>
            </footer>
          </div>
        </dialog>, document.body,
      )}
    </>
  );
}
