import { describe, expect, it } from 'vitest';
import { advancePassage, passageTrajectory } from '../../src/components/thread/passageTrajectory';

describe('the tunnel’s visual promise', () => {
  for (const scale of [.5, 1.14]) {
    it(`centers and clears the copy before entering, at scale ${scale}`, () => {
      const aligned = passageTrajectory(.18, scale);
      expect(aligned.centered).toBe(1);
      expect(aligned.copy).toBe(0);
      expect(aligned.camera).toBeGreaterThan(3.2 * scale);
      let previous = aligned.camera;
      for (let p = .18; p < .78; p += .01) {
        const frame = passageTrajectory(p, scale);
        expect(frame.field).toBe(false);
        expect(frame.centered).toBe(1);
        expect(frame.camera).toBeLessThanOrEqual(previous);
        previous = frame.camera;
      }
      // The exit fade starts after the viewer passes the main coils toward the light.
      expect(passageTrajectory(.68, scale).camera).toBeLessThan(-52.8 * scale);
      expect(passageTrajectory(.68, scale).visibility).toBe(1);
    });
  }

  it('changes camera space only in darkness and retraces identical positions on reverse scroll', () => {
    expect(passageTrajectory(.77999, 1).visibility).toBe(0);
    expect(passageTrajectory(.78, 1).visibility).toBe(0);
    expect(passageTrajectory(1, 1).field).toBe(true);
    expect(passageTrajectory(1, 1).visibility).toBe(1);
    const stops = [0, .18, .42, .68, .76, .78, .89, 1];
    const forward = stops.map(p => passageTrajectory(p, 1));
    expect([...stops].reverse().map(p => passageTrajectory(p, 1)).reverse()).toEqual(forward);
  });

  it('gives the project a broad, lit reveal instead of a last-moment cut', () => {
    expect(passageTrajectory(.78, 1).light).toBe(1);
    expect(passageTrajectory(.89, 1).visibility).toBeCloseTo(.5);
    expect(passageTrajectory(.89, 1).reveal).toBeGreaterThan(.4);
    expect(passageTrajectory(.89, 1).reveal).toBeLessThan(.5);
    expect(passageTrajectory(1, 1).light).toBe(0);
    expect(passageTrajectory(1, 1).reveal).toBe(1);
  });

  it('smooths large native wheel steps in both directions without depending on refresh rate', () => {
    const firstFrame = advancePassage(.7, 1, 1 / 60);
    expect(firstFrame).toBeGreaterThan(.7);
    expect(firstFrame).toBeLessThan(.78);
    expect(advancePassage(.95, .7, 1 / 60)).toBeGreaterThan(.9);
    const atRate = (hz: number) => {
      let progress = .7;
      for (let i = 0; i < hz / 2; i += 1) progress = advancePassage(progress, 1, 1 / hz);
      return progress;
    };
    expect(atRate(30)).toBeCloseTo(atRate(120), 10);
    expect(atRate(60)).toBeGreaterThan(.99);
  });
});
