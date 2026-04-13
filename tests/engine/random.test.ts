import { describe, it, expect } from 'vitest';
import { createRng, nextRandom, randomInt, shuffle, rollDice } from '../../src/utils/random';

describe('seeded PRNG', () => {
  it('produces deterministic results for the same seed', () => {
    const rng1 = createRng(42);
    const rng2 = createRng(42);
    const [val1] = nextRandom(rng1);
    const [val2] = nextRandom(rng2);
    expect(val1).toBe(val2);
  });

  it('produces different results for different seeds', () => {
    const [val1] = nextRandom(createRng(1));
    const [val2] = nextRandom(createRng(2));
    expect(val1).not.toBe(val2);
  });

  it('produces values in [0, 1)', () => {
    let rng = createRng(123);
    for (let i = 0; i < 1000; i++) {
      let val: number;
      [val, rng] = nextRandom(rng);
      expect(val).toBeGreaterThanOrEqual(0);
      expect(val).toBeLessThan(1);
    }
  });

  it('produces a sequence of distinct values', () => {
    let rng = createRng(42);
    const values = new Set<number>();
    for (let i = 0; i < 100; i++) {
      let val: number;
      [val, rng] = nextRandom(rng);
      values.add(val);
    }
    // Should have at least 95 distinct values out of 100
    expect(values.size).toBeGreaterThan(95);
  });
});

describe('randomInt', () => {
  it('produces values in [min, max]', () => {
    let rng = createRng(42);
    for (let i = 0; i < 200; i++) {
      let val: number;
      [val, rng] = randomInt(rng, 3, 8);
      expect(val).toBeGreaterThanOrEqual(3);
      expect(val).toBeLessThanOrEqual(8);
    }
  });
});

describe('shuffle', () => {
  it('is deterministic with the same seed', () => {
    const arr = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const [result1] = shuffle(createRng(42), arr);
    const [result2] = shuffle(createRng(42), arr);
    expect(result1).toEqual(result2);
  });

  it('preserves all elements', () => {
    const arr = [1, 2, 3, 4, 5];
    const [result] = shuffle(createRng(99), arr);
    expect(result.sort()).toEqual([1, 2, 3, 4, 5]);
  });

  it('does not mutate the original array', () => {
    const arr = [1, 2, 3, 4, 5];
    const copy = [...arr];
    shuffle(createRng(42), arr);
    expect(arr).toEqual(copy);
  });
});

describe('rollDice', () => {
  it('produces the correct number of results', () => {
    const [results] = rollDice(createRng(42), 4);
    expect(results.length).toBe(4);
  });

  it('produces values in [1, 6]', () => {
    let rng = createRng(42);
    for (let i = 0; i < 100; i++) {
      let results: number[];
      [results, rng] = rollDice(rng, 2);
      for (const r of results) {
        expect(r).toBeGreaterThanOrEqual(1);
        expect(r).toBeLessThanOrEqual(6);
      }
    }
  });

  it('is deterministic', () => {
    const [r1] = rollDice(createRng(42), 3);
    const [r2] = rollDice(createRng(42), 3);
    expect(r1).toEqual(r2);
  });
});
