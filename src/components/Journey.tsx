import { useRef } from 'react';
import { motion, useReducedMotion, useScroll, useTransform } from 'motion/react';
import { ArrowIcon } from './Icons';
import './JourneyStory.css';

const moments = [
  { title: 'Learning by making', text: 'I study Information Technologies at ASOIU, with frontend training at IT Brains and DIV Academy. I learn best when there’s something to try, break, and make better.', detail: 'ASOIU · 2023–2027 · Expected graduation 2027' },
  { title: 'Showing up with people', text: 'In 2026, I was selected for Event & Communications at the Formula 1 Azerbaijan Grand Prix. It’s a chance to contribute to something much bigger than my own projects.', detail: 'Formula 1 Azerbaijan Grand Prix · Volunteer selection, 2026' },
  { title: 'Following a different rhythm', text: 'Music sends me down new rabbit holes. Learning languages gives me another way into them. There’s usually something I’m curious about that has nothing to do with code.', detail: 'Music · Languages · Whatever catches my curiosity next' },
];

export function Journey() {
  const root = useRef<HTMLElement>(null);
  const reduced = Boolean(useReducedMotion());
  const { scrollYProgress } = useScroll({ target: root, offset: ['start end', 'end start'] });
  const y = useTransform(scrollYProgress, [0, 1], ['-5%', '5%']);
  return (
    <section aria-labelledby="journey-heading" className="life-story" id="journey" ref={root}>
      <div className="life-story__place">
        <motion.picture aria-hidden="true" style={reduced ? {} : { y }}>
          <source srcSet="/media/journey/baku-1280.avif 1280w, /media/journey/baku-1920.avif 1672w" type="image/avif" />
          <img alt="" decoding="async" height="941" loading="lazy" sizes="(min-width:960px) 50vw, 100vw" src="/media/journey/baku-1920.webp" width="1672" />
        </motion.picture>
        <div className="life-story__title"><p className="story-label">Beyond the work</p><h2 id="journey-heading">Built in Baku.<br /><em>Still becoming.</em></h2><p>A place to start.<br />Plenty left to discover.</p></div>
        <span className="life-story__location">Baku, Azerbaijan · 40.4° N, 49.9° E</span>
      </div>
      <div className="life-story__moments">
        <ol>{moments.map((moment, index) => (
          <motion.li initial={reduced ? false : { y: 22 }} key={moment.title} transition={{ duration: .65 }} viewport={{ amount: .5, once: true }} whileInView={{ y: 0 }}>
            <span className="life-story__number">0{index + 1}</span><h3>{moment.title}</h3><p>{moment.text}</p><small>{moment.detail}</small>
          </motion.li>
        ))}</ol>
        <div className="life-story__note"><span>Along the way</span><p>Winner of DIV Academy’s<br />#GələcəyiYazanlar project.</p><a className="story-link" href="mailto:kamil16092006@gmail.com?subject=Could%20you%20send%20me%20your%20r%C3%A9sum%C3%A9%3F">Ask for my résumé<ArrowIcon /></a></div>
      </div>
    </section>
  );
}
