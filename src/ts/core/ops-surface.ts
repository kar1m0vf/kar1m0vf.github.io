export interface FreezeAutoRotationInput {
  manualStepFreezeOnHover: boolean;
  surfaceHovering: boolean;
  manualStepLockUntil: number;
  now?: number;
}

export interface UpdateIntervalInput {
  reduceMotion: boolean;
  coarsePointer: boolean;
}

export const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value));

export const getNextStepIndex = (currentStepIndex: number, stepCount: number): number => {
  if (stepCount <= 0) {
    throw new Error('stepCount must be greater than 0');
  }
  return (currentStepIndex + 1 + stepCount) % stepCount;
};

export const shouldFreezeAutoRotation = ({
  manualStepFreezeOnHover,
  surfaceHovering,
  manualStepLockUntil,
  now = Date.now(),
}: FreezeAutoRotationInput): boolean => {
  const hoverFreeze = manualStepFreezeOnHover && surfaceHovering;
  const touchLockFreeze = manualStepLockUntil > now;
  return hoverFreeze || touchLockFreeze;
};

export const getSeedRowsCount = (isCompactViewport: boolean): number => (isCompactViewport ? 3 : 4);

export const getMaxEventRows = (isCompactViewport: boolean): number => (isCompactViewport ? 4 : 5);

export const getUpdateIntervalMs = ({ reduceMotion, coarsePointer }: UpdateIntervalInput): number => {
  if (reduceMotion) {
    return 4800;
  }
  if (coarsePointer) {
    return 3400;
  }
  return 2600;
};
