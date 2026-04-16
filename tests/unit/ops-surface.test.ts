import {
  clamp,
  getMaxEventRows,
  getNextStepIndex,
  getSeedRowsCount,
  getUpdateIntervalMs,
  shouldFreezeAutoRotation,
} from '../../src/ts/core/ops-surface';

describe('ops-surface utilities', () => {
  it('clamp keeps value in range', () => {
    expect(clamp(120, 0, 100)).toBe(100);
    expect(clamp(-2, 0, 100)).toBe(0);
    expect(clamp(42, 0, 100)).toBe(42);
  });

  it('rotates next step index in a cycle', () => {
    expect(getNextStepIndex(0, 4)).toBe(1);
    expect(getNextStepIndex(3, 4)).toBe(0);
  });

  it('throws when stepCount is invalid', () => {
    expect(() => getNextStepIndex(0, 0)).toThrow('stepCount must be greater than 0');
  });

  it('respects hover and touch lock freeze conditions', () => {
    expect(
      shouldFreezeAutoRotation({
        manualStepFreezeOnHover: true,
        surfaceHovering: true,
        manualStepLockUntil: 0,
      })
    ).toBe(true);

    expect(
      shouldFreezeAutoRotation({
        manualStepFreezeOnHover: false,
        surfaceHovering: false,
        manualStepLockUntil: Date.now() + 5_000,
      })
    ).toBe(true);

    expect(
      shouldFreezeAutoRotation({
        manualStepFreezeOnHover: false,
        surfaceHovering: true,
        manualStepLockUntil: Date.now() - 5_000,
      })
    ).toBe(false);
  });

  it('returns compact and desktop row limits', () => {
    expect(getSeedRowsCount(true)).toBe(3);
    expect(getSeedRowsCount(false)).toBe(4);
    expect(getMaxEventRows(true)).toBe(4);
    expect(getMaxEventRows(false)).toBe(5);
  });

  it('returns adaptive update intervals by capability profile', () => {
    expect(getUpdateIntervalMs({ reduceMotion: true, coarsePointer: false })).toBe(4800);
    expect(getUpdateIntervalMs({ reduceMotion: false, coarsePointer: true })).toBe(3400);
    expect(getUpdateIntervalMs({ reduceMotion: false, coarsePointer: false })).toBe(2600);
  });
});
