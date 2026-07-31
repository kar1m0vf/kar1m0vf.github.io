import { motion, useReducedMotion } from 'motion/react';
import { journeyMilestones } from '../data/projects';
import { ArrowRightIcon } from './Icons';

const qualityTools = ['pytest', 'Vitest', 'Playwright', 'Lighthouse CI', 'GitHub Actions', 'PyInstaller', 'SHA256'] as const;

export function Journey() {
  const reduceMotion = useReducedMotion();

  return (
    <section className="journey" id="journey">
      <div className="section-shell journey__inner">
        <div className="quality-loop">
          <p className="quality-loop__label">The quality loop</p>
          <motion.h2
            initial={reduceMotion ? false : { opacity: 0, y: 28 }}
            viewport={{ amount: 0.45, once: true }}
            whileInView={{ opacity: 1, y: 0 }}
          >
            <span>Map</span><ArrowRightIcon /><span>Build</span><ArrowRightIcon /><span>Break</span><ArrowRightIcon /><span>Test</span><ArrowRightIcon /><span>Ship</span>
          </motion.h2>
          <blockquote>When the happy path works, I ask what breaks next.</blockquote>
          <ul aria-label="Quality and release tools">
            {qualityTools.map((tool) => <li key={tool}>{tool}</li>)}
          </ul>
        </div>

        <div className="journey__story">
          <div className="journey__heading">
            <span>Built in public, from Baku.</span>
            <p>Three projects. One way of thinking across interface, automation, runtime, and release.</p>
          </div>
          <ol className="timeline">
            {journeyMilestones.map((milestone, index) => (
              <motion.li
                initial={reduceMotion ? false : { opacity: 0, y: 18 }}
                key={`${milestone.year}-${milestone.title}`}
                transition={{ delay: reduceMotion ? 0 : index * 0.05 }}
                viewport={{ amount: 0.4, once: true }}
                whileInView={{ opacity: 1, y: 0 }}
              >
                <span className="timeline__dot" aria-hidden="true" />
                <strong>{milestone.year}</strong>
                <h3>{milestone.title}</h3>
                <p>{milestone.detail}</p>
              </motion.li>
            ))}
          </ol>
          <p className="journey__holberton">
            <span>Holberton School Azerbaijan</span>
            Software Engineering training · 100% schedule achievement
          </p>
        </div>
      </div>
    </section>
  );
}
