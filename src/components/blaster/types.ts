export const MINI_BLASTER_DURATION_MS = 15_000;
export const MINI_BLASTER_MAX_HULL = 3;

export type GamePhase =
  | 'ready'
  | 'loading'
  | 'running'
  | 'paused'
  | 'complete'
  | 'failed'
  | 'error';

export type RunResult = 'complete' | 'failed' | null;

export interface MiniBlasterAssets {
  boss: HTMLImageElement;
  drone: HTMLImageElement;
  effects: HTMLImageElement;
  player: HTMLImageElement;
}

export interface InputState {
  down: boolean;
  left: boolean;
  pointerActive: boolean;
  right: boolean;
  targetX: number;
  targetY: number;
  up: boolean;
}

export interface PlayerState {
  invulnerableMs: number;
  x: number;
  y: number;
}

export interface EnemyState {
  alive: boolean;
  baseX: number;
  drift: number;
  hp: number;
  id: number;
  kind: 'drone' | 'boss';
  maxHp: number;
  nextShotAt: number;
  phase: number;
  speedY: number;
  x: number;
  y: number;
}

export interface ProjectileState {
  alive: boolean;
  id: number;
  owner: 'player' | 'enemy';
  vx: number;
  vy: number;
  x: number;
  y: number;
}

export interface ImpactState {
  ageMs: number;
  durationMs: number;
  id: number;
  kind: 'cyan' | 'orange';
  size: number;
  x: number;
  y: number;
}

export interface GameState {
  bossDestroyed: boolean;
  elapsedMs: number;
  enemies: EnemyState[];
  hull: number;
  impacts: ImpactState[];
  nextEntityId: number;
  nextPlayerShotAt: number;
  player: PlayerState;
  projectiles: ProjectileState[];
  result: RunResult;
  score: number;
  spawnCursor: number;
}

export interface HudSnapshot {
  hull: number;
  score: number;
  timeLeftMs: number;
  wave: 'WAVE 01' | 'WAVE 02' | 'BOSS';
}

export interface GameViewport {
  dpr: number;
  height: number;
  width: number;
}

