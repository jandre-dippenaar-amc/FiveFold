import type { StrategyWeights } from './evaluator';
import { DEFAULT_WEIGHTS } from './evaluator';

export type StrategyId = 'balanced' | 'aggressive' | 'defensive' | 'rush' | 'random';

export const STRATEGIES: Record<StrategyId, StrategyWeights> = {
  balanced: { ...DEFAULT_WEIGHTS },

  aggressive: {
    ...DEFAULT_WEIGHTS,
    totalCubesOnBoard: -3,
    strongholdsCleansed: 30,
    enemyCount: -8,
    principalityCount: -20,
    cubesRemoved: 1,
    lowestPlayerFaith: 2, // less cautious about faith
  },

  defensive: {
    ...DEFAULT_WEIGHTS,
    totalPlayerFaith: 3,
    lowestPlayerFaith: 10,
    darknessMeter: -15,
    tilesAt3Cubes: -12,
    tilesAt4Cubes: -40,
    strongholdsCleansed: 10, // less focus on winning, more on surviving
  },

  rush: {
    ...DEFAULT_WEIGHTS,
    strongholdsCleansed: 40,
    playerDistanceToJerusalem: -8,
    totalCubesOnBoard: -1, // ignores peripheral cubes
    enemyCount: -2, // ignores minor enemies
  },

  // Random strategy uses default weights but the AI player picks randomly
  random: { ...DEFAULT_WEIGHTS },
};
