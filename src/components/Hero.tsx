import { useRef, useState } from 'react';
import { motion, useMotionValueEvent, useReducedMotion, useScroll, useSpring, useTransform } from 'motion/react';
import { useSound } from '../audio/SoundProvider';
import { ArrowIcon } from './Icons';
import { ThreadSculpture } from './thread/ThreadSculpture';
import './thread/ThreadStory.css';

const chapters = ['Meet me', 'My perspective', 'Selected work'] as const;
const chapterPositions = [0, 0.46, 0.87] as const;

export function Hero({ ready = true }: { ready?: boolean }) {
  const sectionRef = useRef<HTMLElement>(null);
  const { playSound } = useSound();
  const reduced = Boolean(useReducedMotion());
  const [chapter, setChapter] = useState(0);
  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ['start start', 'end end'] });
  const progress = useSpring(scrollYProgress, { stiffness: 110, damping: 30, restDelta: 0.0001 });
  const introOpacity = useTransform(progress, [0, 0.12, 0.29], [1, 1, 0]);
  const introY = useTransform(progress, [0, 0.32], ['0vh', '-16vh']);
  const introScale = useTransform(progress, [0, 0.32], [1, 0.92]);
  const perspectiveOpacity = useTransform(progress, [0.23, 0.36, 0.57, 0.69], [0, 1, 1, 0]);
  const perspectiveY = useTransform(progress, [0.23, 0.4, 0.65], ['8vh', '0vh', '-5vh']);
  const closingOpacity = useTransform(progress, [0.65, 0.78, 1], [0, 1, 1]);
  const closingY = useTransform(progress, [0.65, 0.82], ['8vh', '0vh']);
  const progressWidth = useTransform(progress, [0, 1], ['0%', '100%']);

  useMotionValueEvent(progress, 'change', (value) => {
    const next = value < 0.29 ? 0 : value < 0.68 ? 1 : 2;
    setChapter((previous) => previous === next ? previous : next);
  });

  const goToChapter = (index: number) => {
    const section = sectionRef.current;
    if (!section) return;
    playSound('select');
    const top = section.getBoundingClientRect().top + window.scrollY;
    const distance = Math.max(0, section.offsetHeight - window.innerHeight);
    window.scrollTo({ top: top + distance * (chapterPositions[index] ?? 0), behavior: reduced ? 'instant' : 'smooth' });
  };

  return (
    <section className="thread-story" data-chapter={chapter} data-reduced-motion={reduced} id="top" ref={sectionRef}>
      <div className="thread-story__sticky">
        <ThreadSculpture enabled={ready} progress={progress} reduced={reduced} />
        <div aria-hidden="true" className="hero__grain" />
        <motion.div aria-hidden={!reduced && chapter !== 0} className="thread-story__intro" inert={!reduced && chapter !== 0 ? true : undefined} style={reduced ? {} : { opacity: introOpacity, y: introY, scale: introScale }}>
          <h1 aria-label="Kamil Kerimov" className="hero__name"><span>Kamil</span><span>Kerimov</span></h1>
          <div className="hero__message">
            <p className="hero__promise">I build the <em>whole loop.</em></p>
            <p className="hero__summary">I turn ideas into useful experiences. Curious about people, design, and what technology can make possible.</p>
            <p className="hero__role">Software Developer · Baku, Azerbaijan</p>
            <div className="hero__actions">
              <a className="button button--primary" href="#method" onClick={() => playSound('select')}>Explore my work <ArrowIcon /></a>
              <a className="button button--text" href="#contact" onClick={() => playSound('contact')}>Start a conversation <ArrowIcon /></a>
            </div>
          </div>
        </motion.div>
        <motion.div aria-hidden={!reduced && chapter !== 1} className="thread-story__perspective" inert={!reduced && chapter !== 1 ? true : undefined} style={reduced ? {} : { opacity: perspectiveOpacity, y: perspectiveY }}>
          <p className="thread-story__chapter-label">A little about me</p>
          <h2>More than<br /><em>one dimension.</em></h2>
          <p className="thread-story__personal">I’m drawn to how things look,<br />how they work, and how they make people feel.</p>
          <p className="thread-story__personal thread-story__personal--secondary">That curiosity connects everything I do.</p>
        </motion.div>
        <motion.div aria-hidden={!reduced && chapter !== 2} className="thread-story__closing" inert={!reduced && chapter !== 2 ? true : undefined} style={reduced ? {} : { opacity: closingOpacity, y: closingY }}>
          <p className="thread-story__chapter-label">From curiosity to creation</p>
          <h2>Follow<br /><em>the thread.</em></h2>
          <p>A few things I’ve made along the way.</p>
          <a className="thread-story__work-link" href="#method">Discover the work <ArrowIcon /></a>
        </motion.div>
        {!reduced ? (
          <div className="thread-story__navigation">
            <div className="thread-story__scroll-cue"><span aria-hidden="true">↓</span> Scroll to explore</div>
            <nav aria-label="Introduction chapters" className="thread-story__chapters">
              {chapters.map((label, index) => <button aria-pressed={chapter === index} key={label} onClick={() => goToChapter(index)} type="button"><span aria-hidden="true">0{index + 1}</span><span>{label}</span></button>)}
            </nav>
            <a className="thread-story__skip" href="#method">Skip intro <span aria-hidden="true">↘</span></a>
            <div aria-hidden="true" className="thread-story__progress"><motion.span style={{ width: progressWidth }} /></div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
