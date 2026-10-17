import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { useReducedMotion } from 'motion/react';
import './ProjectProcess.css';

const STEP_DURATION = 1600;
const FINAL_REST = 2300;

export function ProjectProcess({ steps, title }: { steps: readonly string[]; title: string }) {
  const listRef = useRef<HTMLOListElement>(null);
  const [activeStep, setActiveStep] = useState(0);
  const [canAnimate, setCanAnimate] = useState(() => !document.hidden);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    let isInView = true;
    const updateVisibility = () => setCanAnimate(isInView && !document.hidden);
    const observer = new IntersectionObserver(([entry]) => {
      isInView = entry?.isIntersecting ?? false;
      updateVisibility();
    });
    observer.observe(list);
    document.addEventListener('visibilitychange', updateVisibility);
    return () => {
      observer.disconnect();
      document.removeEventListener('visibilitychange', updateVisibility);
    };
  }, []);

  useEffect(() => {
    if (!canAnimate || reducedMotion || steps.length < 2) return;
    const timer = window.setTimeout(() => {
      setActiveStep((previous) => (previous + 1) % steps.length);
    }, activeStep === steps.length - 1 ? FINAL_REST : STEP_DURATION);
    return () => window.clearTimeout(timer);
  }, [activeStep, canAnimate, reducedMotion, steps.length]);

  return (
    <ol aria-label={`${title} loop`} className="project-process" ref={listRef} role="list"
      data-active-step={reducedMotion ? 'all' : String(activeStep + 1).padStart(2, '0')}
      data-motion={reducedMotion ? 'static' : canAnimate ? 'running' : 'paused'}
      style={{ '--process-count': steps.length, '--process-step-duration': `${STEP_DURATION}ms` } as CSSProperties}>
      {steps.map((step, index) => (
        <li data-state={reducedMotion || index < activeStep ? 'complete' : index === activeStep ? 'active' : 'waiting'} key={step}>
          <span aria-hidden="true" className="project-process__number">{String(index + 1).padStart(2, '0')}</span>
          <i aria-hidden="true" className="project-process__point" />
          <strong>{step}</strong>
          {index < steps.length - 1 ? (
            <span aria-hidden="true" className="project-process__connector">
              <i className="project-process__fill" /><i className="project-process__arrow" />
            </span>
          ) : null}
        </li>
      ))}
    </ol>
  );
}
