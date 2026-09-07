import { useCallback, useEffect, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import type { PriceObservatoryConfig, TrackerHandoffState, TrackerSignalResult } from '../types';
import { useSound } from '../audio/SoundProvider';
import { ArrowRightIcon, DisclosureIcon, TelegramIcon } from './Icons';

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
    <div className={`signal-world${running ? ' is-running' : ''}`} data-handoff={handoffStatus}
      data-outcome={outcome.key} data-signal-position={position}>
      <div className="signal-world__constellation">
        <div className="signal-world__observation">
          <label className="signal-world__price-control">
            <span>Current price</span>
            <output>{formatPrice(currentPrice)}</output>
            <input aria-label="Illustrative current price" disabled={running}
              max={config.simulation.max} min={config.simulation.min} step={config.simulation.step}
              type="range" value={currentPrice} onChange={(event) => {
                setCurrentPrice(Number(event.currentTarget.value)); resetSignal(); setSelectedGate(1);
              }} />
          </label>
          <div className="price-history-preview">
            <svg aria-label="Illustrative prices over seven checks" role="img" viewBox="0 0 700 140" preserveAspectRatio="none">
              <title>Illustrative prices over seven checks</title>
              <path className="price-history-preview__target" d={`M0 ${130 - (targetPrice - config.simulation.min) / (config.simulation.max - config.simulation.min) * 120}H700`} />
              <motion.path animate={{ d: [1250, 1210, 1260, 1170, 1190, config.simulation.previousPrice, currentPrice].map((price, index) => `${index ? 'L' : 'M'}${index * 116.66},${130 - (price - config.simulation.min) / (config.simulation.max - config.simulation.min) * 120}`).join(' ') }} transition={{ duration: reduceMotion ? 0 : .25 }} />
            </svg>
            <span className="price-history-preview__caption">Illustrative price history · dashed line = your target</span>
          </div>
        </div>

        <div className="signal-world__rule-island">
          <label className="signal-world__target price-target-control">
            <span>Your target <strong>{formatPrice(targetPrice)}</strong></span>
            <input aria-label="Your target price" disabled={running} max={config.simulation.max}
              min={config.simulation.min} step={config.simulation.step} type="range" value={targetPrice}
              onChange={(event) => { setTargetPrice(Number(event.currentTarget.value)); resetSignal(); setSelectedGate(1); }} />
          </label>
          <button aria-pressed={quietHours} className="signal-world__quiet" disabled={running} type="button"
            onClick={() => { playSound('select'); setQuietHours((enabled) => !enabled); resetSignal(); setSelectedGate(2); }}>
            <span>Quiet hours</span>
            <strong>{quietHours ? '23:00—07:00 · ON' : 'OFF'}</strong>
            <i aria-hidden="true" />
          </button>
        </div>

        <div className="signal-world__delivery">
          <div className="signal-world__outcome" aria-live="polite" aria-atomic="true">
            <span className="price-notice-label"><TelegramIcon />Telegram preview · no real message is sent</span>
            <AnimatePresence initial={false} mode="wait">
              <motion.div animate={{ opacity: 1, y: 0 }} initial={reduceMotion ? false : { opacity: 0, y: 8 }}
                exit={{ opacity: reduceMotion ? 1 : 0 }} key={outcome.key} transition={{ duration: .2 }}>
                <strong>{outcome.title}</strong>
                <p>{outcome.reason}</p>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        <div className="signal-world__launch">
          <button className="signal-world__run" disabled={running || handoffStatus === 'pending'} onClick={runSignal} type="button">
            <span>{running ? 'Checking…' : handoffStatus === 'pending' ? 'Ready' : handoffStatus === 'settled' ? 'Check again' : 'Try this price'}</span>
            <ArrowRightIcon />
          </button>
          <p aria-live="polite">{running ? config.gates[Math.max(0, Math.min(position, 2))]?.detail : config.instruction}</p>
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
