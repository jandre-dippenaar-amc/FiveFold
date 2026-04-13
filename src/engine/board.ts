import type { TileState, TileType, Coord, RngState } from './types';
import {
  BOARD_SIZE,
  JERUSALEM_COORD,
  STRONGHOLD_COORDS,
  TILE_BAG,
  SHADOW_TILE_STARTING_CUBES,
  STRONGHOLD_DEFAULT_LAYERS,
} from './constants';
import { shuffle, randomInt } from '../utils/random';
import { coordEqual } from '../utils/grid';

/** Check if a coordinate is a stronghold position. */
function isStrongholdCoord(coord: Coord): boolean {
  return STRONGHOLD_COORDS.some((s) => coordEqual(s, coord));
}

/** Check if a coordinate is the Jerusalem center. */
function isJerusalemCoord(coord: Coord): boolean {
  return coordEqual(coord, JERUSALEM_COORD);
}

/** Build the tile bag — an array of tile types to be shuffled and placed. */
function buildTileBag(): TileType[] {
  const bag: TileType[] = [];
  for (const [type, count] of Object.entries(TILE_BAG)) {
    for (let i = 0; i < count; i++) {
      bag.push(type as TileType);
    }
  }
  return bag;
}

/** Create the initial 7x7 board with all tiles. */
export function createBoard(rng: RngState): [TileState[][], RngState] {
  let currentRng = rng;

  // Build and shuffle the random tile bag
  const tileBag = buildTileBag();
  let shuffledBag: TileType[];
  [shuffledBag, currentRng] = shuffle(currentRng, tileBag);

  let bagIndex = 0;
  const board: TileState[][] = [];

  for (let row = 0; row < BOARD_SIZE; row++) {
    const rowTiles: TileState[] = [];
    for (let col = 0; col < BOARD_SIZE; col++) {
      const coord: Coord = { row, col };
      let tile: TileState;

      if (isJerusalemCoord(coord)) {
        tile = {
          type: 'Jerusalem',
          coord,
          faceDown: false, // Jerusalem starts face-up
          shadowCubes: 0,
          enemyIds: [],
          playerIds: [],
          prayerToken: false,
          strongholdLayers: 0,
          isPermanentLight: false,
        };
      } else if (isStrongholdCoord(coord)) {
        tile = {
          type: 'Stronghold',
          coord,
          faceDown: false, // Strongholds start face-up (visible markers)
          shadowCubes: 0,
          enemyIds: [],
          playerIds: [],
          prayerToken: false,
          strongholdLayers: STRONGHOLD_DEFAULT_LAYERS,
          isPermanentLight: false,
        };
      } else {
        // Draw from the shuffled tile bag
        const tileType = shuffledBag[bagIndex++];
        let startingCubes = 0;

        // Shadow tiles start with 1-2 cubes
        if (tileType === 'Shadow') {
          [startingCubes, currentRng] = randomInt(
            currentRng,
            SHADOW_TILE_STARTING_CUBES.min,
            SHADOW_TILE_STARTING_CUBES.max
          );
        }

        tile = {
          type: tileType,
          coord,
          faceDown: true, // All non-fixed tiles start face-down
          shadowCubes: startingCubes,
          enemyIds: [],
          playerIds: [],
          prayerToken: false,
          strongholdLayers: 0,
          isPermanentLight: false,
        };
      }

      rowTiles.push(tile);
    }
    board.push(rowTiles);
  }

  return [board, currentRng];
}

/** Get a tile from the board by coordinate. */
export function getTile(board: TileState[][], coord: Coord): TileState {
  return board[coord.row][coord.col];
}

/** Set a tile on the board (returns new board — immutable). */
export function setTile(
  board: TileState[][],
  coord: Coord,
  tile: TileState
): TileState[][] {
  return board.map((row, r) =>
    r === coord.row
      ? row.map((t, c) => (c === coord.col ? tile : t))
      : row
  );
}

/** Update a tile on the board (returns new board — immutable). */
export function updateTile(
  board: TileState[][],
  coord: Coord,
  update: Partial<TileState>
): TileState[][] {
  const existing = getTile(board, coord);
  return setTile(board, coord, { ...existing, ...update });
}

/** Reveal a face-down tile. */
export function revealTile(board: TileState[][], coord: Coord): TileState[][] {
  return updateTile(board, coord, { faceDown: false });
}

/** Add shadow cubes to a tile. Returns new board. */
export function addCubes(
  board: TileState[][],
  coord: Coord,
  count: number
): TileState[][] {
  const tile = getTile(board, coord);
  return updateTile(board, coord, {
    shadowCubes: tile.shadowCubes + count,
  });
}

/** Remove shadow cubes from a tile. Returns new board. */
export function removeCubes(
  board: TileState[][],
  coord: Coord,
  count: number
): TileState[][] {
  const tile = getTile(board, coord);
  return updateTile(board, coord, {
    shadowCubes: Math.max(0, tile.shadowCubes - count),
  });
}

/** Count total shadow cubes on the entire board. */
export function countTotalCubes(board: TileState[][]): number {
  let total = 0;
  for (const row of board) {
    for (const tile of row) {
      total += tile.shadowCubes;
    }
  }
  return total;
}

/** Find all tiles matching a predicate. */
export function findTiles(
  board: TileState[][],
  predicate: (tile: TileState) => boolean
): TileState[] {
  const result: TileState[] = [];
  for (const row of board) {
    for (const tile of row) {
      if (predicate(tile)) {
        result.push(tile);
      }
    }
  }
  return result;
}

/** Get all active stronghold tiles (layers > 0). */
export function getActiveStrongholds(board: TileState[][]): TileState[] {
  return findTiles(
    board,
    (t) => t.type === 'Stronghold' && t.strongholdLayers > 0
  );
}

/** Find the "largest" stronghold (most remaining layers, then most adjacent cubes). */
export function getLargestStronghold(board: TileState[][]): TileState | null {
  const strongholds = getActiveStrongholds(board);
  if (strongholds.length === 0) return null;
  return strongholds.reduce((best, s) =>
    s.strongholdLayers > best.strongholdLayers ? s : best
  );
}

/** Find the tile with the most shadow cubes. */
export function getDarkestTile(board: TileState[][]): TileState | null {
  let darkest: TileState | null = null;
  for (const row of board) {
    for (const tile of row) {
      if (!darkest || tile.shadowCubes > darkest.shadowCubes) {
        darkest = tile;
      }
    }
  }
  return darkest && darkest.shadowCubes > 0 ? darkest : null;
}
