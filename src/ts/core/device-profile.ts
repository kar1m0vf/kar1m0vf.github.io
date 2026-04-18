export type DeviceProfile = 'weak' | 'strong';

export interface DetectDeviceProfileInput {
  saveData: boolean;
  deviceMemory?: number | null | undefined;
  hardwareConcurrency?: number | null | undefined;
}

const normalizeCapabilitySignal = (value?: number | null): number | null =>
  typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : null;

export const detectDeviceProfile = ({
  saveData,
  deviceMemory,
  hardwareConcurrency,
}: DetectDeviceProfileInput): DeviceProfile => {
  const normalizedMemory = normalizeCapabilitySignal(deviceMemory);
  const normalizedCpu = normalizeCapabilitySignal(hardwareConcurrency);

  const criticalMemory = normalizedMemory !== null && normalizedMemory <= 2;
  const criticalCpu = normalizedCpu !== null && normalizedCpu <= 2;
  const constrainedCombo =
    normalizedMemory !== null &&
    normalizedCpu !== null &&
    normalizedMemory <= 4 &&
    normalizedCpu <= 4;

  return saveData || criticalMemory || criticalCpu || constrainedCombo ? 'weak' : 'strong';
};
