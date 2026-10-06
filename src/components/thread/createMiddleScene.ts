import { controlOverlayEvent, isSceneRenderingSuspended } from '../../utils/controlOverlay';
import { reportSceneFrame, sceneJumpEvent } from '../../utils/sceneNavigation';
import {
  AdditiveBlending, CanvasTexture, CatmullRomCurve3, Color, Fog, Group, Mesh, MeshBasicMaterial, PerspectiveCamera,
  PMREMGenerator, PointLight, Scene, SphereGeometry, Sprite, SpriteMaterial, Vector2, Vector3, WebGLRenderer,
} from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { createThreadCore, createThreadGlass } from './threadMaterial';
import { advancePassage, passageTrajectory } from './passageTrajectory';
import { RoundThread, THREAD_RADIUS } from './RoundThread';
import { TunnelCurve } from './TunnelCurve';
import { SceneLayout } from './SceneLayout';
import { SceneBufferResize } from './SceneBufferResize';
import { sampleSceneTheme, sceneThemes, type ThemeBlend, type SceneTheme } from '../../data/sceneThemes';

interface Options { reduced: boolean; onReady: () => void; onUnavailable: () => void }
interface Pose { shape: number; x: number; y: number; scale: number; angle: number; camera: number; visibility: number }
interface Stop { at: number; pose: Pose; phase: string }
const clamp = (n: number) => Math.max(0, Math.min(1, n));
const ease = (n: number) => { const t = clamp(n); return t * t * (3 - 2 * t); };
const mix = (a: number, b: number, t: number) => a + (b - a) * t;
const curve = (points: number[][]) => new CatmullRomCurve3(points.map(([x, y, z]) => new Vector3(x, y, z)), false, 'centripetal');
const poseKeys = ['shape', 'x', 'y', 'scale', 'angle', 'camera', 'visibility'] as const;
const viewHeight = 2 * 9.3 * Math.tan(19 * Math.PI / 180);

// Open ends stay open in every pose: one mesh can flow from loop to frame to helix.
export function createMiddleCurves() {
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
  return [strand, loop, frame, new TunnelCurve(), signal, arcade, strand];
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
  const pixelRatio = Math.min(devicePixelRatio || 1, host.clientWidth < 768 ? 1.25 : 1.6);
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

  const paths = createMiddleCurves();
  const segments = host.clientWidth < 768 ? 420 : 640;
  const cable = new RoundThread(paths.map(path => ({
    path, radius: THREAD_RADIUS, extension: 160,
    ...(path instanceof TunnelCurve ? { sample: (count: number) => path.sampleSpine(count) } : {}),
  })), segments);
  const poseWeights = paths.map(() => 0);
  const glass = createThreadGlass();
  const coreMaterial = createThreadCore();
  const shell = new Mesh(cable.shell, glass);
  const core = new Mesh(cable.core, coreMaterial);
  shell.frustumCulled = false; core.frustumCulled = false;
  const group = new Group();
  group.add(shell, core); scene.add(group);
  const key = new PointLight(0xb9dfff, 65, 28, 2);
  const blue = new PointLight(0x2878ff, 45, 22, 2);
  key.position.set(-2, 5, 6); blue.position.set(4, -2, 3);
  scene.add(key, blue);
  const beadGeometry = new SphereGeometry(0.042, 12, 8);
  const beadMaterial = new MeshBasicMaterial({ color: new Color('#c9eeff').multiplyScalar(5), toneMapped: false });
  const beads = Array.from({ length: 3 }, () => { const bead = new Mesh(beadGeometry, beadMaterial); group.add(bead); return bead; });
  const focalMaterial = new MeshBasicMaterial({ color: new Color('#c9eeff').multiplyScalar(3), toneMapped: false, fog: false });
  const focalPoint = new Mesh(beadGeometry, focalMaterial);
  focalPoint.position.set(0, 0, -68);
  group.add(focalPoint);
  // One small texture, created once. The halo sits at the real depth of the
  // light, so approaching it naturally increases its apparent size.
  const haloCanvas = document.createElement('canvas');
  haloCanvas.width = haloCanvas.height = 128;
  const haloContext = haloCanvas.getContext('2d');
  if (haloContext) {
    const gradient = haloContext.createRadialGradient(64, 64, 0, 64, 64, 64);
    gradient.addColorStop(0, '#ffffff');
    gradient.addColorStop(.12, '#ffffffa6');
    gradient.addColorStop(.4, '#ffffff33');
    gradient.addColorStop(1, '#ffffff00');
    haloContext.fillStyle = gradient; haloContext.fillRect(0, 0, 128, 128);
  }
  const haloTexture = new CanvasTexture(haloCanvas);
  const haloMaterial = new SpriteMaterial({ map: haloTexture, color: '#67b3ff',
    blending: AdditiveBlending, depthWrite: false, fog: false, toneMapped: false });
  const halo = new Sprite(haloMaterial);
  halo.position.copy(focalPoint.position);
  group.add(halo);
  const tint = new Color();
  const tintTargets = [
    { material: glass.color, tone: 'glass', strength: 1 },
    { material: glass.emissive, tone: 'emissive', strength: 1 },
    { material: coreMaterial.color, tone: 'core', strength: 3.4 },
    { material: key.color, tone: 'key', strength: 1 },
    { material: blue.color, tone: 'rim', strength: 1 },
    { material: haloMaterial.color, tone: 'halo', strength: 1 },
    { material: beadMaterial.color, tone: 'bead', strength: 5 },
    { material: focalMaterial.color, tone: 'bead', strength: 3 },
  ].map(({ material, tone, strength }) => ({
    material, strength,
    colors: Object.fromEntries(Object.entries(sceneThemes).map(([theme, palette]) =>
      [theme, new Color(palette[tone as keyof typeof palette])])) as Record<SceneTheme, Color>,
  }));
  let themeBlend: ThemeBlend = { from: 'blue', to: 'blue', progress: 1 };
  let snapTint = true;
  const composer = new EffectComposer(renderer);
  const bloom = new UnrealBloomPass(new Vector2(1, 1), 0.3, 0.55, 1.05);
  const output = new OutputPass();
  composer.addPass(new RenderPass(scene, camera)); composer.addPass(bloom); composer.addPass(output);

  let width = 1;
  let height = 1;
  let frameId = 0;
  let needsMeasure = true;
  let lastTime = 0;
  let elapsed = 0;
  let compiled = false;
  let visible = false;
  let unavailable = false;
  let disposed = false;
  let playing = false;
  let signalPosition = 2;
  let signalRunning = false;
  let signalPulse = .56;
  let narSaved = false;
  let passageProgress = 0;
  let passageTarget = 0;
  let passageEnabled = false;
  let passageInView = false;
  let passageHelix: Pose;
  let passageSignal: Pose;
  let phase = 'arrival';
  const passageElement = root.querySelector<HTMLElement>('#connections');
  const narElement = root.querySelector<HTMLElement>('.nar-world');
  const signalElement = root.querySelector<HTMLElement>('.signal-world');
  const perspectiveElement = root.querySelector<HTMLElement>('[data-perspective]');
  const layout = new SceneLayout(root, ['#method', '#nar', '#connections', '#trendyol', '#blaster', '#journey',
    '.perspective-art', '.nar-world__stage', '.signal-world__constellation',
    '.mini-blaster__arena, .blaster-runtime-poster', '.thread-passage__sticky', '.life-story__place']);
  const properties = new Map<string, string>();
  const setProperty = (element: HTMLElement, name: string, value: string) => {
    if (properties.get(name) === value) return;
    properties.set(name, value);
    element.style.setProperty(name, value);
  };
  let target: Pose = { shape: 1, x: 0.74, y: 0.4, scale: 1, angle: 0, camera: 9.3, visibility: 1 };
  let current = { ...target };
  let firstMeasure = true;
  let firstRender = true;
  const pointer = new Vector2();
  const pointerSoft = new Vector2();

  // A scroll changes coordinates, not layout. Only dirty content/size changes
  // enter the DOM-reading batch; the remaining work uses cached document bounds.
  const measure = () => {
    needsMeasure = false;
    if (disposed) return;
    const scroll = window.scrollY;
    const phone = width < 960;
    layout.refresh(scroll);
    const bounds = (selector: string) => layout.bounds(selector, scroll);
    const method = bounds('#method');
    const nar = bounds('#nar');
    const passage = bounds('#connections');
    const tracker = bounds('#trendyol');
    const blaster = bounds('#blaster');
    const journey = bounds('#journey');
    if (!method || !nar || !passage || !tracker || !blaster || !journey) return;
    themeBlend = sampleSceneTheme(scroll + height * .42, [
      { at: nar.top + scroll, theme: 'nar' },
      { at: nar.top + nar.height + scroll, theme: 'blue' },
      { at: tracker.top + scroll, theme: 'trendyol' },
      { at: blaster.top + scroll, theme: 'blaster' },
      { at: journey.top + scroll, theme: 'blue' },
    ], height * .45);
    const anchored = (selector: string, shape: number, size = 1, span = 4.6): Pose => {
      const rect = bounds(selector);
      if (!rect) return { shape, x: 0.72, y: 0.5, scale: 1, angle: 0, camera: 9.3, visibility: 1 };
      return { shape, x: (rect.left + rect.width / 2) / width, y: (rect.top + rect.height / 2) / height,
        scale: rect.width / width * viewHeight * camera.aspect / span * size, angle: 0, camera: 9.3, visibility: 1 };
    };
    const about = anchored('.perspective-art', 1, phone ? 0.82 : 0.94);
    about.y -= phone ? 0 : 0.025;
    const selected = perspectiveElement?.dataset.perspective;
    about.angle = selected === 'think' ? 0.2 : selected === 'people' ? -0.2 : -0.06;
    const windowFrame = anchored('.nar-world__stage', 2, phone ? .98 : .86);
    windowFrame.y -= phone ? .03 : .05;
    windowFrame.angle = [-.12, .06, .18][Number(narElement?.dataset.step) || 0]!;
    const signal = anchored('.signal-world__constellation', 4, phone ? 1.15 : 1, 12);
    if (phone) { signal.angle = -.95; signal.scale *= 2; }
    const arcade = anchored('.mini-blaster__arena, .blaster-runtime-poster', 5, 1.02);
    if (!phone) arcade.y -= .025;
    const passageSticky = bounds('.thread-passage__sticky');
    const compact = height < 650;
    const helix: Pose = { shape: 3, x: compact ? .74 : phone ? .54 : .72, y: compact ? .5 : phone ? .72 : .52,
      scale: compact ? Math.min(.8, width / height * .35) : phone ? .5 : Math.min(1.14, width / height * .7), angle: 0, camera: 9.3, visibility: 1 };
    helix.y += (passageSticky?.top ?? 0) / height;
    const exit = anchored('.life-story__place', 6, 0.8);
    // Journey has a quieter trailing strand at the outside edge of the composition.
    exit.x = phone ? 1.04 : 0.93; exit.scale = phone ? 0.65 : 0.9;
    exit.y = (journey.top + Math.min(journey.height * 0.45, height * 0.8)) / height;
    const top = (rect: { top: number }) => rect.top + scroll;
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
    phase = t < 0.5 ? prev.phase : next.phase;
    passageTarget = clamp((scroll - top(passage)) / Math.max(1, travel));
    passageEnabled = !options.reduced && travel > 1;
    passageInView = scroll >= top(passage) && scroll < top(passage) + travel;
    // Finish an unseen handoff when a scrollbar jump skips the whole passage;
    // its delayed camera must never replace an unrelated visible project.
    if (passage.top >= height || passage.top + passage.height <= 0) passageProgress = passageTarget;
    passageHelix = helix;
    passageSignal = signal;
    if (narElement) {
      setProperty(narElement, '--nar-drift', (clamp((height - nar.top) / (height + nar.height)) - .5).toFixed(4));
      narSaved = narElement.dataset.saved === 'true';
    }
    signalPosition = Number(signalElement?.dataset.signalPosition ?? 2);
    signalRunning = signalElement?.classList.contains('is-running') ?? false;
    if (options.reduced) { target.shape = Math.round(target.shape); target.camera = 9.3; }
    // Direct anchor navigation should land in its final composition immediately.
    if (firstMeasure || options.reduced) {
      current = { ...target }; passageProgress = passageTarget; firstMeasure = false; snapTint = true;
    }
    playing = Boolean(root.querySelector('.mini-blaster[data-phase="running"]'));
  };

  const render = (time: number) => {
    frameId = 0;
    if (disposed || unavailable || !compiled || (!visible && !firstRender) || document.hidden || isSceneRenderingSuspended()) return;
    if (needsMeasure) measure();
    const dt = lastTime ? Math.min((time - lastTime) / 1000, 0.1) : 0.016;
    lastTime = time;
    if (!options.reduced && !playing) elapsed += dt;
    const damp = options.reduced || playing ? 1 : 1 - Math.exp(-dt * 10);
    const tintDamp = snapTint || options.reduced || playing ? 1 : 1 - Math.exp(-dt * 6);
    for (const entry of tintTargets) {
      tint.copy(entry.colors[themeBlend.from]).lerp(entry.colors[themeBlend.to], themeBlend.progress).multiplyScalar(entry.strength);
      entry.material.lerp(tint, tintDamp);
    }
    snapTint = false;
    const threadColor = `#${glass.color.getHexString()}`;
    if (canvas.dataset.threadColor !== threadColor) canvas.dataset.threadColor = threadColor;
    for (const key of poseKeys) current[key] = mix(current[key], target[key], damp);
    passageProgress = options.reduced ? passageTarget : advancePassage(passageProgress, passageTarget, dt);
    const trip = passageTrajectory(passageProgress, passageHelix?.scale ?? 1);
    const traversing = passageEnabled && (passageInView || (passageProgress > 0 && passageProgress < 1));
    if (traversing) {
      // One displayed progress drives the whole handoff. Switch camera spaces
      // atomically in the hidden interval, never by morphing an interior helix.
      Object.assign(current, trip.field ? passageSignal : passageHelix);
      if (!trip.field) {
        current.x = mix(passageHelix.x, .5, trip.centered);
        current.y = mix(passageHelix.y, .5, trip.centered);
        current.angle = -.2 * trip.centered;
      }
      current.camera = trip.camera;
      current.visibility = trip.visibility;
    }
    const renderPhase = traversing ? trip.phase : phase;
    if (canvas.dataset.phase !== renderPhase) canvas.dataset.phase = renderPhase;
    setProperty(root, '--tracker-reveal', (passageEnabled ? trip.reveal : 1).toFixed(4));
    setProperty(root, '--tracker-events', passageEnabled && trip.reveal < .1 ? 'none' : 'auto');
    setProperty(root, '--passage-light', (traversing ? trip.light : 0).toFixed(4));
    if (passageElement) {
      setProperty(passageElement, '--passage-copy', (passageEnabled ? trip.copy : 1).toFixed(4));
      setProperty(passageElement, '--passage-skip', (passageEnabled ? 1 - ease((passageProgress - .78) / .22) : 1).toFixed(4));
    }
    pointerSoft.lerp(pointer, damp * 0.45);
    const lower = Math.min(paths.length - 1, Math.floor(current.shape));
    const upper = Math.min(paths.length - 1, lower + 1);
    const blend = current.shape - lower;
    poseWeights.fill(0);
    poseWeights[lower] = 1 - blend;
    poseWeights[upper] = (poseWeights[upper] ?? 0) + blend;
    cable.update(poseWeights);
    camera.position.set(0, 0, current.camera);
    group.position.set((current.x - 0.5) * viewHeight * camera.aspect, (0.5 - current.y) * viewHeight, 0);
    group.scale.setScalar(current.scale);
    const tunnel = Math.max(0, 1 - Math.abs(current.shape - 3));
    const approach = ease((9.3 - current.camera) / Math.max(1, 9.3 + 60 * current.scale));
    focalPoint.visible = halo.visible = tunnel > 0.01;
    focalPoint.scale.setScalar(tunnel * mix(2.8, 4.2, approach));
    halo.scale.setScalar(mix(4.5, 8, approach));
    haloMaterial.opacity = tunnel * mix(.3, .55, approach);
    // The same light carries over the hidden camera reset into Trendyol.
    // It lives outside the fading canvas and never covers the scene with white.
    const opacity = current.visibility.toFixed(3);
    const depth = current.camera.toFixed(2);
    if (canvas.style.opacity !== opacity) canvas.style.opacity = opacity;
    if (canvas.dataset.cameraZ !== depth) canvas.dataset.cameraZ = depth;
    // Keep illumination with the viewer inside the long tube.
    key.position.z = mix(6, current.camera + 2, tunnel);
    blue.position.z = mix(3, current.camera - 2, tunnel);
    // Aim the mouth at the viewer while it sits beside/below the copy. The axis
    // straightens as the entrance centers, keeping its light visible throughout.
    group.rotation.set(pointerSoft.y * 0.06 * (1 - tunnel) + Math.atan2(group.position.y, 9.3) * tunnel,
      pointerSoft.x * 0.1 * (1 - tunnel) - Math.atan2(group.position.x, 9.3) * tunnel,
      current.angle + (options.reduced ? 0 : Math.sin(elapsed * 0.24) * 0.025 * (1 - tunnel)));
    const signalWeight = Math.max(0, 1 - Math.abs(current.shape - 4));
    const pulseTarget = [.04, .14, .38, .42, .72][Math.max(0, Math.min(4, signalPosition + 1))]!;
    signalPulse = mix(signalPulse, pulseTarget, options.reduced ? 1 : 1 - Math.exp(-dt * 6));
    beads.forEach((bead, index) => {
      const t = signalWeight > .98 ? (index === 0 ? signalPulse : index === 1 ? .17 : .64)
        : (elapsed * 0.04 + index / 3 + 0.08) % 1;
      bead.scale.setScalar(signalWeight > .98 ? (index === 0 ? (signalRunning ? 2.8 : 1.8) : .6) : narSaved && lower === 2 ? 1.6 : 1);
      cable.getPointAt(t, bead.position);
    });
    bloom.strength = 0.28 + tunnel * 0.1;
    try {
      bufferResize.flush((nextWidth, nextHeight) => {
        renderer.setSize(nextWidth, nextHeight, false);
        composer.setSize(nextWidth, nextHeight);
      });
      composer.render(dt);
    }
    catch { fail(); return; }
    reportSceneFrame(host);
    if (firstRender) { firstRender = false; options.onReady(); }
    if (visible && !options.reduced && !playing && document.documentElement.dataset.siteLoading !== 'true') frameId = requestAnimationFrame(render);
  };
  const schedule = () => {
    if (!frameId && !disposed && !unavailable && compiled && (visible || firstRender) && !document.hidden && !isSceneRenderingSuspended()) frameId = requestAnimationFrame(render);
  };
  const bufferResize = new SceneBufferResize(schedule);
  const requestMeasure = () => { needsMeasure = true; schedule(); };
  const invalidateLayout = () => { layout.dirty = true; requestMeasure(); };
  const jump = () => { firstMeasure = true; requestMeasure(); };
  const resize = () => {
    const nextWidth = host.clientWidth, nextHeight = host.clientHeight;
    if (!nextWidth || !nextHeight) return;
    if (width !== nextWidth || height !== nextHeight) {
      if (width > 1 && height > 1 && (width > height) !== (nextWidth > nextHeight)) {
        firstMeasure = true;
        pointer.set(0, 0); pointerSoft.set(0, 0);
        lastTime = 0;
      }
      width = nextWidth; height = nextHeight;
      camera.aspect = width / height; camera.updateProjectionMatrix();
      bufferResize.request(width, height);
    }
    invalidateLayout();
  };
  const move = (event: PointerEvent) => {
    if (event.pointerType !== 'mouse' || options.reduced) return;
    pointer.set((event.clientX / width - 0.5) * 2, (event.clientY / height - 0.5) * 2);
  };
  const leave = () => pointer.set(0, 0);
  const visibility = () => {
    lastTime = 0;
    if (document.hidden || isSceneRenderingSuspended()) { cancelAnimationFrame(frameId); frameId = 0; } else requestMeasure();
  };
  const fail = () => { unavailable = true; cancelAnimationFrame(frameId); frameId = 0; options.onUnavailable(); };
  const contextLost = (event: Event) => { event.preventDefault(); fail(); };
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(host);
  const layoutObserver = new ResizeObserver(invalidateLayout);
  layoutObserver.observe(root);
  root.querySelectorAll('#method, .project, #connections, #journey, .personal-intro__sticky').forEach((element) => layoutObserver.observe(element));
  const observer = new IntersectionObserver(([entry]) => {
    visible = entry?.isIntersecting ?? false;
    lastTime = 0;
    if (visible) requestMeasure(); else if (!firstRender) { cancelAnimationFrame(frameId); frameId = 0; }
  });
  observer.observe(root);
  const mutations = new MutationObserver(records => {
    if (records.some(record => record.type === 'childList')) invalidateLayout();
    else if (records.some(record => record.target !== canvas)) requestMeasure();
  });
  mutations.observe(root, { subtree: true, childList: true, attributes: true, attributeFilter: ['data-phase', 'data-perspective', 'data-step', 'data-saved', 'data-signal-position', 'data-outcome', 'data-handoff'] });
  root.addEventListener('pointermove', move, { passive: true }); root.addEventListener('pointerleave', leave);
  window.addEventListener('scroll', requestMeasure, { passive: true });
  document.addEventListener('visibilitychange', visibility);
  window.addEventListener(controlOverlayEvent, visibility);
  window.addEventListener(sceneJumpEvent, jump);
  canvas.addEventListener('webglcontextlost', contextLost);
  resize();
  void renderer.compileAsync(scene, camera).then(() => {
    if (disposed || unavailable) return;
    compiled = true;
    schedule();
  }).catch(() => { if (!disposed) fail(); });

  return () => {
    disposed = true; cancelAnimationFrame(frameId);
    bufferResize.dispose();
    observer.disconnect(); resizeObserver.disconnect(); layoutObserver.disconnect(); mutations.disconnect();
    root.removeEventListener('pointermove', move); root.removeEventListener('pointerleave', leave);
    window.removeEventListener('scroll', requestMeasure); document.removeEventListener('visibilitychange', visibility);
    window.removeEventListener(controlOverlayEvent, visibility);
    window.removeEventListener(sceneJumpEvent, jump);
    canvas.removeEventListener('webglcontextlost', contextLost);
    shell.geometry.dispose(); core.geometry.dispose(); glass.dispose(); coreMaterial.dispose();
    beadGeometry.dispose(); beadMaterial.dispose(); focalMaterial.dispose(); haloMaterial.dispose(); haloTexture.dispose();
    root.style.removeProperty('--passage-light');
    environment.dispose(); bloom.dispose(); output.dispose(); composer.dispose();
    renderer.dispose(); renderer.forceContextLoss(); canvas.remove();
  };
}
