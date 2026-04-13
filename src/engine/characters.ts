import type {
  GameState,
  MinistryTargets,
  AnointingTargets,
  Coord,
} from './types';
import { CHARACTERS } from './constants';
import { getTile, updateTile, removeCubes } from './board';
import { getPlayer, updatePlayer, addLog } from './state';
import { checkArmorUnlock } from './armor';
import {
  getOrthogonalAdjacent,
  getAllAdjacent,
  coordEqual,
} from '../utils/grid';

// ── Helper ───────────────────────────────────────────────────────────

function getAdjacentCoords(state: GameState, playerId: string): Coord[] {
  const player = getPlayer(state, playerId);
  const charDef = CHARACTERS[player.characterId];
  return charDef.canMoveDiagonally
    ? getAllAdjacent(player.position)
    : getOrthogonalAdjacent(player.position);
}

// ── Ministry Abilities (free, once per turn) ─────────────────────────

export function canUseMinistry(
  state: GameState,
  playerId: string
): { valid: boolean; reason?: string } {
  const player = getPlayer(state, playerId);
  if (player.isEliminated) return { valid: false, reason: 'Player is eliminated' };
  if (player.ministryUsedThisTurn) return { valid: false, reason: 'Ministry already used this turn' };
  if (player.isolatedNextTurn) return { valid: false, reason: 'Isolated by Darkness — cannot use Ministry this turn' };
  return { valid: true };
}

export function executeMinistry(
  state: GameState,
  playerId: string,
  targets?: MinistryTargets
): GameState {
  const check = canUseMinistry(state, playerId);
  if (!check.valid) throw new Error(`Invalid ministry: ${check.reason}`);

  const player = getPlayer(state, playerId);
  const charId = player.characterId;

  // Mark ministry as used
  state = updatePlayer(state, playerId, { ministryUsedThisTurn: true });

  switch (charId) {
    case 'pastor':
      return ministryPastorTend(state, playerId, targets);
    case 'apostle':
      return ministryApostleSent(state, playerId, targets);
    case 'evangelist':
      return ministryEvangelistPreach(state, playerId);
    case 'prophet':
      return ministryProphetRevelation(state, playerId, targets);
    case 'teacher':
      return ministryTeacherStudy(state, playerId);
    default:
      throw new Error(`Unknown character: ${charId}`);
  }
}

/** Pastor — Tend: Give up to 2 Faith to any adjacent players, split as desired. */
function ministryPastorTend(
  state: GameState,
  playerId: string,
  targets?: MinistryTargets
): GameState {
  const player = getPlayer(state, playerId);
  const gifts = targets?.faithGifts || [];

  let totalGiven = 0;
  for (const gift of gifts) {
    if (totalGiven + gift.amount > 2) break;
    const target = getPlayer(state, gift.targetPlayerId);

    // Must be adjacent
    const adj = getAdjacentCoords(state, playerId);
    if (!adj.some((c) => coordEqual(c, target.position))) continue;

    const actualAmount = Math.min(gift.amount, player.faithCurrent - totalGiven);
    if (actualAmount <= 0) continue;

    state = updatePlayer(state, gift.targetPlayerId, {
      faithCurrent: Math.min(target.faithCurrent + actualAmount, target.faithMax),
    });
    totalGiven += actualAmount;
  }

  if (totalGiven > 0) {
    state = updatePlayer(state, playerId, {
      faithCurrent: player.faithCurrent - totalGiven,
    });
  }

  state = addLog(state, state.phase, `The Pastor used Tend — gave ${totalGiven} Faith to adjacent players.`);
  return state;
}

/** Apostle — Sent: Move one other player up to 2 spaces at no action cost. */
function ministryApostleSent(
  state: GameState,
  _playerId: string,
  targets?: MinistryTargets
): GameState {
  if (!targets?.targetPlayerId || !targets?.targetCoord) {
    state = addLog(state, state.phase, 'The Apostle used Sent — no valid target.');
    return state;
  }

  const target = getPlayer(state, targets.targetPlayerId);
  // Apostle's Sent can move diagonally (strategic repositioning)
  const distance = Math.max(
    Math.abs(target.position.row - targets.targetCoord.row),
    Math.abs(target.position.col - targets.targetCoord.col)
  );

  if (distance > 2) {
    throw new Error('Sent can only move a player up to 2 spaces');
  }

  // Move the target player on the board
  const oldTile = getTile(state.board, target.position);
  let board = updateTile(state.board, target.position, {
    playerIds: oldTile.playerIds.filter((id) => id !== target.id),
  });
  const newTile = getTile(board, targets.targetCoord);
  board = updateTile(board, targets.targetCoord, {
    playerIds: [...newTile.playerIds, target.id],
    faceDown: false,
  });
  state = { ...state, board };

  // Shadow tile faith cost for the moved player
  const destTile = getTile(state.board, targets.targetCoord);
  if (destTile.type === 'Shadow' && destTile.shadowCubes > 0) {
    state = updatePlayer(state, target.id, {
      position: targets.targetCoord,
      faithCurrent: Math.max(0, target.faithCurrent - 1),
    });
  } else {
    state = updatePlayer(state, target.id, { position: targets.targetCoord });
  }

  state = addLog(state, state.phase, `The Apostle used Sent — moved ${CHARACTERS[target.characterId].name} to (${targets.targetCoord.row},${targets.targetCoord.col}).`);
  return state;
}

/** Evangelist — Preach: Remove 1 Shadow Cube from each adjacent tile. */
function ministryEvangelistPreach(state: GameState, playerId: string): GameState {
  const adjacent = getAdjacentCoords(state, playerId);
  let cubesRemoved = 0;

  for (const coord of adjacent) {
    const tile = getTile(state.board, coord);
    if (tile.shadowCubes > 0) {
      state = { ...state, board: removeCubes(state.board, coord, 1) };
      cubesRemoved += 1;
    }
  }

  state = { ...state, totalCubesRemoved: state.totalCubesRemoved + cubesRemoved };
  state = addLog(state, state.phase, `The Evangelist preached — removed ${cubesRemoved} cube(s) from adjacent tiles.`);

  if (cubesRemoved > 0) {
    state = checkArmorUnlock(state);
  }

  return state;
}

/** Prophet — Revelation: Look at the top 3 Darkness cards and reorder them. */
function ministryProphetRevelation(
  state: GameState,
  _playerId: string,
  targets?: MinistryTargets
): GameState {
  if (targets?.reorderedCardIds && targets.reorderedCardIds.length > 0) {
    // Reorder the top cards
    const topCards = state.darknessDeck.slice(0, 3);
    const rest = state.darknessDeck.slice(3);

    const reordered = targets.reorderedCardIds
      .map((id) => topCards.find((c) => c.instanceId === id))
      .filter(Boolean) as typeof topCards;

    // Add any cards not in the reorder list back
    const reorderedIds = new Set(targets.reorderedCardIds);
    const remaining = topCards.filter((c) => !reorderedIds.has(c.instanceId));

    state = {
      ...state,
      darknessDeck: [...reordered, ...remaining, ...rest],
    };
  }

  state = addLog(state, state.phase, 'The Prophet used Revelation — viewed and reordered the top Darkness cards.');
  return state;
}

/** Teacher — Study: Draw 2 Scripture cards, keep 1, return 1 to bottom. */
function ministryTeacherStudy(state: GameState, playerId: string): GameState {
  const player = getPlayer(state, playerId);

  if (state.scriptureDeck.length === 0) {
    state = addLog(state, state.phase, 'The Teacher tried to Study but the Scripture deck is empty.');
    return state;
  }

  const drawCount = Math.min(2, state.scriptureDeck.length);
  const drawn = state.scriptureDeck.slice(0, drawCount);
  let remaining = state.scriptureDeck.slice(drawCount);

  // Keep the first, return the second to bottom (AI/auto will choose optimally)
  const kept = drawn[0];
  const returned = drawn.slice(1);

  remaining = [...remaining, ...returned];

  state = {
    ...state,
    scriptureDeck: remaining,
  };
  state = updatePlayer(state, playerId, {
    scriptureHand: [...player.scriptureHand, kept],
  });

  state = addLog(state, state.phase, 'The Teacher studied — drew Scripture cards, kept 1.');
  return state;
}

// ── Anointing Abilities ──────────────────────────────────────────────

export function canUseAnointing(
  state: GameState,
  playerId: string
): { valid: boolean; reason?: string } {
  const player = getPlayer(state, playerId);
  if (player.isEliminated) return { valid: false, reason: 'Player is eliminated' };
  if (!player.anointingUnlocked) return { valid: false, reason: 'Anointing not yet unlocked' };
  if (player.anointingUsedThisTurn) return { valid: false, reason: 'Anointing already used this turn' };
  return { valid: true };
}

export function executeAnointing(
  state: GameState,
  playerId: string,
  targets?: AnointingTargets
): GameState {
  const check = canUseAnointing(state, playerId);
  if (!check.valid) throw new Error(`Invalid anointing: ${check.reason}`);

  const player = getPlayer(state, playerId);

  state = updatePlayer(state, playerId, { anointingUsedThisTurn: true });

  switch (player.characterId) {
    case 'pastor':
      return anointingPastorStillWaters(state);
    case 'apostle':
      return anointingApostleEstablish(state, playerId);
    case 'evangelist':
      return anointingEvangelistHarvest(state, playerId, targets);
    case 'prophet':
      return anointingProphetWordOfKnowledge(state, playerId, targets);
    case 'teacher':
      return anointingTeacherRightlyDivided(state, playerId, targets);
    default:
      throw new Error(`Unknown character`);
  }
}

/** Pastor — Still Waters: All players restore 1 Faith. */
function anointingPastorStillWaters(state: GameState): GameState {
  state = {
    ...state,
    players: state.players.map((p) =>
      p.isEliminated
        ? p
        : { ...p, faithCurrent: Math.min(p.faithCurrent + 1, p.faithMax) }
    ),
  };
  state = addLog(state, state.phase, 'The Pastor used Still Waters — all players restored 1 Faith.');
  return state;
}

/** Apostle — Establish: Place a Prayer Token. Adjacent players gain +1 action/turn. */
function anointingApostleEstablish(state: GameState, playerId: string): GameState {
  const player = getPlayer(state, playerId);
  state = {
    ...state,
    board: updateTile(state.board, player.position, { prayerToken: true }),
  };
  state = addLog(state, state.phase, 'The Apostle used Establish — placed a Prayer Token granting +1 action to adjacent players.');
  return state;
}

/** Evangelist — Harvest: Convert one Shadow Tile to permanent Light. */
function anointingEvangelistHarvest(
  state: GameState,
  _playerId: string,
  targets?: AnointingTargets
): GameState {
  const coord = targets?.targetCoord;
  if (!coord) {
    state = addLog(state, state.phase, 'The Evangelist used Harvest — no target specified.');
    return state;
  }

  const tile = getTile(state.board, coord);
  if (tile.type !== 'Shadow') {
    throw new Error('Harvest can only target Shadow tiles');
  }

  const cubesRemoved = tile.shadowCubes;
  state = {
    ...state,
    board: updateTile(state.board, coord, {
      type: 'Light',
      shadowCubes: 0,
      isPermanentLight: true,
    }),
    totalCubesRemoved: state.totalCubesRemoved + cubesRemoved,
  };

  state = addLog(state, state.phase, `The Evangelist used Harvest — converted Shadow tile at (${coord.row},${coord.col}) to permanent Light!`);
  if (cubesRemoved > 0) state = checkArmorUnlock(state);
  return state;
}

/** Prophet — Word of Knowledge: Reveal a tile and see targeting Darkness cards. */
function anointingProphetWordOfKnowledge(
  state: GameState,
  _playerId: string,
  targets?: AnointingTargets
): GameState {
  const coord = targets?.revealCoord;
  if (!coord) {
    state = addLog(state, state.phase, 'The Prophet used Word of Knowledge — no target specified.');
    return state;
  }

  // Reveal the tile
  state = {
    ...state,
    board: updateTile(state.board, coord, { faceDown: false }),
  };

  state = addLog(state, state.phase, `The Prophet used Word of Knowledge — revealed tile at (${coord.row},${coord.col}).`);
  return state;
}

/** Teacher — Rightly Divided: Play a Scripture card and resolve its effect twice. */
function anointingTeacherRightlyDivided(
  state: GameState,
  _playerId: string,
  _targets?: AnointingTargets
): GameState {
  // This delegates to the card system — the card resolver will be called twice
  // For now we mark it and the card system handles the double resolution
  state = addLog(state, state.phase, 'The Teacher used Rightly Divided — next Scripture card effect resolves twice!');
  return state;
}

// ── Passive Effects (called by other systems) ────────────────────────

/** Pastor — Lay Down Your Life: Sacrifice 2 Faith to prevent adjacent elimination. */
export function pastorLayDownYourLife(
  state: GameState,
  pastorPlayerId: string,
  targetPlayerId: string
): GameState {
  const pastor = getPlayer(state, pastorPlayerId);
  const target = getPlayer(state, targetPlayerId);

  if (pastor.faithCurrent < 2) return state; // Can't afford it
  if (pastor.isEliminated) return state;

  // Check adjacency
  const adj = getAdjacentCoords(state, pastorPlayerId);
  if (!adj.some((c) => coordEqual(c, target.position))) return state;

  state = updatePlayer(state, pastorPlayerId, {
    faithCurrent: pastor.faithCurrent - 2,
  });
  state = updatePlayer(state, targetPlayerId, {
    faithCurrent: 1, // Prevent elimination — set to 1
  });

  state = addLog(state, state.phase, `The Pastor laid down their life — sacrificed 2 Faith to save ${CHARACTERS[target.characterId].name} from elimination!`);
  return state;
}
