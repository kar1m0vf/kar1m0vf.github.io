import { useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { LoopTrace } from './LoopTrace';

const stages = [
  {
    title: 'Map the flow',
    detail: 'Turn user needs and business rules into one clear path.',
    output: 'A clear path from need to interaction.',
  },
  {
    title: 'Hold the state',
    detail: 'Keep interface, storage, data, and background work consistent.',
    output: 'One consistent source of truth across the workflow.',
  },
  {
    title: 'Test the seams',
    detail: 'Check persistence, invalid states, and the handoffs where software breaks.',
    output: 'Known failure paths before users find them.',
  },
  {
    title: 'Ship the release',
    detail: 'Deploy the web build or package the desktop one.',
    output: 'A deployable web build or packaged desktop release.',
  },
] as const;

export function Method() {
  const reduceMotion = useReducedMotion();
  const [activeStageIndex, setActiveStageIndex] = useState(0);
  const activeStage = stages[activeStageIndex] ?? stages[0];

  return (
    <section className="method" id="method">
      <LoopTrace variant="method" />
      <div className="section-shell method__inner">
        <div className="section-label">
          <span>How I build</span>
          <i>From user need to release</i>
        </div>
        <h2 className="sr-only">How I build software</h2>
        <ol className="method__stages">
          {stages.map((stage, index) => {
            const isActive = index === activeStageIndex;
            const stageNumber = String(index + 1).padStart(2, '0');
            const detailId = `method-stage-${stageNumber}-detail`;

            return (
              <motion.li
                className={`method__stage${isActive ? ' is-active' : ''}`}
                initial={reduceMotion ? false : { opacity: 0, y: 24 }}
                key={stage.title}
                onPointerEnter={() => setActiveStageIndex(index)}
                transition={{ delay: reduceMotion ? 0 : index * 0.08 }}
                viewport={{ amount: 0.45, once: true }}
                whileInView={{ opacity: 1, y: 0 }}
              >
                <button
                  aria-controls="method-stage-output"
                  aria-current={isActive ? 'step' : undefined}
                  aria-describedby={detailId}
                  aria-pressed={isActive}
                  className="method__stage-button"
                  onClick={() => setActiveStageIndex(index)}
                  onFocus={() => setActiveStageIndex(index)}
                  type="button"
                >
                  <span className="method__stage-number">{stageNumber}</span>
                  <strong className="method__stage-title">{stage.title}</strong>
                </button>
                <p className="method__stage-detail" id={detailId}>{stage.detail}</p>
              </motion.li>
            );
          })}
        </ol>
        <div
          aria-atomic="true"
          aria-live="polite"
          className="method__output"
          id="method-stage-output"
        >
          <motion.div
            animate={{ opacity: 1, y: 0 }}
            className="method__output-content"
            initial={reduceMotion ? false : { opacity: 0, y: 8 }}
            key={activeStage.title}
            transition={{ duration: reduceMotion ? 0 : 0.22 }}
          >
            <span className="method__output-label">
              Active stage / {String(activeStageIndex + 1).padStart(2, '0')}
            </span>
            <strong className="method__output-title">{activeStage.title}</strong>
            <p className="method__output-detail">{activeStage.output}</p>
          </motion.div>
        </div>
        <div className="method__closing">
          <blockquote>“When the happy path works, I ask what breaks next.”</blockquote>
          <p>From user need to interface, background job, edge case, and release.</p>
          <span>Built in Baku · Used anywhere</span>
        </div>
      </div>
    </section>
  );
}
