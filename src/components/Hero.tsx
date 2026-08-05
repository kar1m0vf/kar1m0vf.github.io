import { useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { useSound } from '../audio/SoundProvider';
import { ArrowIcon } from './Icons';
import { LoopTrace } from './LoopTrace';

const buildRail = ['Map', 'State', 'Test', 'Ship'] as const;

export function Hero() {
  const { playSound } = useSound();
  const reduceMotion = useReducedMotion();
  const [activeStep, setActiveStep] = useState(0);
  const reveal = reduceMotion ? false : { opacity: 0, y: 28 };

  return (
    <section className="hero" data-active-step={activeStep} id="top">
      <LoopTrace
        activeStep={activeStep}
        interactive
        onSignalStepChange={setActiveStep}
        variant="hero"
      />
      <div className="hero__grain" aria-hidden="true" />
      <div className="hero__inner">
        <motion.h1
          animate={{ opacity: 1, y: 0 }}
          aria-label="Kamil Kerimov"
          className="hero__name"
          initial={reveal}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
        >
          <span>Kamil</span>
          <span>Kerimov</span>
        </motion.h1>

        <motion.div
          animate={{ opacity: 1, y: 0 }}
          className="hero__message"
          initial={reveal}
          transition={{ delay: reduceMotion ? 0 : 0.16, duration: 0.85, ease: [0.22, 1, 0.36, 1] }}
        >
          <p className="hero__promise">I build the <em>whole loop.</em></p>
          <p className="hero__summary">
            React interfaces. Python systems. Tests and releases that keep both honest.
          </p>
          <p className="hero__role">Software Developer · Interfaces, automation &amp; runtime · Baku</p>
          <div className="hero__actions">
            <a className="button button--primary" href="#method" onClick={() => playSound('select')}>
              See how I build <ArrowIcon />
            </a>
            <a className="button button--text" href="#contact" onClick={() => playSound('contact')}>
              Start a conversation <ArrowIcon />
            </a>
          </div>
          <small aria-hidden="true" className="hero__conduct-hint">MOVE TO CONDUCT</small>
        </motion.div>

        <p aria-atomic="true" aria-live="polite" className="sr-only">
          Build loop signal: {buildRail[activeStep]}
        </p>
        <ol aria-label="Kamil's interactive build loop" className="hero__rail" data-active-step={activeStep}>
          {buildRail.map((step, index) => (
            <li data-active={activeStep === index || undefined} key={step}>
              <button
                aria-label={`${step}, step ${index + 1} of ${buildRail.length}`}
                aria-pressed={activeStep === index}
                className={`hero__rail-button${activeStep === index ? ' is-active' : ''}`}
                data-active={activeStep === index || undefined}
                data-step={index}
                onClick={() => {
                  if (activeStep !== index) playSound('select');
                  setActiveStep(index);
                }}
                onFocus={() => setActiveStep(index)}
                onPointerEnter={(event) => {
                  if (event.pointerType === 'mouse' || event.pointerType === 'pen') setActiveStep(index);
                }}
                type="button"
              >
                <span>{String(index + 1).padStart(2, '0')}</span>
                {step}
              </button>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
