import { useEffect, useRef, useState } from 'react';
import { ArrowIcon } from './Icons';

const navigation = [
  { label: 'Work', href: '#work' },
  { label: 'Method', href: '#method' },
  { label: 'Journey', href: '#journey' },
  { label: 'Contact', href: '#contact' },
] as const;

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
        Kamil Kerimov
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
            {item.label}
          </a>
        ))}
      </nav>
      <a className="header-cta" href="#contact">
        Let’s talk <ArrowIcon />
      </a>
    </header>
  );
}
