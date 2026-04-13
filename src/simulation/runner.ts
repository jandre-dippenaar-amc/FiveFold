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

/** Run a batch of simulated games and return aggregated statistics. */
export function runSimulation(config: SimulationConfig): SimulationResults {
  const collector = new StatsCollector();
  const weights = STRATEGIES[config.strategy];
  const maxRounds = config.maxRoundsPerGame || 100;
  const baseSeed = config.seed ?? Date.now();

  for (let i = 0; i < config.games; i++) {
    const gameConfig: GameConfig = {
      playerCount: config.playerCount,
      characterIds: config.characters || DEFAULT_CHARACTERS[config.playerCount],
      difficulty: config.difficulty,
      seed: baseSeed + i,
    };

    let state = createGameState(gameConfig);

    // Play until completion or max rounds
    for (let round = 0; round < maxRounds; round++) {
      if (state.status !== 'playing') break;

      state = executeFullRound(state, (s, playerIndex) =>
        aiPlayerTurn(s, playerIndex, weights, config.strategy)
      );
    }

    // If still playing after max rounds, count as loss
    if (state.status === 'playing') {
      state = { ...state, status: 'lost', lossReason: 'Timed out — exceeded max rounds.' };
    }

    collector.record(state);

    if (config.onProgress) {
      config.onProgress(i + 1, config.games);
    }
  }

  return collector.getResults();
}

/** Run a single game and return the final state (for replay/debugging). */
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
