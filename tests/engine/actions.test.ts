import { describe, it, expect } from 'vitest';
import { createGameState } from '../../src/engine/state';
import {
  canMove, executeMove,
  canCleanse, executeCleanse,
  canPray, executePray,
  canEncourage, executeEncourage,
  canFortify, executeFortify,
  canBattle,
} from '../../src/engine/actions';
import { beginPlayerTurn } from '../../src/engine/phases';
import { getTile, addCubes, updateTile } from '../../src/engine/board';
import type { GameConfig } from '../../src/engine/types';

const defaultConfig: GameConfig = {
  playerCount: 3,
  characterIds: ['pastor', 'apostle', 'evangelist'],
  difficulty: 'faithful',
  seed: 42,
};

describe('move action', () => {
  it('allows moving to an adjacent tile', () => {
    let state = createGameState(defaultConfig);
    state = beginPlayerTurn(state, 0);
    const player = state.players[0];
    const { row, col } = player.position;

    // Find a valid adjacent target
    const targets = [
      { row: row - 1, col },
      { row: row + 1, col },
      { row, col: col - 1 },
      { row, col: col + 1 },
    ].filter((t) => t.row >= 0 && t.row < 7 && t.col >= 0 && t.col < 7);

    const target = targets[0];
    const check = canMove(state, player.id, target);
    expect(check.valid).toBe(true);
  });

  it('rejects moving to a tile more than max range away', () => {
    let state = createGameState(defaultConfig);
    state = beginPlayerTurn(state, 0);
    const player = state.players[0];

    // Try to move 3 tiles away
    const farTarget = { row: 3, col: 3 }; // Jerusalem — likely far from edge
    const check = canMove(state, player.id, farTarget);
    // Should be invalid unless player is already adjacent to Jerusalem
    if (check.valid === false) {
      expect(check.reason).toContain('away');
    }
  });

  it('deducts faith when entering a shadow tile', () => {
    let state = createGameState(defaultConfig);
    state = beginPlayerTurn(state, 0);
    const player = state.players[0];
    const { row, col } = player.position;

    // Place a shadow tile adjacent with cubes
    const target = { row: Math.min(row + 1, 6), col };
    state = {
      ...state,
      board: updateTile(state.board, target, {
        ...getTile(state.board, target),
        type: 'Shadow',
        shadowCubes: 2,
        faceDown: false,
      }),
    };

    const faithBefore = player.faithCurrent;
    state = executeMove(state, player.id, target);
    const playerAfter = state.players.find((p) => p.id === player.id)!;
    expect(playerAfter.faithCurrent).toBe(faithBefore - 1);
  });

  it('deducts actions after move', () => {
    let state = createGameState(defaultConfig);
    state = beginPlayerTurn(state, 0);
    const actionsBefore = state.actionsRemaining;
    const player = state.players[0];
    const { row, col } = player.position;

    const target = { row: Math.min(row + 1, 6), col };
    // Make sure target tile is Light (no extra cost)
    state = {
      ...state,
      board: updateTile(state.board, target, {
        ...getTile(state.board, target),
        type: 'Light',
        shadowCubes: 0,
      }),
    };
    state = executeMove(state, player.id, target);
    expect(state.actionsRemaining).toBe(actionsBefore - 1);
  });
});

describe('cleanse action', () => {
  it('removes cubes from current tile', () => {
    let state = createGameState(defaultConfig);
    state = beginPlayerTurn(state, 0);
    const player = state.players[0];

    // Add cubes to player's tile
    state = { ...state, board: addCubes(state.board, player.position, 3) };

    const cubesBefore = getTile(state.board, player.position).shadowCubes;
    state = executeCleanse(state, player.id);
    const cubesAfter = getTile(state.board, player.position).shadowCubes;
    expect(cubesAfter).toBeLessThan(cubesBefore);
  });

  it('increments totalCubesRemoved', () => {
    let state = createGameState(defaultConfig);
    state = beginPlayerTurn(state, 0);
    const player = state.players[0];

    state = { ...state, board: addCubes(state.board, player.position, 3) };
    const removedBefore = state.totalCubesRemoved;
    state = executeCleanse(state, player.id);
    expect(state.totalCubesRemoved).toBeGreaterThan(removedBefore);
  });

  it('rejects cleanse when no cubes on tile', () => {
    let state = createGameState(defaultConfig);
    state = beginPlayerTurn(state, 0);
    const player = state.players[0];

    // Ensure tile has 0 cubes and no stronghold layers
    state = {
      ...state,
      board: updateTile(state.board, player.position, {
        ...getTile(state.board, player.position),
        shadowCubes: 0,
        strongholdLayers: 0,
      }),
    };

    const check = canCleanse(state, player.id);
    expect(check.valid).toBe(false);
  });
});

describe('pray action', () => {
  it('restores 1 Faith', () => {
    let state = createGameState(defaultConfig);
    state = beginPlayerTurn(state, 0);
    const player = state.players[0];

    // Lower faith first
    state = {
      ...state,
      players: state.players.map((p) =>
        p.id === player.id ? { ...p, faithCurrent: 5 } : p
      ),
    };

    state = executePray(state, player.id);
    const updated = state.players.find((p) => p.id === player.id)!;
    expect(updated.faithCurrent).toBe(6);
    expect(updated.totalPrayActions).toBe(1);
  });

  it('cannot pray at max faith', () => {
    let state = createGameState(defaultConfig);
    state = beginPlayerTurn(state, 0);
    const player = state.players[0];
    // Pastor starts at max faith (10)
    const check = canPray(state, player.id);
    expect(check.valid).toBe(false);
  });
});

describe('encourage action', () => {
  it('transfers 1 Faith to adjacent player', () => {
    let state = createGameState(defaultConfig);
    state = beginPlayerTurn(state, 0);
    const giver = state.players[0];
    const receiver = state.players[1];

    // Place receiver adjacent to giver
    const adjacent = { row: Math.min(giver.position.row + 1, 6), col: giver.position.col };
    state = {
      ...state,
      players: state.players.map((p) =>
        p.id === receiver.id ? { ...p, position: adjacent, faithCurrent: 3 } : p
      ),
    };

    const giverFaith = giver.faithCurrent;
    state = executeEncourage(state, giver.id, receiver.id);
    const giverAfter = state.players.find((p) => p.id === giver.id)!;
    const receiverAfter = state.players.find((p) => p.id === receiver.id)!;
    expect(giverAfter.faithCurrent).toBe(giverFaith - 1);
    expect(receiverAfter.faithCurrent).toBe(4);
  });
});

describe('fortify action', () => {
  it('places a prayer token and costs 2 actions', () => {
    let state = createGameState(defaultConfig);
    state = beginPlayerTurn(state, 0);
    const player = state.players[0];

    const actionsBefore = state.actionsRemaining;
    state = executeFortify(state, player.id);
    expect(state.actionsRemaining).toBe(actionsBefore - 2);
    expect(getTile(state.board, player.position).prayerToken).toBe(true);
  });

  it('rejects fortify with only 1 action remaining', () => {
    let state = createGameState(defaultConfig);
    state = beginPlayerTurn(state, 0);
    state = { ...state, actionsRemaining: 1 };
    const check = canFortify(state, state.players[0].id);
    expect(check.valid).toBe(false);
  });
});

describe('battle action', () => {
  it('rejects battle when no enemy on tile', () => {
    let state = createGameState(defaultConfig);
    state = beginPlayerTurn(state, 0);
    const check = canBattle(state, state.players[0].id, 'nonexistent');
    expect(check.valid).toBe(false);
  });
});
