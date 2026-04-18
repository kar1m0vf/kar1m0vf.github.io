const workerState = {
  canvas: null,
  context: null,
  width: 0,
  height: 0,
  dpr: 1,
  mode: 'lite',
  tier: 'lite',
  visible: true,
  pointerReactive: false,
  lastTick: 0,
  rafId: 0,
  destroyed: false,
  particles: [],
  theme: 'light',
  themeColor: { dot: '79, 125, 255', line: '79, 125, 255' },
};

const pointerState = {
  x: 0,
  y: 0,
  targetX: 0,
  targetY: 0,
  active: false,
  influence: 0,
  targetInfluence: 0,
  lastMove: 0,
};

const requestFrame = typeof self.requestAnimationFrame === 'function'
  ? self.requestAnimationFrame.bind(self)
  : (callback) => self.setTimeout(() => callback(performance.now()), 16);

const cancelFrame = typeof self.cancelAnimationFrame === 'function'
  ? self.cancelAnimationFrame.bind(self)
  : (id) => self.clearTimeout(id);

const smooth = (from, to, amount) => from + (to - from) * amount;
const randomBetween = (min, max) => min + Math.random() * (max - min);

const getConfig = () =>
  workerState.mode === 'full'
    ? {
        density: 17500,
        minCount: 30,
        maxCount: 74,
        fps: 30,
        speed: 0.24,
        jitter: 0.0054,
        pointerRadius: 132,
        pointerForce: 0.044,
        pointerSwirl: 0.012,
        linkDistance: 64,
        maxLinksPerParticle: 4,
        dotMin: 0.8,
        dotMax: 1.6,
      }
    : {
        density: 36000,
        minCount: 10,
        maxCount: 24,
        fps: 16,
        speed: 0.17,
        jitter: 0.0038,
        pointerRadius: 112,
        pointerForce: 0.028,
        pointerSwirl: 0.007,
        linkDistance: 0,
        maxLinksPerParticle: 0,
        dotMin: 0.8,
        dotMax: 1.35,
      };

const updateThemeColor = () => {
  workerState.themeColor =
    workerState.theme === 'dark'
      ? { dot: '155, 188, 255', line: '155, 188, 255' }
      : { dot: '79, 125, 255', line: '79, 125, 255' };
};

const createParticle = () => {
  const config = getConfig();
  return {
    x: Math.random() * workerState.width,
    y: Math.random() * workerState.height,
    vx: randomBetween(-config.speed, config.speed),
    vy: randomBetween(-config.speed, config.speed),
    wobble: randomBetween(0.65, 1.25),
    phase: randomBetween(0, Math.PI * 2),
    size: randomBetween(config.dotMin, config.dotMax),
    alpha: randomBetween(workerState.theme === 'dark' ? 0.22 : 0.24, workerState.theme === 'dark' ? 0.62 : 0.7),
  };
};

const syncParticleCount = () => {
  const config = getConfig();
  const targetCount = Math.max(
    config.minCount,
    Math.min(config.maxCount, Math.round((Math.max(workerState.width, 1) * Math.max(workerState.height, 1)) / config.density))
  );

  if (workerState.particles.length > targetCount) {
    workerState.particles.length = targetCount;
    return;
  }

  while (workerState.particles.length < targetCount) {
    workerState.particles.push(createParticle());
  }
};

const resizeCanvas = (width, height, dpr) => {
  if (!workerState.canvas || !workerState.context) {
    return;
  }
  workerState.width = Math.max(1, Math.round(width));
  workerState.height = Math.max(1, Math.round(height));
  workerState.dpr = Math.max(1, Math.min(dpr || 1, 1.8));
  workerState.canvas.width = Math.max(1, Math.round(workerState.width * workerState.dpr));
  workerState.canvas.height = Math.max(1, Math.round(workerState.height * workerState.dpr));
  workerState.context.setTransform(workerState.dpr, 0, 0, workerState.dpr, 0, 0);
  syncParticleCount();
};

const stepParticles = (delta) => {
  const config = getConfig();
  const pointerEnabled = workerState.pointerReactive && workerState.mode === 'full' && workerState.tier === 'full';
  const pointerRadiusSq = config.pointerRadius * config.pointerRadius;

  if (pointerState.active || pointerState.influence > 0.01) {
    const pointerEase = Math.min(0.16 * delta, 0.42);
    pointerState.x = smooth(pointerState.x, pointerState.targetX, pointerEase);
    pointerState.y = smooth(pointerState.y, pointerState.targetY, pointerEase);
  }

  workerState.particles.forEach((particle) => {
    particle.phase += 0.011 * particle.wobble * delta;
    particle.vx += Math.sin(particle.phase) * config.jitter * delta;
    particle.vy += Math.cos(particle.phase * 1.12) * config.jitter * delta;

    if (pointerEnabled && pointerState.influence > 0.01) {
      const dx = pointerState.x - particle.x;
      const dy = pointerState.y - particle.y;
      const distSq = dx * dx + dy * dy;
      if (distSq > 0.0001 && distSq < pointerRadiusSq) {
        const dist = Math.sqrt(distSq);
        const influence = 1 - dist / config.pointerRadius;
        const eased = influence * influence;
        const nx = dx / dist;
        const ny = dy / dist;
        const attract = eased * config.pointerForce * delta * pointerState.influence;
        const swirl = eased * config.pointerSwirl * delta * pointerState.influence;
        particle.vx += nx * attract - ny * swirl;
        particle.vy += ny * attract + nx * swirl;
      }
    }

    particle.vx *= 0.99;
    particle.vy *= 0.99;
    const maxVelocity = config.speed * 1.85;
    const velocitySq = particle.vx * particle.vx + particle.vy * particle.vy;
    if (velocitySq > maxVelocity * maxVelocity) {
      const ratio = maxVelocity / Math.sqrt(velocitySq);
      particle.vx *= ratio;
      particle.vy *= ratio;
    } else if (velocitySq < 0.0006) {
      particle.vx += Math.sin(particle.phase * 1.7) * 0.0038;
      particle.vy += Math.cos(particle.phase * 1.5) * 0.0038;
    }

    particle.x += particle.vx * delta;
    particle.y += particle.vy * delta;

    if (particle.x < -12) particle.x = workerState.width + 12;
    if (particle.x > workerState.width + 12) particle.x = -12;
    if (particle.y < -12) particle.y = workerState.height + 12;
    if (particle.y > workerState.height + 12) particle.y = -12;
  });
};

const drawParticles = () => {
  if (!workerState.context) {
    return;
  }
  const config = getConfig();
  workerState.context.clearRect(0, 0, workerState.width, workerState.height);

  workerState.particles.forEach((particle) => {
    workerState.context.fillStyle = `rgba(${workerState.themeColor.dot}, ${particle.alpha.toFixed(3)})`;
    workerState.context.beginPath();
    workerState.context.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
    workerState.context.fill();
  });

  if (config.linkDistance <= 0) {
    return;
  }

  const maxDistanceSq = config.linkDistance * config.linkDistance;
  for (let i = 0; i < workerState.particles.length; i += 1) {
    const a = workerState.particles[i];
    let linksForParticle = 0;
    for (let j = i + 1; j < workerState.particles.length; j += 1) {
      const b = workerState.particles[j];
      const dx = a.x - b.x;
      const dy = a.y - b.y;
      const distSq = dx * dx + dy * dy;
      if (distSq >= maxDistanceSq) {
        continue;
      }

      const alphaBase = workerState.theme === 'dark' ? 0.16 : 0.13;
      const linkAlpha = (1 - distSq / maxDistanceSq) * alphaBase;
      workerState.context.strokeStyle = `rgba(${workerState.themeColor.line}, ${linkAlpha.toFixed(3)})`;
      workerState.context.lineWidth = 1;
      workerState.context.beginPath();
      workerState.context.moveTo(a.x, a.y);
      workerState.context.lineTo(b.x, b.y);
      workerState.context.stroke();

      linksForParticle += 1;
      if (linksForParticle >= config.maxLinksPerParticle) {
        break;
      }
    }
  }
};

const animate = (now) => {
  workerState.rafId = requestFrame(animate);
  if (workerState.destroyed || !workerState.visible || workerState.tier === 'off') {
    workerState.lastTick = now;
    return;
  }

  if (!workerState.lastTick) {
    workerState.lastTick = now;
  }

  const config = getConfig();
  const frameInterval = 1000 / config.fps;
  const activeFrameInterval = workerState.tier === 'lite' ? Math.max(frameInterval, 1000 / 14) : frameInterval;
  const elapsed = now - workerState.lastTick;
  if (elapsed < activeFrameInterval) {
    return;
  }

  workerState.lastTick = now;
  const delta = Math.min(elapsed / 16.666, 2.4);
  if (pointerState.active && now - pointerState.lastMove > 180) {
    pointerState.targetInfluence = 0;
  }

  pointerState.influence = smooth(pointerState.influence, pointerState.targetInfluence, Math.min(0.2 * delta, 0.36));
  if (pointerState.influence < 0.015 && pointerState.targetInfluence === 0) {
    pointerState.active = false;
  }

  stepParticles(delta);
  drawParticles();
};

const ensureLoop = () => {
  if (workerState.rafId) {
    return;
  }
  workerState.rafId = requestFrame(animate);
};

const shutdown = () => {
  workerState.destroyed = true;
  if (workerState.rafId) {
    cancelFrame(workerState.rafId);
    workerState.rafId = 0;
  }
  workerState.particles.length = 0;
  workerState.canvas = null;
  workerState.context = null;
};

self.onmessage = (event) => {
  const payload = event.data || {};
  const type = payload.type;

  if (type === 'init') {
    workerState.destroyed = false;
    workerState.canvas = payload.canvas || null;
    workerState.context = workerState.canvas ? workerState.canvas.getContext('2d', { alpha: true, desynchronized: true }) : null;
    if (!workerState.context) {
      return;
    }
    workerState.mode = payload.mode === 'full' ? 'full' : 'lite';
    workerState.pointerReactive = Boolean(payload.pointerReactive);
    workerState.tier = payload.tier === 'full' || payload.tier === 'off' ? payload.tier : 'lite';
    workerState.theme = payload.theme === 'dark' ? 'dark' : 'light';
    workerState.visible = payload.visible !== false;
    updateThemeColor();
    resizeCanvas(1, 1, 1);
    ensureLoop();
    return;
  }

  if (type === 'resize') {
    resizeCanvas(payload.width, payload.height, payload.dpr);
    return;
  }

  if (type === 'theme') {
    workerState.theme = payload.theme === 'dark' ? 'dark' : 'light';
    updateThemeColor();
    return;
  }

  if (type === 'tier') {
    workerState.tier = payload.tier === 'full' || payload.tier === 'off' ? payload.tier : 'lite';
    return;
  }

  if (type === 'visibility') {
    workerState.visible = !payload.hidden;
    if (workerState.visible) {
      workerState.lastTick = 0;
    }
    return;
  }

  if (type === 'pointer') {
    if (payload.kind === 'leave') {
      pointerState.targetInfluence = 0;
      return;
    }
    if (!workerState.pointerReactive || workerState.mode !== 'full' || workerState.tier !== 'full') {
      return;
    }
    pointerState.targetX = Number(payload.x) || 0;
    pointerState.targetY = Number(payload.y) || 0;
    if (!pointerState.active) {
      pointerState.x = pointerState.targetX;
      pointerState.y = pointerState.targetY;
    }
    pointerState.active = true;
    pointerState.lastMove = performance.now();
    pointerState.targetInfluence = 1;
    return;
  }

  if (type === 'shutdown') {
    shutdown();
  }
};

