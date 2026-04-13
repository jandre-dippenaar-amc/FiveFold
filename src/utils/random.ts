import type { RngState } from '../engine/types';

/**
 * Mulberry32 — fast 32-bit seeded PRNG.
 * Returns a float in [0, 1) and the next RNG state.
 */
export function nextRandom(rng: RngState): [number, RngState] {
  let t = (rng.state + 0x6d2b79f5) | 0;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  const value = ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  return [value, { seed: rng.seed, state: rng.state + 1 }];
}

/** Create an RNG state from a seed. */
export function createRng(seed: number): RngState {
  return { seed, state: seed };
}

/** Get a random integer in [min, max] inclusive. */
export function randomInt(
  rng: RngState,
  min: number,
  max: number
): [number, RngState] {
  const [value, nextState] = nextRandom(rng);
  return [Math.floor(value * (max - min + 1)) + min, nextState];
}

/** Shuffle an array in-place using Fisher-Yates with seeded RNG. Returns new array + updated RNG. */
export function shuffle<T>(rng: RngState, arr: readonly T[]): [T[], RngState] {
  const result = [...arr];
  let currentRng = rng;
  for (let i = result.length - 1; i > 0; i--) {
    let j: number;
    [j, currentRng] = randomInt(currentRng, 0, i);
    [result[i], result[j]] = [result[j], result[i]];
  }
  return [result, currentRng];
}

/** Pick a random element from an array. */
export function randomPick<T>(
  rng: RngState,
  arr: readonly T[]
): [T, RngState] {
  const [idx, nextState] = randomInt(rng, 0, arr.length - 1);
  return [arr[idx], nextState];
}

/** Roll N six-sided dice. Returns array of results + updated RNG. */
export function rollDice(
  rng: RngState,
  count: number
): [number[], RngState] {
  const results: number[] = [];
  let currentRng = rng;
  for (let i = 0; i < count; i++) {
    let roll: number;
    [roll, currentRng] = randomInt(currentRng, 1, 6);
    results.push(roll);
  }
  return [results, currentRng];
}
