import { useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import { useSound } from '../audio/SoundProvider';
import { ArrowIcon } from './Icons';
import './ContactFinale.css';

const socialLinks = [
  { label: 'GitHub', href: 'https://github.com/kar1m0vf' },
  { label: 'LinkedIn', href: 'https://www.linkedin.com/in/kamil-kerimov' },
] as const;

const desktopSignal = {
  viewBox: '0 0 1600 900',
  incoming: [
    'M570 -50C704 82 842 238 950 490',
    'M724 -50C812 90 902 278 950 490',
    'M822 -50C880 102 936 292 950 490',
  ],
  loop: 'M950 490C1034 372 1188 232 1378 236C1492 238 1470 350 1362 452C1260 548 1124 610 1098 660C1068 720 1188 730 1324 706C1420 684 1490 708 1530 758',
  action: 'M950 490C910 574 838 650 706 690',
  node: { x: 950, y: 490 },
  endpoint: { x: 706, y: 690 },
} as const;

const mobileSignal = {
  viewBox: '0 0 390 844',
  incoming: [
    'M194 -34C226 78 270 190 286 332',
    'M258 -34C274 92 294 218 286 332',
    'M324 -34C320 92 312 226 286 332',
  ],
  loop: 'M286 332C332 298 374 298 374 334C374 376 304 416 270 454C238 490 260 518 318 548C362 572 370 606 370 642',
  action: 'M286 332C252 390 216 466 206 520C194 582 270 596 332 606C356 610 368 624 370 642',
  node: { x: 286, y: 332 },
  endpoint: { x: 370, y: 642 },
} as const;

interface SignalArtworkProps {
  mobile?: boolean;
}

function SignalArtwork({ mobile = false }: SignalArtworkProps) {
  const signal = mobile ? mobileSignal : desktopSignal;
  const suffix = mobile ? 'mobile' : 'desktop';
  const incomingClasses = ['contact__path--nar', 'contact__path--trendyol', 'contact__path--blaster'];

  return (
    <svg
      aria-hidden="true"
      className={`contact__signal-art contact__signal-art--${suffix}`}
      preserveAspectRatio="none"
      viewBox={signal.viewBox}
    >
      <defs>
        <filter height="240%" id={`contact-glow-${suffix}`} width="240%" x="-70%" y="-70%">
          <feGaussianBlur result="blur" stdDeviation={mobile ? '3.5' : '5'} />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <linearGradient id={`contact-loop-${suffix}`} x1="0" x2="1" y1="0" y2="1">
          <stop className="contact__gradient-stop contact__gradient-stop--start" offset="0" stopColor="#69dfff" />
          <stop className="contact__gradient-stop contact__gradient-stop--middle" offset="0.52" stopColor="#5b91ff" />
          <stop className="contact__gradient-stop contact__gradient-stop--violet" offset="0.78" stopColor="#a47aff" />
          <stop className="contact__gradient-stop contact__gradient-stop--end" offset="1" stopColor="#ff5d7d" />
        </linearGradient>
      </defs>

      {signal.incoming.map((path, index) => (
        <g key={path}>
          <path className={`contact__path contact__path-halo ${incomingClasses[index]}`} d={path} />
          <path className={`contact__path contact__path-line ${incomingClasses[index]}`} d={path} pathLength="1" />
        </g>
      ))}
      <g className="contact__signal-touch-color">
        <g className="contact__signal-auto-color">
          <path
            className="contact__path contact__path-halo contact__path--loop"
            d={signal.loop}
            filter={`url(#contact-glow-${suffix})`}
          />
          <path
            className="contact__path contact__path-line contact__path--loop"
            d={signal.loop}
            pathLength="1"
            stroke={`url(#contact-loop-${suffix})`}
          />
          <path
            className="contact__path contact__path-halo contact__path--action"
            d={signal.action}
            filter={`url(#contact-glow-${suffix})`}
          />
          <path
            className="contact__path contact__path-line contact__path--action"
            d={signal.action}
            pathLength="1"
            stroke={`url(#contact-loop-${suffix})`}
          />
          <circle
            className="contact__signal-end-halo"
            cx={signal.endpoint.x}
            cy={signal.endpoint.y}
            filter={`url(#contact-glow-${suffix})`}
            r={mobile ? '5' : '7'}
          />
          <circle className="contact__signal-end" cx={signal.endpoint.x} cy={signal.endpoint.y} r={mobile ? '2.8' : '4'} />
        </g>
      </g>
    </svg>
  );
}

export function Contact() {
  const { playSound } = useSound();
  const reduceMotion = Boolean(useReducedMotion());
  const contactRef = useRef<HTMLElement | null>(null);
  const signalFrameRef = useRef<number | null>(null);
  const pulseTimeoutRef = useRef<number | null>(null);
  const [signalActive, setSignalActive] = useState(false);

  useEffect(() => () => {
    if (signalFrameRef.current !== null) window.cancelAnimationFrame(signalFrameRef.current);
    if (pulseTimeoutRef.current !== null) window.clearTimeout(pulseTimeoutRef.current);
  }, []);

  const setSignalPosition = (event: ReactPointerEvent<HTMLElement>) => {
    if (reduceMotion || !contactRef.current) return;
    const bounds = contactRef.current.getBoundingClientRect();
    if (!bounds.width || !bounds.height) return;
    const x = Math.min(1, Math.max(0, (event.clientX - bounds.left) / bounds.width));
    const y = Math.min(1, Math.max(0, (event.clientY - bounds.top) / bounds.height));

    if (signalFrameRef.current !== null) window.cancelAnimationFrame(signalFrameRef.current);
    signalFrameRef.current = window.requestAnimationFrame(() => {
      contactRef.current?.style.setProperty('--contact-signal-x', `${(x - 0.5) * 16}px`);
      contactRef.current?.style.setProperty('--contact-signal-y', `${(y - 0.5) * 12}px`);
      contactRef.current?.style.setProperty('--contact-signal-hue', `${(x - 0.5) * 150 + (y - 0.5) * 30}deg`);
    });
  };

  const resetSignalPosition = () => {
    if (!contactRef.current) return;
    contactRef.current.style.setProperty('--contact-signal-x', '0px');
    contactRef.current.style.setProperty('--contact-signal-y', '0px');
    contactRef.current.style.setProperty('--contact-signal-hue', '0deg');
    setSignalActive(false);
  };

  const activateSignal = () => {
    if (pulseTimeoutRef.current !== null) window.clearTimeout(pulseTimeoutRef.current);
    setSignalActive(true);
    playSound('contact');
    pulseTimeoutRef.current = window.setTimeout(() => setSignalActive(false), 720);
  };

  return (
    <footer
      className="contact contact--finale"
      id="contact"
      onPointerDown={setSignalPosition}
      onPointerLeave={resetSignalPosition}
      onPointerMove={setSignalPosition}
      ref={contactRef}
    >
      <div aria-hidden="true" className="contact__signal-canvas">
        <SignalArtwork />
        <SignalArtwork mobile />
      </div>

      <button
        aria-label="Activate the closing signal"
        className="contact__signal-hit"
        data-active={signalActive || undefined}
        onClick={activateSignal}
        onPointerDown={(event) => {
          setSignalActive(true);
          setSignalPosition(event);
        }}
        type="button"
      >
        <span className="contact__signal-node" />
      </button>

      <div className="section-shell contact__inner">
        <p className="contact__label"><span>Loop</span><b>/</b> 04 — Contact</p>

        <motion.div
          className="contact__copy"
          initial={reduceMotion ? false : { opacity: 0, y: 32 }}
          transition={{ duration: reduceMotion ? 0 : 0.72, ease: [0.22, 1, 0.36, 1] }}
          viewport={{ amount: 0.28, once: true }}
          whileInView={{ opacity: 1, y: 0 }}
        >
          <h2>
            <span>The <em>next</em> loop</span>
            <span>starts with a</span>
            <span>conversation.</span>
          </h2>
          <p>Interface, automation, runtime, testing, and release — I build across the whole system.</p>
        </motion.div>

        <motion.div
          className="contact__actions"
          initial={reduceMotion ? false : { opacity: 0, y: 22 }}
          transition={{ delay: reduceMotion ? 0 : 0.12, duration: reduceMotion ? 0 : 0.62 }}
          viewport={{ amount: 0.5, once: true }}
          whileInView={{ opacity: 1, y: 0 }}
        >
          <a
            aria-label="Email Kamil Kerimov — start the next loop"
            className="contact__primary"
            href="mailto:kamil16092006@gmail.com"
            onClick={() => playSound('contact')}
          >
            <span>Start the next loop</span>
            <ArrowIcon />
          </a>
          <a
            className="contact__telegram"
            href="https://t.me/kar1m0vf"
            onClick={() => playSound('select')}
            rel="noreferrer"
            target="_blank"
          >
            <span>Telegram</span>
            <ArrowIcon />
          </a>
        </motion.div>

        <nav aria-label="Footer links and location" className="contact__footer">
          <a className="wordmark" href="#top" onClick={() => playSound('select')}>Kamil Kerimov</a>
          <span>Baku · UTC+4</span>
          {socialLinks.map((link) => (
            <a href={link.href} key={link.href} onClick={() => playSound('select')} rel="noreferrer" target="_blank">
              {link.label}<ArrowIcon />
            </a>
          ))}
          <a href="#top" onClick={() => playSound('select')}>Back to top<ArrowIcon /></a>
        </nav>
      </div>
    </footer>
  );
}
