import { BufferAttribute, TubeGeometry, Vector3 } from 'three';

/** Continue both ends along their tangents, without resampling or changing the
 * visible curve. Just two extra rings; closed poses collapse them into the seam. */
export function extendThreadGeometry(geometry: TubeGeometry, distance: number, outwardStart?: Vector3) {
  const { path, radialSegments, tubularSegments } = geometry.parameters;
  const stride = radialSegments + 1;
  const start = (outwardStart?.clone() ?? path.getTangentAt(0, new Vector3()).negate()).multiplyScalar(distance);
  const end = path.getTangentAt(1, new Vector3()).multiplyScalar(distance);
  for (const name of ['position', 'normal', 'uv']) {
    const attribute = geometry.getAttribute(name);
    const size = attribute.itemSize;
    const source = attribute.array;
    const data = new Float32Array(source.length + stride * size * 2);
    data.set(source, stride * size);
    for (let i = 0; i < stride; i += 1) {
      for (let axis = 0; axis < size; axis += 1) {
        data[i * size + axis] = source[i * size + axis]! + (name === 'position' ? start.getComponent(axis) : 0);
        data[(attribute.count + stride + i) * size + axis] = source[(attribute.count - stride + i) * size + axis]!
          + (name === 'position' ? end.getComponent(axis) : 0);
      }
    }
    geometry.setAttribute(name, new BufferAttribute(data, size));
  }
  const indices: number[] = [];
  for (let row = 1; row <= tubularSegments + 2; row += 1) {
    for (let side = 1; side <= radialSegments; side += 1) {
      const a = stride * (row - 1) + side - 1;
      const b = stride * row + side - 1;
      indices.push(a, b, a + 1, b, b + 1, a + 1);
    }
  }
  geometry.setIndex(indices);
  geometry.boundingBox = null;
  geometry.boundingSphere = null;
  return geometry;
}
