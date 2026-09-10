import { describe, expect, it } from 'vitest';
import { Vector3 } from 'three';
import { RoundThread, THREAD_RADIUS } from '../../src/components/thread/RoundThread';
import { createMiddleCurves } from '../../src/components/thread/createMiddleScene';
import { ThreadCurve } from '../../src/components/thread/createThreadScene';
import { TunnelCurve } from '../../src/components/thread/TunnelCurve';

describe('round glass through a morph', () => {
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
