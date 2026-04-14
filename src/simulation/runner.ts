import type { GameConfig, GameState, Difficulty, CharacterId } from '../engine/types';
import { createGameState } from '../engine/state';
import { executeFullRound } from '../engine/phases';
import { aiPlayerTurn } from './aiPlayer';
import { STRATEGIES, type StrategyId } from './strategies';
import { StatsCollector, type SimulationResults } from './stats';

export interface SimulationConfig {
  games: number;
  playerCount: number;
  characters?: CharacterId[];
  difficulty: Difficulty;
  strategy: StrategyId;
  seed?: number;
  maxRoundsPerGame?: number;
  onProgress?: (completed: number, total: number) => void;
}

const DEFAULT_CHARACTERS: Record<number, CharacterId[]> = {
  2: ['pastor', 'evangelist'],
  3: ['pastor', 'apostle', 'evangelist'],
  4: ['pastor', 'apostle', 'evangelist', 'prophet'],
  5: ['pastor', 'apostle', 'evangelist', 'prophet', 'teacher'],
};

/** Run a single game and return a lightweight final state (log stripped). */
function runOneGame(
  gameConfig: GameConfig,
  weights: typeof STRATEGIES[StrategyId],
  strategy: StrategyId,
  maxRounds: number
): GameState {
  let state = createGameState(gameConfig);
  // Strip the log during simulation — we don't need it for stats
  state = { ...state, log: [] };

  for (let round = 0; round < maxRounds; round++) {
    if (state.status !== 'playing') break;

    state = executeFullRound(state, (s, playerIndex) =>
      aiPlayerTurn(s, playerIndex, weights, strategy)
    );

    // Aggressively strip accumulated data to keep memory flat
    state = {
      ...state,
      log: [],
      darknessDiscard: [],
      scriptureDiscard: [],
    };
  }

  if (state.status === 'playing') {
    state = { ...state, status: 'lost', lossReason: 'Timed out — exceeded max rounds.' };
  }

  return state;
}

/** Run a batch of simulated games and return aggregated statistics. */
export function runSimulation(config: SimulationConfig): SimulationResults {
  const collector = new StatsCollector();
  const weights = STRATEGIES[config.strategy];
  const maxRounds = config.maxRoundsPerGame || 50;
  const baseSeed = config.seed ?? Date.now();

  for (let i = 0; i < config.games; i++) {
    const gameConfig: GameConfig = {
      playerCount: config.playerCount,
      characterIds: config.characters || DEFAULT_CHARACTERS[config.playerCount],
      difficulty: config.difficulty,
      seed: baseSeed + i,
    };

    const state = runOneGame(gameConfig, weights, config.strategy, maxRounds);
    collector.record(state);

    if (config.onProgress) {
      config.onProgress(i + 1, config.games);
    }
  }

  return collector.getResults();
}

/** Run a single game with full log (for replay/debugging). */
export function runSingleGame(
  gameConfig: GameConfig,
  strategy: StrategyId = 'balanced',
  maxRounds = 100
): GameState {
  const weights = STRATEGIES[strategy];
  let state = createGameState(gameConfig);

  for (let round = 0; round < maxRounds; round++) {
    if (state.status !== 'playing') break;
    state = executeFullRound(state, (s, playerIndex) =>
      aiPlayerTurn(s, playerIndex, weights, strategy)
    );
  }

  if (state.status === 'playing') {
    state = { ...state, status: 'lost', lossReason: 'Timed out — exceeded max rounds.' };
  }

  return state;
}
