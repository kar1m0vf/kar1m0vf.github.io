import { useRef, useState, type KeyboardEvent } from 'react';
import { motion, useMotionValueEvent, useReducedMotion, useScroll } from 'motion/react';
import { ArrowIcon } from './Icons';
import './PersonalStory.css';

const perspectives = [
  { title: 'Make something useful', heading: 'A small frustration. A reason to build.', text: 'Checking the same price again and again felt like a job for a bot. I like finding those small moments where making something can make life easier.', link: 'Explore the projects', href: '#work', art: 'make' },
  { title: 'Understand the details', heading: 'The interesting part is often the question.', text: 'What does someone actually need? What happens when a plan goes wrong? I enjoy untangling a problem, trying an idea, and staying with it until it works.', link: 'Try the price tracker', href: '#trendyol', art: 'think' },
  { title: 'Be part of it', heading: 'Good things happen with other people.', text: 'Learning with others, entering a project competition, joining an event team. I want the things I do to take me beyond my own screen.', link: 'A little beyond the work', href: '#journey', art: 'people' },
] as const;

export function Method() {
  const section = useRef<HTMLElement>(null);
  const buttons = useRef<Array<HTMLButtonElement | null>>([]);
  const [active, setActive] = useState(0);
  const reduced = Boolean(useReducedMotion());
  const { scrollYProgress } = useScroll({ target: section, offset: ['start start', 'end end'] });
  const current = perspectives[active]!;
  useMotionValueEvent(scrollYProgress, 'change', (value) => {
    if (!reduced && window.matchMedia('(min-width: 960px) and (min-height: 650px)').matches) setActive(Math.min(2, Math.floor(value * 3)));
  });
  const select = (index: number, focus = false) => {
    setActive(index);
    if (focus) buttons.current[index]?.focus({ preventScroll: true });
    if (!reduced && section.current && window.matchMedia('(min-width: 960px) and (min-height: 650px)').matches) {
      const top = section.current.getBoundingClientRect().top + window.scrollY;
      window.scrollTo({ top: top + (section.current.offsetHeight - window.innerHeight) * ((index + 0.15) / 3), behavior: 'instant' });
    }
  };
  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const next = event.key === 'ArrowDown' || event.key === 'ArrowRight' ? (index + 1) % 3
      : event.key === 'ArrowUp' || event.key === 'ArrowLeft' ? (index + 2) % 3
        : event.key === 'Home' ? 0 : event.key === 'End' ? 2 : null;
    if (next !== null) { event.preventDefault(); select(next, true); }
  };
  return (
    <section aria-labelledby="about-heading" className="personal-intro" id="method" ref={section}>
      <div className="personal-intro__sticky section-shell">
        <div className="personal-intro__copy">
          <p className="story-label">A little more Kamil</p>
          <h2 id="about-heading">Curiosity takes<br /><em>many shapes.</em></h2>
          <p className="personal-intro__lead">I like making useful things, asking better questions, and being part of what happens around me.</p>
          <div aria-label="Get to know Kamil" aria-orientation="vertical" className="perspectives" role="tablist">
            {perspectives.map((item, index) => (
              <button aria-controls="perspective-panel" aria-selected={active === index} id={`perspective-${index}`} key={item.art}
                onClick={() => select(index)} onKeyDown={(event) => onKeyDown(event, index)} ref={(node) => { buttons.current[index] = node; }}
                role="tab" tabIndex={active === index ? 0 : -1} type="button">
                <span>0{index + 1}</span><strong>{item.title}</strong><ArrowIcon />
              </button>
            ))}
          </div>
        </div>
        <div className="personal-intro__scene" data-perspective={current.art}>
          <div aria-hidden="true" className="perspective-art" />
          <div aria-labelledby={`perspective-${active}`} className="perspective-panel" id="perspective-panel" role="tabpanel" tabIndex={0}>
            <motion.div animate={{ opacity: 1, y: 0 }} initial={reduced ? false : { opacity: 0, y: 12 }} key={current.art} transition={{ duration: 0.35 }}>
              <h3>{current.heading}</h3><p>{current.text}</p>
              <a className="story-link" href={current.href}>{current.link}<ArrowIcon /></a>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}
