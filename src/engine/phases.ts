import type { GameState } from './types';
import {
  ACTIONS_PER_TURN,
  DIFFICULTY_PRESETS,
  OVERFLOW_THRESHOLD,
} from './constants';
import { getTile, addCubes } from './board';
import { addLog, getAlivePlayers } from './state';
import { drawScriptureToHandLimit, drawAndResolveDarknessCard } from './cards';
import { resolveEnemyPhase } from './enemies';
import { checkLossConditions, checkWinCondition, handleHelmetRespawn } from './winLoss';
import { getPrayerTokenBonus } from './actions';
import { pastorLayDownYourLife } from './characters';
import { getOrthogonalAdjacent } from '../utils/grid';

// ── Phase 1: Prayer Phase ────────────────────────────────────────────

/** Execute the Prayer Phase — all players draw Scripture to hand limit. */
export function executePrayerPhase(state: GameState): GameState {
  state = addLog(state, 'Prayer', `--- Round ${state.round} — Prayer Phase ---`);
  state = { ...state, phase: 'Prayer', shieldOfFaithUsedThisRound: false };

  // Reset per-round flags
  state = {
    ...state,
    players: state.players.map((p) => ({
      ...p,
      foresightUsedThisRound: false,
    })),
  };

  // All players draw Scripture cards to hand limit
  for (const player of getAlivePlayers(state)) {
    state = drawScriptureToHandLimit(state, player.id);
  }

  return state;
}

// ── Phase 2: Action Phase ────────────────────────────────────────────

/** Begin a player's action turn within the Action Phase. */
export function beginPlayerTurn(state: GameState, playerIndex: number): GameState {
  const player = state.players[playerIndex];
  if (player.isEliminated) return state;

  // Calculate actions: base + prayer token bonus + any carried bonus
  let actions = ACTIONS_PER_TURN;
  actions += getPrayerTokenBonus(state, player);
  actions += player.bonusActionsThisTurn;

  // High Place tile: +1 action
  const tile = getTile(state.board, player.position);
  if (tile.type === 'HighPlace') actions += 1;

  state = {
    ...state,
    phase: 'Action',
    currentPlayerIndex: playerIndex,
    actionsRemaining: actions,
  };

  // Reset per-turn flags
  state = {
    ...state,
    players: state.players.map((p, i) =>
      i === playerIndex
        ? {
            ...p,
            ministryUsedThisTurn: false,
            anointingUsedThisTurn: false,
            bonusActionsThisTurn: 0,
            // Clear isolation from PREVIOUS turn
            isolatedNextTurn: false,
          }
        : p
    ),
  };

  return state;
}

// ── Phase 3: Darkness Phase ──────────────────────────────────────────

/** Execute the Darkness Phase — draw N cards = Darkness Meter level. */
export function executeDarknessPhase(state: GameState): GameState {
  state = { ...state, phase: 'Darkness', darknessCardsDrawnThisPhase: 0 };
  state = addLog(state, 'Darkness', `--- Darkness Phase (Meter: ${state.darknessMeter}) ---`);

  const preset = DIFFICULTY_PRESETS.find((d) => d.id === state.config.difficulty)!;
  const cardsToDraw = state.darknessMeter + preset.extraDarknessCardsPerRound;

  for (let i = 0; i < cardsToDraw; i++) {
    if (state.status !== 'playing') break;

    state = drawAndResolveDarknessCard(state);

    // Check loss after each card
    state = checkLossConditions(state);
  }

  return state;
}

// ── Phase 4: Enemy Phase ─────────────────────────────────────────────

/** Execute the Enemy Phase. */
export function executeEnemyPhase(state: GameState): GameState {
  state = { ...state, phase: 'Enemy' };
  state = addLog(state, 'Enemy', '--- Enemy Phase ---');

  state = resolveEnemyPhase(state);

  // Check loss after enemy actions
  state = checkLossConditions(state);

  return state;
}

// ── Phase 5: Check Phase ─────────────────────────────────────────────

/** Execute the Check Phase — overflow, elimination, win/loss. */
export function executeCheckPhase(state: GameState): GameState {
  state = { ...state, phase: 'Check' };
  state = addLog(state, 'Check', '--- Check Phase ---');

  // 1. Shadow Overflow Check
  state = resolveOverflow(state);
  state = checkLossConditions(state);
  if (state.status !== 'playing') return state;

  // 2. Elimination Check
  state = handleElimination(state);
  state = checkLossConditions(state);
  if (state.status !== 'playing') return state;

  // 3. Win Check
  state = checkWinCondition(state);
  if (state.status !== 'playing') return state;

  // 4. Final loss check
  state = checkLossConditions(state);

  return state;
}

/** Resolve overflow: tiles with 4+ cubes spill 1 to each adjacent, Meter +1. */
function resolveOverflow(state: GameState): GameState {
  let overflowOccurred = true;
  let iterations = 0;
  const maxIterations = 50; // Prevent infinite loops

  while (overflowOccurred && iterations < maxIterations) {
    overflowOccurred = false;
    iterations++;

    for (let r = 0; r < 7; r++) {
      for (let c = 0; c < 7; c++) {
        const tile = getTile(state.board, { row: r, col: c });
        if (tile.shadowCubes >= OVERFLOW_THRESHOLD) {
          overflowOccurred = true;

          // Keep 3 cubes, spill 1 to each adjacent
          const spillCoord = { row: r, col: c };
          const adjacent = getOrthogonalAdjacent(spillCoord);

          // Reduce to 3 cubes
          let board = state.board;
          board = board.map((row, ri) =>
            ri === r
              ? row.map((t, ci) => (ci === c ? { ...t, shadowCubes: 3 } : t))
              : row
          );

          // Spill 1 cube to each adjacent tile
          for (const adj of adjacent) {
            board = addCubes(board, adj, 1);
          }

          state = { ...state, board };

          // Advance Darkness Meter by 1
          state = { ...state, darknessMeter: state.darknessMeter + 1 };
          state = addLog(state, state.phase, `Shadow Overflow at (${r},${c})! Spilled to ${adjacent.length} tiles. Meter +1.`);

          // Check for instant loss (5th cube)
          state = checkLossConditions(state);
          if (state.status !== 'playing') return state;
        }
      }
    }
  }

  return state;
}

/** Handle player elimination (0 Faith). */
function handleElimination(state: GameState): GameState {
  // First try Helmet of Salvation respawn
  state = handleHelmetRespawn(state);

  // Then check for Pastor's Lay Down Your Life passive
  for (const player of state.players) {
    if (player.isEliminated || player.faithCurrent > 0) continue;

    // Look for adjacent Pastor
    const pastor = state.players.find(
      (p) => p.characterId === 'pastor' && !p.isEliminated && p.faithCurrent >= 2
    );
    if (pastor) {
      state = pastorLayDownYourLife(state, pastor.id, player.id);
    }
  }

  return state;
}

// ── Full Round Orchestration ─────────────────────────────────────────

/** Advance to the next round. */
export function advanceRound(state: GameState): GameState {
  return {
    ...state,
    round: state.round + 1,
    currentPlayerIndex: 0,
  };
}

/** Execute a full automated round (for simulation). */
export function executeFullRound(
  state: GameState,
  actionCallback: (state: GameState, playerIndex: number) => GameState
): GameState {
  if (state.status !== 'playing') return state;

  // Phase 1: Prayer
  state = executePrayerPhase(state);

  // Phase 2: Action — each player takes their turn
  for (let i = 0; i < state.players.length; i++) {
    if (state.status !== 'playing') break;
    if (state.players[i].isEliminated) continue;

    state = beginPlayerTurn(state, i);
    state = actionCallback(state, i);
  }

  // Phase 3: Darkness
  if (state.status === 'playing') {
    state = executeDarknessPhase(state);
  }

  // Phase 4: Enemy
  if (state.status === 'playing') {
    state = executeEnemyPhase(state);
  }

  // Phase 5: Check
  if (state.status === 'playing') {
    state = executeCheckPhase(state);
  }

  // Advance round
  if (state.status === 'playing') {
    state = advanceRound(state);
  }

  return state;
}
