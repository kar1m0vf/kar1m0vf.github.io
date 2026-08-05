import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties, KeyboardEvent as ReactKeyboardEvent, SVGProps } from 'react';
import { ArrowIcon, ArrowRightIcon, GitHubIcon, TelegramIcon } from './Icons';
import {
  kControlSections,
  resolveKControlSection,
  type SiteSectionId,
} from '../data/siteSections';
import { useSound } from '../audio/SoundProvider';

export interface KControlProps {
  activeSection: SiteSectionId;
  builderMode: boolean;
  disabled?: boolean;
  onBuilderModeChange: (enabled: boolean) => void;
}

type CommandElement = HTMLAnchorElement | HTMLButtonElement;
type OpenSource = 'keyboard' | 'pointer';

const quickActions = [
  {
    href: 'mailto:kamil16092006@gmail.com',
    icon: EmailIcon,
    label: 'Email',
  },
  {
    external: true,
    href: 'https://t.me/kar1m0vf',
    icon: TelegramIcon,
    label: 'Telegram',
  },
  {
    external: true,
    href: 'https://github.com/kar1m0vf',
    icon: GitHubIcon,
    label: 'GitHub',
  },
] as const;

function EmailIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" {...props}>
      <path d="M3.5 5.5h17v13h-17z" fill="none" stroke="currentColor" strokeLinejoin="round" strokeWidth="1.5" />
      <path d="m4.2 6.3 7.8 6.1 7.8-6.1" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
    </svg>
  );
}

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
    target.isContentEditable
    || target.matches('input, textarea, select')
  );
}

export function KControl({
  activeSection,
  builderMode,
  disabled = false,
  onBuilderModeChange,
}: KControlProps) {
  const { playSound, setSoundEnabled, soundEnabled } = useSound();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const commandRefs = useRef<Array<CommandElement | null>>([]);
  const openSourceRef = useRef<OpenSource>('pointer');
  const [isOpen, setIsOpen] = useState(false);

  const resolvedSection = resolveKControlSection(activeSection);
  const activeIndex = Math.max(
    0,
    kControlSections.findIndex((section) => section.id === resolvedSection),
  );
  const activeControlSection = kControlSections[activeIndex] ?? kControlSections[0];
  const progress = kControlSections.length > 1
    ? activeIndex / (kControlSections.length - 1)
    : 0;

  const dialogStyle = useMemo(() => ({
    '--k-control-progress': `${progress * 100}%`,
  }) as CSSProperties, [progress]);

  const closePalette = useCallback(() => {
    if (isOpen) playSound('close');
    setIsOpen(false);
  }, [isOpen, playSound]);

  const openPalette = useCallback((source: OpenSource) => {
    if (disabled) return;

    if (isOpen) {
      closePalette();
      return;
    }

    if (document.body.classList.contains('nav-open')) return;

    const activeModal = document.querySelector<HTMLElement>('dialog[open], [aria-modal="true"]');
    if (activeModal && activeModal !== dialogRef.current) return;

    openSourceRef.current = source;
    playSound('open');
    setIsOpen(true);
  }, [closePalette, disabled, isOpen, playSound]);

  useEffect(() => {
    if (!disabled) return;
    setIsOpen(false);
  }, [disabled]);

  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      if (
        event.defaultPrevented
        || event.altKey
        || event.shiftKey
        || !(event.ctrlKey || event.metaKey)
        || event.key.toLowerCase() !== 'k'
        || isEditableTarget(event.target)
      ) return;

      if (!isOpen) {
        if (disabled || document.body.classList.contains('nav-open')) return;
        const activeModal = document.querySelector<HTMLElement>('dialog[open], [aria-modal="true"]');
        if (activeModal && activeModal !== dialogRef.current) return;
      }

      event.preventDefault();
      openPalette('keyboard');
    };

    window.addEventListener('keydown', handleShortcut);
    return () => window.removeEventListener('keydown', handleShortcut);
  }, [disabled, isOpen, openPalette]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (!isOpen) {
      if (dialog.open) dialog.close();
      return;
    }

    if (!dialog.open) dialog.showModal();
    document.body.classList.add('k-control-open');

    const focusFrame = window.requestAnimationFrame(() => {
      if (openSourceRef.current === 'keyboard') {
        commandRefs.current[activeIndex]?.focus();
      } else {
        closeButtonRef.current?.focus({ preventScroll: true });
      }
    });

    return () => {
      window.cancelAnimationFrame(focusFrame);
      document.body.classList.remove('k-control-open');
      if (dialog.open) dialog.close();
    };
  }, [activeIndex, isOpen]);

  useEffect(() => () => document.body.classList.remove('k-control-open'), []);

  const handleDialogKeyDown = (event: ReactKeyboardEvent<HTMLDialogElement>) => {
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;

    const commands = commandRefs.current.filter(
      (element): element is CommandElement => Boolean(element && !element.hasAttribute('disabled')),
    );
    if (commands.length === 0) return;

    const currentIndex = commands.findIndex((element) => element === document.activeElement);
    let nextIndex = currentIndex;

    if (event.key === 'Home') nextIndex = 0;
    if (event.key === 'End') nextIndex = commands.length - 1;
    if (event.key === 'ArrowDown') nextIndex = currentIndex < 0 ? 0 : (currentIndex + 1) % commands.length;
    if (event.key === 'ArrowUp') nextIndex = currentIndex < 0 ? commands.length - 1 : (currentIndex - 1 + commands.length) % commands.length;

    event.preventDefault();
    commands[nextIndex]?.focus();
  };

  const registerCommand = (index: number) => (element: CommandElement | null) => {
    commandRefs.current[index] = element;
  };

  return (
    <>
      <button
        aria-controls="k-control-dialog"
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        aria-keyshortcuts="Control+K Meta+K"
        aria-label="Open K-Control navigation"
        className="k-control__trigger"
        disabled={disabled}
        onClick={() => openPalette('pointer')}
        ref={triggerRef}
        type="button"
      >
        <span aria-hidden="true">K</span>
        <small>Control</small>
      </button>

      <dialog
        aria-describedby="k-control-description"
        aria-labelledby="k-control-title"
        className="k-control"
        id="k-control-dialog"
        onCancel={(event) => {
          event.preventDefault();
          closePalette();
        }}
        onClick={(event) => {
          if (event.currentTarget === event.target) closePalette();
        }}
        onClose={() => {
          setIsOpen(false);
          triggerRef.current?.focus({ preventScroll: true });
        }}
        onKeyDown={handleDialogKeyDown}
        ref={dialogRef}
        style={dialogStyle}
      >
        <div className="k-control__surface">
          <header className="k-control__header">
            <div className="k-control__identity">
              <span aria-hidden="true" className="k-control__mark">K</span>
              <i aria-hidden="true" />
              <h2 id="k-control-title">K-Control</h2>
            </div>
            <button
              aria-label="Close K-Control"
              className="k-control__close"
              onClick={closePalette}
              ref={closeButtonRef}
              type="button"
            >
              <span />
              <span />
            </button>
          </header>

          <p className="k-control__intro" id="k-control-description">Navigate the whole loop.</p>

          <div aria-hidden="true" className="k-control__progress">
            <i />
            <ol>
              {kControlSections.map((section, index) => (
                <li data-active={index === activeIndex || undefined} key={section.id}>
                  <span />
                  <small>{section.control.index}</small>
                </li>
              ))}
            </ol>
          </div>

          <nav aria-label="K-Control destinations" className="k-control__destinations">
            {kControlSections.map((section, index) => {
              const isActive = section.id === activeControlSection?.id;

              return (
                <a
                  aria-current={isActive ? 'location' : undefined}
                  className="k-control__destination"
                  data-accent={section.control.accent}
                  href={section.href}
                  key={section.id}
                  onClick={closePalette}
                  ref={registerCommand(index)}
                >
                  <span>{section.control.index}</span>
                  <i aria-hidden="true" />
                  <strong>{section.control.label}</strong>
                  <ArrowRightIcon />
                </a>
              );
            })}
          </nav>

          <button
            aria-checked={builderMode}
            className="k-control__builder k-control__setting"
            onClick={() => {
              playSound(builderMode ? 'toggle-off' : 'toggle-on');
              onBuilderModeChange(!builderMode);
            }}
            ref={registerCommand(kControlSections.length)}
            role="switch"
            type="button"
          >
            <span aria-hidden="true" className="k-control__builder-icon"><BuilderCubeIcon /></span>
            <strong>Builder Mode</strong>
            <output>{builderMode ? 'On' : 'Off'}</output>
            <i aria-hidden="true" className="k-control__switch"><span /></i>
          </button>

          <button
            aria-checked={soundEnabled}
            className="k-control__sound k-control__setting"
            onClick={() => setSoundEnabled(!soundEnabled)}
            ref={registerCommand(kControlSections.length + 1)}
            role="switch"
            type="button"
          >
            <span aria-hidden="true" className="k-control__builder-icon k-control__sound-icon">
              <SoundIcon enabled={soundEnabled} />
            </span>
            <strong>Interface Sound</strong>
            <output>{soundEnabled ? 'On' : 'Off'}</output>
            <i aria-hidden="true" className="k-control__switch"><span /></i>
          </button>

          <section aria-labelledby="k-control-quick-title" className="k-control__quick">
            <h3 id="k-control-quick-title">Quick actions</h3>
            <div>
              {quickActions.map((action, index) => {
                const Icon = action.icon;
                const externalProps = 'external' in action && action.external
                  ? { rel: 'noreferrer', target: '_blank' }
                  : {};

                return (
                  <a
                    {...externalProps}
                    href={action.href}
                    key={action.label}
                    onClick={closePalette}
                    ref={registerCommand(kControlSections.length + 2 + index)}
                  >
                    <Icon />
                    <span>{action.label}</span>
                    <ArrowIcon />
                  </a>
                );
              })}
            </div>
          </section>

          <p aria-live="polite" className="sr-only">
            Builder mode {builderMode ? 'enabled' : 'disabled'}. Interface sound {soundEnabled ? 'enabled' : 'disabled'}.
          </p>

          <button className="k-control__footer-close" onClick={closePalette} type="button">
            Press <strong>Esc</strong> or tap to close
          </button>
        </div>
      </dialog>
    </>
  );
}
