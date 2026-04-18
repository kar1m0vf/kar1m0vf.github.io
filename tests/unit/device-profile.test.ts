import { detectDeviceProfile } from '../../src/ts/core/device-profile';

describe('device profile detection', () => {
  it('treats data saver as weak regardless of hardware', () => {
    expect(
      detectDeviceProfile({
        saveData: true,
        deviceMemory: 8,
        hardwareConcurrency: 8,
      })
    ).toBe('weak');
  });

  it('keeps midrange devices strong when only one mild signal is present', () => {
    expect(
      detectDeviceProfile({
        saveData: false,
        deviceMemory: undefined,
        hardwareConcurrency: 4,
      })
    ).toBe('strong');

    expect(
      detectDeviceProfile({
        saveData: false,
        deviceMemory: 4,
        hardwareConcurrency: undefined,
      })
    ).toBe('strong');
  });

  it('marks clearly constrained hardware as weak', () => {
    expect(
      detectDeviceProfile({
        saveData: false,
        deviceMemory: 2,
        hardwareConcurrency: undefined,
      })
    ).toBe('weak');

    expect(
      detectDeviceProfile({
        saveData: false,
        deviceMemory: undefined,
        hardwareConcurrency: 2,
      })
    ).toBe('weak');

    expect(
      detectDeviceProfile({
        saveData: false,
        deviceMemory: 4,
        hardwareConcurrency: 4,
      })
    ).toBe('weak');
  });

  it('defaults to strong when the browser exposes little hardware info', () => {
    expect(
      detectDeviceProfile({
        saveData: false,
        deviceMemory: undefined,
        hardwareConcurrency: undefined,
      })
    ).toBe('strong');
  });
});
