import { useRef } from 'react';
import { useReducedMotion } from 'motion/react';
import { ArrowRightIcon } from './Icons';

const socialLinks = [
  { label: 'Telegram', href: 'https://t.me/kar1m0vf' },
  { label: 'GitHub', href: 'https://github.com/kar1m0vf' },
  { label: 'LinkedIn', href: 'https://www.linkedin.com/in/kamil-kerimov' },
] as const;

export function Contact() {
  const reduceMotion = useReducedMotion();
  const emailRef = useRef<HTMLAnchorElement>(null);

  return (
    <footer className="contact" id="contact">
      <div className="section-shell contact__inner">
        <div className="contact__copy">
          <h2>I’m looking for frontend work where UI, state, and product quality all matter.</h2>
          <p>If you need someone who can own the screen and reason about the system behind it, let’s talk.</p>
          <a
            className="contact__email"
            href="mailto:kamil16092006@gmail.com"
            onPointerLeave={() => {
              if (emailRef.current) emailRef.current.style.transform = '';
            }}
            onPointerMove={(event) => {
              if (reduceMotion || event.pointerType !== 'mouse') return;
              const bounds = event.currentTarget.getBoundingClientRect();
              const x = event.clientX - (bounds.left + bounds.width / 2);
              const y = event.clientY - (bounds.top + bounds.height / 2);
              event.currentTarget.style.transform = `translate3d(${x * 0.08}px, ${y * 0.12}px, 0)`;
            }}
            ref={emailRef}
          >
            <ArrowRightIcon /> Email me
          </a>
          <nav aria-label="Contact and social links" className="contact__links">
            {socialLinks.map((link) => (
              <a href={link.href} key={link.href} rel="noreferrer" target="_blank">{link.label}</a>
            ))}
          </nav>
        </div>
        <svg aria-hidden="true" className="contact__signature" viewBox="0 0 420 360">
          <path d="M128 38 C104 116 115 214 94 326" pathLength="1" />
          <path d="M105 198 C176 140 231 94 300 35" pathLength="1" />
          <path d="M106 198 C183 220 234 278 322 332" pathLength="1" />
        </svg>
        <div className="contact__footer">
          <a className="wordmark" href="#top">Kamil Kerimov</a>
          <span>Baku · UTC+4</span>
          <span>Frontend &amp; Software Developer</span>
        </div>
      </div>
    </footer>
  );
}
