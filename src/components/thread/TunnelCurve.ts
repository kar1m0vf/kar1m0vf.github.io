import { Curve, Vector3 } from 'three';

const TAU = Math.PI * 2;

/** A flared entrance continues behind the viewer; the far coils converge on
 * the light's axis. Neither continuation can draw a straight line across the bore. */
export class TunnelCurve extends Curve<Vector3> {
  constructor() { super(); }

  /** Spend the existing vertex budget on the visible bore. Uniform arc-length
   * sampling wastes many rings on the large entrance behind the camera. The
   * path itself is unchanged, including its distant continuation into the light. */
  sampleSpine(segments: number): Vector3[] {
    const divisions = segments * 4;
    const points = this.getPoints(divisions);
    const distances = new Float64Array(divisions + 1);
    const smooth = (value: number) => { const t = Math.max(0, Math.min(1, value)); return t * t * (3 - 2 * t); };
    for (let i = 1; i <= divisions; i += 1) {
      const travel = -.1 + 1.9 * (i - .5) / divisions;
      const density = (.16 + .84 * smooth((travel + .04) / .06)) * (1 - .35 * smooth((travel - 1) / .3));
      distances[i] = distances[i - 1]! + points[i]!.distanceTo(points[i - 1]!) * density;
    }
    let cursor = 1;
    return Array.from({ length: segments + 1 }, (_, i) => {
      const distance = distances[divisions]! * i / segments;
      while (cursor < divisions && distances[cursor]! < distance) cursor += 1;
      const fraction = (distance - distances[cursor - 1]!) / Math.max(1e-10, distances[cursor]! - distances[cursor - 1]!);
      return this.getPoint((cursor - 1 + fraction) / divisions);
    });
  }

  getPoint(t: number, target = new Vector3()) {
    const travel = -0.1 + 1.9 * t;
    const flare = Math.max(0, -travel);
    const tail = Math.max(0, Math.min(1, (travel - 1) / 0.8));
    const taper = tail * tail * (3 - 2 * tail);
    const radius = 2.3 * (1 - taper) + 1100 * flare * flare;
    const angle = TAU * (7.4 * travel + 0.12);
    return target.set(
      radius * Math.cos(angle), radius * Math.sin(angle),
      3.2 - 56 * travel + 19200 * flare * flare * flare,
    );
  }
}
