import { motion, useReducedMotion } from 'motion/react';
import { journeyMilestones } from '../data/projects';

export function Journey() {
  const reduceMotion = useReducedMotion();

  return (
    <section className="journey" id="journey">
      <div className="section-shell journey__inner">
        <div className="journey__story">
          <h2 className="sr-only">Kamil Kerimov’s software journey</h2>
          <div className="journey__heading">
            <span>A software path, built from Baku.</span>
            <p>Project by project, the work expanded from Python automation into runtime systems, React interfaces, testing, and release ownership.</p>
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
        </div>
      </div>
    </section>
  );
}
