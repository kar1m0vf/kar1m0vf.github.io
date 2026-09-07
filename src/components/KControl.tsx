import { useCallback, useEffect, useRef, useState } from 'react';
import type { KeyboardEvent as ReactKeyboardEvent, PointerEvent as ReactPointerEvent, SVGProps } from 'react';
import { ArrowIcon, ArrowRightIcon, CloseIcon } from './Icons';
import { kControlSections, type SiteSectionId } from '../data/siteSections';
import { useSound } from '../audio/SoundProvider';
import { isSceneTransitionActive, setControlOverlayOpen } from '../utils/controlOverlay';
import { navigateToScene } from '../utils/sceneNavigation';

export interface KControlProps {
  activeSection: SiteSectionId;
  builderMode: boolean;
  disabled?: boolean;
  onBuilderModeChange: (enabled: boolean) => void;
}

const quickActions = [
  { href: 'mailto:kamil16092006@gmail.com', label: 'Email' },
  { href: 'https://t.me/kar1m0vf', label: 'Telegram' },
  { href: 'https://github.com/kar1m0vf', label: 'GitHub' },
  { href: 'https://www.linkedin.com/in/kamil-kerimov', label: 'LinkedIn' },
] as const;

function BuilderCubeIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg aria-hidden="true" viewBox="0 0 32 32" {...props}>
      <path d="m16 3.8 10 5.8v11.5l-10 5.8-10-5.8V9.6Z" fill="none" stroke="currentColor" strokeLinejoin="round" strokeWidth="1.25" />
      <path d="m6.3 9.8 9.7 5.6 9.7-5.6M16 15.4v11" fill="none" stroke="currentColor" strokeLinejoin="round" strokeWidth="1.25" />
    </svg>
  );
}

function SoundIcon({ enabled, ...props }: SVGProps<SVGSVGElement> & { enabled: boolean }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 32 32" {...props}>
      <path d="M5.5 13h5l6-5v16l-6-5h-5Z" fill="none" stroke="currentColor" strokeLinejoin="round" strokeWidth="1.35" />
      {enabled ? (
        <>
          <path d="M21 12.2c1.3 1 2 2.3 2 3.8s-.7 2.8-2 3.8" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.35" />
          <path d="M24.3 9.2c2.1 1.8 3.2 4 3.2 6.8s-1.1 5-3.2 6.8" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.35" />
        </>
      ) : (
        <path d="m21.2 12 6 8m0-8-6 8" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.35" />
      )}
    </svg>
  );
}

function isEditableTarget(target: EventTarget | null) {
  return target instanceof HTMLElement && (
    target.isContentEditable || Boolean(target.closest('input, textarea, select, [role="textbox"]'))
  );
}

function isOutsideDialog(event: ReactPointerEvent<HTMLDialogElement>) {
  const rect = event.currentTarget.getBoundingClientRect();
  return event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom;
}

function focusWithoutScrolling(target: HTMLElement) {
  // Headings selected by chapter navigation lose their temporary tabindex on blur.
  // Restore it when returning from the dialog, then clean it up again on departure.
  const temporary = target.tabIndex < 0 && !target.hasAttribute('tabindex');
  if (temporary) target.tabIndex = -1;
  target.focus({ preventScroll: true });
  if (temporary) target.addEventListener('blur', () => target.removeAttribute('tabindex'), { once: true });
}

export function KControl({ activeSection, builderMode, disabled = false, onBuilderModeChange }: KControlProps) {
  const { playSound, setSoundEnabled, soundEnabled } = useSound();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const destinationRef = useRef<SiteSectionId | null>(null);
  const outsidePointerRef = useRef(false);
  const [isOpen, setIsOpen] = useState(false);
  const [shortcut, setShortcut] = useState('Ctrl K');

  useEffect(() => {
    if (/Mac|iPhone|iPad/.test(navigator.platform)) setShortcut('Cmd K');
  }, []);

  const closePalette = useCallback(() => {
    const dialog = dialogRef.current;
    if (!dialog?.open) return;
    playSound('close');
    setControlOverlayOpen(false);
    dialog.close();
    setIsOpen(false);
  }, [playSound]);

  const openPalette = useCallback((source: 'keyboard' | 'pointer') => {
    const dialog = dialogRef.current;
    if (!dialog || disabled || isSceneTransitionActive()) return false;
    if (dialog.open) { closePalette(); return true; }
    if (document.body.classList.contains('nav-open')) return false;
    if (document.querySelector('dialog[open], [aria-modal="true"]')) return false;

    // IntersectionObserver can be one frame behind a direct chapter jump.
    const marker = window.innerHeight * .42;
    const visibleSection = kControlSections.find((section) => {
      const bounds = document.getElementById(section.id)?.getBoundingClientRect();
      return bounds && bounds.top <= marker && bounds.bottom > marker;
    })?.id ?? activeSection;
    returnFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : triggerRef.current;
    destinationRef.current = null;
    outsidePointerRef.current = false;
    dialog.showModal();
    setControlOverlayOpen(true);
    setIsOpen(true);
    playSound('open');
    const firstFocus = source === 'keyboard'
      ? dialog.querySelector<HTMLElement>(`.k-control__destination[href="#${visibleSection}"]`)
      : dialog.querySelector<HTMLElement>('.k-control__close');
    firstFocus?.focus({ preventScroll: true });
    return true;
  }, [activeSection, closePalette, disabled, playSound]);

  useEffect(() => { if (disabled) closePalette(); }, [closePalette, disabled]);
  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.repeat || event.isComposing || event.altKey || event.shiftKey
        || !(event.ctrlKey || event.metaKey) || event.key.toLowerCase() !== 'k' || isEditableTarget(event.target)) return;
      if (openPalette('keyboard')) event.preventDefault();
    };
    window.addEventListener('keydown', handleShortcut);
    return () => window.removeEventListener('keydown', handleShortcut);
  }, [openPalette]);
  useEffect(() => {
    const dialog = dialogRef.current;
    return () => {
      setControlOverlayOpen(false);
      if (dialog?.open) dialog.close();
    };
  }, []);

  const handleClose = () => {
    // A close event can arrive after a rapid shortcut has already reopened the dialog.
    if (dialogRef.current?.open) return;
    setIsOpen(false);
    setControlOverlayOpen(false);
    const destination = destinationRef.current;
    destinationRef.current = null;
    if (disabled || isSceneTransitionActive() || document.querySelector('dialog[open], [aria-modal="true"]')) return;
    if (destination) {
      const section = document.getElementById(destination);
      const heading = section?.querySelector<HTMLElement>('h1, h2');
      const target = heading && !heading.closest('[inert]') ? heading : section;
      if (target) {
        focusWithoutScrolling(target);
      }
    } else if (returnFocusRef.current?.isConnected) {
      focusWithoutScrolling(returnFocusRef.current);
    } else {
      triggerRef.current?.focus({ preventScroll: true });
    }
  };

  const handleDialogKeyDown = (event: ReactKeyboardEvent<HTMLDialogElement>) => {
    if (event.key === 'Tab' && !event.altKey && !event.ctrlKey && !event.metaKey) {
      const controls = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('a[href], button:not(:disabled)'));
      const first = controls[0];
      const last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault(); last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault(); first?.focus();
      }
      return;
    }
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey || isEditableTarget(event.target)) return;
    if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
    // Arrow navigation is scoped to destinations. Native keys on settings remain untouched.
    const links = Array.from(event.currentTarget.querySelectorAll<HTMLAnchorElement>('.k-control__destination'));
    const index = links.findIndex((link) => link === document.activeElement);
    if (index < 0) return;
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? links.length - 1
      : (index + (event.key === 'ArrowDown' ? 1 : -1) + links.length) % links.length;
    event.preventDefault();
    links[next]?.focus();
  };

  return (
    <>
      <button aria-controls="k-control-dialog" aria-expanded={isOpen} aria-haspopup="dialog"
        aria-keyshortcuts="Control+K Meta+K" aria-label="Open K Control" className="k-control__trigger"
        disabled={disabled} onClick={() => openPalette('pointer')} ref={triggerRef} type="button">
        <svg aria-hidden="true" viewBox="0 0 40 24" fill="none"><path d="M3 17C14 2 21 26 36 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
        <span>K Control</span>
      </button>
      <dialog aria-describedby="k-control-description" aria-labelledby="k-control-title" className="k-control"
        id="k-control-dialog" onCancel={(event) => { event.preventDefault(); closePalette(); }}
        onPointerDown={(event) => { outsidePointerRef.current = isOutsideDialog(event); }}
        onPointerUp={(event) => { if (outsidePointerRef.current && isOutsideDialog(event)) closePalette(); outsidePointerRef.current = false; }}
        onPointerCancel={() => { outsidePointerRef.current = false; }}
        onClose={handleClose} onKeyDown={handleDialogKeyDown} ref={dialogRef}>
        <div className="k-control__surface">
          <div className="k-control__header">
            <div><h2 id="k-control-title">K Control</h2><p id="k-control-description">Find your place in the story.</p></div>
            <button aria-label="Close K Control" className="k-control__close" onClick={closePalette} type="button"><CloseIcon /></button>
          </div>
          <nav aria-label="K Control destinations" className="k-control__destinations">
            <svg aria-hidden="true" className="k-control__spine" fill="none" preserveAspectRatio="none" viewBox="0 0 20 364">
              <path d="M10 0C19 42 1 71 10 105S19 172 10 208S1 273 10 310S13 350 10 364" />
            </svg>
            {kControlSections.map((section) => (
              <a aria-current={section.id === activeSection ? 'location' : undefined}
                className="k-control__destination" href={section.href} key={section.id}
                onClick={(event) => {
                  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
                  const target = document.getElementById(section.id);
                  if (!target) return;
                  event.preventDefault();
                  destinationRef.current = section.id;
                  closePalette();
                  navigateToScene(section.id);
                }}>
                <i aria-hidden="true" /><span aria-hidden="true">{section.index}</span>
                <strong>{section.control.label}</strong><ArrowRightIcon />
              </a>
            ))}
          </nav>
          <div className="k-control__settings">
            <button aria-checked={builderMode} aria-labelledby="k-control-builder-label" aria-describedby="k-control-builder-description"
              className="k-control__setting" onClick={() => {
                playSound(builderMode ? 'toggle-off' : 'toggle-on'); onBuilderModeChange(!builderMode);
              }} role="switch" type="button">
              <BuilderCubeIcon /><span className="k-control__setting-copy"><strong id="k-control-builder-label">Builder Mode</strong>
                <small id="k-control-builder-description">See how the projects work</small></span>
              <i aria-hidden="true" className="k-control__switch"><span /></i>
            </button>
            <button aria-checked={soundEnabled} aria-labelledby="k-control-sound-label" aria-describedby="k-control-sound-description"
              className="k-control__setting" onClick={() => setSoundEnabled(!soundEnabled)} role="switch" type="button">
              <SoundIcon enabled={soundEnabled} /><span className="k-control__setting-copy"><strong id="k-control-sound-label">Interface Sound</strong>
                <small id="k-control-sound-description">Subtle feedback for your actions</small></span>
              <i aria-hidden="true" className="k-control__switch"><span /></i>
            </button>
          </div>
          <nav aria-label="Contact links" className="k-control__quick">
            {quickActions.map((action) => (
              <a {...(action.href.startsWith('https:') ? { target: '_blank', rel: 'noreferrer' } : {})}
                href={action.href} key={action.label}><span>{action.label}</span><ArrowIcon /></a>
            ))}
          </nav>
          <p className="k-control__hint"><kbd>{shortcut}</kbd> to open <span aria-hidden="true">·</span> <kbd>Esc</kbd> to close</p>
        </div>
      </dialog>
    </>
  );
}
