import { describe, expect, it } from 'vitest';
import { passageTrajectory } from '../../src/components/thread/passageTrajectory';

describe('the tunnel’s visual promise', () => {
  for (const scale of [.5, 1.14]) {
    it(`centers and clears the copy before entering, at scale ${scale}`, () => {
      const aligned = passageTrajectory(.18, scale);
      expect(aligned.centered).toBe(1);
      expect(aligned.copy).toBe(0);
      expect(aligned.camera).toBeGreaterThan(3.2 * scale);
      let previous = aligned.camera;
      for (let p = .18; p < .94; p += .01) {
        const frame = passageTrajectory(p, scale);
        expect(frame.field).toBe(false);
        expect(frame.centered).toBe(1);
        expect(frame.camera).toBeLessThanOrEqual(previous);
        previous = frame.camera;
      }
      // The exit fade starts after the viewer passes the main coils toward the light.
      expect(passageTrajectory(.86, scale).camera).toBeLessThan(-52.8 * scale);
      expect(passageTrajectory(.86, scale).visibility).toBe(1);
    });
  }

  it('changes camera space only in darkness and retraces identical positions on reverse scroll', () => {
    expect(passageTrajectory(.93999, 1).visibility).toBe(0);
    expect(passageTrajectory(.94, 1).visibility).toBe(0);
    expect(passageTrajectory(1, 1).field).toBe(true);
    expect(passageTrajectory(1, 1).visibility).toBe(1);
    const stops = [0, .18, .42, .7, .86, .94, 1];
    const forward = stops.map(p => passageTrajectory(p, 1));
    expect([...stops].reverse().map(p => passageTrajectory(p, 1)).reverse()).toEqual(forward);
  });
});
