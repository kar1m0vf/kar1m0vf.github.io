import { useCallback, useEffect, useState, type CSSProperties } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import type { PriceObservatoryConfig, TrackerHandoffState, TrackerSignalResult } from '../types';
import { useSound } from '../audio/SoundProvider';
import { ArrowRightIcon, DisclosureIcon, TelegramIcon } from './Icons';
import { PriceHistoryChart } from './PriceHistoryChart';

interface PriceObservatoryProps {
  config: PriceObservatoryConfig;
  handoffStatus: TrackerHandoffState['status'];
  onHandoffReset: () => void;
  onHandoffResolved: (result: TrackerSignalResult) => void;
}

const priceFormatter = new Intl.NumberFormat('en-US');
const formatPrice = (value: number) => `₺${priceFormatter.format(value)}`;
const checkSteps = [
  { label: 'Read price', title: 'Reading the product price.' },
  { label: 'Compare', title: 'Comparing with your target.' },
  { label: 'Quiet hours', title: 'Checking quiet hours.' },
  { label: 'Alert', title: 'Preparing your alert.' },
] as const;
type CompletedCheck = TrackerSignalResult & { targetPrice: number };

export function PriceObservatory({
  config,
  handoffStatus,
  onHandoffReset,
  onHandoffResolved,
}: PriceObservatoryProps) {
  const { playSound } = useSound();
  const reduceMotion = useReducedMotion();
  const [currentPrice, setCurrentPrice] = useState(config.simulation.currentPrice);
  const [targetPrice, setTargetPrice] = useState(config.simulation.targetPrice);
  const [quietHours, setQuietHours] = useState(true);
  const [position, setPosition] = useState(-1);
  const [selectedGate, setSelectedGate] = useState(0);
  const [running, setRunning] = useState(false);
  const [completedCheck, setCompletedCheck] = useState<CompletedCheck | null>(null);
  const rangeStyle = (value: number): CSSProperties & { '--range-progress': string } => ({
    '--range-progress': `${(value - config.simulation.min) / (config.simulation.max - config.simulation.min) * 100}%`,
  });

  const targetMatched = currentPrice <= targetPrice;
  const stopPosition = targetMatched ? (quietHours ? 2 : 3) : 1;
  const outcomeKey: TrackerSignalResult['outcome'] = !targetMatched
    ? 'memory'
    : quietHours
      ? 'held'
      : 'released';

  const reportSignal = useCallback(() => {
    const result = { currentPrice, outcome: outcomeKey };
    setCompletedCheck({ ...result, targetPrice });
    onHandoffResolved(result);
    playSound('complete');
  }, [currentPrice, targetPrice, onHandoffResolved, outcomeKey, playSound]);

  useEffect(() => {
    if (!running) return;

    if (position >= stopPosition) {
      const finishTimer = window.setTimeout(() => {
        setRunning(false);
        reportSignal();
      }, 520);
      return () => window.clearTimeout(finishTimer);
    }

    const nextTimer = window.setTimeout(() => {
      const nextPosition = position + 1;
      setPosition(nextPosition);
      setSelectedGate(Math.min(Math.max(nextPosition, 0), 2));
    }, 620);

    return () => window.clearTimeout(nextTimer);
  }, [position, reportSignal, running, stopPosition]);

  const checkStatus = running ? 'checking' : completedCheck ? 'complete' : 'idle';
  const stepIndex = Math.max(0, Math.min(position, checkSteps.length - 1));
  const preview = running
    ? {
        key: `checking-${stepIndex}`,
        title: (checkSteps[stepIndex] ?? checkSteps[0]).title,
        reason: [
          'Getting the current price for this check.',
          `${formatPrice(currentPrice)} against your ${formatPrice(targetPrice)} target.`,
          `${config.simulation.time} · Quiet hours are ${quietHours ? 'on' : 'off'}.`,
          'The price matches and notifications are allowed.',
        ][stepIndex] ?? 'Checking your price and alert rules.',
      }
    : completedCheck
      ? completedCheck.outcome === 'memory'
        ? {
            key: 'memory',
            title: 'Not at your target yet.',
            reason: `${formatPrice(completedCheck.currentPrice)} is above your ${formatPrice(completedCheck.targetPrice)} target.`,
          }
        : completedCheck.outcome === 'held'
          ? { key: 'held', title: 'Quiet hours are on.', reason: 'The price matches. Your alert would wait until 07:00.' }
          : { key: 'released', title: 'Your price is here.', reason: 'The price matches. You would receive an alert in Telegram.' }
      : { key: 'idle', title: 'Waiting for your check.', reason: 'Set the price and target, then press Check price.' };

  const checkStepStatus = (index: number) => {
    if (checkStatus === 'idle' || index > stepIndex) return 'pending';
    if (index < stepIndex) return 'done';
    if (running) return 'active';
    return completedCheck?.outcome === 'released' ? 'done' : 'held';
  };

  const runSignal = () => {
    if (running || handoffStatus === 'pending') return;
    playSound('signal');
    onHandoffReset();
    setCompletedCheck(null);
    setPosition(0);
    setSelectedGate(0);
    setRunning(true);
  };

  const resetSignal = () => {
    onHandoffReset();
    setRunning(false);
    setCompletedCheck(null);
    setPosition(-1);
  };

  const chooseGate = (index: number) => {
    if (index !== selectedGate) playSound('select');
    setSelectedGate(index);
  };

  const gateStatus = (index: number) => {
    if (position < index) return 'pending';
    if (index === 1 && position === 1 && !targetMatched && !running) return 'blocked';
    if (index === 2 && position === 2 && targetMatched && quietHours && !running) return 'blocked';
    if (position === index && running) return 'active';
    return 'passed';
  };

  return (
    <div className={`signal-world${running ? ' is-running' : ''}`} data-handoff={handoffStatus}
      data-outcome={completedCheck?.outcome ?? checkStatus} data-check-status={checkStatus} data-signal-position={position}>
      <div className="signal-world__constellation">
        <div className="signal-world__observation">
          <label className="signal-world__price-control">
            <span>Current price</span>
            <output>{formatPrice(currentPrice)}</output>
            <span className="signal-world__range" style={rangeStyle(currentPrice)}>
              <input aria-label="Illustrative current price" disabled={running}
                max={config.simulation.max} min={config.simulation.min} step={config.simulation.step}
                type="range" value={currentPrice} onChange={(event) => {
                  setCurrentPrice(Number(event.currentTarget.value)); resetSignal(); setSelectedGate(1);
                }} />
            </span>
            <span className="signal-world__range-limits" aria-hidden="true">
              <span>{formatPrice(config.simulation.min)}</span><span>{formatPrice(config.simulation.max)}</span>
            </span>
          </label>
          <PriceHistoryChart currentPrice={currentPrice} targetPrice={targetPrice}
            previousPrice={config.simulation.previousPrice} min={config.simulation.min} max={config.simulation.max} />
        </div>

        <div className="signal-world__rule-island">
          <label className="signal-world__target price-target-control">
            <span>Your target <strong>{formatPrice(targetPrice)}</strong></span>
            <span className="signal-world__range" style={rangeStyle(targetPrice)}>
              <input aria-label="Your target price" disabled={running} max={config.simulation.max}
                min={config.simulation.min} step={config.simulation.step} type="range" value={targetPrice}
                onChange={(event) => { setTargetPrice(Number(event.currentTarget.value)); resetSignal(); setSelectedGate(1); }} />
            </span>
            <span className="signal-world__range-limits" aria-hidden="true">
              <span>{formatPrice(config.simulation.min)}</span><span>{formatPrice(config.simulation.max)}</span>
            </span>
          </label>
          <button aria-pressed={quietHours} className="signal-world__quiet" disabled={running} type="button"
            onClick={() => { playSound('select'); setQuietHours((enabled) => !enabled); resetSignal(); setSelectedGate(2); }}>
            <span>Quiet hours</span>
            <strong>{quietHours ? '23:00—07:00 · ON' : 'OFF'}</strong>
            <i aria-hidden="true" />
          </button>
        </div>

        <div className="signal-world__delivery">
          <div className="signal-world__outcome">
            <span className="price-notice-label"><TelegramIcon />Telegram preview · no real message is sent</span>
            <ol className="signal-world__check-steps" aria-label="Price check progress">
              {checkSteps.map((step, index) => <li key={step.label} data-status={checkStepStatus(index)}
                aria-current={running && index === stepIndex ? 'step' : undefined}
                aria-label={`${step.label}: ${checkStepStatus(index)}`}><span>{step.label}</span></li>)}
            </ol>
            <div className="signal-world__check-copy" role="status" aria-atomic="true">
              <motion.div animate={{ opacity: 1, y: 0 }} initial={reduceMotion ? false : { opacity: 0, y: 6 }}
                key={preview.key} transition={{ duration: reduceMotion ? 0 : .16 }}>
                <strong>{preview.title}</strong>
                <p>{preview.reason}</p>
              </motion.div>
            </div>
          </div>
        </div>

        <div className="signal-world__launch">
          <button className="signal-world__run" disabled={running || handoffStatus === 'pending'} onClick={runSignal} type="button">
            <span>{running ? 'Checking…' : completedCheck ? 'Check again' : 'Check price'}</span>
            <ArrowRightIcon />
          </button>
          <p>{running ? 'A quick check of the price and your rules.' : completedCheck ? 'Adjust the settings to try another check.' : config.instruction}</p>
        </div>
      </div>

      <div className="signal-world__caption"><span aria-hidden="true" className="signal-world__beacon" />{config.sampleLabel}</div>
      <details className="signal-world__details">
        <summary><span>Under the hood</span><strong>Three engineering choices</strong><DisclosureIcon /></summary>
        <ol aria-label="Price signal decisions" className="signal-world__stations">
          {config.gates.map((gate, index) => (
            <li className={selectedGate === index ? 'is-selected' : ''} data-status={gateStatus(index)} key={gate.id}>
              <button aria-pressed={selectedGate === index} disabled={running} onClick={() => chooseGate(index)} type="button">
                <span>{String(index + 1).padStart(2, '0')}</span><strong>{gate.label}</strong>
              </button>
              <p>{gate.detail}</p>
              <em>{gate.id === 'memory' ? 'History +1' : gate.id === 'rule'
                ? `${formatPrice(currentPrice)} ${targetMatched ? '≤' : '>'} ${formatPrice(targetPrice)}`
                : `${config.simulation.time} · ${quietHours ? 'wait' : 'open'}`}</em>
            </li>
          ))}
        </ol>
        <ul>{config.facts.map((fact) => <li key={fact.label}><strong>{fact.label}</strong><p>{fact.detail}</p></li>)}</ul>
      </details>
    </div>
  );
}
