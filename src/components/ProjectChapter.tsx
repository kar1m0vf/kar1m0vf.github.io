import { memo, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import type { ProjectWorld, TrackerHandoffState, TrackerSignalResult } from '../types';
import { BuilderLayerPanel } from './BuilderMode';
import { ArrowIcon, ArrowRightIcon, DisclosureIcon, GitHubIcon, TelegramIcon } from './Icons';
import { ProjectVisual } from './ProjectVisuals';

interface ProjectChapterProps {
  builderMode: boolean;
  handoff: TrackerHandoffState | null;
  onHandoffReset: (() => void) | null;
  onHandoffResolved: ((result: TrackerSignalResult) => void) | null;
  project: ProjectWorld;
}

function ProjectChapterComponent({
  builderMode,
  handoff,
  onHandoffReset,
  onHandoffResolved,
  project,
}: ProjectChapterProps) {
  const reduceMotion = useReducedMotion();
  const sectionRef = useRef<HTMLElement | null>(null);
  const [builderLayer, setBuilderLayer] = useState(0);

  return (
    <section
      className={`project project--${project.theme}`}
      data-builder-layer={builderMode ? builderLayer : undefined}
      data-builder-world={project.id}
      id={project.id}
      ref={sectionRef}
    >
      <div className="section-shell project__inner">
        <motion.header
          className="project__header"
          initial={reduceMotion ? false : { opacity: 0, y: 30 }}
          viewport={{ amount: 0.3, once: true }}
          whileInView={{ opacity: 1, y: 0 }}
        >
          <div className="project__identity">
            <p className="project__kicker">{project.index} · {project.loopLabel}</p>
            <h2 className={project.theme === 'blaster' ? 'sr-only' : undefined}>{project.title}</h2>
            {project.theme === 'blaster' ? <p className="arcade-headline">A little less<br /><em>serious.</em></p> : null}
          </div>
          <div className="project__thesis">
            <p className="project__statement">{project.statement}</p>
            <p className="project__description">{project.description}</p>
          </div>
        </motion.header>

        <div className="project__experience">
          <div className="project__visual-focus" data-builder-zone="system">
            <ProjectVisual
              onHandoffReset={onHandoffReset}
              onHandoffResolved={onHandoffResolved}
              project={project}
              trackerHandoff={handoff}
            />
          </div>

          {builderMode ? <BuilderLayerPanel onLayerChange={setBuilderLayer} projectId={project.id} /> : null}
        </div>

        <div className="project__after">
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
          <details className="project-details" open={builderMode || undefined}>
            <summary>See how I built it<DisclosureIcon /></summary>
            <ol aria-label={`${project.title} loop`} className="project__flow" data-builder-zone="flow">
              {project.flow.map((step, index) => (
                <li key={step}>
                  <span>{step}</span>
                  {index < project.flow.length - 1 ? <ArrowRightIcon /> : null}
                </li>
              ))}
            </ol>
            <div className="project__notes" data-builder-zone="output">
              <div className="project__decision">
                <span>A decision that mattered</span>
                <blockquote>{project.decision}</blockquote>
                {project.releaseNote ? <p>{project.releaseNote}</p> : null}
              </div>
              <div className="project__meta">
                <dl>
                  <div><dt>My part</dt><dd>{project.role}</dd></div>
                  <div><dt>Built with</dt><dd>{project.stack.join(' · ')}</dd></div>
                </dl>
              </div>
            </div>
          </details>
        </div>
      </div>
    </section>
  );
}

export const ProjectChapter = memo(ProjectChapterComponent);
