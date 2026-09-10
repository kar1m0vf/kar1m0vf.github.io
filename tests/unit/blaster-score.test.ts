import { describe, expect, it } from 'vitest';
import { createGameState, createInputState, stepGame } from '../../src/components/blaster/engine';
import { MINI_BLASTER_MAX_SCORE } from '../../src/components/blaster/types';

describe('Blaster scoring', () => {
  it('awards 50,000 for clearing the real spawn schedule, without a completion top-up', () => {
    const state = createGameState();
    state.nextPlayerShotAt = Infinity; // This fixture supplies each successful shot explicitly.
    const input = createInputState();
    let hits = 0;
    let lastScore = 0;
    while (!state.result) {
      stepGame(state, input, 1000 / 60);
      for (const enemy of [...state.enemies]) {
        if (enemy.y < .04) continue;
        while (enemy.alive && !state.result) {
          state.projectiles.push({ id: state.nextEntityId++, alive: true, owner: 'player',
            x: enemy.x, y: enemy.y, vx: 0, vy: 0 });
          stepGame(state, input, 0);
          hits += 1;
        }
      }
      expect(state.score).toBeGreaterThanOrEqual(lastScore);
      expect(state.score).toBeLessThanOrEqual(MINI_BLASTER_MAX_SCORE);
      lastScore = state.score;
    }
    expect(state.spawnCursor).toBe(12);
    expect(state.bossDestroyed).toBe(true);
    expect(hits).toBe(44);
    expect(state.score).toBe(50_000);
    stepGame(state, input, 34);
    expect(state.score).toBe(50_000);
  });

  it('counts both a hit and a kill once, and never awards a missed shot', () => {
    const state = createGameState();
    const input = createInputState();
    while (!state.enemies.some(enemy => enemy.y > .04)) stepGame(state, input, 34);
    const enemy = state.enemies[0]!;
    state.projectiles = [];
    const hit = () => {
      state.projectiles.push({ id: state.nextEntityId++, alive: true, owner: 'player', x: enemy.x, y: enemy.y, vx: 0, vy: 0 });
      stepGame(state, input, 0);
    };
    hit(); expect(state.score).toBe(500);
    hit(); expect(state.score).toBe(2000);
    stepGame(state, input, 0); expect(state.score).toBe(2000);
  });
});
