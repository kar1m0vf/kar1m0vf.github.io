import { controlOverlayEvent, isControlOverlayOpen } from '../../utils/controlOverlay';
import {
  AdditiveBlending, BufferGeometry, Color, Curve, Float32BufferAttribute, Group,
  Mesh, MeshBasicMaterial, PerspectiveCamera, PMREMGenerator,
  PointLight, Points, PointsMaterial, Scene, SphereGeometry, TubeGeometry, Vector2,
  Vector3, WebGLRenderer,
} from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { createThreadCore, createThreadGlass } from './threadMaterial';

interface SceneOptions {
  framing: 'intro' | 'closing';
  getProgress: () => number;
  reduced: boolean;
  onUnavailable: () => void;
}

const TAU = Math.PI * 2;
const clamp = (n: number) => Math.max(0, Math.min(1, n));
const smooth = (a: number, b: number, n: number) => {
  const t = clamp((n - a) / (b - a));
  return t * t * (3 - 2 * t);
};
const mix = (a: number, b: number, t: number) => a + (b - a) * t;

type Shape = 'knot' | 'aperture' | 'thread';

/** All shapes share topology, so the cable opens continuously rather than swapping models. */
class ThreadCurve extends Curve<Vector3> {
  constructor(private readonly shape: Shape) { super(); }
  getPoint(t: number, target = new Vector3()) {
    const a = t * TAU;
    if (this.shape === 'knot') {
      const r = 1.45 + 0.57 * Math.cos(3 * a);
      return target.set(r * Math.cos(2 * a), r * Math.sin(2 * a), 0.75 * Math.sin(3 * a));
    }
    if (this.shape === 'aperture') {
      return target.set(2.1 * Math.cos(a), 2.1 * Math.sin(a), 0.16 * Math.sin(3 * a));
    }
    return target.set(-8 + 16 * t, 1.5 * Math.sin(a * 1.15) - 1.1, 0.5 * Math.cos(a));
  }
}

function createCable(radius: number, segments: number, radial: number) {
  const curves = [new ThreadCurve('knot'), new ThreadCurve('aperture'), new ThreadCurve('thread')];
  const geometry = new TubeGeometry(curves[0]!, segments, radius, radial, true);
  const targets = [
    new TubeGeometry(curves[1]!, segments, radius, radial, true),
    new TubeGeometry(curves[2]!, segments, radius * 0.23, radial, false),
  ];
  geometry.morphAttributes.position = targets.map((target) => target.attributes.position!.clone());
  geometry.morphAttributes.normal = targets.map((target) => target.attributes.normal!.clone());
  targets.forEach((target) => target.dispose());
  // The final open strand extends beyond the original knot's bounds.
  geometry.boundingSphere = null;
  return { geometry, curves };
}

export function createThreadScene(host: HTMLElement, options: SceneOptions): (() => void) | null {
  const canvas = document.createElement('canvas');
  canvas.setAttribute('aria-hidden', 'true');
  let renderer: WebGLRenderer;
  try {
    const context = canvas.getContext('webgl2', { alpha: true, antialias: true, powerPreference: 'high-performance' });
    if (!context) return null;
    renderer = new WebGLRenderer({ canvas, context, alpha: true, antialias: true });
  } catch { return null; }

  const mobile = () => host.clientWidth < 768;
  let pixelRatio = Math.min(window.devicePixelRatio || 1, mobile() ? 1.35 : 1.7);
  renderer.setPixelRatio(pixelRatio);
  renderer.setClearColor(0x050709, 0);
  renderer.toneMappingExposure = 1.05;
  host.appendChild(canvas);

  const scene = new Scene();
  const camera = new PerspectiveCamera(38, 1, 0.1, 70);
  camera.position.set(0, 0, 9.3);
  const pmrem = new PMREMGenerator(renderer);
  const room = new RoomEnvironment();
  const environment = pmrem.fromScene(room, 0.04);
  scene.environment = environment.texture;
  room.dispose();
  pmrem.dispose();

  const group = new Group();
  scene.add(group);
  const cable = createCable(0.145, mobile() ? 220 : 320, 16);
  const glass = createThreadGlass();
  const shell = new Mesh(cable.geometry, glass);
  shell.frustumCulled = false;
  group.add(shell);

  const core = createCable(0.022, mobile() ? 220 : 320, 8);
  const coreMaterial = createThreadCore();
  const filament = new Mesh(core.geometry, coreMaterial);
  filament.frustumCulled = false;
  group.add(filament);

  const keyLight = new PointLight(0xb9dfff, 65, 20, 2);
  keyLight.position.set(-2, 5, 6);
  const blueLight = new PointLight(0x2878ff, 45, 16, 2);
  blueLight.position.set(4, -2, 3);
  scene.add(keyLight, blueLight);

  const beadGeometry = new SphereGeometry(0.045, 12, 8);
  const beadMaterial = new MeshBasicMaterial({ color: new Color('#c9eeff').multiplyScalar(5), toneMapped: false });
  const beads = Array.from({ length: 3 }, () => {
    const bead = new Mesh(beadGeometry, beadMaterial);
    group.add(bead);
    return bead;
  });

  // A sparse, deterministic field gives the camera movement a depth reference.
  const starPositions = new Float32Array(72 * 3);
  for (let i = 0; i < 72; i += 1) {
    starPositions[i * 3] = Math.sin(i * 127.1) * 10;
    starPositions[i * 3 + 1] = Math.cos(i * 311.7) * 6;
    starPositions[i * 3 + 2] = -2 - (i % 7);
  }
  const starsGeometry = new BufferGeometry();
  starsGeometry.setAttribute('position', new Float32BufferAttribute(starPositions, 3));
  const starsMaterial = new PointsMaterial({ color: 0x5798df, size: 0.014, transparent: true, opacity: 0.38, depthWrite: false, blending: AdditiveBlending });
  const stars = new Points(starsGeometry, starsMaterial);
  scene.add(stars);

  const composer = new EffectComposer(renderer);
  const renderPass = new RenderPass(scene, camera);
  const bloom = new UnrealBloomPass(new Vector2(1, 1), 0.5, 0.55, 1.05);
  const output = new OutputPass();
  composer.addPass(renderPass);
  composer.addPass(bloom);
  composer.addPass(output);

  let width = 0;
  let height = 0;
  let inView = true;
  let disposed = false;
  let contextAvailable = true;
  let frameId = 0;
  let lastTime = 0;
  let elapsed = 0;
  let slowFrames = 0;
  const pointer = new Vector2();
  const smoothedPointer = new Vector2();
  const pointA = new Vector3();
  const pointB = new Vector3();
  const pointC = new Vector3();

  const render = (time: number) => {
    frameId = 0;
    if (disposed || !contextAvailable || !inView || document.hidden || isControlOverlayOpen()) return;
    const dt = lastTime ? Math.min((time - lastTime) / 1000, 0.04) : 0.016;
    if (lastTime && time - lastTime > 45) slowFrames += 1;
    else slowFrames = Math.max(0, slowFrames - 1);
    lastTime = time;
    elapsed += options.reduced ? 0 : dt;
    if (slowFrames > 75 && pixelRatio > 1) {
      pixelRatio = 1;
      renderer.setPixelRatio(1);
      composer.setPixelRatio(1);
      slowFrames = 0;
    }
    const p = clamp(options.getProgress());
    const open = smooth(0.17, 0.5, p);
    const unspool = smooth(0.66, 0.94, p);
    const approach = smooth(0.42, 0.69, p) * (1 - unspool);
    smoothedPointer.lerp(pointer, 1 - Math.exp(-dt * 3));
    const phone = width < 768;
    const viewWidth = 2 * 9.3 * Math.tan(19 * Math.PI / 180) * camera.aspect;
    const initialX = phone ? 0.05 : viewWidth * 0.245;
    const closingPhone = phone && options.framing === 'closing';
    group.position.set(mix(initialX, 0, open) + unspool * 1.2, mix(closingPhone ? 0 : phone ? 0.45 : 0.1, 0.12, open) - unspool * 1.2, 0);
    const initialScale = phone ? (closingPhone ? 0.9 : 0.5) : Math.min(1.55, viewWidth * 0.092);
    const scale = mix(initialScale, phone ? 1.02 : 1.3, open) + approach * 0.58 - unspool * 0.12;
    group.scale.setScalar(scale);
    group.rotation.set(
      mix(-0.24 + Math.sin(elapsed * 0.22) * 0.08, 0, open) + smoothedPointer.y * 0.13 * (1 - open),
      mix(0.32 + Math.sin(elapsed * 0.17) * 0.24, 0, open) + smoothedPointer.x * 0.18 * (1 - open),
      mix(-0.34 + elapsed * 0.025, -Math.PI * 0.5, open) * (1 - unspool) + unspool * 0.65,
    );
    for (const mesh of [shell, filament]) {
      const influences = mesh.morphTargetInfluences!;
      influences[0] = open * (1 - unspool);
      influences[1] = unspool;
    }
    camera.position.z = 9.3 - approach * 5.6;
    camera.position.x = smoothedPointer.x * 0.12;
    camera.position.y = -smoothedPointer.y * 0.09;
    camera.lookAt(0, 0, 0);
    glass.envMapIntensity = 3.1 + approach * 0.7;
    bloom.strength = 0.28 + approach * 0.25;
    stars.rotation.z = -p * 0.25;
    beads.forEach((bead, index) => {
      const t = (elapsed * 0.065 + index / 3) % 1;
      cable.curves[0]!.getPointAt(t, pointA);
      cable.curves[1]!.getPointAt(t, pointB);
      cable.curves[2]!.getPointAt(t, pointC);
      bead.position.copy(pointA).lerp(pointB, open).lerp(pointC, unspool);
    });
    canvas.dataset.phase = p < 0.29 ? 'knot' : p < 0.68 ? 'aperture' : 'thread';
    try { composer.render(dt); }
    catch {
      contextAvailable = false;
      options.onUnavailable();
      return;
    }
    if (!options.reduced) frameId = requestAnimationFrame(render);
  };

  const schedule = () => {
    if (!disposed && contextAvailable && inView && !document.hidden && !isControlOverlayOpen() && !frameId) {
      lastTime = 0;
      frameId = requestAnimationFrame(render);
    }
  };
  const resize = () => {
    width = host.clientWidth;
    height = host.clientHeight;
    if (!width || !height) return;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height, false);
    composer.setSize(width, height);
    schedule();
  };
  const pointerMove = (event: PointerEvent) => {
    if (event.pointerType !== 'mouse' || options.reduced) return;
    const bounds = host.getBoundingClientRect();
    if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) {
      pointer.set(0, 0);
      return;
    }
    pointer.set(((event.clientX - bounds.left) / width - 0.5) * 2, ((event.clientY - bounds.top) / height - 0.5) * 2);
  };
  const pointerLeave = () => pointer.set(0, 0);
  const visibility = () => {
    if (document.hidden || isControlOverlayOpen()) { cancelAnimationFrame(frameId); frameId = 0; }
    else schedule();
  };
  const contextLost = (event: Event) => {
    event.preventDefault();
    contextAvailable = false;
    cancelAnimationFrame(frameId);
    frameId = 0;
    options.onUnavailable();
  };
  const contextRestored = () => options.onUnavailable();
  const container = host.closest('.thread-story__sticky') ?? host;
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(host);
  const observer = new IntersectionObserver(([entry]) => {
    inView = entry?.isIntersecting ?? false;
    if (inView) schedule();
    else { cancelAnimationFrame(frameId); frameId = 0; }
  }, { rootMargin: '100px' });
  observer.observe(host);
  container.addEventListener('pointermove', pointerMove as EventListener, { passive: true });
  container.addEventListener('pointerleave', pointerLeave);
  document.addEventListener('visibilitychange', visibility);
  window.addEventListener(controlOverlayEvent, visibility);
  canvas.addEventListener('webglcontextlost', contextLost);
  canvas.addEventListener('webglcontextrestored', contextRestored);
  resize();

  return () => {
    disposed = true;
    cancelAnimationFrame(frameId);
    observer.disconnect();
    resizeObserver.disconnect();
    container.removeEventListener('pointermove', pointerMove as EventListener);
    container.removeEventListener('pointerleave', pointerLeave);
    document.removeEventListener('visibilitychange', visibility);
    window.removeEventListener(controlOverlayEvent, visibility);
    canvas.removeEventListener('webglcontextlost', contextLost);
    canvas.removeEventListener('webglcontextrestored', contextRestored);
    cable.geometry.dispose(); core.geometry.dispose(); glass.dispose(); coreMaterial.dispose();
    beadGeometry.dispose(); beadMaterial.dispose(); starsGeometry.dispose(); starsMaterial.dispose();
    environment.dispose(); bloom.dispose(); output.dispose(); composer.dispose();
    renderer.dispose(); renderer.forceContextLoss(); canvas.remove();
  };
}
