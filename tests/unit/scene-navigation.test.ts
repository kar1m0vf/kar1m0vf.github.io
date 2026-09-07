import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SceneNavigation } from '../../src/components/SceneNavigation';
import { focusScene, sceneNavigationEvent } from '../../src/utils/sceneNavigation';

const hooks = vi.hoisted(() => ({
  veil: null as unknown,
  effect: null as null | (() => () => void),
}));

vi.mock('react', async (importOriginal) => ({
  ...await importOriginal<typeof import('react')>(),
  useRef: () => ({ current: hooks.veil }),
  useEffect: (effect: () => () => void) => { hooks.effect = effect; },
}));

vi.mock('../../src/utils/sceneNavigation', async (importOriginal) => ({
  ...await importOriginal<typeof import('../../src/utils/sceneNavigation')>(),
  focusScene: vi.fn(),
}));

describe('chapter transition continuity', () => {
  let cleanup: (() => void) | undefined;
  let veil: { hidden: boolean; style: { opacity: string }; animate: ReturnType<typeof vi.fn> };
  let site: { inert: boolean; setAttribute: ReturnType<typeof vi.fn> };
  let jumps: Array<{ top: number; opacity: string; hidden: boolean }>;

  beforeEach(() => {
    vi.useFakeTimers();
    jumps = [];
    veil = {
      hidden: true,
      style: { opacity: '0' },
      animate: vi.fn((_frames: Keyframe[], options: KeyframeAnimationOptions) => {
        let timer: ReturnType<typeof setTimeout>;
        const finished = new Promise<void>((resolve) => {
          timer = setTimeout(resolve, Number(options.duration));
        });
        return { finished, cancel: () => clearTimeout(timer) };
      }),
    };
    site = { inert: false, setAttribute: vi.fn() };
    const browser = Object.assign(new EventTarget(), {
      scrollY: 0,
      history: { scrollRestoration: 'auto' },
      setTimeout,
      clearTimeout,
      requestAnimationFrame: (callback: FrameRequestCallback) => setTimeout(() => callback(0), 16),
      cancelAnimationFrame: clearTimeout,
      scrollTo: ({ top }: { top: number }) => {
        jumps.push({ top, opacity: veil.style.opacity, hidden: veil.hidden });
        browser.scrollY = top;
      },
    });
    vi.stubGlobal('window', browser);
    vi.stubGlobal('innerHeight', 800);
    vi.stubGlobal('matchMedia', () => ({ matches: false }));
    vi.stubGlobal('document', Object.assign(new EventTarget(), {
      documentElement: { dataset: {}, scrollHeight: 10_000 },
      querySelector: () => site,
    }));
    hooks.veil = veil;
    SceneNavigation();
    cleanup = hooks.effect?.();
  });

  afterEach(() => {
    cleanup?.();
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  const request = (top = 1200) => window.dispatchEvent(new CustomEvent(sceneNavigationEvent, {
    cancelable: true,
    detail: { top, history: 'none', element: {} },
  }));

  it('hides the jump, then uses matching fades without waiting for a WebGL readiness event', async () => {
    request();
    const coverOptions = veil.animate.mock.calls[0]![1] as KeyframeAnimationOptions;
    await vi.advanceTimersByTimeAsync(Number(coverOptions.duration) - 1);
    expect(jumps).toHaveLength(0);
    await vi.advanceTimersByTimeAsync(1);
    expect(jumps).toEqual([{ top: 1200, opacity: '1', hidden: false }]);

    await vi.advanceTimersByTimeAsync(32);
    expect(veil.animate).toHaveBeenCalledTimes(2);
    expect(veil.animate.mock.calls[1]![1]).toEqual(coverOptions);
    expect(veil.animate.mock.calls[1]![0]).toEqual([{ opacity: 1 }, { opacity: 0 }]);

    await vi.advanceTimersByTimeAsync(Number(coverOptions.duration));
    expect(veil.hidden).toBe(true);
    expect(veil.style.opacity).toBe('0');
    expect(site.inert).toBe(false);
    expect(document.documentElement.dataset.sceneTransition).toBeUndefined();
    expect(focusScene).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('releases navigation even when the browser never delivers a paint frame', async () => {
    window.requestAnimationFrame = vi.fn(() => 0);
    request();
    await vi.advanceTimersByTimeAsync(1000);
    expect(jumps).toHaveLength(1);
    expect(veil.animate).toHaveBeenCalledTimes(2);
    expect(veil.hidden).toBe(true);
    expect(site.inert).toBe(false);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('uses the latest destination requested during the cover without another fade cycle', async () => {
    request(1200);
    await vi.advanceTimersByTimeAsync(100);
    request(2400);
    await vi.advanceTimersByTimeAsync(900);
    expect(jumps.map(({ top }) => top)).toEqual([2400]);
    expect(veil.animate).toHaveBeenCalledTimes(2);
    expect(site.inert).toBe(false);
  });

  it('does not add animation or waiting for reduced motion', () => {
    vi.stubGlobal('matchMedia', () => ({ matches: true }));
    request();
    expect(jumps).toHaveLength(1);
    expect(veil.animate).not.toHaveBeenCalled();
    expect(site.inert).toBe(false);
    expect(vi.getTimerCount()).toBe(0);
  });
});
