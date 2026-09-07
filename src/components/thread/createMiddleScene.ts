import { controlOverlayEvent, isControlOverlayOpen } from '../../utils/controlOverlay';
import {
  CatmullRomCurve3, Color, Curve, Fog, Group, Mesh, MeshBasicMaterial, PerspectiveCamera,
  PMREMGenerator, PointLight, Scene, SphereGeometry, TubeGeometry, Vector2, Vector3, WebGLRenderer,
} from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { createThreadCore, createThreadGlass } from './threadMaterial';
import { passageTrajectory } from './passageTrajectory';

interface Options { reduced: boolean; onReady: () => void; onUnavailable: () => void }
interface Pose { shape: number; x: number; y: number; scale: number; angle: number; camera: number; visibility: number }
interface Stop { at: number; pose: Pose; phase: string }
const TAU = Math.PI * 2;
const clamp = (n: number) => Math.max(0, Math.min(1, n));
const ease = (n: number) => { const t = clamp(n); return t * t * (3 - 2 * t); };
const mix = (a: number, b: number, t: number) => a + (b - a) * t;
const curve = (points: number[][]) => new CatmullRomCurve3(points.map(([x, y, z]) => new Vector3(x, y, z)), false, 'centripetal');

class Helix extends Curve<Vector3> {
  constructor() { super(); }
  getPoint(t: number, target = new Vector3()) {
    const a = TAU * (7.4 * t + 0.12);
    return target.set(2.3 * Math.cos(a), 2.3 * Math.sin(a), 3.2 - 56 * t);
  }
}

// Open ends stay open in every pose: one mesh can flow from loop to frame to helix.
function createCurves() {
  const strand = curve([[-4, 5, -1], [0, 2, 0], [1, 0, 0.4], [-0.5, -2, 0], [4, -5, -1]]);
  const loop = curve([
    [-1.4, 5, -0.6], [-1.1, 2.4, 0], [1.1, 1.4, 0.2], [1.3, -0.8, -0.5],
    [-0.8, -1.8, -0.3], [-1.7, -0.4, 0.5], [-0.6, 1.7, 0.6], [1.6, 0.7, 0.8],
    [1.8, -1.3, 0.2], [0.4, -2, 0.3], [-0.7, -0.3, 0.9], [0.6, 0.3, 0.1], [3.2, -2.2, -0.4], [4.8, -3.7, -1],
  ]);
  const frame = curve([
    [-1.8, 5, -1.2], [-2.2, 2.6, -.6], [-1.3, .3, -.7], [1.4, -.9, -.9], [2.6, .2, -.6],
    [2, 2, -.4], [-.2, 2.2, 0], [-2, .6, .8], [-1.8, -1.7, .6], [1, -2.4, .3],
    [2.7, -.8, .2], [2.4, 1.5, -.3], [0, 2.1, -.8], [-2.3, -1.5, -1], [-4, -4.2, .3], [-7, -4.2, .5], [-9, -6.7, -.5],
  ]);
  const signal = curve([
    [-7, -.4, -.8], [-5.4, 1.6, .1], [-3.9, 1.9, .4], [-2.7, .6, .2], [-1.5, -1.4, -.3],
    [.2, -1.9, -.2], [1.7, .4, .3], [2.9, 2.4, -.5], [5.5, 2.3, -.6], [6, 1, -.3],
    [5, -.5, .4], [3, -.7, .5], [2.1, .4, 0], [2.7, 1.8, -.7], [5.7, -.8, -.5], [8, -3.5, -.5],
  ]);
  const arcade = curve([
    [-1, 5, -1], [0.5, 2.2, 0], [2.3, 1.5, 0.3], [2.6, -0.7, 0.6], [1, -1.5, 0],
    [-1.7, -1.6, -0.2], [-2.6, -0.5, -0.4], [-1.8, 1.5, -0.8], [0.5, 1.4, -1], [2.2, -3.5, -0.6], [5, -5, -.8], [7, -7, -1],
  ]);
  return [strand, loop, frame, new Helix(), signal, arcade, strand];
}

function tube(curves: Curve<Vector3>[], segments: number, radius: number, radial: number) {
  const geometry = new TubeGeometry(curves[0]!, segments, radius, radial, false);
  const targets = curves.slice(1).map((path) => new TubeGeometry(path, segments, radius, radial, false));
  geometry.morphAttributes.position = targets.map((target) => target.attributes.position!.clone());
  geometry.morphAttributes.normal = targets.map((target) => target.attributes.normal!.clone());
  targets.forEach((target) => target.dispose());
  return geometry;
}

export function createMiddleScene(host: HTMLElement, root: HTMLElement, options: Options): (() => void) | null {
  const canvas = document.createElement('canvas');
  canvas.setAttribute('aria-hidden', 'true');
  let renderer: WebGLRenderer;
  try {
    const context = canvas.getContext('webgl2', { alpha: true, antialias: true, powerPreference: 'high-performance' });
    if (!context) return null;
    renderer = new WebGLRenderer({ canvas, context, alpha: true, antialias: true });
  } catch { return null; }
  host.appendChild(canvas);
  let pixelRatio = Math.min(devicePixelRatio || 1, host.clientWidth < 768 ? 1.25 : 1.6);
  renderer.setPixelRatio(pixelRatio);
  renderer.setClearColor(0x050709, 0);
  renderer.toneMappingExposure = 1.05;
  const scene = new Scene();
  scene.fog = new Fog(0x050709, 22, 82);
  const camera = new PerspectiveCamera(38, 1, 0.1, 90);
  camera.position.z = 9.3;
  const pmrem = new PMREMGenerator(renderer);
  const room = new RoomEnvironment();
  const environment = pmrem.fromScene(room, 0.04);
  scene.environment = environment.texture;
  room.dispose(); pmrem.dispose();

  const paths = createCurves();
  const segments = host.clientWidth < 768 ? 300 : 520;
  const glass = createThreadGlass();
  const coreMaterial = createThreadCore();
  const shell = new Mesh(tube(paths, segments, 0.145, 16), glass);
  const core = new Mesh(tube(paths, segments, 0.022, 8), coreMaterial);
  shell.frustumCulled = false; core.frustumCulled = false;
  const group = new Group();
  group.add(shell, core); scene.add(group);
  const capGeometry = new SphereGeometry(0.145, 16, 10);
  const caps = [new Mesh(capGeometry, glass), new Mesh(capGeometry, glass)];
  group.add(...caps);
  const key = new PointLight(0xb9dfff, 65, 28, 2);
  const blue = new PointLight(0x2878ff, 45, 22, 2);
  key.position.set(-2, 5, 6); blue.position.set(4, -2, 3);
  scene.add(key, blue);
  const beadGeometry = new SphereGeometry(0.042, 12, 8);
  const beadMaterial = new MeshBasicMaterial({ color: new Color('#c9eeff').multiplyScalar(5), toneMapped: false });
  const beads = Array.from({ length: 3 }, () => { const bead = new Mesh(beadGeometry, beadMaterial); group.add(bead); return bead; });
  const focalPoint = new Mesh(beadGeometry, beadMaterial);
  focalPoint.position.set(0, 0, -68);
  group.add(focalPoint);
  const composer = new EffectComposer(renderer);
  const bloom = new UnrealBloomPass(new Vector2(1, 1), 0.3, 0.55, 1.05);
  const output = new OutputPass();
  composer.addPass(new RenderPass(scene, camera)); composer.addPass(bloom); composer.addPass(output);

  let width = 1;
  let height = 1;
  let frameId = 0;
  let measureId = 0;
  let lastTime = 0;
  let elapsed = 0;
  let slowFrames = 0;
  let visible = false;
  let unavailable = false;
  let disposed = false;
  let playing = false;
  let inPassageField = false;
  let signalPosition = 2;
  let signalRunning = false;
  let signalPulse = .56;
  let narSaved = false;
  const passageElement = root.querySelector<HTMLElement>('#connections');
  const narElement = root.querySelector<HTMLElement>('.nar-world');
  let target: Pose = { shape: 1, x: 0.74, y: 0.4, scale: 1, angle: 0, camera: 9.3, visibility: 1 };
  let current = { ...target };
  let firstMeasure = true;
  let firstRender = true;
  let lastScroll = window.scrollY;
  const pointer = new Vector2();
  const pointerSoft = new Vector2();
  const a = new Vector3();
  const b = new Vector3();

  // Layout is sampled only after scroll/resize/content changes, never in the render loop.
  const measure = () => {
    measureId = 0;
    if (disposed) return;
    const scroll = window.scrollY;
    const phone = width < 960;
    const bounds = (selector: string) => root.querySelector<HTMLElement>(selector)?.getBoundingClientRect();
    const method = bounds('#method');
    const nar = bounds('#nar');
    const passage = bounds('#connections');
    const tracker = bounds('#trendyol');
    const blaster = bounds('#blaster');
    const journey = bounds('#journey');
    if (!method || !nar || !passage || !tracker || !blaster || !journey) return;
    const worldHeight = 2 * 9.3 * Math.tan(19 * Math.PI / 180);
    const anchored = (selector: string, shape: number, size = 1, span = 4.6): Pose => {
      const rect = bounds(selector);
      if (!rect) return { shape, x: 0.72, y: 0.5, scale: 1, angle: 0, camera: 9.3, visibility: 1 };
      return { shape, x: (rect.left + rect.width / 2) / width, y: (rect.top + rect.height / 2) / height,
        scale: rect.width / width * worldHeight * camera.aspect / span * size, angle: 0, camera: 9.3, visibility: 1 };
    };
    const about = anchored('.perspective-art', 1, phone ? 0.82 : 0.94);
    about.y -= phone ? 0 : 0.025;
    const selected = root.querySelector<HTMLElement>('[data-perspective]')?.dataset.perspective;
    about.angle = selected === 'think' ? 0.2 : selected === 'people' ? -0.2 : -0.06;
    const windowFrame = anchored('.nar-world__stage', 2, phone ? .98 : .86);
    windowFrame.y -= phone ? .03 : .05;
    windowFrame.angle = [-.12, .06, .18][Number(narElement?.dataset.step) || 0]!;
    const signal = anchored('.signal-world__constellation', 4, phone ? 1.15 : 1, 12);
    if (phone) { signal.angle = -.95; signal.scale *= 2; }
    const arcade = anchored('.mini-blaster__arena, .blaster-runtime-poster', 5, 1.02);
    if (!phone) arcade.y -= .025;
    const passageSticky = bounds('.thread-passage__sticky');
    const helix: Pose = { shape: 3, x: phone ? .54 : .72, y: phone ? .72 : .52,
      scale: phone ? .5 : Math.min(1.14, width / height * .7), angle: 0, camera: 9.3, visibility: 1 };
    helix.y += (passageSticky?.top ?? 0) / height;
    const exit = anchored('.life-story__place', 6, 0.8);
    // Journey has a quieter trailing strand at the outside edge of the composition.
    exit.x = phone ? 1.04 : 0.93; exit.scale = phone ? 0.65 : 0.9;
    exit.y = (journey.top + Math.min(journey.height * 0.45, height * 0.8)) / height;
    const top = (rect: DOMRect) => rect.top + scroll;
    const travel = Math.max(0, passage.height - height);
    const stops: Stop[] = [
      { at: top(method) - height * 0.7, pose: { ...about, shape: 0, angle: -0.25 }, phase: 'arrival' },
      { at: top(method) + (phone ? height * 0.15 : 0), pose: about, phase: 'perspective' },
      { at: top(method) + Math.max(0, method.height - height), pose: about, phase: 'perspective' },
      { at: top(nar) + height * 0.04, pose: windowFrame, phase: 'frame' },
      { at: top(passage) - height * 0.8, pose: windowFrame, phase: 'frame' },
      { at: top(passage), pose: helix, phase: 'connections' },
      { at: top(passage) + travel, pose: signal, phase: 'signal' },
      { at: top(tracker) + height * 0.08, pose: signal, phase: 'signal' },
      { at: top(blaster) - height * 0.8, pose: signal, phase: 'signal' },
      { at: top(blaster) + height * 0.06, pose: arcade, phase: 'play' },
      { at: top(journey) - height * 0.75, pose: arcade, phase: 'play' },
      { at: top(journey) + height * 0.1, pose: exit, phase: 'beyond' },
    ].sort((left, right) => left.at - right.at);
    const index = stops.findIndex((stop) => stop.at > scroll);
    const next = stops[index < 0 ? stops.length - 1 : index]!;
    const prev = stops[index < 0 ? stops.length - 1 : Math.max(0, index - 1)]!;
    const t = ease((scroll - prev.at) / Math.max(1, next.at - prev.at));
    target = { shape: mix(prev.pose.shape, next.pose.shape, t), x: mix(prev.pose.x, next.pose.x, t),
      y: mix(prev.pose.y, next.pose.y, t), scale: mix(prev.pose.scale, next.pose.scale, t),
      angle: mix(prev.pose.angle, next.pose.angle, t), camera: mix(prev.pose.camera, next.pose.camera, t), visibility: 1 };
    let phase = t < 0.5 ? prev.phase : next.phase;
    const passageProgress = clamp((scroll - top(passage)) / Math.max(1, travel));
    // A distinct traversal, never an interpolation from a half-entered helix into the next pose.
    const animatedPassage = !options.reduced && height >= 650 && travel > 1;
    const traversing = animatedPassage && scroll >= top(passage) && scroll < top(passage) + travel;
    root.style.setProperty('--tracker-reveal', String(animatedPassage ? ease((passageProgress - .9) / .1) : 1));
    root.style.setProperty('--tracker-events', animatedPassage && passageProgress < .9 ? 'none' : 'auto');
    passageElement?.style.setProperty('--passage-skip', String(animatedPassage ? 1 - ease((passageProgress - .88) / .12) : 1));
    if (traversing) {
      const trip = passageTrajectory(passageProgress, helix.scale);
      target = trip.field ? { ...signal, visibility: trip.visibility } : {
        ...helix, x: mix(helix.x, .5, trip.centered), y: mix(helix.y, .5, trip.centered),
        angle: -.2 * trip.centered, camera: trip.camera, visibility: trip.visibility,
      };
      // The two camera coordinate systems switch only while nothing is visible.
      if (inPassageField !== trip.field) current = { ...target, visibility: 0 };
      inPassageField = trip.field;
      phase = trip.phase;
      passageElement?.style.setProperty('--passage-copy', String(trip.copy));
    } else {
      inPassageField = false;
      passageElement?.style.setProperty('--passage-copy', animatedPassage && scroll > top(passage) ? '0' : '1');
    }
    if (narElement) {
      narElement.style.setProperty('--nar-drift', String(clamp((height - nar.top) / (height + nar.height)) - .5));
      narSaved = narElement.dataset.saved === 'true';
    }
    const signalElement = root.querySelector<HTMLElement>('.signal-world');
    signalPosition = Number(signalElement?.dataset.signalPosition ?? 2);
    signalRunning = signalElement?.classList.contains('is-running') ?? false;
    if (options.reduced) { target.shape = Math.round(target.shape); target.camera = 9.3; }
    // Direct anchor navigation should land in its final composition immediately.
    if (firstMeasure || options.reduced || Math.abs(scroll - lastScroll) > height * 0.75) {
      current = { ...target }; firstMeasure = false;
    }
    lastScroll = scroll;
    if (canvas.dataset.phase !== phase) canvas.dataset.phase = phase;
    playing = Boolean(root.querySelector('.mini-blaster[data-phase="running"]'));
    schedule();
  };

  const render = (time: number) => {
    frameId = 0;
    if (disposed || unavailable || !visible || document.hidden || isControlOverlayOpen()) return;
    const dt = lastTime ? Math.min((time - lastTime) / 1000, 0.1) : 0.016;
    slowFrames = lastTime && time - lastTime > 45 ? slowFrames + 1 : Math.max(0, slowFrames - 1);
    lastTime = time;
    if (slowFrames > 60 && pixelRatio > 1) {
      pixelRatio = 1; renderer.setPixelRatio(1); composer.setPixelRatio(1); slowFrames = 0;
    }
    if (!options.reduced && !playing) elapsed += dt;
    const damp = options.reduced || playing ? 1 : 1 - Math.exp(-dt * 10);
    for (const key of Object.keys(target) as Array<keyof Pose>) current[key] = mix(current[key], target[key], damp);
    pointerSoft.lerp(pointer, damp * 0.45);
    const lower = Math.min(paths.length - 1, Math.floor(current.shape));
    const upper = Math.min(paths.length - 1, lower + 1);
    const blend = current.shape - lower;
    for (const mesh of [shell, core]) {
      const weights = mesh.morphTargetInfluences!;
      weights.fill(0);
      if (lower > 0) weights[lower - 1] = 1 - blend;
      if (upper > 0) weights[upper - 1] = (weights[upper - 1] ?? 0) + blend;
    }
    camera.position.set(0, 0, current.camera);
    const viewHeight = 2 * 9.3 * Math.tan(19 * Math.PI / 180);
    group.position.set((current.x - 0.5) * viewHeight * camera.aspect, (0.5 - current.y) * viewHeight, 0);
    group.scale.setScalar(current.scale);
    const tunnel = Math.max(0, 1 - Math.abs(current.shape - 3));
    focalPoint.visible = tunnel > 0.01;
    focalPoint.scale.setScalar(4.5 * tunnel * Math.max(.04, (68 * current.scale + current.camera) / (68 * current.scale + 9.3)));
    const opacity = current.visibility.toFixed(3);
    const depth = current.camera.toFixed(2);
    if (canvas.style.opacity !== opacity) canvas.style.opacity = opacity;
    if (canvas.dataset.cameraZ !== depth) canvas.dataset.cameraZ = depth;
    // Keep illumination with the viewer inside the long tube.
    key.position.z = mix(6, current.camera + 2, tunnel);
    blue.position.z = mix(3, current.camera - 2, tunnel);
    group.rotation.set(pointerSoft.y * 0.06 * (1 - tunnel), pointerSoft.x * 0.1 * (1 - tunnel),
      current.angle + (options.reduced ? 0 : Math.sin(elapsed * 0.24) * 0.025 * (1 - tunnel)));
    const signalWeight = Math.max(0, 1 - Math.abs(current.shape - 4));
    const pulseTarget = [.04, .14, .38, .42, .72][Math.max(0, Math.min(4, signalPosition + 1))]!;
    signalPulse = mix(signalPulse, pulseTarget, options.reduced ? 1 : 1 - Math.exp(-dt * 6));
    beads.forEach((bead, index) => {
      const t = signalWeight > .98 ? (index === 0 ? signalPulse : index === 1 ? .17 : .64)
        : (elapsed * 0.04 + index / 3 + 0.08) % 1;
      bead.scale.setScalar(signalWeight > .98 ? (index === 0 ? (signalRunning ? 2.8 : 1.8) : .6) : narSaved && lower === 2 ? 1.6 : 1);
      paths[lower]!.getPointAt(t, a); paths[upper]!.getPointAt(t, b);
      bead.position.copy(a).lerp(b, blend);
    });
    caps.forEach((cap, index) => {
      paths[lower]!.getPoint(index, a); paths[upper]!.getPoint(index, b);
      cap.position.copy(a).lerp(b, blend);
    });
    bloom.strength = 0.28 + tunnel * 0.1;
    try { composer.render(dt); }
    catch { fail(); return; }
    if (firstRender) { firstRender = false; options.onReady(); }
    if (!options.reduced && !playing) frameId = requestAnimationFrame(render);
  };
  const schedule = () => {
    if (!frameId && !disposed && !unavailable && visible && !document.hidden && !isControlOverlayOpen()) frameId = requestAnimationFrame(render);
  };
  const requestMeasure = () => { if (!measureId && !disposed) measureId = requestAnimationFrame(measure); };
  const resize = () => {
    width = host.clientWidth; height = host.clientHeight;
    if (!width || !height) return;
    camera.aspect = width / height; camera.updateProjectionMatrix();
    renderer.setSize(width, height, false); composer.setSize(width, height); requestMeasure();
  };
  const move = (event: PointerEvent) => {
    if (event.pointerType !== 'mouse' || options.reduced) return;
    pointer.set((event.clientX / width - 0.5) * 2, (event.clientY / height - 0.5) * 2);
  };
  const leave = () => pointer.set(0, 0);
  const visibility = () => {
    lastTime = 0;
    if (document.hidden || isControlOverlayOpen()) { cancelAnimationFrame(frameId); frameId = 0; } else requestMeasure();
  };
  const fail = () => { unavailable = true; cancelAnimationFrame(frameId); frameId = 0; options.onUnavailable(); };
  const contextLost = (event: Event) => { event.preventDefault(); fail(); };
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(host); resizeObserver.observe(root);
  root.querySelectorAll('#method, .project, #connections, #journey').forEach((element) => resizeObserver.observe(element));
  const observer = new IntersectionObserver(([entry]) => {
    visible = entry?.isIntersecting ?? false;
    lastTime = 0;
    if (visible) requestMeasure(); else { cancelAnimationFrame(frameId); frameId = 0; }
  });
  observer.observe(root);
  const mutations = new MutationObserver(requestMeasure);
  mutations.observe(root, { subtree: true, attributes: true, attributeFilter: ['data-phase', 'data-perspective', 'data-step', 'data-saved', 'data-signal-position', 'data-outcome', 'data-handoff'] });
  root.addEventListener('pointermove', move, { passive: true }); root.addEventListener('pointerleave', leave);
  window.addEventListener('scroll', requestMeasure, { passive: true });
  document.addEventListener('visibilitychange', visibility);
  window.addEventListener(controlOverlayEvent, visibility);
  canvas.addEventListener('webglcontextlost', contextLost);
  resize();

  return () => {
    disposed = true; cancelAnimationFrame(frameId); cancelAnimationFrame(measureId);
    observer.disconnect(); resizeObserver.disconnect(); mutations.disconnect();
    root.removeEventListener('pointermove', move); root.removeEventListener('pointerleave', leave);
    window.removeEventListener('scroll', requestMeasure); document.removeEventListener('visibilitychange', visibility);
    window.removeEventListener(controlOverlayEvent, visibility);
    canvas.removeEventListener('webglcontextlost', contextLost);
    shell.geometry.dispose(); core.geometry.dispose(); glass.dispose(); coreMaterial.dispose();
    capGeometry.dispose(); beadGeometry.dispose(); beadMaterial.dispose(); environment.dispose(); bloom.dispose(); output.dispose(); composer.dispose();
    renderer.dispose(); renderer.forceContextLoss(); canvas.remove();
  };
}
