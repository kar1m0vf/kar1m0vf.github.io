import { useCallback, useEffect, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import type { PriceObservatoryConfig, TrackerHandoffState, TrackerSignalResult } from '../types';
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
  const reduceMotion = useReducedMotion();
  const [currentPrice, setCurrentPrice] = useState(config.simulation.currentPrice);
  const [quietHours, setQuietHours] = useState(true);
  const [position, setPosition] = useState(2);
  const [selectedGate, setSelectedGate] = useState(2);
  const [running, setRunning] = useState(false);

  const targetMatched = currentPrice <= config.simulation.targetPrice;
  const stopPosition = targetMatched ? (quietHours ? 2 : 3) : 1;
  const outcomeKey: TrackerSignalResult['outcome'] = !targetMatched
    ? 'memory'
    : quietHours
      ? 'held'
      : 'released';
  const dockedGate = !running && position >= 0 && position < config.gates.length ? position : -1;

  const reportSignal = useCallback(() => {
    onHandoffResolved({ currentPrice, outcome: outcomeKey });
  }, [currentPrice, onHandoffResolved, outcomeKey]);

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
        title: 'Stored, not sent.',
        reason: `${formatPrice(currentPrice)} is still above your ${formatPrice(config.simulation.targetPrice)} target.`,
      }
    : quietHours
      ? {
          key: 'held',
          title: 'Matched. Held until 07:00.',
          reason: `The target is crossed at ${config.simulation.time}, inside quiet hours.`,
        }
      : {
          key: 'released',
          title: 'Matched. One useful alert.',
          reason: 'The rule is true and the attention gate is open.',
        };

  const runSignal = () => {
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
              <strong>One check. Three decisions.</strong>
            </p>
          </div>
          <button disabled={running || handoffStatus === 'pending'} onClick={runSignal} type="button">
            <span>
              {running
                ? 'Signal moving'
                : handoffStatus === 'pending'
                  ? 'Decision armed'
                  : handoffStatus === 'settled'
                    ? 'Run another signal'
                    : 'Run signal'}
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

          <div className="signal-world__target">
            <span>Your target</span>
            <strong>{formatPrice(config.simulation.targetPrice)}</strong>
          </div>

          <button
            aria-pressed={quietHours}
            className="signal-world__quiet"
            disabled={running}
            onClick={() => {
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
                  {gate.id === 'rule' ? `${formatPrice(currentPrice)} ${targetMatched ? '≤' : '>'} ${formatPrice(config.simulation.targetPrice)}` : null}
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
