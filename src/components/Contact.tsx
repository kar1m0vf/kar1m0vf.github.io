import { useRef } from 'react';
import { useInView, useReducedMotion, useScroll, useTransform } from 'motion/react';
import { ArrowIcon, ArrowUpIcon, GitHubIcon, LinkedInIcon } from './Icons';
import { ThreadSculpture } from './thread/ThreadSculpture';
import './ClosingStory.css';

export function Contact() {
  const root = useRef<HTMLElement>(null);
  const visible = useInView(root, { margin: '300px', once: true });
  const reduced = Boolean(useReducedMotion());
  const { scrollYProgress } = useScroll({ target: root, offset: ['start end', 'start start'] });
  const progress = useTransform(scrollYProgress, [0, .9], [1, 0]);
  return (
    <footer className="closing-story" id="contact" ref={root}>
      <div className="closing-story__sculpture" aria-hidden="true">{visible ? <ThreadSculpture framing="closing" progress={progress} reduced={reduced} /> : null}</div>
      <div className="section-shell closing-story__inner">
        <p className="story-label">The next chapter</p>
        <h2>What could<br />we <em>make next?</em></h2>
        <p className="closing-story__invitation">A project, a question, or a conversation.<br />I’d like to hear what you have in mind.</p>
        <div className="closing-story__actions">
          <a aria-label="Email Kamil Kerimov" className="closing-story__primary" href="mailto:kamil16092006@gmail.com">Let’s talk<ArrowIcon /></a>
          <a className="story-link" href="https://t.me/kar1m0vf" rel="noreferrer" target="_blank">Message on Telegram<ArrowIcon /></a>
        </div>
        <nav aria-label="Professional profiles" className="closing-story__profiles">
          <a href="https://github.com/kar1m0vf" rel="noreferrer" target="_blank"><GitHubIcon />GitHub<ArrowIcon /></a>
          <a href="https://www.linkedin.com/in/kamil-kerimov" rel="noreferrer" target="_blank"><LinkedInIcon />LinkedIn<ArrowIcon /></a>
          <a href="mailto:kamil16092006@gmail.com?subject=Could%20you%20send%20me%20your%20r%C3%A9sum%C3%A9%3F">Ask for my résumé<ArrowIcon /></a>
        </nav>
        <div className="closing-story__foot"><span>Kamil Kerimov</span><span>Baku · UTC+4</span><a href="#top">Back to top<ArrowUpIcon /></a></div>
      </div>
    </footer>
  );
}
