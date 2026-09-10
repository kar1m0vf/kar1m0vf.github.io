import { BufferAttribute, BufferGeometry, Curve, DynamicDrawUsage, Quaternion, Vector3 } from 'three';

export interface ThreadPose {
  path: Curve<Vector3>;
  radius: number;
  closed?: boolean;
  extension?: number;
  outwardStart?: Vector3;
  sample?: (segments: number) => Vector3[];
}

interface Surface {
  geometry: BufferGeometry;
  positions: Float32Array;
  normals: Float32Array;
  circle: Float32Array;
  sides: number;
  radiusRatio: number;
}

const TAU = Math.PI * 2;
const coreRatio = .022 / .145;
export const THREAD_RADIUS = .145 * 1.35;

/** Blend the spine first, then sweep a circular section along it. Opposing
 * normals from different poses can no longer cancel and pinch the glass.
 * Buffers are reused and uploaded only when the shape changes; idle motion
 * only changes the group's transform. There are no GPU morph textures. */
export class RoundThread {
  readonly shell: BufferGeometry;
  readonly core: BufferGeometry;
  private readonly samples: Vector3[][];
  private readonly starts: Vector3[];
  private readonly ends: Vector3[];
  private readonly centers: Vector3[];
  private readonly filtered: Vector3[];
  private readonly tangents: Vector3[];
  private readonly normals: Vector3[];
  private readonly surfaces: Surface[];
  private readonly weights: number[];
  private readonly rotation = new Quaternion();
  private readonly before = new Vector3();
  private readonly after = new Vector3();
  private readonly binormal = new Vector3();
  private readonly start = new Vector3();
  private readonly end = new Vector3();
  private initialized = false;

  constructor(private readonly poses: readonly ThreadPose[], readonly segments: number) {
    this.samples = poses.map(({ path, sample }) => {
      path.arcLengthDivisions = Math.max(path.arcLengthDivisions, segments * 3);
      path.updateArcLengths();
      return sample ? sample(segments) : path.getSpacedPoints(segments);
    });
    this.starts = poses.map((pose, index) => this.samples[index]![0]!.clone().addScaledVector(
      pose.outwardStart ?? pose.path.getTangentAt(0).negate(), pose.extension ?? 0,
    ));
    this.ends = poses.map((pose, index) => this.samples[index]![segments]!.clone().addScaledVector(
      pose.path.getTangentAt(1), pose.extension ?? 0,
    ));
    this.centers = Array.from({ length: segments + 1 }, () => new Vector3());
    this.filtered = this.centers.map(() => new Vector3());
    this.tangents = this.centers.map(() => new Vector3());
    this.normals = this.centers.map(() => new Vector3());
    this.weights = poses.map(() => 0);
    this.surfaces = [this.surface(20, 1), this.surface(4, coreRatio)];
    this.shell = this.surfaces[0]!.geometry;
    this.core = this.surfaces[1]!.geometry;
    this.update(poses.map((_, i) => Number(i === 0)));
  }

  private surface(sides: number, radiusRatio: number): Surface {
    const rows = this.segments + 3;
    const stride = sides + 1;
    const positions = new Float32Array(rows * stride * 3);
    const normals = new Float32Array(positions.length);
    const uv = new Float32Array(rows * stride * 2);
    const circle = new Float32Array(stride * 2);
    const indices: number[] = [];
    for (let side = 0; side <= sides; side += 1) {
      circle[side * 2] = -Math.cos(side / sides * TAU);
      circle[side * 2 + 1] = Math.sin(side / sides * TAU);
    }
    for (let row = 0; row < rows; row += 1) {
      for (let side = 0; side <= sides; side += 1) {
        const offset = (row * stride + side) * 2;
        uv[offset] = Math.max(0, Math.min(1, (row - 1) / this.segments));
        uv[offset + 1] = side / sides;
        if (row > 0 && side > 0) {
          const a = (row - 1) * stride + side - 1;
          const b = row * stride + side - 1;
          indices.push(a, b, a + 1, b, b + 1, a + 1);
        }
      }
    }
    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new BufferAttribute(positions, 3).setUsage(DynamicDrawUsage));
    geometry.setAttribute('normal', new BufferAttribute(normals, 3).setUsage(DynamicDrawUsage));
    geometry.setAttribute('uv', new BufferAttribute(uv, 2));
    geometry.setIndex(indices);
    return { geometry, positions, normals, circle, sides, radiusRatio };
  }

  update(weights: readonly number[]): boolean {
    if (this.initialized && weights.every((weight, i) => Math.abs(weight - this.weights[i]!) < .0002)) return false;
    this.initialized = true;
    this.start.set(0, 0, 0); this.end.set(0, 0, 0);
    this.centers.forEach(center => center.set(0, 0, 0));
    let radius = 0;
    let open = 0;
    this.poses.forEach((pose, poseIndex) => {
      const weight = weights[poseIndex] ?? 0;
      this.weights[poseIndex] = weight;
      if (!weight) return;
      radius += pose.radius * weight;
      if (!pose.closed) open += weight;
      this.start.addScaledVector(this.starts[poseIndex]!, weight);
      this.end.addScaledVector(this.ends[poseIndex]!, weight);
      this.centers.forEach((center, i) => center.addScaledVector(this.samples[poseIndex]![i]!, weight));
    });
    const closed = open < .000001;
    this.roundBends(radius, closed);
    this.frames(closed);
    for (const surface of this.surfaces) {
      const stride = surface.sides + 1;
      for (let row = 0; row < this.segments + 3; row += 1) {
        const i = Math.max(0, Math.min(this.segments, row - 1));
        const center = row === 0 ? this.start : row === this.segments + 2 ? this.end : this.centers[i]!;
        const normal = this.normals[i]!;
        this.binormal.crossVectors(this.tangents[i]!, normal).normalize();
        for (let side = 0; side <= surface.sides; side += 1) {
          const cos = surface.circle[side * 2]!;
          const sin = surface.circle[side * 2 + 1]!;
          const x = cos * normal.x + sin * this.binormal.x;
          const y = cos * normal.y + sin * this.binormal.y;
          const z = cos * normal.z + sin * this.binormal.z;
          const offset = (row * stride + side) * 3;
          surface.normals[offset] = x; surface.normals[offset + 1] = y; surface.normals[offset + 2] = z;
          const r = radius * surface.radiusRatio;
          surface.positions[offset] = center.x + r * x;
          surface.positions[offset + 1] = center.y + r * y;
          surface.positions[offset + 2] = center.z + r * z;
        }
      }
      surface.geometry.attributes.position!.needsUpdate = true;
      surface.geometry.attributes.normal!.needsUpdate = true;
    }
    return true;
  }

  /** Relax only corners tighter than the glass can bend around. The window is
   * measured in world units, so densely sampled folds receive the same rounding. */
  private roundBends(radius: number, closed: boolean) {
    const count = this.segments;
    for (let pass = 0; pass < 3; pass += 1) {
      for (let i = 0; i <= count; i += 1) {
        const center = this.centers[i]!;
        const output = this.filtered[i]!.copy(center);
        if (!closed && (i < 2 || i > count - 2)) continue;
        const left = this.centers[(i - 1 + count) % count]!;
        const right = this.centers[(i + 1) % count]!;
        this.before.subVectors(center, left);
        this.after.subVectors(right, center);
        const step = Math.max(.00001, Math.min(this.before.length(), this.after.length()));
        const bend = Math.sqrt(Math.max(0, (1 - this.before.normalize().dot(this.after.normalize())) * .5));
        if (step > 4 * radius * bend) continue;
        const reach = Math.min(16, Math.max(2, Math.ceil(radius * 2 / step)));
        output.set(0, 0, 0);
        let total = 0;
        for (let offset = -reach; offset <= reach; offset += 1) {
          const index = closed ? (i + offset + count) % count : Math.max(0, Math.min(count, i + offset));
          const weight = reach + 1 - Math.abs(offset);
          output.addScaledVector(this.centers[index]!, weight); total += weight;
        }
        output.divideScalar(total).lerp(center, .25);
      }
      this.centers.forEach((center, i) => center.copy(this.filtered[i]!));
      if (closed) this.centers[count]!.copy(this.centers[0]!);
    }
    if (closed) { this.start.copy(this.centers[0]!); this.end.copy(this.centers[count]!); }
  }

  private frames(closed: boolean) {
    const count = this.segments;
    for (let i = 0; i <= count; i += 1) {
      const left = this.centers[closed ? (i - 1 + count) % count : Math.max(0, i - 1)]!;
      const right = this.centers[closed ? (i + 1) % count : Math.min(count, i + 1)]!;
      const tangent = this.tangents[i]!.subVectors(right, left);
      if (tangent.lengthSq() < 1e-10) tangent.copy(i ? this.tangents[i - 1]! : this.after.set(0, 1, 0));
      tangent.normalize();
    }
    const firstTangent = this.tangents[0]!;
    const firstNormal = this.normals[0]!;
    firstNormal.set(0, 0, 1);
    if (Math.abs(firstNormal.dot(firstTangent)) > .95) firstNormal.set(1, 0, 0);
    firstNormal.addScaledVector(firstTangent, -firstNormal.dot(firstTangent)).normalize();
    for (let i = 1; i <= count; i += 1) {
      this.rotation.setFromUnitVectors(this.tangents[i - 1]!, this.tangents[i]!);
      this.normals[i]!.copy(this.normals[i - 1]!).applyQuaternion(this.rotation).normalize();
    }
    if (closed) {
      const lastNormal = this.normals[count]!;
      const angle = Math.atan2(firstTangent.dot(this.before.crossVectors(lastNormal, firstNormal)), lastNormal.dot(firstNormal));
      for (let i = 1; i <= count; i += 1) this.normals[i]!.applyAxisAngle(this.tangents[i]!, angle * i / count);
      this.normals[count]!.copy(firstNormal); this.tangents[count]!.copy(firstTangent);
    }
  }

  getPointAt(t: number, target: Vector3): Vector3 {
    const position = Math.max(0, Math.min(1, t)) * this.segments;
    const index = Math.min(this.segments - 1, Math.floor(position));
    return target.copy(this.centers[index]!).lerp(this.centers[index + 1]!, position - index);
  }
}
