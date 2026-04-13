import type { GameState } from '../engine/types';
import {
  BOARD_SIZE,
  JERUSALEM_COORD,
  TOTAL_STRONGHOLDS,
} from '../engine/constants';
import { getTile } from '../engine/board';
import { getAlivePlayers } from '../engine/state';
import { manhattanDistance } from '../utils/grid';

export interface StrategyWeights {
  totalCubesOnBoard: number;
  tilesAt3Cubes: number;
  tilesAt4Cubes: number;
  totalPlayerFaith: number;
  lowestPlayerFaith: number;
  darknessMeter: number;
  strongholdsCleansed: number;
  enemyCount: number;
  principalityCount: number;
  armorUnlocked: number;
  cubesRemoved: number;
  playerDistanceToJerusalem: number; // late-game only when strongholds are cleared
  scripturCardsInHand: number;
}

export const DEFAULT_WEIGHTS: StrategyWeights = {
  totalCubesOnBoard: -2,
  tilesAt3Cubes: -8,
  tilesAt4Cubes: -25,
  totalPlayerFaith: 1.5,
  lowestPlayerFaith: 5,
  darknessMeter: -10,
  strongholdsCleansed: 20,
  enemyCount: -4,
  principalityCount: -15,
  armorUnlocked: 12,
  cubesRemoved: 0.5,
  playerDistanceToJerusalem: -3,
  scripturCardsInHand: 1,
};

export interface BoardMetrics {
  totalCubes: number;
  tilesAt3: number;
  tilesAt4: number;
  totalFaith: number;
  lowestFaith: number;
  meter: number;
  strongholdsCleansed: number;
  enemies: number;
  principalities: number;
  armor: number;
  cubesRemoved: number;
  avgDistToJerusalem: number;
  totalScriptureCards: number;
}

/** Extract numeric metrics from the game state. */
export function extractMetrics(state: GameState): BoardMetrics {
  let totalCubes = 0;
  let tilesAt3 = 0;
  let tilesAt4 = 0;

  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      const cubes = getTile(state.board, { row: r, col: c }).shadowCubes;
      totalCubes += cubes;
      if (cubes === 3) tilesAt3++;
      if (cubes >= 4) tilesAt4++;
    }
  }

  const alive = getAlivePlayers(state);
  const totalFaith = alive.reduce((s, p) => s + p.faithCurrent, 0);
  const lowestFaith = alive.length > 0
    ? Math.min(...alive.map((p) => p.faithCurrent))
    : 0;

  const avgDistToJerusalem = alive.length > 0
    ? alive.reduce((s, p) => s + manhattanDistance(p.position, JERUSALEM_COORD), 0) / alive.length
    : 0;

  const totalScriptureCards = alive.reduce((s, p) => s + p.scriptureHand.length, 0);

  return {
    totalCubes,
    tilesAt3,
    tilesAt4,
    totalFaith,
    lowestFaith,
    meter: state.darknessMeter,
    strongholdsCleansed: TOTAL_STRONGHOLDS - state.strongholdsRemaining,
    enemies: state.enemies.length,
    principalities: state.enemies.filter((e) => e.tier === 'Principality').length,
    armor: state.armorUnlocked.length,
    cubesRemoved: state.totalCubesRemoved,
    avgDistToJerusalem,
    totalScriptureCards,
  };
}

/** Score a game state. Higher = better for players. */
export function scoreState(state: GameState, weights: StrategyWeights): number {
  if (state.status === 'won') return 100000;
  if (state.status === 'lost') return -100000;

  const m = extractMetrics(state);

  // Only penalize distance to Jerusalem in late game
  const lateGameMultiplier = state.strongholdsRemaining <= 2 ? 1 : 0;

  return (
    m.totalCubes * weights.totalCubesOnBoard +
    m.tilesAt3 * weights.tilesAt3Cubes +
    m.tilesAt4 * weights.tilesAt4Cubes +
    m.totalFaith * weights.totalPlayerFaith +
    m.lowestFaith * weights.lowestPlayerFaith +
    m.meter * weights.darknessMeter +
    m.strongholdsCleansed * weights.strongholdsCleansed +
    m.enemies * weights.enemyCount +
    m.principalities * weights.principalityCount +
    m.armor * weights.armorUnlocked +
    m.cubesRemoved * weights.cubesRemoved +
    m.avgDistToJerusalem * weights.playerDistanceToJerusalem * lateGameMultiplier +
    m.totalScriptureCards * weights.scripturCardsInHand
  );
}
