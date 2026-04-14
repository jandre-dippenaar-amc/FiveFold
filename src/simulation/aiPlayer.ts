import type { GameState, Coord } from '../engine/types';
import { CHARACTERS, JERUSALEM_COORD, BOARD_SIZE } from '../engine/constants';
import { getPlayer, getAlivePlayers } from '../engine/state';
import { getTile } from '../engine/board';
import {
  canMove, executeMove,
  canCleanse, executeCleanse,
  canBattle, executeBattle,
  canPray, executePray,
  canEncourage, executeEncourage,
} from '../engine/actions';
import { canUseMinistry, executeMinistry, canUseAnointing, executeAnointing } from '../engine/characters';
import { canPlayScripture, executeScripture } from '../engine/cards';
import { scoreState, type StrategyWeights } from './evaluator';
import {
  getOrthogonalAdjacent,
  getAllAdjacent,
  coordEqual,
  manhattanDistance,
} from '../utils/grid';
import { randomInt } from '../utils/random';
import type { StrategyId } from './strategies';

// Anti-oscillation: track each player's previous position
const prevPositions = new Map<string, Coord>();

/** AI player: takes a full turn using goal-directed planning. */
export function aiPlayerTurn(
  state: GameState,
  playerIndex: number,
  weights: StrategyWeights,
  strategyId: StrategyId = 'balanced'
): GameState {
  const player = state.players[playerIndex];
  if (player.isEliminated || state.status !== 'playing') return state;

  // Free actions first
  state = useFreeActions(state, player.id, weights, strategyId);

  if (strategyId === 'random') return randomTurn(state, player.id);

  // CRITICAL: If all strongholds are cleared, RUSH to Jerusalem
  if (state.strongholdsRemaining === 0) {
    return rushJerusalem(state, player.id);
  }

  return tacticalTurn(state, player.id);
}

// ── Jerusalem Rush Mode ──────────────────────────────────────────────

/** All strongholds cleared — every action goes to reaching Jerusalem. */
function rushJerusalem(state: GameState, playerId: string): GameState {
  while (state.actionsRemaining > 0 && state.status === 'playing') {
    const player = getPlayer(state, playerId);

    // Already on Jerusalem? Done.
    if (coordEqual(player.position, JERUSALEM_COORD)) {
      // Pray if low on faith, otherwise just end turn
      if (player.faithCurrent <= 2 && canPray(state, playerId).valid) {
        state = executePray(state, playerId);
      } else {
        break;
      }
      continue;
    }

    // Move toward Jerusalem
    const stepped = stepTowardTarget(state, playerId, JERUSALEM_COORD);
    if (stepped) {
      state = stepped;
    } else {
      // Can't move (maybe blocked by shadow tile with no faith)
      if (canPray(state, playerId).valid) {
        state = executePray(state, playerId);
      } else {
        break;
      }
    }
  }
  return state;
}

// ── Tactical Turn (normal gameplay) ──────────────────────────────────

function tacticalTurn(state: GameState, playerId: string): GameState {
  // Step 1: Cleanse current tile if it has cubes or stronghold layers
  state = cleanseCurrentTile(state, playerId);

  // Step 2: Battle enemies on current tile
  state = battleCurrentTile(state, playerId);

  // Step 3: If faith is critically low (<=2), pray once
  const p1 = getPlayer(state, playerId);
  if (p1.faithCurrent <= 2 && state.actionsRemaining > 0 && canPray(state, playerId).valid) {
    state = executePray(state, playerId);
  }

  // Step 4: Pick best goal and move toward it (use at most half remaining actions for movement)
  const moveActions = Math.min(Math.ceil(state.actionsRemaining / 2), 3);
  if (state.actionsRemaining > 0 && state.status === 'playing') {
    const goal = pickGoal(state, playerId);
    if (goal) {
      state = moveTowardTarget(state, playerId, goal, moveActions);
    }
  }

  // Step 5: Cleanse and battle at new position
  state = cleanseCurrentTile(state, playerId);
  state = battleCurrentTile(state, playerId);

  // Step 6: Use remaining actions productively
  while (state.actionsRemaining > 0 && state.status === 'playing') {
    const cur = getPlayer(state, playerId);

    // Move to adjacent tile with cubes and cleanse it
    const movedToCleanse = moveAndCleanse(state, playerId);
    if (movedToCleanse) { state = movedToCleanse; continue; }

    // Encourage a nearby low-faith ally
    if (cur.faithCurrent > 4) {
      const encouraged = tryEncourage(state, playerId);
      if (encouraged) { state = encouraged; continue; }
    }

    // Pray if below 70% faith
    if (cur.faithCurrent < cur.faithMax * 0.7 && canPray(state, playerId).valid) {
      state = executePray(state, playerId);
      continue;
    }

    // Move toward the next best goal
    const goal2 = pickGoal(state, playerId);
    if (goal2) {
      const stepped = stepTowardTarget(state, playerId, goal2);
      if (stepped) { state = stepped; continue; }
    }

    // Nothing productive — end turn early
    break;
  }

  return state;
}

// ── Goal Selection ───────────────────────────────────────────────────

function pickGoal(state: GameState, playerId: string): Coord | null {
  const player = getPlayer(state, playerId);
  const pos = player.position;

  let bestCoord: Coord | null = null;
  let bestScore = -Infinity;

  // Which tiles have other players heading toward them?
  const otherPlayerPositions = getAlivePlayers(state)
    .filter((p) => p.id !== playerId)
    .map((p) => p.position);

  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      const coord = { row: r, col: c };
      if (coordEqual(coord, pos)) continue;

      const tile = getTile(state.board, coord);
      const dist = manhattanDistance(pos, coord);
      if (dist > 6) continue; // Too far to be a good goal

      let score = 0;

      // Cube urgency: 3+ cubes = overflow danger
      if (tile.shadowCubes >= 3) score += 200;
      else if (tile.shadowCubes >= 2) score += 80;

      // Strongholds: the win condition
      if (tile.strongholdLayers > 0) {
        score += 120;
        // Bonus for strongholds with fewer layers (closer to clearing)
        score += (4 - tile.strongholdLayers) * 20;
      }

      // Enemies
      for (const enemy of state.enemies) {
        if (coordEqual(enemy.position, coord)) {
          score += enemy.tier === 'Principality' ? 150 : enemy.tier === 'Power' ? 60 : 30;
        }
      }

      // Distance penalty — prefer closer targets
      score -= dist * 15;

      // Avoid targets another player is already on
      if (otherPlayerPositions.some((p) => coordEqual(p, coord))) {
        score -= 40;
      }

      // Late game: start favoring Jerusalem
      if (state.strongholdsRemaining <= 2 && coordEqual(coord, JERUSALEM_COORD)) {
        score += 200;
      }

      if (score > bestScore) {
        bestScore = score;
        bestCoord = coord;
      }
    }
  }

  return bestScore > 0 ? bestCoord : null;
}

// ── Movement ─────────────────────────────────────────────────────────

/** Move up to maxSteps toward a target, avoiding oscillation and unnecessary shadow entry. */
function moveTowardTarget(state: GameState, playerId: string, target: Coord, maxSteps: number): GameState {
  for (let step = 0; step < maxSteps; step++) {
    const stepped = stepTowardTarget(state, playerId, target);
    if (!stepped) break;
    state = stepped;
    // Stop if we arrived
    if (coordEqual(getPlayer(state, playerId).position, target)) break;
  }
  return state;
}

/** Take one step toward a target. Returns null if no valid move. */
function stepTowardTarget(state: GameState, playerId: string, target: Coord): GameState | null {
  if (state.actionsRemaining <= 0 || state.status !== 'playing') return null;
  const player = getPlayer(state, playerId);
  if (coordEqual(player.position, target)) return null;

  const charDef = CHARACTERS[player.characterId];
  const adjacent = charDef.canMoveDiagonally
    ? getAllAdjacent(player.position)
    : getOrthogonalAdjacent(player.position);

  let bestMove: Coord | null = null;
  let bestScore = -Infinity;

  for (const adj of adjacent) {
    if (!canMove(state, playerId, adj).valid) continue;

    const distToTarget = manhattanDistance(adj, target);
    const tile = getTile(state.board, adj);
    let score = -distToTarget * 10;

    // Heavy penalty for entering shadow tiles unnecessarily (costs faith)
    if (tile.type === 'Shadow' && tile.shadowCubes > 0 && !coordEqual(adj, target)) {
      if (player.faithCurrent <= 3) score -= 200;
      else score -= 10;
    }

    // Anti-oscillation
    const prev = prevPositions.get(playerId);
    if (prev && coordEqual(adj, prev)) score -= 50;

    // Bonus for tiles with cubes (can cleanse on the way)
    if (tile.shadowCubes >= 2) score += 15;

    if (score > bestScore) {
      bestScore = score;
      bestMove = adj;
    }
  }

  if (!bestMove) return null;
  prevPositions.set(playerId, player.position);
  return executeMove(state, playerId, bestMove);
}

// ── Action Helpers ───────────────────────────────────────────────────

function cleanseCurrentTile(state: GameState, playerId: string): GameState {
  const tile = getTile(state.board, getPlayer(state, playerId).position);
  // Only cleanse if there are cubes or stronghold layers
  let iters = 0;
  while ((tile.shadowCubes > 0 || getTile(state.board, getPlayer(state, playerId).position).strongholdLayers > 0) && state.actionsRemaining > 0 && state.status === 'playing' && iters++ < 10) {
    if (canCleanse(state, playerId).valid) {
      state = executeCleanse(state, playerId);
    } else break;
  }
  return state;
}

function battleCurrentTile(state: GameState, playerId: string): GameState {
  for (const enemy of [...state.enemies]) {
    const p = getPlayer(state, playerId);
    if (coordEqual(p.position, enemy.position) && state.actionsRemaining > 0 && state.status === 'playing') {
      if (canBattle(state, playerId, enemy.id).valid) {
        state = executeBattle(state, playerId, enemy.id);
      }
    }
  }
  return state;
}

function moveAndCleanse(state: GameState, playerId: string): GameState | null {
  if (state.actionsRemaining < 2) return null;
  const player = getPlayer(state, playerId);
  const charDef = CHARACTERS[player.characterId];
  const adjacent = charDef.canMoveDiagonally
    ? getAllAdjacent(player.position)
    : getOrthogonalAdjacent(player.position);

  // Find adjacent tile with most cubes
  let bestAdj: Coord | null = null;
  let bestCubes = 1; // Only consider tiles with 2+ cubes

  for (const adj of adjacent) {
    const tile = getTile(state.board, adj);
    if (tile.shadowCubes > bestCubes && canMove(state, playerId, adj).valid) {
      bestCubes = tile.shadowCubes;
      bestAdj = adj;
    }
  }

  if (bestAdj) {
    let s = executeMove(state, playerId, bestAdj);
    if (canCleanse(s, playerId).valid) {
      s = executeCleanse(s, playerId);
    }
    return s;
  }
  return null;
}

function tryEncourage(state: GameState, playerId: string): GameState | null {
  const alive = getAlivePlayers(state);
  for (const other of alive) {
    if (other.id !== playerId && other.faithCurrent <= 3) {
      if (canEncourage(state, playerId, other.id).valid) {
        return executeEncourage(state, playerId, other.id);
      }
    }
  }
  return null;
}

// ── Free Actions ─────────────────────────────────────────────────────

function useFreeActions(state: GameState, playerId: string, weights: StrategyWeights, _strategyId: StrategyId): GameState {
  // Ministry (free)
  if (canUseMinistry(state, playerId).valid) {
    const targets = buildMinistryTargets(state, playerId);
    try { state = executeMinistry(state, playerId, targets); } catch { /* skip */ }
  }

  // Anointing (free)
  if (canUseAnointing(state, playerId).valid) {
    const targets = buildAnointingTargets(state, playerId);
    try { state = executeAnointing(state, playerId, targets); } catch { /* skip */ }
  }

  // Scripture cards — play aggressively
  const player = getPlayer(state, playerId);
  for (const card of [...player.scriptureHand]) {
    if (state.status !== 'playing') break;
    if (!canPlayScripture(state, playerId, card.instanceId).valid) continue;
    const targets = buildScriptureTargets(state, card.defId);
    try {
      const next = executeScripture(state, playerId, card.instanceId, targets);
      // Almost always play — only skip Sent Ones (needs complex targeting) and Spirit of Unity (conditional)
      const skipCards = ['sentOnes'];
      if (!skipCards.includes(card.defId)) {
        if (scoreState(next, weights) >= scoreState(state, weights) - 10) {
          state = next;
        }
      }
    } catch { /* skip */ }
  }

  return state;
}

// ── Random strategy ──────────────────────────────────────────────────

function randomTurn(state: GameState, playerId: string): GameState {
  let safety = 30;
  while (state.actionsRemaining > 0 && state.status === 'playing' && safety-- > 0) {
    const player = getPlayer(state, playerId);
    const charDef = CHARACTERS[player.characterId];
    const adj = charDef.canMoveDiagonally ? getAllAdjacent(player.position) : getOrthogonalAdjacent(player.position);

    const actions: Array<() => GameState> = [];
    for (const a of adj) { if (canMove(state, playerId, a).valid) actions.push(() => executeMove(state, playerId, a)); }
    if (canCleanse(state, playerId).valid) actions.push(() => executeCleanse(state, playerId));
    if (canPray(state, playerId).valid) actions.push(() => executePray(state, playerId));
    for (const e of state.enemies) {
      if (coordEqual(e.position, player.position) && canBattle(state, playerId, e.id).valid) {
        actions.push(() => executeBattle(state, playerId, e.id));
      }
    }
    if (actions.length === 0) break;
    let idx: number;
    [idx, state = { ...state }] = (() => { const [v, rng] = randomInt(state.rng, 0, actions.length - 1); return [v, { ...state, rng }]; })();
    state = actions[idx]();
  }
  return state;
}

// ── Target Builders ──────────────────────────────────────────────────

function buildMinistryTargets(state: GameState, playerId: string) {
  const player = getPlayer(state, playerId);
  switch (player.characterId) {
    case 'pastor': {
      const charDef = CHARACTERS[player.characterId];
      const adj = charDef.canMoveDiagonally ? getAllAdjacent(player.position) : getOrthogonalAdjacent(player.position);
      const adjacentPlayers = getAlivePlayers(state).filter(
        (p) => p.id !== playerId && adj.some((a) => coordEqual(a, p.position)) && p.faithCurrent < p.faithMax
      );
      const gifts = adjacentPlayers.sort((a, b) => a.faithCurrent - b.faithCurrent)
        .slice(0, 2).map((p) => ({ targetPlayerId: p.id, amount: 1 }));
      return { faithGifts: gifts };
    }
    case 'apostle': {
      // Move a player toward the nearest stronghold or toward Jerusalem if done
      const others = getAlivePlayers(state).filter((p) => p.id !== playerId);
      if (others.length === 0) return {};
      if (state.strongholdsRemaining === 0) {
        // Rush someone to Jerusalem
        const farthest = others.reduce((best, p) =>
          manhattanDistance(p.position, JERUSALEM_COORD) > manhattanDistance(best.position, JERUSALEM_COORD) ? p : best
        );
        const step = stepCoord(farthest.position, JERUSALEM_COORD);
        return { targetPlayerId: farthest.id, targetCoord: step };
      }
      const danger = findMostDangerousTile(state);
      if (!danger) return {};
      const closest = others.reduce((best, p) =>
        manhattanDistance(p.position, danger) < manhattanDistance(best.position, danger) ? p : best
      );
      const step = stepCoord(closest.position, danger);
      return { targetPlayerId: closest.id, targetCoord: step };
    }
    case 'prophet': {
      const top3 = state.darknessDeck.slice(0, 3);
      if (top3.length === 0) return {};
      const severity: Record<string, number> = {
        'creepingDark': 1, 'temptation': 2, 'accusation': 2, 'isolation': 1,
        'encroach': 3, 'floodOfDarkness': 4, 'spreadingBlight': 6,
        'theEnemyRages': 4, 'nightFalls': 7, 'pulse': 5, 'entrench': 3,
        'spiritualWickednessAppears': 2, 'powerManifests': 3, 'principalityRises': 8,
        'persecution': 5, 'valleyOfTheShadow': 4, 'darkNightOfTheSoul': 3,
      };
      const sorted = [...top3].sort((a, b) => (severity[a.defId] || 3) - (severity[b.defId] || 3));
      return { reorderedCardIds: sorted.map((c) => c.instanceId) };
    }
    default: return {};
  }
}

function buildAnointingTargets(state: GameState, playerId: string) {
  const player = getPlayer(state, playerId);
  switch (player.characterId) {
    case 'evangelist': {
      let bestCoord: Coord | undefined, bestCubes = 0;
      for (let r = 0; r < BOARD_SIZE; r++) for (let c = 0; c < BOARD_SIZE; c++) {
        const t = getTile(state.board, { row: r, col: c });
        if (t.type === 'Shadow' && t.shadowCubes > bestCubes) { bestCubes = t.shadowCubes; bestCoord = { row: r, col: c }; }
      }
      return { targetCoord: bestCoord };
    }
    case 'prophet': {
      for (let r = 0; r < BOARD_SIZE; r++) for (let c = 0; c < BOARD_SIZE; c++) {
        if (getTile(state.board, { row: r, col: c }).faceDown) return { revealCoord: { row: r, col: c } };
      }
      return {};
    }
    default: return {};
  }
}

function buildScriptureTargets(state: GameState, cardDefId: string) {
  switch (cardDefId) {
    case 'putOnTheFullArmor': {
      const alive = getAlivePlayers(state);
      const weakest = alive.reduce((min, p) => p.faithCurrent < min.faithCurrent ? p : min);
      return { targetPlayerId: weakest.id };
    }
    case 'resistTheDevil': {
      const p = state.enemies.find((e) => e.tier === 'Principality') || state.enemies.find((e) => e.tier === 'Power') || state.enemies[0];
      return p ? { targetEnemyId: p.id } : {};
    }
    case 'swordOfTheSpiritCard': {
      let best: Coord | undefined, bestLayers = 999;
      for (let r = 0; r < BOARD_SIZE; r++) for (let c = 0; c < BOARD_SIZE; c++) {
        const t = getTile(state.board, { row: r, col: c });
        if (t.strongholdLayers > 0 && t.strongholdLayers < bestLayers) { bestLayers = t.strongholdLayers; best = { row: r, col: c }; }
      }
      return best ? { targetStrongholdCoord: best } : {};
    }
    default: return {};
  }
}

// ── Helpers ──────────────────────────────────────────────────────────

function findMostDangerousTile(state: GameState): Coord | null {
  let best: Coord | null = null, bestScore = -1;
  for (let r = 0; r < BOARD_SIZE; r++) for (let c = 0; c < BOARD_SIZE; c++) {
    const t = getTile(state.board, { row: r, col: c });
    let score = t.shadowCubes * 10;
    if (t.shadowCubes >= 3) score += 80;
    if (t.strongholdLayers > 0) score += 50;
    for (const e of state.enemies) if (coordEqual(e.position, { row: r, col: c })) score += e.tier === 'Principality' ? 60 : 30;
    if (score > bestScore) { bestScore = score; best = { row: r, col: c }; }
  }
  return best;
}

function stepCoord(from: Coord, to: Coord): Coord {
  return {
    row: Math.max(0, Math.min(6, from.row + Math.sign(to.row - from.row))),
    col: Math.max(0, Math.min(6, from.col + Math.sign(to.col - from.col))),
  };
}
