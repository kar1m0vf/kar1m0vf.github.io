import { useEffect, useId, useRef, useState } from 'react';
import { ArrowIcon } from './Icons';

const navigation = [
  { label: 'About', href: '#method' },
  { label: 'Work', href: '#work' },
  { label: 'Journey', href: '#journey' },
  { label: 'Contact', href: '#contact' },
] as const;

function ContrastText({ children }: { children: string }) {
  const maskId = `nav-text-${useId().replace(/:/g, '')}`;

  return (
    <span className="nav-contrast">
      <span className="nav-contrast__label">{children}</span>
      <svg aria-hidden="true" className="nav-contrast__mask" focusable="false">
        <defs>
          <mask id={maskId} maskUnits="userSpaceOnUse" x="0" y="0" width="100%" height="100%">
            <text x="0" y="50%" dominantBaseline="central" fill="white">{children}</text>
          </mask>
        </defs>
      </svg>
      <span
        aria-hidden="true"
        className="nav-contrast__ink"
        style={{ maskImage: `url(#${maskId})`, WebkitMaskImage: `url(#${maskId})` }}
      />
    </span>
  );
}

export function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const navigationRef = useRef<HTMLElement>(null);

  useEffect(() => {
    document.body.classList.toggle('nav-open', menuOpen);
    return () => document.body.classList.remove('nav-open');
  }, [menuOpen]);

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false);
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, []);

  useEffect(() => {
    if (!menuOpen) return;

    const main = document.querySelector('main');
    const previousInert = main?.inert ?? false;
    const links = Array.from(navigationRef.current?.querySelectorAll<HTMLAnchorElement>('a') ?? []);
    const focusable = [menuButtonRef.current, ...links].filter(
      (item): item is HTMLButtonElement | HTMLAnchorElement => item !== null,
    );
    const firstLink = links[0];
    const focusFrame = window.requestAnimationFrame(() => firstLink?.focus());

    const trapFocus = (event: KeyboardEvent) => {
      if (event.key !== 'Tab' || focusable.length === 0) return;
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
    };

    if (main) main.inert = true;
    window.addEventListener('keydown', trapFocus);
    return () => {
      window.cancelAnimationFrame(focusFrame);
      window.removeEventListener('keydown', trapFocus);
      if (main) main.inert = previousInert;
      menuButtonRef.current?.focus();
    };
  }, [menuOpen]);

  return (
    <header className={`site-header${menuOpen ? ' is-open' : ''}`}>
      <a aria-label="Kamil Kerimov — home" className="wordmark" href="#top">
        <ContrastText>Kamil Kerimov</ContrastText>
      </a>
      <button
        aria-controls="primary-navigation"
        aria-expanded={menuOpen}
        aria-label={menuOpen ? 'Close navigation' : 'Open navigation'}
        className="menu-button"
        onClick={() => setMenuOpen((open) => !open)}
        ref={menuButtonRef}
        type="button"
      >
        <span />
        <span />
      </button>
      <nav aria-label="Primary navigation" className="site-nav" id="primary-navigation" ref={navigationRef}>
        {navigation.map((item) => (
          <a href={item.href} key={item.href} onClick={() => setMenuOpen(false)}>
            <ContrastText>{item.label}</ContrastText>
          </a>
        ))}
      </nav>
      <a className="header-cta" href="#contact">
        <ContrastText>Let’s talk</ContrastText> <ArrowIcon />
      </a>
    </header>
  );
}
