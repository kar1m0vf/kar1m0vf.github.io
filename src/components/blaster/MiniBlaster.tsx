import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
} from 'react';
import { useReducedMotion } from 'motion/react';
import type {
  FocusEvent as ReactFocusEvent,
  KeyboardEvent as ReactKeyboardEvent,
  PointerEvent as ReactPointerEvent,
} from 'react';
import { useSound } from '../../audio/SoundProvider';
import { controlOverlayEvent, isControlOverlayOpen } from '../../utils/controlOverlay';
import { PauseIcon, PlayIcon, RestartIcon, SteerIcon } from '../Icons';
import { loadMiniBlasterAssets } from './assets';
import {
  createGameState,
  createInputState,
  getHudSnapshot,
  resetInputState,
  stepGame,
} from './engine';
import { renderGame } from './renderer';
import {
  MINI_BLASTER_MAX_HULL,
} from './types';
import type {
  GamePhase,
  GameViewport,
  MiniBlasterAssets,
} from './types';
import './MiniBlaster.css';

export interface MiniBlasterProps {
  inboundSignal?: string | null;
}

const fixedStepMs = 1_000 / 60;
const hudIntervalMs = 100;
const movementKeys = new Set(['arrowleft', 'arrowright', 'arrowup', 'arrowdown', 'a', 'd', 's', 'w']);

const formatScore = (score: number) => String(score).padStart(5, '0');
const formatTime = (milliseconds: number) => `${(milliseconds / 1_000).toFixed(1)}s`;

export default function MiniBlaster({ inboundSignal = null }: MiniBlasterProps) {
  const { playSound } = useSound();
  const reducedEffects = Boolean(useReducedMotion());
  const headingId = useId();
  const instructionsId = useId();
  const rootRef = useRef<HTMLElement | null>(null);
  const arenaRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const assetsRef = useRef<MiniBlasterAssets | null>(null);
  const gameRef = useRef(createGameState());
  const inputRef = useRef(createInputState());
  const viewportRef = useRef<GameViewport>({ dpr: 1, height: 0, width: 0 });
  const frameCallbackRef = useRef<(time: number) => void>(() => undefined);
  const frameRequestRef = useRef<number | null>(null);
  const lastFrameAtRef = useRef(0);
  const accumulatorRef = useRef(0);
  const lastHudAtRef = useRef(0);
  const phaseRef = useRef<GamePhase>('ready');
  const reducedEffectsRef = useRef(reducedEffects);
  const isInViewRef = useRef(true);
  const loadControllerRef = useRef<AbortController | null>(null);
  const activePointerRef = useRef<number | null>(null);
  const pressedKeysRef = useRef(new Set<string>());
  const lastHullRef = useRef(MINI_BLASTER_MAX_HULL);
  const [bestScore, setBestScore] = useState(() => {
    try {
      const saved = Number(localStorage.getItem('portfolio:blaster-best:v1'));
      return Number.isSafeInteger(saved) && saved > 0 ? saved : 0;
    } catch { return 0; }
  });
  const bestScoreRef = useRef(bestScore);
  const [phase, setPhase] = useState<GamePhase>('ready');
  const [hud, setHud] = useState(() => getHudSnapshot(gameRef.current));
  const [announcement, setAnnouncement] = useState('Mini Blaster ready.');
  const [loadError, setLoadError] = useState('');
  reducedEffectsRef.current = reducedEffects;

  const setGamePhase = useCallback((nextPhase: GamePhase) => {
    phaseRef.current = nextPhase;
    setPhase(nextPhase);
  }, []);

  const stopLoop = useCallback(() => {
    if (frameRequestRef.current !== null) {
      window.cancelAnimationFrame(frameRequestRef.current);
      frameRequestRef.current = null;
    }
    lastFrameAtRef.current = 0;
    accumulatorRef.current = 0;
  }, []);

  const clearInput = useCallback(() => {
    pressedKeysRef.current.clear();
    activePointerRef.current = null;
    resetInputState(inputRef.current);
  }, []);

  frameCallbackRef.current = (time: number) => {
    frameRequestRef.current = null;
    if (phaseRef.current !== 'running') return;

    const canvas = canvasRef.current;
    const assets = assetsRef.current;
    if (!canvas || !assets) return;

    const previousTime = lastFrameAtRef.current || time;
    const deltaMs = Math.min(50, Math.max(0, time - previousTime));
    lastFrameAtRef.current = time;
    accumulatorRef.current += deltaMs;

    let result = gameRef.current.result;
    let steps = 0;
    while (accumulatorRef.current >= fixedStepMs && steps < 4 && !result) {
      result = stepGame(gameRef.current, inputRef.current, fixedStepMs);
      accumulatorRef.current -= fixedStepMs;
      steps += 1;
    }

    renderGame(canvas, viewportRef.current, gameRef.current, assets, {
      reducedEffects: reducedEffectsRef.current,
    });

    if (time - lastHudAtRef.current >= hudIntervalMs || result) {
      lastHudAtRef.current = time;
      const nextHud = getHudSnapshot(gameRef.current);
      if (nextHud.hull < lastHullRef.current) playSound('hit');
      lastHullRef.current = nextHud.hull;
      setHud(nextHud);
    }

    if (result) {
      if (gameRef.current.score > bestScoreRef.current) {
        bestScoreRef.current = gameRef.current.score;
        setBestScore(gameRef.current.score);
        try { localStorage.setItem('portfolio:blaster-best:v1', String(gameRef.current.score)); } catch { /* Keep the best score for this visit. */ }
      }
      clearInput();
      setGamePhase(result);
      playSound(result === 'complete' ? 'complete' : 'hit');
      setAnnouncement(
        result === 'complete'
          ? `Micro run complete. Score ${gameRef.current.score}.`
          : `Ship lost. Score ${gameRef.current.score}.`,
      );
      return;
    }

    frameRequestRef.current = window.requestAnimationFrame(frameCallbackRef.current);
  };

  const beginLoop = useCallback(() => {
    stopLoop();
    lastHudAtRef.current = 0;
    frameRequestRef.current = window.requestAnimationFrame(frameCallbackRef.current);
  }, [stopLoop]);

  const launchRun = useCallback(() => {
    if (!assetsRef.current) return;
    clearInput();
    gameRef.current = createGameState();
    lastHullRef.current = MINI_BLASTER_MAX_HULL;
    setHud(getHudSnapshot(gameRef.current));
    setLoadError('');
    const shouldHold = document.hidden || !isInViewRef.current;
    setGamePhase(shouldHold ? 'paused' : 'running');
    setAnnouncement(
      shouldHold
        ? 'Micro run loaded and paused outside the active view.'
        : 'Micro run launched. Auto-fire enabled.',
    );

    const canvas = canvasRef.current;
    const assets = assetsRef.current;
    if (canvas && assets) {
      renderGame(canvas, viewportRef.current, gameRef.current, assets, {
        reducedEffects: reducedEffectsRef.current,
      });
    }

    if (!shouldHold) {
      playSound('launch');
      beginLoop();
      window.requestAnimationFrame(() => arenaRef.current?.focus({ preventScroll: true }));
    }
  }, [beginLoop, clearInput, playSound, setGamePhase]);

  const startRun = useCallback(async () => {
    if (phaseRef.current === 'loading') return;
    if (assetsRef.current) {
      launchRun();
      return;
    }
    playSound('select');

    loadControllerRef.current?.abort();
    const controller = new AbortController();
    loadControllerRef.current = controller;
    setLoadError('');
    setGamePhase('loading');
    setAnnouncement('Loading the micro run.');

    try {
      const assets = await loadMiniBlasterAssets(controller.signal);
      if (controller.signal.aborted) return;
      assetsRef.current = assets;
      loadControllerRef.current = null;
      launchRun();
    } catch (error) {
      if (controller.signal.aborted) return;
      loadControllerRef.current = null;
      setLoadError(error instanceof Error ? error.message : 'The game assets could not be loaded.');
      setGamePhase('error');
      setAnnouncement('The micro run could not be loaded.');
    }
  }, [launchRun, playSound, setGamePhase]);

  const pauseRun = useCallback((message = 'Micro run paused.') => {
    if (phaseRef.current !== 'running') return;
    stopLoop();
    clearInput();
    setGamePhase('paused');
    setAnnouncement(message);
  }, [clearInput, setGamePhase, stopLoop]);

  const resumeRun = useCallback(() => {
    if (phaseRef.current !== 'paused' || !assetsRef.current) return;
    clearInput();
    setGamePhase('running');
    playSound('select');
    setAnnouncement('Micro run resumed.');
    beginLoop();
    arenaRef.current?.focus({ preventScroll: true });
  }, [beginLoop, clearInput, playSound, setGamePhase]);

  const restartRun = useCallback(() => {
    if (phaseRef.current === 'loading') return;
    if (assetsRef.current) launchRun();
    else void startRun();
  }, [launchRun, startRun]);

  const togglePause = useCallback(() => {
    if (phaseRef.current === 'running') {
      playSound('pause');
      pauseRun();
    }
    else if (phaseRef.current === 'paused') resumeRun();
  }, [pauseRun, playSound, resumeRun]);

  useEffect(() => {
    const pauseForControls = () => {
      if (isControlOverlayOpen()) pauseRun('Micro run paused while K Control is open.');
    };
    pauseForControls();
    window.addEventListener(controlOverlayEvent, pauseForControls);
    return () => window.removeEventListener(controlOverlayEvent, pauseForControls);
  }, [pauseRun, phase]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resizeCanvas = () => {
      const bounds = canvas.getBoundingClientRect();
      if (!bounds.width || !bounds.height) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const pixelWidth = Math.max(1, Math.round(bounds.width * dpr));
      const pixelHeight = Math.max(1, Math.round(bounds.height * dpr));
      if (canvas.width !== pixelWidth) canvas.width = pixelWidth;
      if (canvas.height !== pixelHeight) canvas.height = pixelHeight;
      viewportRef.current = { dpr, height: bounds.height, width: bounds.width };

      const assets = assetsRef.current;
      if (assets) {
        renderGame(canvas, viewportRef.current, gameRef.current, assets, {
          reducedEffects: reducedEffectsRef.current,
        });
      }
    };

    const observer = new ResizeObserver(resizeCanvas);
    observer.observe(canvas);
    resizeCanvas();
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const pauseForVisibility = () => {
      if (document.hidden) pauseRun('Micro run paused while this page was hidden.');
    };
    const pauseForBlur = () => pauseRun('Micro run paused when the window lost focus.');
    document.addEventListener('visibilitychange', pauseForVisibility);
    window.addEventListener('blur', pauseForBlur);
    return () => {
      document.removeEventListener('visibilitychange', pauseForVisibility);
      window.removeEventListener('blur', pauseForBlur);
    };
  }, [pauseRun]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry) return;
      isInViewRef.current = entry.isIntersecting && entry.intersectionRatio >= 0.14;
      if (!isInViewRef.current) {
        pauseRun('Micro run paused outside the viewport.');
      }
    }, { threshold: [0, 0.14, 0.4] });
    observer.observe(root);
    return () => observer.disconnect();
  }, [pauseRun]);

  useEffect(() => () => {
    stopLoop();
    loadControllerRef.current?.abort();
    clearInput();
  }, [clearInput, stopLoop]);

  const setPointerTarget = (event: ReactPointerEvent<HTMLDivElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    if (!bounds.width || !bounds.height) return;
    inputRef.current.targetX = Math.min(1, Math.max(0, (event.clientX - bounds.left) / bounds.width));
    inputRef.current.targetY = Math.min(1, Math.max(0, (event.clientY - bounds.top) / bounds.height));
  };

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (phaseRef.current !== 'running') return;
    if (event.target instanceof Element && event.target.closest('button')) return;
    activePointerRef.current = event.pointerId;
    inputRef.current.pointerActive = true;
    setPointerTarget(event);
    event.currentTarget.setPointerCapture(event.pointerId);
    event.currentTarget.focus({ preventScroll: true });
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (phaseRef.current !== 'running' || activePointerRef.current !== event.pointerId) return;
    setPointerTarget(event);
  };

  const releasePointer = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (activePointerRef.current !== event.pointerId) return;
    activePointerRef.current = null;
    inputRef.current.pointerActive = false;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const updateKeyboardInput = () => {
    const keys = pressedKeysRef.current;
    inputRef.current.left = keys.has('arrowleft') || keys.has('a');
    inputRef.current.right = keys.has('arrowright') || keys.has('d');
    inputRef.current.up = keys.has('arrowup') || keys.has('w');
    inputRef.current.down = keys.has('arrowdown') || keys.has('s');
    inputRef.current.pointerActive = false;
  };

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    const key = event.key.toLowerCase();
    if ((key === 'p' || key === 'escape') && !event.repeat) {
      event.preventDefault();
      togglePause();
      return;
    }
    if (key === 'r' && !event.repeat) {
      event.preventDefault();
      restartRun();
      return;
    }
    if (phaseRef.current !== 'running' || !movementKeys.has(key)) return;
    event.preventDefault();
    pressedKeysRef.current.add(key);
    updateKeyboardInput();
  };

  const handleKeyUp = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    const key = event.key.toLowerCase();
    if (!movementKeys.has(key)) return;
    event.preventDefault();
    pressedKeysRef.current.delete(key);
    updateKeyboardInput();
  };

  const handleArenaBlur = (event: ReactFocusEvent<HTMLDivElement>) => {
    if (event.relatedTarget instanceof Node && event.currentTarget.contains(event.relatedTarget)) return;
    pressedKeysRef.current.clear();
    updateKeyboardInput();
  };

  const showInbound = Boolean(inboundSignal && (phase === 'ready' || phase === 'loading'));
  const primaryLabel = phase === 'running'
    ? 'Pause'
    : phase === 'paused'
      ? 'Resume'
      : phase === 'loading'
        ? 'Loading'
        : phase === 'ready'
          ? 'Play 15-second run'
          : 'Run again';

  const handlePrimaryAction = () => {
    if (phase === 'running') pauseRun();
    else if (phase === 'paused') resumeRun();
    else if (phase !== 'loading') void startRun();
  };

  return (
    <section
      aria-labelledby={headingId}
      className="mini-blaster"
      data-phase={phase}
      data-reduced-effects={reducedEffects || undefined}
      ref={rootRef}
    >
      <header className="mini-blaster__heading">
        <div>
          <span>Play right here</span>
          <h3 id={headingId}>Blaster <i>/</i> Micro run</h3>
        </div>
      </header>

      {showInbound ? (
        <p className="mini-blaster__inbound">
          <span>Your last price check</span>
          <strong>{inboundSignal}</strong>
        </p>
      ) : null}

      <div aria-label="Micro run status" className="mini-blaster__hud">
        <div className="mini-blaster__metric">
          <span>Score</span>
          <strong>{formatScore(hud.score)}</strong>
        </div>
        <div className="mini-blaster__metric mini-blaster__metric--best"><span>Best</span><strong>{formatScore(bestScore)}</strong></div>
        <div className="mini-blaster__metric mini-blaster__metric--hull">
          <span>Hull</span>
          <strong aria-label={`${hud.hull} of ${MINI_BLASTER_MAX_HULL} hull points`}>{hud.hull}</strong>
          <i aria-hidden="true" className="mini-blaster__lives">
            {Array.from({ length: MINI_BLASTER_MAX_HULL }, (_, index) => (
              <b className={index < hud.hull ? 'is-live' : ''} key={index} />
            ))}
          </i>
        </div>
        <div className="mini-blaster__metric mini-blaster__metric--timer">
          <span>Time</span>
          <strong>{formatTime(hud.timeLeftMs)}</strong>
        </div>
        <button
          aria-label={phase === 'paused' ? 'Resume Mini Blaster' : 'Pause Mini Blaster'}
          className="mini-blaster__pause"
          disabled={phase !== 'running' && phase !== 'paused'}
          onClick={togglePause}
          type="button"
        >
          {phase === 'paused' ? <PlayIcon /> : <PauseIcon />}
        </button>
      </div>

      <div
        aria-describedby={instructionsId}
        aria-label="Mini Blaster play area"
        className="mini-blaster__arena"
        onBlur={handleArenaBlur}
        onKeyDown={handleKeyDown}
        onKeyUp={handleKeyUp}
        onPointerCancel={releasePointer}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={releasePointer}
        ref={arenaRef}
        role="group"
        tabIndex={0}
      >
        <canvas aria-hidden="true" className="mini-blaster__canvas" ref={canvasRef} />
        {phase === 'ready' ? <div aria-hidden="true" className="mini-blaster__attract"><div /><svg fill="none" viewBox="0 0 1000 500" preserveAspectRatio="none"><path d="M-40 -30C60 210 200 80 420 210C520 270 560 220 500 260" /></svg><img alt="" src="/media/blaster/mini/player.webp" /></div> : null}
        <span aria-hidden="true" className="mini-blaster__scanlines" />
        <span aria-hidden="true" className="mini-blaster__wave">{hud.wave}</span>

        {phase !== 'running' ? (
          <div className="mini-blaster__overlay">
            {phase === 'ready' ? (
              <>
                <span>15 seconds. Your best shot.</span>
                <strong>Ready when you are.</strong>
                <p>Drag or use WASD. Your weapon fires automatically.</p>
                <button onClick={() => void startRun()} type="button">Play 15 seconds</button>
              </>
            ) : null}
            {phase === 'loading' ? (
              <>
                <span className="mini-blaster__loading" />
                <strong>Loading the game</strong>
                <p>Getting the ship ready.</p>
              </>
            ) : null}
            {phase === 'paused' ? (
              <>
                <span>Take your time</span>
                <strong>Paused.</strong>
                <p>Your position and score are preserved.</p>
                <button onClick={resumeRun} type="button">Resume</button>
              </>
            ) : null}
            {phase === 'complete' ? (
              <>
                <span>Run complete</span>
                <strong>{formatScore(hud.score)} points.</strong>
                <p>Nicely done. Think you can beat that?</p>
                <button onClick={restartRun} type="button">Run again</button>
              </>
            ) : null}
            {phase === 'failed' ? (
              <>
                <span>Signal lost</span>
                <strong>Ship down.</strong>
                <p>One more try?</p>
                <button onClick={restartRun} type="button">Retry</button>
              </>
            ) : null}
            {phase === 'error' ? (
              <>
                <span>Couldn’t load the game</span>
                <strong>Let’s try that again.</strong>
                <p>{loadError}</p>
                <button onClick={() => void startRun()} type="button">Try again</button>
              </>
            ) : null}
          </div>
        ) : null}
      </div>

      <p className="mini-blaster__instructions" id={instructionsId}>
        <SteerIcon />
        Drag to steer <i>·</i> WASD or arrows <i>·</i> Auto-fire enabled
      </p>

      <div className="mini-blaster__controls">
        <button disabled={phase === 'loading'} onClick={handlePrimaryAction} type="button">
          {phase === 'running' ? <PauseIcon /> : <PlayIcon />}
          {primaryLabel}
        </button>
        <button disabled={phase === 'loading' || phase === 'ready'} onClick={restartRun} type="button">
          <RestartIcon />
          Restart
        </button>
      </div>

      <footer className="mini-blaster__footer">
        <span>A short browser game inspired by my original Blaster.</span>
        {reducedEffects ? <strong>Reduced visual effects</strong> : null}
      </footer>

      <p aria-live="polite" className="mini-blaster__sr" role="status">{announcement}</p>
    </section>
  );
}
