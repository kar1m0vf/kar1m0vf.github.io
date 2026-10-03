import { describe, expect, it } from 'vitest';
import { sampleSceneTheme, type ThemeBoundary } from '../../src/data/sceneThemes';

const boundaries: ThemeBoundary[] = [
  { at: 1000, theme: 'nar' }, { at: 3000, theme: 'blue' },
  { at: 5000, theme: 'trendyol' }, { at: 7000, theme: 'blaster' }, { at: 9000, theme: 'blue' },
];

describe('project light transitions', () => {
  it('keeps the introduction, neutral passage, and journey blue', () => {
    for (const position of [0, 4000, 10000]) {
      expect(sampleSceneTheme(position, boundaries, 400)).toMatchObject({ from: 'blue', to: 'blue' });
    }
  });
  it('holds each project hue away from its edges', () => {
    expect(sampleSceneTheme(2000, boundaries, 400)).toMatchObject({ from: 'nar', to: 'nar' });
    expect(sampleSceneTheme(6000, boundaries, 400)).toMatchObject({ from: 'trendyol', to: 'trendyol' });
    expect(sampleSceneTheme(8000, boundaries, 400)).toMatchObject({ from: 'blaster', to: 'blaster' });
  });
  it('blends adjacent projects directly and continuously in both scroll directions', () => {
    const before = sampleSceneTheme(6999, boundaries, 400);
    const after = sampleSceneTheme(7001, boundaries, 400);
    expect(before).toMatchObject({ from: 'trendyol', to: 'blaster' });
    expect(after.progress - before.progress).toBeLessThan(.01);
    expect(before.progress).toBeLessThan(.5);
    expect(after.progress).toBeGreaterThan(.5);
  });
  it('narrows transitions around short sections without overlapping hue bands', () => {
    const short: ThemeBoundary[] = [{ at: 1000, theme: 'nar' }, { at: 1200, theme: 'blue' }];
    expect(sampleSceneTheme(1050, short, 500).to).toBe('nar');
    expect(sampleSceneTheme(1150, short, 500).to).toBe('blue');
    expect(sampleSceneTheme(1100, short, 500).progress).toBe(1);
    expect(sampleSceneTheme(0, [], 500).from).toBe('blue');
  });
});
