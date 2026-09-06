import { useCallback, useEffect, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import type { PriceObservatoryConfig, TrackerHandoffState, TrackerSignalResult } from '../types';
import { useSound } from '../audio/SoundProvider';
import { ArrowRightIcon } from './Icons';

interface PriceObservatoryProps {
  config: PriceObservatoryConfig;
  handoffStatus: TrackerHandoffState['status'];
  onHandoffReset: () => void;
  onHandoffResolved: (result: TrackerSignalResult) => void;
}

const priceFormatter = new Intl.NumberFormat('en-US');
const formatPrice = (value: number) => `₺${priceFormatter.format(value)}`;

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
  const [position, setPosition] = useState(2);
  const [selectedGate, setSelectedGate] = useState(2);
  const [running, setRunning] = useState(false);

  const targetMatched = currentPrice <= targetPrice;
  const stopPosition = targetMatched ? (quietHours ? 2 : 3) : 1;
  const outcomeKey: TrackerSignalResult['outcome'] = !targetMatched
    ? 'memory'
    : quietHours
      ? 'held'
      : 'released';
  const dockedGate = !running && position >= 0 && position < config.gates.length ? position : -1;

  const reportSignal = useCallback(() => {
    onHandoffResolved({ currentPrice, outcome: outcomeKey });
    playSound('complete');
  }, [currentPrice, onHandoffResolved, outcomeKey, playSound]);

  useEffect(() => {
    if (!running) return;

    if (reduceMotion) {
      setPosition(stopPosition);
      setSelectedGate(Math.min(stopPosition, 2));
      setRunning(false);
      reportSignal();
      return;
    }

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
    }, position < 0 ? 280 : 620);

    return () => window.clearTimeout(nextTimer);
  }, [position, reduceMotion, reportSignal, running, stopPosition]);

  const outcome = !targetMatched
    ? {
        key: 'memory',
        title: 'Still waiting for your price.',
        reason: `${formatPrice(currentPrice)} is still above your ${formatPrice(targetPrice)} target.`,
      }
    : quietHours
      ? {
          key: 'held',
          title: 'Good price. We’ll tell you at 07:00.',
          reason: `The target is crossed at ${config.simulation.time}, inside quiet hours.`,
        }
      : {
          key: 'released',
          title: 'Your price is here.',
          reason: 'You would receive one price alert in Telegram.',
        };

  const runSignal = () => {
    playSound('signal');
    onHandoffReset();

    if (reduceMotion) {
      setPosition(stopPosition);
      setSelectedGate(Math.min(stopPosition, 2));
      setRunning(false);
      reportSignal();
      return;
    }

    setPosition(-1);
    setSelectedGate(0);
    setRunning(true);
  };

  const resetSignal = (nextPosition = -1) => {
    onHandoffReset();
    setRunning(false);
    setPosition(nextPosition);
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
    <div
      className={`signal-world${running ? ' is-running' : ''}`}
      data-handoff={handoffStatus}
      data-outcome={outcome.key}
    >
      <div className="signal-world__heading">
        <span>{config.title}</span>
        <i>{config.instruction}</i>
      </div>

      <div className="signal-world__surface">
        <header className="signal-world__statusbar">
          <div>
            <span aria-hidden="true" className="signal-world__beacon" />
            <p>
              <small>{config.sampleLabel}</small>
              <strong>A better price. Without checking all day.</strong>
            </p>
          </div>
          <button disabled={running || handoffStatus === 'pending'} onClick={runSignal} type="button">
            <span>
              {running
                ? 'Checking…'
                : handoffStatus === 'pending'
                  ? 'Ready'
                  : handoffStatus === 'settled'
                    ? 'Check again'
                    : 'Try this price'}
            </span>
            <ArrowRightIcon />
          </button>
        </header>

        <div className="signal-world__controls">
          <label className="signal-world__price-control">
            <span>Current price <output>{formatPrice(currentPrice)}</output></span>
            <input
              aria-label="Illustrative current price"
              disabled={running}
              max={config.simulation.max}
              min={config.simulation.min}
              onChange={(event) => {
                setCurrentPrice(Number(event.currentTarget.value));
                resetSignal();
                setSelectedGate(1);
              }}
              step={config.simulation.step}
              type="range"
              value={currentPrice}
            />
          </label>

          <label className="signal-world__target price-target-control">
            <span>Your target <strong>{formatPrice(targetPrice)}</strong></span>
            <input aria-label="Your target price" disabled={running} max={config.simulation.max} min={config.simulation.min} step={config.simulation.step} type="range" value={targetPrice}
              onChange={(event) => { setTargetPrice(Number(event.currentTarget.value)); resetSignal(); setSelectedGate(1); }} />
          </label>

          <button
            aria-pressed={quietHours}
            className="signal-world__quiet"
            disabled={running}
            onClick={() => {
              playSound('select');
              setQuietHours((enabled) => !enabled);
              resetSignal();
              setSelectedGate(2);
            }}
            type="button"
          >
            <span>Quiet hours</span>
            <strong>{quietHours ? '23:00—07:00 · ON' : 'OFF'}</strong>
          </button>
        </div>

        <div className="price-history-preview">
          <div><span>Illustrative price history</span><strong>{formatPrice(currentPrice)}</strong></div>
          <svg aria-label="Illustrative prices over seven checks" role="img" viewBox="0 0 700 140" preserveAspectRatio="none">
            <title>Illustrative prices over seven checks</title>
            <path className="price-history-preview__target" d={`M0 ${130 - (targetPrice - config.simulation.min) / (config.simulation.max - config.simulation.min) * 120}H700`} />
            <motion.path animate={{ d: [1250, 1210, 1260, 1170, 1190, config.simulation.previousPrice, currentPrice].map((price, index) => `${index ? 'L' : 'M'}${index * 116.66},${130 - (price - config.simulation.min) / (config.simulation.max - config.simulation.min) * 120}`).join(' ') }} transition={{ duration: reduceMotion ? 0 : .25 }} />
          </svg><span className="price-history-preview__caption">The dashed line is your target.</span>
        </div>
        <div className="signal-world__corridor">
          <div aria-hidden="true" className="signal-world__track" />
          <div className="signal-world__input">
            <span>Price changed</span>
            <strong>{formatPrice(config.simulation.previousPrice)} → {formatPrice(currentPrice)}</strong>
          </div>

          <ol aria-label="Price signal decisions" className="signal-world__stations">
            {config.gates.map((gate, index) => (
              <li
                className={`${selectedGate === index ? 'is-selected' : ''}`}
                data-status={gateStatus(index)}
                key={gate.id}
              >
                <div aria-hidden="true" className={`signal-world__symbol signal-world__symbol--${gate.id}`}>
                  {gate.id === 'memory' ? <><i /><i /><i /></> : null}
                  {gate.id === 'rule' ? <><i /><i /><b>{targetMatched ? '≤' : '>'}</b></> : null}
                  {gate.id === 'attention' ? <><i /><b /></> : null}
                  {dockedGate === index ? (
                    <div className="signal-world__pulse signal-world__pulse--docked">
                      <span>{formatPrice(currentPrice)}</span>
                    </div>
                  ) : null}
                </div>
                <span>{String(index + 1).padStart(2, '0')}</span>
                <strong>{gate.label}</strong>
                <p>{gate.detail}</p>
                <em>
                  {gate.id === 'memory' ? 'History +1' : null}
                  {gate.id === 'rule' ? `${formatPrice(currentPrice)} ${targetMatched ? '≤' : '>'} ${formatPrice(targetPrice)}` : null}
                  {gate.id === 'attention' ? `${config.simulation.time} · ${quietHours ? 'wait' : 'open'}` : null}
                </em>
              </li>
            ))}
          </ol>

          <div className="signal-world__endpoint" data-active={position === 3}>
            <span>Deliver</span>
            <strong>Telegram</strong>
          </div>

          {dockedGate === -1 ? (
            <div aria-hidden="true" className="signal-world__pulse" data-position={position}>
              <span>{formatPrice(currentPrice)}</span>
            </div>
          ) : null}
        </div>

        <div aria-label="Inspect a decision" className="signal-world__nav" role="group">
          {config.gates.map((gate, index) => (
            <button
              aria-pressed={selectedGate === index}
              disabled={running}
              key={gate.id}
              onClick={() => chooseGate(index)}
              type="button"
            >
              <span>{String(index + 1).padStart(2, '0')}</span>
              {gate.label}
            </button>
          ))}
        </div>

        <AnimatePresence initial={false} mode="wait">
          <motion.div
            animate={{ opacity: 1, y: 0 }}
            aria-live="polite"
            className="signal-world__outcome"
            initial={reduceMotion ? false : { opacity: 0, y: 8 }}
            key={`${outcome.key}-${currentPrice}-${quietHours}`}
          >
            <span className="price-notice-label">Telegram preview · no real message is sent</span>
            <strong>{outcome.title}</strong>
            <p>{outcome.reason}</p>
            {handoffStatus === 'pending' ? (
              <span className="signal-world__handoff-status">Decision event armed · Continue to Blaster</span>
            ) : null}
          </motion.div>
        </AnimatePresence>
      </div>

      <details className="signal-world__details">
        <summary>
          <span>Under the hood</span>
          <strong>Three engineering choices</strong>
        </summary>
        <ul>
          {config.facts.map((fact) => (
            <li key={fact.label}>
              <strong>{fact.label}</strong>
              <p>{fact.detail}</p>
            </li>
          ))}
        </ul>
      </details>
    </div>
  );
}
