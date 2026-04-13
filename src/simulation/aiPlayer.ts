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

interface ScoredAction {
  execute: (state: GameState) => GameState;
  score: number;
  label: string;
}

// Track last position to avoid oscillation
const lastPositions = new Map<string, Coord>();

/** AI player: takes a full turn using goal-directed planning. */
export function aiPlayerTurn(
  state: GameState,
  playerIndex: number,
  weights: StrategyWeights,
  strategyId: StrategyId = 'balanced'
): GameState {
  const player = state.players[playerIndex];
  if (player.isEliminated || state.status !== 'playing') return state;

  // Use free actions first
  state = useFreeActions(state, player.id, weights, strategyId);

  if (strategyId === 'random') {
    return randomTurn(state, player.id);
  }

  // Goal-directed turn: pick a goal, then spend actions toward it
  return goalDirectedTurn(state, player.id, weights);
}

/** Goal-directed AI: pick a target tile, move there, then act. */
function goalDirectedTurn(state: GameState, playerId: string, _weights: StrategyWeights): GameState {
  const player = getPlayer(state, playerId);

  // 1. If on a tile with cubes/stronghold, cleanse first
  let tile = getTile(state.board, player.position);
  while ((tile.shadowCubes > 0 || tile.strongholdLayers > 0) && state.actionsRemaining > 0 && state.status === 'playing') {
    if (canCleanse(state, playerId).valid) {
      state = executeCleanse(state, playerId);
      tile = getTile(state.board, getPlayer(state, playerId).position);
    } else break;
  }

  // 2. If on a tile with an enemy, battle it
  for (const enemy of [...state.enemies]) {
    const p = getPlayer(state, playerId);
    if (coordEqual(p.position, enemy.position) && state.actionsRemaining > 0 && state.status === 'playing') {
      if (canBattle(state, playerId, enemy.id).valid) {
        state = executeBattle(state, playerId, enemy.id);
      }
    }
  }

  // 3. If low on faith (<=2), pray
  let currentPlayer = getPlayer(state, playerId);
  while (currentPlayer.faithCurrent <= 2 && state.actionsRemaining > 0 && canPray(state, playerId).valid) {
    state = executePray(state, playerId);
    currentPlayer = getPlayer(state, playerId);
  }

  // 4. Pick a target and move toward it
  if (state.actionsRemaining > 0 && state.status === 'playing') {
    const target = pickGoalTile(state, playerId);
    if (target) {
      state = moveToward(state, playerId, target);
    }
  }

  // 5. Cleanse at new position if possible
  tile = getTile(state.board, getPlayer(state, playerId).position);
  while ((tile.shadowCubes > 0 || tile.strongholdLayers > 0) && state.actionsRemaining > 0 && state.status === 'playing') {
    if (canCleanse(state, playerId).valid) {
      state = executeCleanse(state, playerId);
      tile = getTile(state.board, getPlayer(state, playerId).position);
    } else break;
  }

  // 6. Battle at new position
  for (const enemy of [...state.enemies]) {
    const p = getPlayer(state, playerId);
    if (coordEqual(p.position, enemy.position) && state.actionsRemaining > 0 && state.status === 'playing') {
      if (canBattle(state, playerId, enemy.id).valid) {
        state = executeBattle(state, playerId, enemy.id);
      }
    }
  }

  // 7. Spend remaining actions: encourage nearby low-faith players, or pray
  while (state.actionsRemaining > 0 && state.status === 'playing') {
    currentPlayer = getPlayer(state, playerId);

    // Encourage adjacent player with low faith
    let encouraged = false;
    if (currentPlayer.faithCurrent > 3) {
      for (const other of getAlivePlayers(state)) {
        if (other.id !== playerId && other.faithCurrent <= 2) {
          if (canEncourage(state, playerId, other.id).valid) {
            state = executeEncourage(state, playerId, other.id);
            encouraged = true;
            break;
          }
        }
      }
    }
    if (encouraged) continue;

    // Pray if below max
    if (canPray(state, playerId).valid) {
      state = executePray(state, playerId);
      continue;
    }

    // Try to move+cleanse somewhere nearby
    const moved = moveToNearbyDanger(state, playerId);
    if (moved) {
      state = moved;
      continue;
    }

    break; // Nothing useful to do
  }

  return state;
}

/** Pick the best tile to move toward based on priorities. */
function pickGoalTile(state: GameState, playerId: string): Coord | null {
  const player = getPlayer(state, playerId);
  const pos = player.position;

  // Score every tile on the board
  const candidates: Array<{ coord: Coord; score: number }> = [];

  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      const coord = { row: r, col: c };
      if (coordEqual(coord, pos)) continue;

      const tile = getTile(state.board, coord);
      const dist = manhattanDistance(pos, coord);
      let score = 0;

      // HIGH PRIORITY: tiles about to overflow (3 cubes)
      if (tile.shadowCubes >= 3) score += 100 - dist * 10;
      // MEDIUM: tiles with 2 cubes
      else if (tile.shadowCubes >= 2) score += 50 - dist * 8;
      // Tiles with 1 cube
      else if (tile.shadowCubes >= 1) score += 20 - dist * 5;

      // Strongholds
      if (tile.strongholdLayers > 0) score += 60 - dist * 5;

      // Enemies (especially Principalities)
      for (const enemy of state.enemies) {
        if (coordEqual(enemy.position, coord)) {
          if (enemy.tier === 'Principality') score += 80 - dist * 5;
          else if (enemy.tier === 'Power') score += 40 - dist * 5;
          else score += 20 - dist * 5;
        }
      }

      // Late game: Jerusalem convergence becomes the top priority
      if (state.strongholdsRemaining === 0) {
        // All strongholds clear — ONLY goal is Jerusalem
        if (coordEqual(coord, JERUSALEM_COORD)) score += 500;
        else score = -100; // nothing else matters
      } else if (state.strongholdsRemaining <= 2) {
        if (coordEqual(coord, JERUSALEM_COORD)) score += 150 - dist * 15;
      }

      // Penalize tiles that are too far away
      if (dist > state.actionsRemaining + 1) score -= 50;

      // Avoid tiles another player is already heading toward
      const otherPlayers = getAlivePlayers(state).filter((p) => p.id !== playerId);
      for (const other of otherPlayers) {
        if (coordEqual(other.position, coord)) score -= 20; // someone's already there
      }

      if (score > 0) candidates.push({ coord, score });
    }
  }

  candidates.sort((a, b) => b.score - a.score);
  return candidates.length > 0 ? candidates[0].coord : null;
}

/** Move the player one step toward a target tile, avoiding oscillation and unnecessary shadow entry. */
function moveToward(state: GameState, playerId: string, target: Coord): GameState {
  const maxSteps = Math.min(state.actionsRemaining, 3); // save at least 1 action for cleansing

  for (let step = 0; step < maxSteps; step++) {
    if (state.actionsRemaining <= 0 || state.status !== 'playing') break;

    const player = getPlayer(state, playerId);
    if (coordEqual(player.position, target)) break;

    const charDef = CHARACTERS[player.characterId];
    const adjacent = charDef.canMoveDiagonally
      ? getAllAdjacent(player.position)
      : getOrthogonalAdjacent(player.position);

    // Score each adjacent tile by distance to target and safety
    let bestMove: Coord | null = null;
    let bestScore = -Infinity;

    for (const adj of adjacent) {
      const check = canMove(state, playerId, adj);
      if (!check.valid) continue;

      const distToTarget = manhattanDistance(adj, target);
      const adjTile = getTile(state.board, adj);
      let moveScore = -distToTarget * 10;

      // Penalty for entering shadow tiles (costs faith)
      if (adjTile.type === 'Shadow' && adjTile.shadowCubes > 0) {
        // Only enter if that's our target or we have enough faith
        if (!coordEqual(adj, target) && player.faithCurrent <= 3) {
          moveScore -= 100; // avoid unless necessary
        } else {
          moveScore -= 5;
        }
      }

      // Penalty for oscillation — don't go back where we just were
      const lastPos = lastPositions.get(playerId);
      if (lastPos && coordEqual(adj, lastPos)) {
        moveScore -= 30;
      }

      if (moveScore > bestScore) {
        bestScore = moveScore;
        bestMove = adj;
      }
    }

    if (bestMove) {
      lastPositions.set(playerId, player.position);
      state = executeMove(state, playerId, bestMove);
    } else {
      break;
    }
  }

  return state;
}

/** Try to move to a nearby tile that has cubes and cleanse it. */
function moveToNearbyDanger(state: GameState, playerId: string): GameState | null {
  const player = getPlayer(state, playerId);
  if (state.actionsRemaining < 2) return null; // need at least 1 move + 1 cleanse

  const charDef = CHARACTERS[player.characterId];
  const adjacent = charDef.canMoveDiagonally
    ? getAllAdjacent(player.position)
    : getOrthogonalAdjacent(player.position);

  // Find adjacent tile with cubes
  let bestAdj: Coord | null = null;
  let bestCubes = 0;

  for (const adj of adjacent) {
    const tile = getTile(state.board, adj);
    if (tile.shadowCubes > bestCubes && canMove(state, playerId, adj).valid) {
      bestCubes = tile.shadowCubes;
      bestAdj = adj;
    }
  }

  if (bestAdj && bestCubes > 0) {
    let newState = executeMove(state, playerId, bestAdj);
    if (canCleanse(newState, playerId).valid) {
      newState = executeCleanse(newState, playerId);
      return newState;
    }
    return newState;
  }

  return null;
}

/** Random strategy turn. */
function randomTurn(state: GameState, playerId: string): GameState {
  let safety = 30;
  while (state.actionsRemaining > 0 && state.status === 'playing' && safety-- > 0) {
    const actions = enumerateAllActions(state, playerId);
    if (actions.length === 0) break;
    let idx: number;
    [idx, state = { ...state }] = (() => {
      const [v, rng] = randomInt(state.rng, 0, actions.length - 1);
      return [v, { ...state, rng }];
    })();
    state = actions[idx].execute(state);
  }
  return state;
}

/** Enumerate all legal actions for random strategy. */
function enumerateAllActions(state: GameState, playerId: string): ScoredAction[] {
  const actions: ScoredAction[] = [];
  const player = getPlayer(state, playerId);
  const charDef = CHARACTERS[player.characterId];

  const moveTargets = charDef.canMoveDiagonally
    ? getAllAdjacent(player.position)
    : getOrthogonalAdjacent(player.position);

  for (const target of moveTargets) {
    if (canMove(state, playerId, target).valid) {
      actions.push({ execute: (s) => executeMove(s, playerId, target), score: 0, label: 'Move' });
    }
  }
  if (canCleanse(state, playerId).valid) {
    actions.push({ execute: (s) => executeCleanse(s, playerId), score: 0, label: 'Cleanse' });
  }
  if (canPray(state, playerId).valid) {
    actions.push({ execute: (s) => executePray(s, playerId), score: 0, label: 'Pray' });
  }
  for (const enemy of state.enemies) {
    if (coordEqual(enemy.position, player.position) && canBattle(state, playerId, enemy.id).valid) {
      actions.push({ execute: (s) => executeBattle(s, playerId, enemy.id), score: 0, label: 'Battle' });
    }
  }
  return actions;
}

/** Use free actions: ministry ability, anointing, scripture cards. */
function useFreeActions(
  state: GameState,
  playerId: string,
  weights: StrategyWeights,
  _strategyId: StrategyId
): GameState {
  // Always use ministry (it's free)
  if (canUseMinistry(state, playerId).valid) {
    const targets = buildMinistryTargets(state, playerId);
    try { state = executeMinistry(state, playerId, targets); } catch { /* skip */ }
  }

  // Always use anointing (it's free and powerful)
  if (canUseAnointing(state, playerId).valid) {
    const targets = buildAnointingTargets(state, playerId);
    try { state = executeAnointing(state, playerId, targets); } catch { /* skip */ }
  }

  // Play scripture cards aggressively
  const updatedPlayer = getPlayer(state, playerId);
  for (const card of [...updatedPlayer.scriptureHand]) {
    if (state.status !== 'playing') break;
    if (!canPlayScripture(state, playerId, card.instanceId).valid) continue;

    const targets = buildScriptureTargets(state, card.defId);
    try {
      const nextState = executeScripture(state, playerId, card.instanceId, targets);
      // Play most cards — only skip if it clearly hurts
      const alwaysPlay = ['resistTheDevil', 'greaterIsHe', 'byHisStripes',
        'lightOfTheWorld', 'perfectLoveCastsOutFear', 'theNameAboveAllNames',
        'renewedStrength', 'heWhoIsInMe', 'theWordIsALamp', 'swordOfTheSpiritCard',
        'putOnTheFullArmor', 'spiritOfUnity', 'whereTwoOrThreeGather', 'bindingAndLoosing'];
      if (alwaysPlay.includes(card.defId) || scoreState(nextState, weights) >= scoreState(state, weights) - 5) {
        state = nextState;
      }
    } catch { /* skip */ }
  }

  return state;
}

// ── Target builders ──────────────────────────────────────────────────

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
      // Move a player toward the most dangerous tile
      const others = getAlivePlayers(state).filter((p) => p.id !== playerId);
      if (others.length === 0) return {};
      const dangerTile = findMostDangerousTile(state);
      if (!dangerTile) return {};
      const closest = others.reduce((best, p) =>
        manhattanDistance(p.position, dangerTile) < manhattanDistance(best.position, dangerTile) ? p : best
      );
      const step = stepToward(closest.position, dangerTile);
      return { targetPlayerId: closest.id, targetCoord: step };
    }

    case 'prophet': {
      const top3 = state.darknessDeck.slice(0, 3);
      if (top3.length === 0) return {};
      const severity: Record<string, number> = {
        'creepingDark': 1, 'temptation': 2, 'accusation': 2, 'isolation': 1,
        'encroach': 3, 'floodOfDarkness': 4, 'spreadingBlight': 5,
        'theEnemyRages': 4, 'nightFalls': 6, 'pulse': 5, 'entrench': 4,
        'spiritualWickednessAppears': 3, 'powerManifests': 4, 'principalityRises': 7,
        'persecution': 5, 'valleyOfTheShadow': 4, 'darkNightOfTheSoul': 3,
      };
      const sorted = [...top3].sort((a, b) => (severity[a.defId] || 3) - (severity[b.defId] || 3));
      return { reorderedCardIds: sorted.map((c) => c.instanceId) };
    }

    default:
      return {};
  }
}

function buildAnointingTargets(state: GameState, playerId: string) {
  const player = getPlayer(state, playerId);
  switch (player.characterId) {
    case 'evangelist': {
      let bestCoord: Coord | undefined;
      let bestCubes = 0;
      for (let r = 0; r < BOARD_SIZE; r++) {
        for (let c = 0; c < BOARD_SIZE; c++) {
          const tile = getTile(state.board, { row: r, col: c });
          if (tile.type === 'Shadow' && tile.shadowCubes > bestCubes) {
            bestCubes = tile.shadowCubes;
            bestCoord = { row: r, col: c };
          }
        }
      }
      return { targetCoord: bestCoord };
    }
    case 'prophet': {
      for (let r = 0; r < BOARD_SIZE; r++) {
        for (let c = 0; c < BOARD_SIZE; c++) {
          if (getTile(state.board, { row: r, col: c }).faceDown) return { revealCoord: { row: r, col: c } };
        }
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
      const principality = state.enemies.find((e) => e.tier === 'Principality');
      const power = state.enemies.find((e) => e.tier === 'Power');
      const enemy = principality || power || state.enemies[0];
      return enemy ? { targetEnemyId: enemy.id } : {};
    }
    case 'swordOfTheSpiritCard': {
      let bestCoord: Coord | undefined;
      let bestLayers = 999;
      for (let r = 0; r < BOARD_SIZE; r++) {
        for (let c = 0; c < BOARD_SIZE; c++) {
          const tile = getTile(state.board, { row: r, col: c });
          if (tile.strongholdLayers > 0 && tile.strongholdLayers < bestLayers) {
            bestLayers = tile.strongholdLayers;
            bestCoord = { row: r, col: c };
          }
        }
      }
      return bestCoord ? { targetStrongholdCoord: bestCoord } : {};
    }
    default: return {};
  }
}

// ── Helpers ──────────────────────────────────────────────────────────

function findMostDangerousTile(state: GameState): Coord | null {
  let best: Coord | null = null;
  let bestScore = -1;
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      const tile = getTile(state.board, { row: r, col: c });
      let score = tile.shadowCubes * 10;
      if (tile.shadowCubes >= 3) score += 50;
      if (tile.strongholdLayers > 0) score += 30;
      for (const enemy of state.enemies) {
        if (coordEqual(enemy.position, { row: r, col: c })) score += enemy.tier === 'Principality' ? 40 : 20;
      }
      if (score > bestScore) { bestScore = score; best = { row: r, col: c }; }
    }
  }
  return best;
}

function stepToward(from: Coord, to: Coord): Coord {
  return {
    row: Math.max(0, Math.min(6, from.row + Math.sign(to.row - from.row))),
    col: Math.max(0, Math.min(6, from.col + Math.sign(to.col - from.col))),
  };
}
