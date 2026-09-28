import { describe, expect, it } from 'vitest';
import { Vector3 } from 'three';
import { RoundThread, THREAD_RADIUS } from '../../src/components/thread/RoundThread';
import { createMiddleCurves } from '../../src/components/thread/createMiddleScene';
import { ThreadCurve } from '../../src/components/thread/createThreadScene';
import { TunnelCurve } from '../../src/components/thread/TunnelCurve';

describe('round glass through a morph', () => {
  it('keeps the designed middle poses round without disc-like folds', () => {
    const paths = createMiddleCurves();
    const thread = new RoundThread(paths.map(path => ({ path, radius: THREAD_RADIUS, extension: 160,
      ...(path instanceof TunnelCurve ? { sample: (count: number) => path.sampleSpine(count) } : {}),
    })), 640);
    const a = new Vector3(), b = new Vector3(), c = new Vector3(), normal = new Vector3();
    // A morph can overlap itself internally while a loop opens. Forcing those
    // buried faces outward by moving the live spine caused the snapping bug.
    // Finished poses must be clean; moving poses are checked for motion and
    // constant cross-section below.
    for (const shape of [0, 1, 2, 3, 4, 5, 6]) {
      const weights = paths.map(() => 0);
      weights[Math.floor(shape)] = 1 - shape % 1;
      weights[Math.ceil(shape)] = (weights[Math.ceil(shape)] ?? 0) + shape % 1;
      thread.update(weights);
      const positions = thread.shell.getAttribute('position');
      const normals = thread.shell.getAttribute('normal');
      const indices = thread.shell.index!;
      let inverted = 0;
      for (let i = 20 * 6; i < indices.count - 20 * 6; i += 3) {
        a.fromBufferAttribute(positions, indices.getX(i));
        b.fromBufferAttribute(positions, indices.getX(i + 1)).sub(a);
        c.fromBufferAttribute(positions, indices.getX(i + 2)).sub(a);
        normal.fromBufferAttribute(normals, indices.getX(i));
        if (b.cross(c).normalize().dot(normal) < -.01) inverted += 1;
      }
      expect(inverted, `shape ${shape}`).toBe(0);
    }
    thread.shell.dispose(); thread.core.dispose();
  });

  it('does not spring or snap as morph weights cross the old bend-correction thresholds', () => {
    const paths = createMiddleCurves();
    const middle = new RoundThread(paths.map(path => ({ path, radius: THREAD_RADIUS, extension: 160,
      ...(path instanceof TunnelCurve ? { sample: (count: number) => path.sampleSpine(count) } : {}),
    })), 420);
    const hero = new RoundThread(['knot', 'aperture'].map(shape => ({
      path: new ThreadCurve(shape as 'knot' | 'aperture'), radius: THREAD_RADIUS, closed: true,
    })), 200);
    const a = Array.from({ length: 31 }, () => new Vector3());
    const b = a.map(() => new Vector3());
    const c = new Vector3();
    const expected = new Vector3();
    const cases = [[hero, 0, 2], [middle, 0, 7], [middle, 1, 7], [middle, 2, 7], [middle, 4, 7], [middle, 5, 7]] as const;
    for (const [thread, pose, count] of cases) {
      // These are the previously observed discontinuities, rather than a
      // performance benchmark or a screenshot comparison of still poses.
      for (const progress of [.16, .24, .37, .39, .4, .46, .58, .59, .72, .75]) {
        const update = (p: number) => {
          const weights = Array<number>(count).fill(0);
          weights[pose] = 1 - p; weights[pose + 1] = p;
          thread.update(weights);
        };
        update(progress - .001);
        a.forEach((point, i) => thread.getPointAt(i / 30, point));
        update(progress);
        b.forEach((point, i) => thread.getPointAt(i / 30, point));
        update(progress + .001);
        a.forEach((point, i) => {
          thread.getPointAt(i / 30, c);
          expected.copy(point).lerp(c, .5);
          expect(b[i]!.distanceTo(expected), `pose ${pose}, progress ${progress}, point ${i}`).toBeLessThan(1e-8);
        });
        // Reverse scrolling must reach the same geometry without any lag filter.
        update(progress);
        b.forEach((point, i) => expect(thread.getPointAt(i / 30, c).distanceTo(point)).toBeLessThan(1e-8));
      }
    }
    for (const thread of [middle, hero]) { thread.shell.dispose(); thread.core.dispose(); }
  });

  it('keeps circular, finite sections through every middle transition', () => {
    const paths = createMiddleCurves();
    const thread = new RoundThread(paths.map(path => ({ path, radius: THREAD_RADIUS, extension: 160,
      ...(path instanceof TunnelCurve ? { sample: (count: number) => path.sampleSpine(count) } : {}),
    })), 420);
    const center = new Vector3();
    const vertex = new Vector3();
    for (let pose = 0; pose < paths.length - 1; pose += 1) {
      for (const blend of [0, .25, .5, .75, 1]) {
        const weights = paths.map(() => 0); weights[pose] = 1 - blend; weights[pose + 1] = blend;
        thread.update(weights);
        const position = thread.shell.getAttribute('position');
        const normal = thread.shell.getAttribute('normal');
        for (let row = 1; row <= 421; row += 9) {
          center.set(0, 0, 0);
          for (let side = 0; side < 20; side += 1) center.add(vertex.fromBufferAttribute(position, row * 21 + side));
          center.divideScalar(20);
          for (let side = 0; side < 20; side += 1) {
            vertex.fromBufferAttribute(position, row * 21 + side);
            expect(vertex.distanceTo(center)).toBeCloseTo(THREAD_RADIUS, 4);
            expect(vertex.fromBufferAttribute(normal, row * 21 + side).length()).toBeCloseTo(1, 5);
          }
        }
      }
    }
    expect(thread.shell.index!.count + thread.core.index!.count).toBe((420 + 2) * 24 * 6);
    expect(Object.keys(thread.shell.morphAttributes)).toHaveLength(0);
    thread.shell.dispose(); thread.core.dispose();
  });

  it('closes Hero seams and leaves idle geometry buffers untouched', () => {
    const thread = new RoundThread(['knot', 'aperture'].map(shape => ({
      path: new ThreadCurve(shape as 'knot' | 'aperture'), radius: THREAD_RADIUS, closed: true,
    })), 200);
    for (const blend of [0, .5, 1]) {
      thread.update([1 - blend, blend]);
      const position = thread.shell.getAttribute('position');
      const a = new Vector3(), b = new Vector3();
      for (let side = 0; side <= 20; side += 1) {
        a.fromBufferAttribute(position, 21 + side); b.fromBufferAttribute(position, 201 * 21 + side);
        expect(a.distanceTo(b)).toBeLessThan(.0001);
      }
      const version = position.version;
      expect(thread.update([1 - blend, blend])).toBe(false);
      expect(position.version).toBe(version);
    }
    thread.shell.dispose(); thread.core.dispose();
  });
});
