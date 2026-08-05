import type {
  EnemyState,
  GameState,
  GameViewport,
  ImpactState,
  MiniBlasterAssets,
  ProjectileState,
} from './types';

interface RenderOptions {
  reducedEffects: boolean;
}

interface Star {
  brightness: number;
  depth: number;
  x: number;
  y: number;
}

function createStars(count: number): readonly Star[] {
  let seed = 0x4b414d49;
  const random = () => {
    seed = (seed * 1_664_525 + 1_013_904_223) >>> 0;
    return seed / 0x1_0000_0000;
  };

  return Array.from({ length: count }, () => ({
    brightness: 0.28 + random() * 0.72,
    depth: 0.35 + random() * 0.9,
    x: random(),
    y: random() * 0.76,
  }));
}

const stars = createStars(86);

function drawBackground(
  context: CanvasRenderingContext2D,
  state: GameState,
  width: number,
  height: number,
  reducedEffects: boolean,
): void {
  const unit = Math.min(width, height);
  const background = context.createLinearGradient(0, 0, 0, height);
  background.addColorStop(0, '#02050d');
  background.addColorStop(0.58, '#040713');
  background.addColorStop(1, '#02060d');
  context.fillStyle = background;
  context.fillRect(0, 0, width, height);

  const glow = context.createRadialGradient(
    width * 0.52,
    height * 0.22,
    0,
    width * 0.52,
    height * 0.22,
    unit * 0.62,
  );
  glow.addColorStop(0, 'rgba(174, 68, 198, 0.12)');
  glow.addColorStop(0.46, 'rgba(38, 121, 172, 0.055)');
  glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
  context.fillStyle = glow;
  context.fillRect(0, 0, width, height);

  const starOffset = reducedEffects ? 0 : (state.elapsedMs / 24_000);
  stars.forEach((star) => {
    const y = ((star.y + starOffset * star.depth) % 0.78) * height;
    const radius = Math.max(0.55, unit * 0.0016 * star.depth);
    context.globalAlpha = star.brightness;
    context.fillStyle = star.depth > 0.8 ? '#8cefff' : '#c8c7ff';
    context.fillRect(star.x * width, y, radius, radius);
  });
  context.globalAlpha = 1;

  const horizon = height * 0.68;
  context.save();
  context.strokeStyle = 'rgba(37, 216, 238, 0.23)';
  context.lineWidth = Math.max(0.65, unit * 0.0012);

  for (let index = 0; index <= 12; index += 1) {
    const progress = index / 12;
    const eased = progress ** 1.72;
    const y = horizon + eased * (height - horizon);
    context.globalAlpha = 0.24 + progress * 0.52;
    context.beginPath();
    context.moveTo(0, y);
    context.lineTo(width, y);
    context.stroke();
  }

  context.globalAlpha = 0.7;
  for (let index = -8; index <= 8; index += 1) {
    context.beginPath();
    context.moveTo(width * 0.5, horizon);
    context.lineTo(width * 0.5 + index * width * 0.115, height);
    context.stroke();
  }
  context.restore();

  context.save();
  context.strokeStyle = 'rgba(255, 103, 201, 0.18)';
  context.lineWidth = Math.max(1, unit * 0.0022);
  context.beginPath();
  context.arc(width * 0.5, height * 0.22, unit * 0.26, Math.PI * 0.12, Math.PI * 0.88, true);
  context.stroke();
  context.restore();
}

function drawSprite(
  context: CanvasRenderingContext2D,
  image: HTMLImageElement,
  x: number,
  y: number,
  width: number,
  height: number,
  glow: string,
  alpha = 1,
): void {
  context.save();
  context.globalAlpha = alpha;
  context.shadowColor = glow;
  context.shadowBlur = Math.min(width, height) * 0.22;
  context.drawImage(image, x - width / 2, y - height / 2, width, height);
  context.restore();
}

function drawEnemy(
  context: CanvasRenderingContext2D,
  enemy: EnemyState,
  assets: MiniBlasterAssets,
  width: number,
  height: number,
): void {
  const unit = Math.min(width, height);
  if (enemy.kind === 'boss') {
    const size = unit * 0.29;
    const pulse = 1 + Math.sin(enemy.phase + enemy.hp * 0.4) * 0.012;
    drawSprite(
      context,
      assets.boss,
      enemy.x * width,
      enemy.y * height,
      size * pulse,
      size * pulse,
      'rgba(255, 99, 199, 0.76)',
    );

    const barWidth = Math.min(width * 0.46, unit * 0.7);
    const barX = width * 0.5 - barWidth / 2;
    const barY = Math.max(unit * 0.025, height * 0.025);
    context.fillStyle = 'rgba(3, 5, 13, 0.82)';
    context.fillRect(barX, barY, barWidth, Math.max(5, unit * 0.014));
    context.fillStyle = '#ff68c7';
    context.fillRect(barX, barY, barWidth * Math.max(0, enemy.hp / enemy.maxHp), Math.max(5, unit * 0.014));
    return;
  }

  const size = unit * 0.112;
  drawSprite(
    context,
    assets.drone,
    enemy.x * width,
    enemy.y * height,
    size,
    size,
    'rgba(83, 238, 235, 0.68)',
  );

  if (enemy.hp >= enemy.maxHp) return;
  const barWidth = size * 0.72;
  const barHeight = Math.max(2, unit * 0.005);
  const barX = enemy.x * width - barWidth / 2;
  const barY = enemy.y * height - size * 0.58;
  context.fillStyle = 'rgba(255, 255, 255, 0.16)';
  context.fillRect(barX, barY, barWidth, barHeight);
  context.fillStyle = '#55ebe8';
  context.fillRect(barX, barY, barWidth * (enemy.hp / enemy.maxHp), barHeight);
}

function drawEffectTile(
  context: CanvasRenderingContext2D,
  image: HTMLImageElement,
  column: 0 | 1,
  row: 0 | 1,
  x: number,
  y: number,
  width: number,
  height: number,
  alpha: number,
): void {
  const tileWidth = image.naturalWidth / 2;
  const tileHeight = image.naturalHeight / 2;
  context.save();
  context.globalAlpha = alpha;
  context.drawImage(
    image,
    tileWidth * column,
    tileHeight * row,
    tileWidth,
    tileHeight,
    x - width / 2,
    y - height / 2,
    width,
    height,
  );
  context.restore();
}

function drawProjectile(
  context: CanvasRenderingContext2D,
  projectile: ProjectileState,
  effects: HTMLImageElement,
  width: number,
  height: number,
): void {
  const unit = Math.min(width, height);
  const isPlayer = projectile.owner === 'player';
  drawEffectTile(
    context,
    effects,
    isPlayer ? 0 : 1,
    0,
    projectile.x * width,
    projectile.y * height,
    unit * (isPlayer ? 0.035 : 0.04),
    unit * (isPlayer ? 0.092 : 0.08),
    0.96,
  );
}

function drawImpact(
  context: CanvasRenderingContext2D,
  impact: ImpactState,
  effects: HTMLImageElement,
  width: number,
  height: number,
  reducedEffects: boolean,
): void {
  if (reducedEffects) return;
  const progress = Math.min(1, impact.ageMs / impact.durationMs);
  const unit = Math.min(width, height);
  const size = unit * impact.size * (0.72 + progress * 1.35);
  drawEffectTile(
    context,
    effects,
    impact.kind === 'cyan' ? 0 : 1,
    1,
    impact.x * width,
    impact.y * height,
    size,
    size,
    1 - progress,
  );
}

function drawPlayer(
  context: CanvasRenderingContext2D,
  state: GameState,
  playerImage: HTMLImageElement,
  width: number,
  height: number,
  reducedEffects: boolean,
): void {
  const unit = Math.min(width, height);
  const hit = state.player.invulnerableMs > 0;
  const flicker = hit && !reducedEffects && Math.floor(state.player.invulnerableMs / 90) % 2 === 0;
  const size = unit * 0.19;
  drawSprite(
    context,
    playerImage,
    state.player.x * width,
    state.player.y * height,
    size,
    size,
    'rgba(73, 235, 238, 0.76)',
    flicker ? 0.38 : hit ? 0.7 : 1,
  );
}

export function renderGame(
  canvas: HTMLCanvasElement,
  viewport: GameViewport,
  state: GameState,
  assets: MiniBlasterAssets,
  options: RenderOptions,
): void {
  const context = canvas.getContext('2d');
  if (!context || viewport.width <= 0 || viewport.height <= 0) return;

  context.setTransform(viewport.dpr, 0, 0, viewport.dpr, 0, 0);
  context.clearRect(0, 0, viewport.width, viewport.height);
  drawBackground(context, state, viewport.width, viewport.height, options.reducedEffects);

  state.enemies.forEach((enemy) => {
    drawEnemy(context, enemy, assets, viewport.width, viewport.height);
  });
  state.projectiles.forEach((projectile) => {
    drawProjectile(context, projectile, assets.effects, viewport.width, viewport.height);
  });
  state.impacts.forEach((impact) => {
    drawImpact(
      context,
      impact,
      assets.effects,
      viewport.width,
      viewport.height,
      options.reducedEffects,
    );
  });
  drawPlayer(
    context,
    state,
    assets.player,
    viewport.width,
    viewport.height,
    options.reducedEffects,
  );
}

