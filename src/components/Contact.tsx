import { useEffect, useRef, useState } from 'react';
import { useInView, useReducedMotion, useScroll, useTransform } from 'motion/react';
import { ArrowIcon, ArrowUpIcon, GitHubIcon, LinkedInIcon } from './Icons';
import { ThreadSculpture } from './thread/ThreadSculpture';
import './ClosingStory.css';

const CONTACT_EMAIL = 'hello@kamilkerimov.com';

export function Contact({ prepare = false, onReady }: { prepare?: boolean; onReady?: () => void }) {
  const root = useRef<HTMLElement>(null);
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copying' | 'copied' | 'error'>('idle');
  const visible = useInView(root, { margin: '300px', once: true });
  const reduced = Boolean(useReducedMotion());
  const { scrollYProgress } = useScroll({ target: root, offset: ['start end', 'start start'] });
  const progress = useTransform(scrollYProgress, [0, .9], [1, 0]);

  useEffect(() => {
    if (copyStatus !== 'copied') return;
    const timer = window.setTimeout(() => setCopyStatus('idle'), 3000);
    return () => window.clearTimeout(timer);
  }, [copyStatus]);

  const copyEmail = async () => {
    setCopyStatus('copying');
    try {
      await navigator.clipboard.writeText(CONTACT_EMAIL);
      setCopyStatus('copied');
    } catch {
      setCopyStatus('error');
    }
  };

  return (
    <footer className="closing-story" id="contact" ref={root}>
      <div className="closing-story__sculpture" aria-hidden="true">{visible || prepare ? <ThreadSculpture framing="closing" onReady={onReady} progress={progress} reduced={reduced} /> : null}</div>
      <div className="section-shell closing-story__inner">
        <p className="story-label">The next chapter</p>
        <h2>What could<br />we <em>make next?</em></h2>
        <p className="closing-story__invitation">A project, a question, or a conversation.<br />I’d like to hear what you have in mind.</p>
        <div className="closing-story__actions">
          <a aria-label="Email Kamil Kerimov" className="closing-story__primary" href={`mailto:${CONTACT_EMAIL}`}>Let’s talk<ArrowIcon /></a>
          <a className="story-link" href="https://t.me/kar1m0vf" rel="noreferrer" target="_blank">Message on Telegram<ArrowIcon /></a>
        </div>
        <div className="closing-story__email">
          <div className="closing-story__email-row">
            <a className="closing-story__email-address" href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
            <button aria-label="Copy email address" className="closing-story__email-copy" disabled={copyStatus === 'copying'} onClick={copyEmail} type="button">
              <svg aria-hidden="true" viewBox="0 0 24 24">
                {copyStatus === 'copied'
                  ? <path d="m5 12 4 4L19 6" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
                  : <><rect x="8" y="8" width="12" height="12" rx="2" fill="none" stroke="currentColor" strokeWidth="1.5" /><path d="M15 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v9a1 1 0 0 0 1 1h3" fill="none" stroke="currentColor" strokeWidth="1.5" /></>}
              </svg>
              <span>{copyStatus === 'copied' ? 'Copied' : 'Copy'}</span>
            </button>
          </div>
          <span className="closing-story__email-status" role="status">{copyStatus === 'copied' ? 'Email copied.' : copyStatus === 'error' ? 'Could not copy. You can select the address above.' : ''}</span>
        </div>
        <nav aria-label="Professional profiles" className="closing-story__profiles">
          <a href="https://github.com/kar1m0vf" rel="noreferrer" target="_blank"><GitHubIcon />GitHub<ArrowIcon /></a>
          <a href="https://www.linkedin.com/in/kamil-kerimov" rel="noreferrer" target="_blank"><LinkedInIcon />LinkedIn<ArrowIcon /></a>
          <a href="mailto:hello@kamilkerimov.com?subject=Could%20you%20send%20me%20your%20r%C3%A9sum%C3%A9%3F">Ask for my résumé<ArrowIcon /></a>
        </nav>
        <div className="closing-story__foot"><span>Kamil Kerimov</span><span>Baku · UTC+4</span><a href="#top">Back to top<ArrowUpIcon /></a></div>
      </div>
    </footer>
  );
}
