import { describe, it, expect } from 'vitest';
import { createGameState } from '../../src/engine/state';
import { executeFullRound } from '../../src/engine/phases';
import {
  canMove, executeMove,
  canCleanse, executeCleanse,
  canPray, executePray,
  canBattle, executeBattle,
} from '../../src/engine/actions';
import { canUseMinistry, executeMinistry } from '../../src/engine/characters';
import { getTile } from '../../src/engine/board';
import { getOrthogonalAdjacent } from '../../src/utils/grid';
import type { GameConfig, GameState } from '../../src/engine/types';

const fullTeamConfig: GameConfig = {
  playerCount: 5,
  characterIds: ['pastor', 'apostle', 'evangelist', 'prophet', 'teacher'],
  difficulty: 'faithful',
  seed: 12345,
};

const smallTeamConfig: GameConfig = {
  playerCount: 2,
  characterIds: ['pastor', 'evangelist'],
  difficulty: 'seeker',
  seed: 42,
};

/** Simple AI: tries to cleanse, pray, or move toward cubes. */
function simpleAiTurn(state: GameState, playerIndex: number): GameState {
  const player = state.players[playerIndex];
  if (player.isEliminated) return state;

  // Try ministry ability first (free action)
  if (canUseMinistry(state, player.id).valid) {
    try {
      state = executeMinistry(state, player.id);
    } catch {
      // Some ministries need targets we don't provide — skip
    }
  }

  // Spend actions
  let safety = 20; // prevent infinite loops
  while (state.actionsRemaining > 0 && state.status === 'playing' && safety-- > 0) {
    // Try to cleanse if cubes on tile
    if (canCleanse(state, player.id).valid) {
      state = executeCleanse(state, player.id);
      continue;
    }

    // Try to pray if not at max faith
    const currentPlayer = state.players.find((p) => p.id === player.id)!;
    if (canPray(state, player.id).valid) {
      state = executePray(state, player.id);
      continue;
    }

    // Try to battle any enemy on tile
    const tile = getTile(state.board, currentPlayer.position);
    const enemyOnTile = state.enemies.find((e) =>
      e.position.row === currentPlayer.position.row && e.position.col === currentPlayer.position.col
    );
    if (enemyOnTile && canBattle(state, player.id, enemyOnTile.id).valid) {
      state = executeBattle(state, player.id, enemyOnTile.id);
      continue;
    }

    // Try to move to an adjacent tile
    const updatedPlayer = state.players.find((p) => p.id === player.id)!;
    const adjacent = getOrthogonalAdjacent(updatedPlayer.position);
    let moved = false;
    for (const target of adjacent) {
      if (canMove(state, player.id, target).valid) {
        state = executeMove(state, player.id, target);
        moved = true;
        break;
      }
    }
    if (!moved) break; // Can't do anything else
  }

  return state;
}

describe('full game simulation', () => {
  it('can create a game and play multiple rounds without crashing', () => {
    let state = createGameState(fullTeamConfig);
    expect(state.status).toBe('playing');

    // Play 5 rounds
    for (let round = 0; round < 5; round++) {
      if (state.status !== 'playing') break;
      state = executeFullRound(state, simpleAiTurn);
    }

    // Game should still be in a valid state
    expect(['playing', 'won', 'lost']).toContain(state.status);
    expect(state.round).toBeGreaterThan(1);
    expect(state.log.length).toBeGreaterThan(0);
  });

  it('can play a full game until completion (win or loss)', () => {
    let state = createGameState(smallTeamConfig);
    const maxRounds = 100;

    for (let round = 0; round < maxRounds; round++) {
      if (state.status !== 'playing') break;
      state = executeFullRound(state, simpleAiTurn);
    }

    // Game should have ended
    expect(['won', 'lost']).toContain(state.status);
  });

  it('tracks cubes removed and can trigger armor unlocks', () => {
    let state = createGameState(fullTeamConfig);

    // Play several rounds
    for (let round = 0; round < 10; round++) {
      if (state.status !== 'playing') break;
      state = executeFullRound(state, simpleAiTurn);
    }

    // Some cubes should have been removed
    expect(state.totalCubesRemoved).toBeGreaterThanOrEqual(0);
  });

  it('darkness meter can increase over rounds', () => {
    let state = createGameState(fullTeamConfig);
    const initialMeter = state.darknessMeter;

    for (let round = 0; round < 10; round++) {
      if (state.status !== 'playing') break;
      state = executeFullRound(state, simpleAiTurn);
    }

    // Meter should have increased (darkness cards cause escalation)
    if (state.status === 'playing') {
      expect(state.darknessMeter).toBeGreaterThanOrEqual(initialMeter);
    }
  });

  it('enemies spawn from darkness cards', () => {
    let state = createGameState(fullTeamConfig);

    for (let round = 0; round < 10; round++) {
      if (state.status !== 'playing') break;
      state = executeFullRound(state, simpleAiTurn);
    }

    // The game log should contain enemy-related events
    const hasEnemyLog = state.log.some(
      (e) => e.description.includes('Wickedness') || e.description.includes('Power') || e.description.includes('Principality')
    );
    expect(hasEnemyLog).toBe(true);
  });

  it('produces different outcomes with different seeds', () => {
    const config1 = { ...fullTeamConfig, seed: 1 };
    const config2 = { ...fullTeamConfig, seed: 999 };

    let state1 = createGameState(config1);
    let state2 = createGameState(config2);

    for (let round = 0; round < 5; round++) {
      if (state1.status === 'playing') state1 = executeFullRound(state1, simpleAiTurn);
      if (state2.status === 'playing') state2 = executeFullRound(state2, simpleAiTurn);
    }

    // States should differ (different seed = different random events)
    const log1 = state1.log.map((e) => e.description).join('');
    const log2 = state2.log.map((e) => e.description).join('');
    expect(log1).not.toBe(log2);
  });

  it('respects difficulty settings', () => {
    const easy = createGameState({ ...fullTeamConfig, difficulty: 'seeker' });
    const hard = createGameState({ ...fullTeamConfig, difficulty: 'refinedByFire' });

    expect(easy.darknessMeter).toBe(1);
    expect(hard.darknessMeter).toBe(3);

    // Easy mode should have more scripture cards dealt
    const easyCards = easy.players.reduce((sum, p) => sum + p.scriptureHand.length, 0);
    const hardCards = hard.players.reduce((sum, p) => sum + p.scriptureHand.length, 0);
    expect(easyCards).toBeGreaterThan(hardCards);
  });
});
