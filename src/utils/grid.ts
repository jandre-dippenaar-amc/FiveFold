import type { Coord } from '../engine/types';
import { BOARD_SIZE } from '../engine/constants';

/** Check if a coordinate is within the 7x7 board. */
export function isValidCoord(coord: Coord): boolean {
  return (
    coord.row >= 0 &&
    coord.row < BOARD_SIZE &&
    coord.col >= 0 &&
    coord.col < BOARD_SIZE
  );
}

/** Get orthogonal (4-directional) adjacent coordinates. */
export function getOrthogonalAdjacent(coord: Coord): Coord[] {
  const deltas: Coord[] = [
    { row: -1, col: 0 },
    { row: 1, col: 0 },
    { row: 0, col: -1 },
    { row: 0, col: 1 },
  ];
  return deltas
    .map((d) => ({ row: coord.row + d.row, col: coord.col + d.col }))
    .filter(isValidCoord);
}

/** Get all 8-directional adjacent coordinates (includes diagonals). */
export function getAllAdjacent(coord: Coord): Coord[] {
  const deltas: Coord[] = [
    { row: -1, col: -1 },
    { row: -1, col: 0 },
    { row: -1, col: 1 },
    { row: 0, col: -1 },
    { row: 0, col: 1 },
    { row: 1, col: -1 },
    { row: 1, col: 0 },
    { row: 1, col: 1 },
  ];
  return deltas
    .map((d) => ({ row: coord.row + d.row, col: coord.col + d.col }))
    .filter(isValidCoord);
}

/** Get adjacent tiles for a specific character (Evangelist gets diagonals). */
export function getAdjacentForCharacter(
  coord: Coord,
  canMoveDiagonally: boolean
): Coord[] {
  return canMoveDiagonally
    ? getAllAdjacent(coord)
    : getOrthogonalAdjacent(coord);
}

/** Manhattan distance between two coordinates. */
export function manhattanDistance(a: Coord, b: Coord): number {
  return Math.abs(a.row - b.row) + Math.abs(a.col - b.col);
}

/** Chebyshev distance (max of row/col delta — accounts for diagonal movement). */
export function chebyshevDistance(a: Coord, b: Coord): number {
  return Math.max(Math.abs(a.row - b.row), Math.abs(a.col - b.col));
}

/** Check if two coordinates are equal. */
export function coordEqual(a: Coord, b: Coord): boolean {
  return a.row === b.row && a.col === b.col;
}

/** Check if a coordinate is adjacent (orthogonal) to another. */
export function isOrthogonallyAdjacent(a: Coord, b: Coord): boolean {
  return manhattanDistance(a, b) === 1;
}

/** Check if a coordinate is adjacent (including diagonal) to another. */
export function isAdjacent(a: Coord, b: Coord): boolean {
  return chebyshevDistance(a, b) === 1;
}

/** Get all tiles within a given distance (Manhattan). */
export function getTilesWithinDistance(
  coord: Coord,
  distance: number
): Coord[] {
  const result: Coord[] = [];
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      const target = { row: r, col: c };
      if (manhattanDistance(coord, target) <= distance && !coordEqual(coord, target)) {
        result.push(target);
      }
    }
  }
  return result;
}

/** Get all coordinates in the same row as the given coordinate. */
export function getRow(coord: Coord): Coord[] {
  const result: Coord[] = [];
  for (let c = 0; c < BOARD_SIZE; c++) {
    if (c !== coord.col) {
      result.push({ row: coord.row, col: c });
    }
  }
  return result;
}

/** Get all coordinates in the same column as the given coordinate. */
export function getColumn(coord: Coord): Coord[] {
  const result: Coord[] = [];
  for (let r = 0; r < BOARD_SIZE; r++) {
    if (r !== coord.row) {
      result.push({ row: r, col: coord.col });
    }
  }
  return result;
}

/** Get all coordinates in the same row AND column (for Principality spread). */
export function getRowAndColumn(coord: Coord): Coord[] {
  const set = new Set<string>();
  const result: Coord[] = [];
  for (const c of [...getRow(coord), ...getColumn(coord)]) {
    const key = `${c.row},${c.col}`;
    if (!set.has(key)) {
      set.add(key);
      result.push(c);
    }
  }
  return result;
}

/** Check if a coordinate is on the edge of the board. */
export function isEdgeTile(coord: Coord): boolean {
  return (
    coord.row === 0 ||
    coord.row === BOARD_SIZE - 1 ||
    coord.col === 0 ||
    coord.col === BOARD_SIZE - 1
  );
}

/** Get all edge tiles. */
export function getEdgeTiles(): Coord[] {
  const result: Coord[] = [];
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      const coord = { row: r, col: c };
      if (isEdgeTile(coord)) {
        result.push(coord);
      }
    }
  }
  return result;
}
