import { Color, MeshBasicMaterial, MeshPhysicalMaterial } from 'three';

/** The same material follows the visitor from the opening sculpture to the last loop. */
export const createThreadGlass = () => new MeshPhysicalMaterial({
  color: new Color('#1665bf'), metalness: 0.48, roughness: 0.115,
  clearcoat: 1, clearcoatRoughness: 0.06, transmission: 0.2,
  thickness: 0.55, ior: 1.46, envMapIntensity: 3.1,
  emissive: new Color('#0642ad'), emissiveIntensity: 0.27,
});

export const createThreadCore = () => new MeshBasicMaterial({
  color: new Color('#6ebeff').multiplyScalar(3.4), toneMapped: false,
});
