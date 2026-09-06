export interface PassageFrame {
  centered: number;
  camera: number;
  visibility: number;
  copy: number;
  field: boolean;
  phase: 'connections' | 'enter' | 'through' | 'clearing' | 'signal';
}

const clamp = (n: number) => Math.max(0, Math.min(1, n));
const smooth = (n: number) => { const t = clamp(n); return t * t * (3 - 2 * t); };

/** The camera crosses the last coil (z = -52.8 × scale) before the signal is revealed.
 * Geometry/camera can reset only in the dark interval; reversing scroll retraces the trip.
 */
export function passageTrajectory(progress: number, scale: number): PassageFrame {
  const p = clamp(progress);
  const field = p >= 0.94;
  const interior = 9.3 + (-46 * scale - 9.3) * smooth((p - 0.18) / 0.62);
  const camera = p < .8 ? interior : -46 * scale - 14 * scale * smooth((p - .8) / .06);
  return {
    centered: smooth(p / 0.18),
    camera: field ? 9.3 : camera,
    visibility: field ? smooth((p - 0.94) / 0.06) : 1 - smooth((p - 0.86) / 0.05),
    copy: 1 - smooth(p / 0.15),
    field,
    phase: field ? 'signal' : p >= 0.82 ? 'clearing' : p >= 0.3 ? 'through' : p > 0.04 ? 'enter' : 'connections',
  };
}
