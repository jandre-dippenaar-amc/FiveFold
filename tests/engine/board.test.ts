import { describe, it, expect } from 'vitest';
import { createBoard, getTile, addCubes, removeCubes, countTotalCubes, getActiveStrongholds, findTiles } from '../../src/engine/board';
import { BOARD_SIZE, JERUSALEM_COORD, STRONGHOLD_COORDS, TILE_BAG } from '../../src/engine/constants';
import { createRng } from '../../src/utils/random';
import { coordEqual } from '../../src/utils/grid';

describe('createBoard', () => {
  it('creates a 7x7 grid', () => {
    const [board] = createBoard(createRng(42));
    expect(board.length).toBe(BOARD_SIZE);
    for (const row of board) {
      expect(row.length).toBe(BOARD_SIZE);
    }
  });

  it('places Jerusalem at center face-up', () => {
    const [board] = createBoard(createRng(42));
    const jerusalem = getTile(board, JERUSALEM_COORD);
    expect(jerusalem.type).toBe('Jerusalem');
    expect(jerusalem.faceDown).toBe(false);
    expect(jerusalem.shadowCubes).toBe(0);
  });

  it('places 7 Strongholds at correct positions', () => {
    const [board] = createBoard(createRng(42));
    for (const coord of STRONGHOLD_COORDS) {
      const tile = getTile(board, coord);
      expect(tile.type).toBe('Stronghold');
      expect(tile.faceDown).toBe(false);
      expect(tile.strongholdLayers).toBe(3);
    }
  });

  it('distributes exactly the right number of each tile type', () => {
    const [board] = createBoard(createRng(42));
    const counts: Record<string, number> = {};
    for (const row of board) {
      for (const tile of row) {
        counts[tile.type] = (counts[tile.type] || 0) + 1;
      }
    }
    expect(counts['Jerusalem']).toBe(1);
    expect(counts['Stronghold']).toBe(7);
    expect(counts['Light']).toBe(TILE_BAG.Light);
    expect(counts['Shadow']).toBe(TILE_BAG.Shadow);
    expect(counts['BrokenGround']).toBe(TILE_BAG.BrokenGround);
    expect(counts['HighPlace']).toBe(TILE_BAG.HighPlace);
  });

  it('all non-fixed tiles start face-down', () => {
    const [board] = createBoard(createRng(42));
    for (const row of board) {
      for (const tile of row) {
        if (tile.type !== 'Jerusalem' && tile.type !== 'Stronghold') {
          expect(tile.faceDown).toBe(true);
        }
      }
    }
  });

  it('shadow tiles start with 1-2 cubes', () => {
    const [board] = createBoard(createRng(42));
    const shadowTiles = findTiles(board, (t) => t.type === 'Shadow');
    expect(shadowTiles.length).toBe(TILE_BAG.Shadow);
    for (const tile of shadowTiles) {
      expect(tile.shadowCubes).toBeGreaterThanOrEqual(1);
      expect(tile.shadowCubes).toBeLessThanOrEqual(2);
    }
  });

  it('is deterministic with the same seed', () => {
    const [board1] = createBoard(createRng(123));
    const [board2] = createBoard(createRng(123));
    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        expect(board1[r][c].type).toBe(board2[r][c].type);
        expect(board1[r][c].shadowCubes).toBe(board2[r][c].shadowCubes);
      }
    }
  });

  it('produces different layouts with different seeds', () => {
    const [board1] = createBoard(createRng(1));
    const [board2] = createBoard(createRng(999));
    // At least one non-fixed tile should differ
    let hasDifference = false;
    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        const coord = { row: r, col: c };
        if (!coordEqual(coord, JERUSALEM_COORD) && !STRONGHOLD_COORDS.some(s => coordEqual(s, coord))) {
          if (board1[r][c].type !== board2[r][c].type) {
            hasDifference = true;
          }
        }
      }
    }
    expect(hasDifference).toBe(true);
  });
});

describe('board operations', () => {
  it('addCubes increases cube count', () => {
    const [board] = createBoard(createRng(42));
    const coord = { row: 1, col: 1 }; // A Stronghold but we can still test
    const original = getTile(board, coord).shadowCubes;
    const newBoard = addCubes(board, coord, 2);
    expect(getTile(newBoard, coord).shadowCubes).toBe(original + 2);
    // Original board unchanged (immutable)
    expect(getTile(board, coord).shadowCubes).toBe(original);
  });

  it('removeCubes decreases cube count (minimum 0)', () => {
    let [board] = createBoard(createRng(42));
    const coord = { row: 2, col: 2 };
    board = addCubes(board, coord, 3);
    board = removeCubes(board, coord, 2);
    expect(getTile(board, coord).shadowCubes).toBe(1);
    board = removeCubes(board, coord, 5);
    expect(getTile(board, coord).shadowCubes).toBe(0);
  });

  it('countTotalCubes sums all cubes on the board', () => {
    const [board] = createBoard(createRng(42));
    const total = countTotalCubes(board);
    // Should equal sum of shadow tile starting cubes
    const shadowTiles = findTiles(board, (t) => t.type === 'Shadow');
    const expectedTotal = shadowTiles.reduce((sum, t) => sum + t.shadowCubes, 0);
    expect(total).toBe(expectedTotal);
  });

  it('getActiveStrongholds returns only strongholds with layers > 0', () => {
    const [board] = createBoard(createRng(42));
    const active = getActiveStrongholds(board);
    expect(active.length).toBe(7);
    for (const s of active) {
      expect(s.strongholdLayers).toBeGreaterThan(0);
    }
  });
});
