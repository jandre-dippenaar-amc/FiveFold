import { describe, it, expect } from 'vitest';
import {
  isValidCoord,
  getOrthogonalAdjacent,
  getAllAdjacent,
  manhattanDistance,
  chebyshevDistance,
  coordEqual,
  isEdgeTile,
  getEdgeTiles,
  getRow,
  getColumn,
  getRowAndColumn,
} from '../../src/utils/grid';

describe('isValidCoord', () => {
  it('accepts coords within 7x7', () => {
    expect(isValidCoord({ row: 0, col: 0 })).toBe(true);
    expect(isValidCoord({ row: 6, col: 6 })).toBe(true);
    expect(isValidCoord({ row: 3, col: 3 })).toBe(true);
  });

  it('rejects out-of-bounds coords', () => {
    expect(isValidCoord({ row: -1, col: 0 })).toBe(false);
    expect(isValidCoord({ row: 0, col: 7 })).toBe(false);
    expect(isValidCoord({ row: 7, col: 0 })).toBe(false);
  });
});

describe('getOrthogonalAdjacent', () => {
  it('returns 4 neighbors for center tile', () => {
    const adj = getOrthogonalAdjacent({ row: 3, col: 3 });
    expect(adj.length).toBe(4);
  });

  it('returns 2 neighbors for corner tile', () => {
    const adj = getOrthogonalAdjacent({ row: 0, col: 0 });
    expect(adj.length).toBe(2);
    expect(adj).toContainEqual({ row: 0, col: 1 });
    expect(adj).toContainEqual({ row: 1, col: 0 });
  });

  it('returns 3 neighbors for edge (non-corner) tile', () => {
    const adj = getOrthogonalAdjacent({ row: 0, col: 3 });
    expect(adj.length).toBe(3);
  });
});

describe('getAllAdjacent', () => {
  it('returns 8 neighbors for center tile', () => {
    const adj = getAllAdjacent({ row: 3, col: 3 });
    expect(adj.length).toBe(8);
  });

  it('returns 3 neighbors for corner tile', () => {
    const adj = getAllAdjacent({ row: 0, col: 0 });
    expect(adj.length).toBe(3);
  });
});

describe('distances', () => {
  it('manhattan distance is correct', () => {
    expect(manhattanDistance({ row: 0, col: 0 }, { row: 3, col: 3 })).toBe(6);
    expect(manhattanDistance({ row: 2, col: 2 }, { row: 2, col: 5 })).toBe(3);
  });

  it('chebyshev distance is correct', () => {
    expect(chebyshevDistance({ row: 0, col: 0 }, { row: 3, col: 3 })).toBe(3);
    expect(chebyshevDistance({ row: 2, col: 2 }, { row: 2, col: 5 })).toBe(3);
  });
});

describe('coordEqual', () => {
  it('returns true for same coords', () => {
    expect(coordEqual({ row: 1, col: 2 }, { row: 1, col: 2 })).toBe(true);
  });

  it('returns false for different coords', () => {
    expect(coordEqual({ row: 1, col: 2 }, { row: 2, col: 1 })).toBe(false);
  });
});

describe('edge tiles', () => {
  it('correctly identifies edge tiles', () => {
    expect(isEdgeTile({ row: 0, col: 0 })).toBe(true);
    expect(isEdgeTile({ row: 0, col: 3 })).toBe(true);
    expect(isEdgeTile({ row: 3, col: 0 })).toBe(true);
    expect(isEdgeTile({ row: 3, col: 3 })).toBe(false);
    expect(isEdgeTile({ row: 6, col: 6 })).toBe(true);
  });

  it('getEdgeTiles returns 24 tiles (7*4 - 4 corners counted once)', () => {
    const edges = getEdgeTiles();
    expect(edges.length).toBe(24);
  });
});

describe('row and column', () => {
  it('getRow returns 6 tiles (excludes self)', () => {
    const row = getRow({ row: 3, col: 3 });
    expect(row.length).toBe(6);
    for (const c of row) {
      expect(c.row).toBe(3);
      expect(c.col).not.toBe(3);
    }
  });

  it('getColumn returns 6 tiles (excludes self)', () => {
    const col = getColumn({ row: 3, col: 3 });
    expect(col.length).toBe(6);
    for (const c of col) {
      expect(c.col).toBe(3);
      expect(c.row).not.toBe(3);
    }
  });

  it('getRowAndColumn returns 12 unique tiles for center', () => {
    const rowCol = getRowAndColumn({ row: 3, col: 3 });
    expect(rowCol.length).toBe(12);
  });
});
