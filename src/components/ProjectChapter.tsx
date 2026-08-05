import { memo, useRef } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import type { ProjectWorld, TrackerHandoffState, TrackerSignalResult } from '../types';
import { ArrowIcon, ArrowRightIcon, GitHubIcon, TelegramIcon } from './Icons';
import { LoopTrace } from './LoopTrace';
import { NarTrackerHandoff } from './NarTrackerHandoff';
import { ProjectVisual } from './ProjectVisuals';

interface ProjectChapterProps {
  handoff: TrackerHandoffState | null;
  onHandoffReset: (() => void) | null;
  onHandoffResolved: ((result: TrackerSignalResult) => void) | null;
  project: ProjectWorld;
}

function ProjectChapterComponent({
  handoff,
  onHandoffReset,
  onHandoffResolved,
  project,
}: ProjectChapterProps) {
  const reduceMotion = useReducedMotion();
  const sectionRef = useRef<HTMLElement | null>(null);
  const initialDeepLink = useRef(
    typeof window !== 'undefined' && window.location.hash === `#${project.id}`,
  ).current;

  return (
    <section className={`project project--${project.theme}`} id={project.id} ref={sectionRef}>
      <LoopTrace variant={project.theme} />
      {project.theme === 'trendyol' && !reduceMotion && !initialDeepLink ? (
        <NarTrackerHandoff targetRef={sectionRef} />
      ) : null}
      <div className="section-shell project__inner">
        <motion.header
          className="project__header"
          initial={reduceMotion ? false : { opacity: 0, y: 30 }}
          viewport={{ amount: 0.3, once: true }}
          whileInView={{ opacity: 1, y: 0 }}
        >
          <div className="project__identity">
            <p className="project__kicker">{project.index} · {project.loopLabel}</p>
            <h2>{project.title}</h2>
          </div>
          <div className="project__thesis">
            <p className="project__statement">{project.statement}</p>
            <p className="project__description">{project.description}</p>
          </div>
        </motion.header>

        <ol aria-label={`${project.title} loop`} className="project__flow">
          {project.flow.map((step, index) => (
            <li key={step}>
              <span>{step}</span>
              {index < project.flow.length - 1 ? <ArrowRightIcon /> : null}
            </li>
          ))}
        </ol>

        <ProjectVisual
          onHandoffReset={onHandoffReset}
          onHandoffResolved={onHandoffResolved}
          project={project}
          trackerHandoff={handoff}
        />

        <div className="project__notes">
          <div className="project__decision">
            <span>Builder’s note</span>
            <blockquote>{project.decision}</blockquote>
            {project.releaseNote ? <p>{project.releaseNote}</p> : null}
          </div>
          <div className="project__meta">
            <dl>
              <div><dt>Ownership</dt><dd>{project.role}</dd></div>
              <div><dt>Timeline</dt><dd>{project.year}</dd></div>
              <div><dt>Built with</dt><dd>{project.stack.join(' · ')}</dd></div>
            </dl>
            <div className="project__actions">
              {project.links.map((link) => (
                <a
                  className={`project-link project-link--${link.kind}`}
                  href={link.href}
                  key={link.href}
                  rel="noreferrer"
                  target="_blank"
                >
                  {project.theme === 'trendyol' && link.label.includes('bot') ? <TelegramIcon /> : null}
                  {link.label.includes('repository') ? <GitHubIcon /> : null}
                  <span>{link.label}</span>
                  <ArrowIcon />
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export const ProjectChapter = memo(ProjectChapterComponent);
