import {
  MINI_BLASTER_DURATION_MS,
  MINI_BLASTER_MAX_HULL,
} from './types';
import type {
  EnemyState,
  GameState,
  HudSnapshot,
  ImpactState,
  InputState,
  ProjectileState,
  RunResult,
} from './types';

interface SpawnEvent {
  at: number;
  drift: number;
  phase: number;
  speedY: number;
  type: 'drone' | 'boss';
  x: number;
}

const spawnSchedule: readonly SpawnEvent[] = [
  { at: 450, drift: 0.05, phase: 0.2, speedY: 0.115, type: 'drone', x: 0.18 },
  { at: 850, drift: 0.06, phase: 2.5, speedY: 0.12, type: 'drone', x: 0.5 },
  { at: 1_250, drift: 0.05, phase: 4.7, speedY: 0.115, type: 'drone', x: 0.82 },
  { at: 2_350, drift: 0.08, phase: 1.4, speedY: 0.125, type: 'drone', x: 0.3 },
  { at: 2_750, drift: 0.08, phase: 4.1, speedY: 0.125, type: 'drone', x: 0.7 },
  { at: 4_550, drift: 0.045, phase: 0.4, speedY: 0.145, type: 'drone', x: 0.14 },
  { at: 4_780, drift: 0.055, phase: 1.8, speedY: 0.14, type: 'drone', x: 0.38 },
  { at: 5_010, drift: 0.055, phase: 3.3, speedY: 0.14, type: 'drone', x: 0.62 },
  { at: 5_240, drift: 0.045, phase: 5.1, speedY: 0.145, type: 'drone', x: 0.86 },
  { at: 6_650, drift: 0.12, phase: 2.3, speedY: 0.135, type: 'drone', x: 0.28 },
  { at: 6_950, drift: 0.12, phase: 5.5, speedY: 0.135, type: 'drone', x: 0.72 },
  { at: 8_900, drift: 0.18, phase: 0, speedY: 0.18, type: 'boss', x: 0.5 },
] as const;

const clamp = (value: number, minimum: number, maximum: number) => (
  Math.min(maximum, Math.max(minimum, value))
);

const distanceSquared = (ax: number, ay: number, bx: number, by: number) => (
  ((ax - bx) ** 2) + ((ay - by) ** 2)
);

const createInput = (): InputState => ({
  down: false,
  left: false,
  pointerActive: false,
  right: false,
  targetX: 0.5,
  targetY: 0.86,
  up: false,
});

export function createInputState(): InputState {
  return createInput();
}

export function resetInputState(input: InputState): void {
  const initial = createInput();
  Object.assign(input, initial);
}

export function createGameState(): GameState {
  return {
    bossDestroyed: false,
    elapsedMs: 0,
    enemies: [],
    hull: MINI_BLASTER_MAX_HULL,
    impacts: [],
    nextEntityId: 1,
    nextPlayerShotAt: 120,
    player: {
      invulnerableMs: 0,
      x: 0.5,
      y: 0.86,
    },
    projectiles: [],
    result: null,
    score: 0,
    spawnCursor: 0,
  };
}

function nextId(state: GameState): number {
  const id = state.nextEntityId;
  state.nextEntityId += 1;
  return id;
}

function spawnEnemy(state: GameState, event: SpawnEvent): void {
  const isBoss = event.type === 'boss';
  state.enemies.push({
    alive: true,
    baseX: event.x,
    drift: event.drift,
    hp: isBoss ? 22 : 2,
    id: nextId(state),
    kind: event.type,
    maxHp: isBoss ? 22 : 2,
    nextShotAt: event.at + (isBoss ? 720 : 1_150 + Math.round(event.x * 650)),
    phase: event.phase,
    speedY: event.speedY,
    x: event.x,
    y: isBoss ? -0.2 : -0.09,
  });
}

function addProjectile(
  state: GameState,
  owner: ProjectileState['owner'],
  x: number,
  y: number,
  vx: number,
  vy: number,
): void {
  state.projectiles.push({ alive: true, id: nextId(state), owner, vx, vy, x, y });
}

function addImpact(
  state: GameState,
  kind: ImpactState['kind'],
  x: number,
  y: number,
  size: number,
): void {
  state.impacts.push({
    ageMs: 0,
    durationMs: 430,
    id: nextId(state),
    kind,
    size,
    x,
    y,
  });
}

function movePlayer(state: GameState, input: InputState, deltaSeconds: number): void {
  const player = state.player;
  const speed = 0.62;

  if (input.pointerActive) {
    const dx = input.targetX - player.x;
    const dy = input.targetY - player.y;
    const distance = Math.hypot(dx, dy);
    const maximumStep = speed * 1.45 * deltaSeconds;
    const ratio = distance > maximumStep && distance > 0 ? maximumStep / distance : 1;
    player.x += dx * ratio;
    player.y += dy * ratio;
  } else {
    const horizontal = Number(input.right) - Number(input.left);
    const vertical = Number(input.down) - Number(input.up);
    const magnitude = Math.hypot(horizontal, vertical) || 1;
    player.x += (horizontal / magnitude) * speed * deltaSeconds;
    player.y += (vertical / magnitude) * speed * deltaSeconds;
  }

  player.x = clamp(player.x, 0.055, 0.945);
  player.y = clamp(player.y, 0.64, 0.925);
}

function firePlayerWeapon(state: GameState): void {
  while (state.elapsedMs >= state.nextPlayerShotAt) {
    addProjectile(state, 'player', state.player.x, state.player.y - 0.055, 0, -0.92);
    state.nextPlayerShotAt += 175;
  }
}

function updateEnemies(state: GameState, deltaSeconds: number): void {
  state.enemies.forEach((enemy) => {
    if (!enemy.alive) return;

    if (enemy.kind === 'boss') {
      if (enemy.y < 0.185) enemy.y = Math.min(0.185, enemy.y + enemy.speedY * deltaSeconds);
      enemy.x = clamp(
        enemy.baseX + Math.sin((state.elapsedMs / 1_050) + enemy.phase) * enemy.drift,
        0.2,
        0.8,
      );
    } else {
      enemy.y += enemy.speedY * deltaSeconds;
      enemy.x = clamp(
        enemy.baseX + Math.sin((state.elapsedMs / 720) + enemy.phase) * enemy.drift,
        0.06,
        0.94,
      );
    }

    if (state.elapsedMs >= enemy.nextShotAt && enemy.y > 0.04 && enemy.y < 0.7) {
      const aimX = clamp((state.player.x - enemy.x) * 0.18, -0.13, 0.13);
      if (enemy.kind === 'boss') {
        addProjectile(state, 'enemy', enemy.x - 0.075, enemy.y + 0.065, aimX - 0.035, 0.38);
        addProjectile(state, 'enemy', enemy.x + 0.075, enemy.y + 0.065, aimX + 0.035, 0.38);
        enemy.nextShotAt += 820;
      } else {
        addProjectile(state, 'enemy', enemy.x, enemy.y + 0.04, aimX, 0.32);
        enemy.nextShotAt += 1_480;
      }
    }

    if (enemy.kind === 'drone' && enemy.y > 1.05) enemy.alive = false;
  });
}

function updateProjectiles(state: GameState, deltaSeconds: number): void {
  state.projectiles.forEach((projectile) => {
    if (!projectile.alive) return;
    projectile.x += projectile.vx * deltaSeconds;
    projectile.y += projectile.vy * deltaSeconds;
    if (projectile.y < -0.12 || projectile.y > 1.12 || projectile.x < -0.12 || projectile.x > 1.12) {
      projectile.alive = false;
    }
  });
}

function collideProjectiles(state: GameState): void {
  state.projectiles.forEach((projectile) => {
    if (!projectile.alive) return;

    if (projectile.owner === 'player') {
      for (const enemy of state.enemies) {
        if (!enemy.alive) continue;
        const hitRadius = enemy.kind === 'boss' ? 0.085 : 0.044;
        if (distanceSquared(projectile.x, projectile.y, enemy.x, enemy.y) > hitRadius ** 2) continue;

        projectile.alive = false;
        enemy.hp -= 1;
        state.score += enemy.kind === 'boss' ? 25 : 15;
        addImpact(state, enemy.kind === 'boss' ? 'orange' : 'cyan', projectile.x, projectile.y, hitRadius * 1.7);

        if (enemy.hp <= 0) {
          enemy.alive = false;
          state.score += enemy.kind === 'boss' ? 650 : 100;
          addImpact(state, 'orange', enemy.x, enemy.y, enemy.kind === 'boss' ? 0.19 : 0.095);
          if (enemy.kind === 'boss') state.bossDestroyed = true;
        }
        break;
      }
      return;
    }

    if (state.player.invulnerableMs > 0) return;
    if (distanceSquared(projectile.x, projectile.y, state.player.x, state.player.y) > 0.038 ** 2) return;

    projectile.alive = false;
    state.hull -= 1;
    state.player.invulnerableMs = 850;
    addImpact(state, 'orange', state.player.x, state.player.y, 0.105);
  });
}

function collideEnemiesWithPlayer(state: GameState): void {
  if (state.player.invulnerableMs > 0) return;

  for (const enemy of state.enemies) {
    if (!enemy.alive || enemy.kind === 'boss') continue;
    if (distanceSquared(enemy.x, enemy.y, state.player.x, state.player.y) > 0.064 ** 2) continue;

    enemy.alive = false;
    state.hull -= 1;
    state.player.invulnerableMs = 850;
    addImpact(state, 'orange', state.player.x, state.player.y, 0.12);
    return;
  }
}

function updateImpacts(state: GameState, deltaMs: number): void {
  state.impacts.forEach((impact) => {
    impact.ageMs += deltaMs;
  });
  state.impacts = state.impacts.filter((impact) => impact.ageMs < impact.durationMs);
}

function compactState(state: GameState): void {
  state.enemies = state.enemies.filter((enemy) => enemy.alive);
  state.projectiles = state.projectiles.filter((projectile) => projectile.alive);
}

export function stepGame(state: GameState, input: InputState, deltaMs: number): RunResult {
  if (state.result) return state.result;

  const safeDeltaMs = clamp(deltaMs, 0, 34);
  const deltaSeconds = safeDeltaMs / 1_000;
  state.elapsedMs = Math.min(MINI_BLASTER_DURATION_MS, state.elapsedMs + safeDeltaMs);
  state.player.invulnerableMs = Math.max(0, state.player.invulnerableMs - safeDeltaMs);

  while (state.spawnCursor < spawnSchedule.length) {
    const event = spawnSchedule[state.spawnCursor];
    if (!event || event.at > state.elapsedMs) break;
    spawnEnemy(state, event);
    state.spawnCursor += 1;
  }

  movePlayer(state, input, deltaSeconds);
  firePlayerWeapon(state);
  updateEnemies(state, deltaSeconds);
  updateProjectiles(state, deltaSeconds);
  collideProjectiles(state);
  collideEnemiesWithPlayer(state);
  updateImpacts(state, safeDeltaMs);
  compactState(state);

  if (state.hull <= 0) state.result = 'failed';
  else if (state.elapsedMs >= MINI_BLASTER_DURATION_MS) state.result = 'complete';

  return state.result;
}

export function getHudSnapshot(state: GameState): HudSnapshot {
  const wave = state.elapsedMs >= 8_900
    ? 'BOSS'
    : state.elapsedMs >= 4_400
      ? 'WAVE 02'
      : 'WAVE 01';

  return {
    hull: state.hull,
    score: state.score,
    timeLeftMs: Math.max(0, MINI_BLASTER_DURATION_MS - state.elapsedMs),
    wave,
  };
}

