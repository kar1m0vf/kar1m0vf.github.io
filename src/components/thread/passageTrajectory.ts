export interface PassageFrame {
  centered: number;
  camera: number;
  visibility: number;
  copy: number;
  light: number;
  reveal: number;
  field: boolean;
  phase: 'connections' | 'enter' | 'through' | 'clearing' | 'signal';
}

const clamp = (n: number) => Math.max(0, Math.min(1, n));
const smooth = (n: number) => { const t = clamp(n); return t * t * (3 - 2 * t); };

/** The camera crosses the main coils (z = -52.8 × scale), approaching the light.
 * Geometry/camera reset while the mesh is hidden; a blue light wash bridges that
 * interval into the signal scene. Reversing scroll retraces the same trip.
 */
export function passageTrajectory(progress: number, scale: number): PassageFrame {
  const p = clamp(progress);
  const field = p >= 0.78;
  const interior = 9.3 + (-46 * scale - 9.3) * smooth((p - 0.18) / 0.44);
  const camera = p < .62 ? interior : -46 * scale - 14 * scale * smooth((p - .62) / .12);
  return {
    centered: smooth(p / 0.18),
    camera: field ? 9.3 : camera,
    visibility: field ? smooth((p - 0.78) / 0.22) : 1 - smooth((p - 0.68) / 0.08),
    copy: 1 - smooth(p / 0.15),
    light: smooth((p - .58) / .2) * (1 - smooth((p - .78) / .22)),
    reveal: smooth((p - .79) / .21),
    field,
    phase: field ? 'signal' : p >= 0.68 ? 'clearing' : p >= 0.3 ? 'through' : p > 0.04 ? 'enter' : 'connections',
  };
}

/** Wheel input can advance by a large fraction of the exit in one event.
 * Camera, light and HTML share this clock, including when scrolling backwards. */
export function advancePassage(current: number, target: number, seconds: number) {
  const next = current + (target - current) * (1 - Math.exp(-Math.max(0, seconds) * 9));
  return Math.abs(next - target) < .0001 ? target : next;
}
