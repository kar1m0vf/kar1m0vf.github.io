import { afterEach, describe, expect, it, vi } from 'vitest';
import { SceneLayout } from '../../src/components/thread/SceneLayout';

afterEach(() => vi.unstubAllGlobals());

describe('cached scene anchors', () => {
  it('tracks sticky limits while scrolling without reading layout again', () => {
    vi.stubGlobal('getComputedStyle', () => ({ position: 'sticky' }));
    const parentRect = vi.fn(() => ({ top: 1000, bottom: 2600 }));
    const stickyRect = vi.fn(() => ({ top: 1000, height: 800 }));
    const sticky = { parentElement: { getBoundingClientRect: parentRect }, getBoundingClientRect: stickyRect };
    const rect = vi.fn(() => ({ top: 1100, left: 500, width: 300, height: 400 }));
    const root = { querySelector: () => ({ getBoundingClientRect: rect, closest: () => sticky }) } as unknown as HTMLElement;
    const layout = new SceneLayout(root, ['.art']);
    layout.refresh(0);
    expect(layout.bounds('.art', 500)?.top).toBe(600);
    expect(layout.bounds('.art', 1300)?.top).toBe(100);
    expect(layout.bounds('.art', 2100)?.top).toBe(-200);
    layout.refresh(2100);
    expect(rect).toHaveBeenCalledTimes(1);
    expect(parentRect).toHaveBeenCalledTimes(1);
    expect(stickyRect).toHaveBeenCalledTimes(1);
  });

  it('refreshes document coordinates after a content resize', () => {
    const rect = vi.fn(() => ({ top: 700, left: 20, width: 500, height: 400 }));
    const root = { querySelector: () => ({ getBoundingClientRect: rect, closest: () => null }) } as unknown as HTMLElement;
    const layout = new SceneLayout(root, ['.art']);
    layout.refresh(300);
    expect(layout.bounds('.art', 600)?.top).toBe(400);
    rect.mockReturnValue({ top: 650, left: 20, width: 500, height: 600 });
    layout.dirty = true;
    layout.refresh(600);
    expect(layout.bounds('.art', 700)).toMatchObject({ top: 550, height: 600 });
    expect(layout.bounds('.missing', 700)).toBeUndefined();
  });
});
