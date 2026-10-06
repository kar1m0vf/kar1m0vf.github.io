import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SceneBufferResize } from '../../src/components/thread/SceneBufferResize';

describe('scene buffers during mobile viewport changes', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('prepares the first buffer immediately and applies it only inside the owner’s frame', () => {
    const wake = vi.fn();
    const apply = vi.fn();
    const resize = new SceneBufferResize(wake);
    resize.request(390, 700);
    expect(wake).toHaveBeenCalledOnce();
    expect(apply).not.toHaveBeenCalled();
    expect(resize.flush(apply)).toBe(true);
    expect(apply).toHaveBeenCalledOnce();
    expect(apply).toHaveBeenCalledWith(390, 700);
    expect(resize.flush(apply)).toBe(false);
  });

  it('keeps the previous buffer through ten animated height changes and applies only the settled size', () => {
    const wake = vi.fn();
    const apply = vi.fn();
    const resize = new SceneBufferResize(wake);
    resize.request(390, 700);
    resize.flush(apply);
    wake.mockClear();
    apply.mockClear();

    for (let index = 1; index <= 10; index += 1) {
      resize.request(390, 700 + index * 10);
      expect(resize.flush(apply)).toBe(false);
      if (index < 10) vi.advanceTimersByTime(10);
    }
    vi.advanceTimersByTime(119);
    expect(wake).not.toHaveBeenCalled();
    expect(resize.flush(apply)).toBe(false);
    vi.advanceTimersByTime(1);
    expect(wake).toHaveBeenCalledOnce();
    expect(apply).not.toHaveBeenCalled();
    expect(resize.flush(apply)).toBe(true);
    expect(apply).toHaveBeenCalledOnce();
    expect(apply).toHaveBeenCalledWith(390, 800);
    expect(resize.flush(apply)).toBe(false);
  });

  it('lets a rotation replace a pending toolbar height change immediately', () => {
    const wake = vi.fn();
    const apply = vi.fn();
    const resize = new SceneBufferResize(wake);
    resize.request(390, 700);
    resize.flush(apply);
    wake.mockClear();
    apply.mockClear();
    resize.request(390, 760);
    vi.advanceTimersByTime(60);
    resize.request(844, 390);
    expect(wake).toHaveBeenCalledOnce();
    expect(resize.flush(apply)).toBe(true);
    expect(apply).toHaveBeenCalledOnce();
    expect(apply).toHaveBeenCalledWith(844, 390);
    vi.advanceTimersByTime(1000);
    expect(wake).toHaveBeenCalledOnce();
    expect(resize.flush(apply)).toBe(false);
  });

  it('cancels the resize when the viewport returns to the existing buffer size', () => {
    const wake = vi.fn();
    const apply = vi.fn();
    const resize = new SceneBufferResize(wake);
    resize.request(390, 700);
    resize.flush(apply);
    wake.mockClear();
    apply.mockClear();
    resize.request(390, 760);
    vi.advanceTimersByTime(100);
    resize.request(390, 700);
    vi.advanceTimersByTime(1000);
    expect(wake).not.toHaveBeenCalled();
    expect(resize.flush(apply)).toBe(false);
    expect(apply).not.toHaveBeenCalled();
  });

  it('ignores invalid measurements without replacing a valid pending resize', () => {
    const wake = vi.fn();
    const apply = vi.fn();
    const resize = new SceneBufferResize(wake);
    resize.request(390, 700);
    resize.flush(apply);
    wake.mockClear();
    apply.mockClear();
    resize.request(390, 760);
    vi.advanceTimersByTime(60);
    for (const [width, height] of [[0, 760], [390, 0], [-1, 760], [390, Number.NaN], [Number.POSITIVE_INFINITY, 760]] as const) {
      resize.request(width, height);
    }
    vi.advanceTimersByTime(59);
    expect(wake).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(wake).toHaveBeenCalledOnce();
    expect(resize.flush(apply)).toBe(true);
    expect(apply).toHaveBeenCalledOnce();
    expect(apply).toHaveBeenCalledWith(390, 760);
  });

  it('cancels the outstanding timer and refuses further work after disposal', () => {
    const wake = vi.fn();
    const apply = vi.fn();
    const resize = new SceneBufferResize(wake);
    resize.request(390, 700);
    resize.flush(apply);
    wake.mockClear();
    apply.mockClear();
    resize.request(390, 760);
    resize.dispose();
    vi.advanceTimersByTime(1000);
    resize.request(844, 390);
    expect(wake).not.toHaveBeenCalled();
    expect(resize.flush(apply)).toBe(false);
    expect(apply).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });
});
