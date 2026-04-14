import type {
  GameState,
  GameConfig,
  PlayerState,
  ScriptureCardInstance,
  DarknessCardInstance,
  Coord,
  CharacterId,
  GameEvent,
  Phase,
} from './types';
import {
  CHARACTERS,
  SCRIPTURE_CARDS,
  SCRIPTURE_COPIES,
  DARKNESS_CARDS,
  DIFFICULTY_PRESETS,
  TESTED_REMOVED_SCRIPTURE,
  ACTIONS_PER_TURN,
  TOTAL_STRONGHOLDS,
} from './constants';
import { createBoard } from './board';
import { createRng, shuffle, randomPick } from '../utils/random';
import { getEdgeTiles, coordEqual } from '../utils/grid';
import type { RngState } from './types';

/** Build the scripture deck (2 copies of each card, shuffled). */
function buildScriptureDeck(
  rng: RngState,
  difficulty: string
): [ScriptureCardInstance[], RngState, number] {
  const cards: ScriptureCardInstance[] = [];
  let nextId = 1;

  for (const def of SCRIPTURE_CARDS) {
    // In "Tested" difficulty, remove specific cards
    if (
      difficulty === 'tested' &&
      TESTED_REMOVED_SCRIPTURE.includes(def.id)
    ) {
      continue;
    }

    for (let copy = 0; copy < SCRIPTURE_COPIES; copy++) {
      cards.push({
        defId: def.id,
        instanceId: `sc-${nextId++}`,
      });
    }
  }

  const [shuffled, nextRng] = shuffle(rng, cards);
  return [shuffled, nextRng, nextId];
}

/** Build the darkness deck from card definitions (respecting count and difficulty). */
function buildDarknessDeck(
  rng: RngState,
  difficulty: string
): [DarknessCardInstance[], RngState, number] {
  const cards: DarknessCardInstance[] = [];
  let nextId = 1;

  // Get difficulty preset to check for removed cards
  const preset = DIFFICULTY_PRESETS.find((d) => d.id === difficulty);
  const removedCounts: Record<string, number> = {};
  if (preset) {
    for (const cardId of preset.removedDarknessCards) {
      removedCounts[cardId] = (removedCounts[cardId] || 0) + 1;
    }
  }

  for (const def of DARKNESS_CARDS) {
    let count = def.countInDeck;
    const toRemove = removedCounts[def.id] || 0;
    count = Math.max(0, count - toRemove);

    for (let i = 0; i < count; i++) {
      cards.push({
        defId: def.id,
        instanceId: `dc-${nextId++}`,
      });
    }
  }

  const [shuffled, nextRng] = shuffle(rng, cards);
  return [shuffled, nextRng, nextId];
}

/** Place players on the board and create initial player states. */
function createPlayers(
  characterIds: CharacterId[],
  rng: RngState,
  scriptureDeck: ScriptureCardInstance[],
  extraScriptureCards: number
): [PlayerState[], ScriptureCardInstance[], RngState] {
  const players: PlayerState[] = [];
  let currentRng = rng;
  let remainingDeck = [...scriptureDeck];

  // Get available edge tiles for non-Jerusalem starters
  const edgeTiles = getEdgeTiles();
  const usedEdges: Coord[] = [];

  for (let i = 0; i < characterIds.length; i++) {
    const charId = characterIds[i];
    const charDef = CHARACTERS[charId];

    // Determine starting position
    let position: Coord;
    if (charDef.startingPosition === 'jerusalem') {
      position = { row: 3, col: 3 };
    } else {
      // Pick a random edge tile that isn't already used
      const available = edgeTiles.filter(
        (e) => !usedEdges.some((u) => coordEqual(u, e))
      );
      [position, currentRng] = randomPick(currentRng, available);
      usedEdges.push(position);
    }

    // Draw starting scripture cards
    const drawCount = charDef.startingScriptureCards + extraScriptureCards;
    const hand: ScriptureCardInstance[] = remainingDeck.slice(0, drawCount);
    remainingDeck = remainingDeck.slice(drawCount);

    players.push({
      id: `player-${i}`,
      characterId: charId,
      position,
      faithCurrent: charDef.faithMax,
      faithMax: charDef.faithMax,
      scriptureHand: hand,
      ministryUsedThisTurn: false,
      anointingUnlocked: false,
      anointingUsedThisTurn: false,
      totalPrayActions: 0,
      isEliminated: false,
      isolatedNextTurn: false,
      bonusActionsThisTurn: 0,
      foresightUsedThisRound: false,
    });
  }

  return [players, remainingDeck, currentRng];
}

/** Create a fresh game state from configuration. */
export function createGameState(config: GameConfig): GameState {
  let rng = createRng(config.seed);

  // Get difficulty preset
  const preset = DIFFICULTY_PRESETS.find((d) => d.id === config.difficulty)!;

  // Create board
  let board;
  [board, rng] = createBoard(rng);

  // Build decks
  let scriptureDeck: ScriptureCardInstance[];
  let nextCardId: number;
  [scriptureDeck, rng, nextCardId] = buildScriptureDeck(rng, config.difficulty);

  let darknessDeck: DarknessCardInstance[];
  let nextDarknessId: number;
  [darknessDeck, rng, nextDarknessId] = buildDarknessDeck(rng, config.difficulty);

  // Create players and draw starting hands
  let players: PlayerState[];
  [players, scriptureDeck, rng] = createPlayers(
    config.characterIds,
    rng,
    scriptureDeck,
    preset.extraScriptureCards
  );

  // Place players on the board tiles
  for (const player of players) {
    board = board.map((row, r) =>
      r === player.position.row
        ? row.map((t, c) =>
            c === player.position.col
              ? { ...t, playerIds: [...t.playerIds, player.id], faceDown: false }
              : t
          )
        : row
    );
  }

  const state: GameState = {
    config,
    board,
    players,
    currentPlayerIndex: 0,
    phase: 'Prayer',
    actionsRemaining: ACTIONS_PER_TURN,
    round: 1,
    darknessMeter: preset.startingDarknessMeter,
    totalCubesRemoved: 0,
    armorUnlocked: [],
    shieldOfFaithUsedThisRound: false,
    enemies: [],
    strongholdsRemaining: TOTAL_STRONGHOLDS,
    scriptureDeck,
    scriptureDiscard: [],
    darknessDeck,
    darknessDiscard: [],
    darknessCardsDrawnThisPhase: 0,
    rng,
    log: [],
    status: 'playing',
    lossReason: null,
    nextEnemyId: 1,
    nextCardInstanceId: nextCardId + nextDarknessId,
    greaterIsHeActive: false,
    heWhoIsInMeActive: false,
  };

  return addLog(state, 'Prayer', `Game started with ${config.playerCount} players on ${preset.name} difficulty.`);
}

/** Add an event to the game log. */
export function addLog(
  state: GameState,
  phase: Phase,
  description: string
): GameState {
  const event: GameEvent = {
    round: state.round,
    phase,
    description,
  };
  return { ...state, log: [...state.log, event] };
}

/** Get the current player. */
export function getCurrentPlayer(state: GameState): PlayerState {
  return state.players[state.currentPlayerIndex];
}

/** Update a specific player in the state (immutable). */
export function updatePlayer(
  state: GameState,
  playerId: string,
  update: Partial<PlayerState>
): GameState {
  return {
    ...state,
    players: state.players.map((p) =>
      p.id === playerId ? { ...p, ...update } : p
    ),
  };
}

/** Get a player by ID. */
export function getPlayer(state: GameState, playerId: string): PlayerState {
  const player = state.players.find((p) => p.id === playerId);
  if (!player) throw new Error(`Player ${playerId} not found`);
  return player;
}

/** Get alive (non-eliminated) players. */
export function getAlivePlayers(state: GameState): PlayerState[] {
  return state.players.filter((p) => !p.isEliminated);
}

/** Generate a unique enemy ID. */
export function nextEnemyId(state: GameState): [string, GameState] {
  const id = `enemy-${state.nextEnemyId}`;
  return [id, { ...state, nextEnemyId: state.nextEnemyId + 1 }];
}
