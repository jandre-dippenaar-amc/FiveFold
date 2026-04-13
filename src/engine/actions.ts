import type {
  GameState,
  Coord,
  PlayerState,
} from './types';
import {
  CHARACTERS,
  ENEMIES,
} from './constants';
import { getTile, updateTile, removeCubes } from './board';
import { getPlayer, updatePlayer, addLog } from './state';
import { checkArmorUnlock } from './armor';
import {
  getOrthogonalAdjacent,
  getAllAdjacent,
  coordEqual,
  isOrthogonallyAdjacent,
  isAdjacent,
  chebyshevDistance,
  manhattanDistance,
} from '../utils/grid';
import { rollDice } from '../utils/random';

// ── Helpers ──────────────────────────────────────────────────────────

function hasArmor(state: GameState, armorId: string): boolean {
  return state.armorUnlocked.includes(armorId as any);
}

/** Get maximum movement range for a player. */
function getMovementRange(state: GameState, player: PlayerState): number {
  let range = 1;
  // Gospel of Peace (Boots) adds +1 range
  if (hasArmor(state, 'gospelOfPeace')) range += 1;
  // Evangelist Beautiful Feet: move 2 spaces for 1 action
  if (player.characterId === 'evangelist') range = Math.max(range, 2);
  return range;
}

/** Check if a player can move diagonally. */
function canMoveDiagonally(player: PlayerState): boolean {
  return CHARACTERS[player.characterId].canMoveDiagonally;
}

/** Get distance between two coords considering movement type. */
function getMovementDistance(player: PlayerState, from: Coord, to: Coord): number {
  if (canMoveDiagonally(player)) {
    return chebyshevDistance(from, to);
  }
  return manhattanDistance(from, to);
}

/** Check if a tile is adjacent to the player (considering diagonal ability). */
function isAdjacentToPlayer(player: PlayerState, coord: Coord): boolean {
  if (canMoveDiagonally(player)) {
    return isAdjacent(player.position, coord);
  }
  return isOrthogonallyAdjacent(player.position, coord);
}

/** Move a player token on the board (update tile playerIds). */
function movePlayerOnBoard(
  state: GameState,
  playerId: string,
  from: Coord,
  to: Coord
): GameState {
  // Remove from old tile
  const oldTile = getTile(state.board, from);
  let board = updateTile(state.board, from, {
    playerIds: oldTile.playerIds.filter((id) => id !== playerId),
  });

  // Add to new tile and reveal it
  const newTile = getTile(board, to);
  board = updateTile(board, to, {
    playerIds: [...newTile.playerIds, playerId],
    faceDown: false,
  });

  return { ...state, board };
}

// ── Action Validators ────────────────────────────────────────────────

export function canMove(
  state: GameState,
  playerId: string,
  target: Coord
): { valid: boolean; reason?: string; faithCost: number; actionCost: number } {
  const player = getPlayer(state, playerId);
  const targetTile = getTile(state.board, target);
  const distance = getMovementDistance(player, player.position, target);
  const maxRange = getMovementRange(state, player);

  if (player.isEliminated) return { valid: false, reason: 'Player is eliminated', faithCost: 0, actionCost: 0 };
  if (coordEqual(player.position, target)) return { valid: false, reason: 'Already on this tile', faithCost: 0, actionCost: 0 };
  if (distance > maxRange) return { valid: false, reason: `Target is ${distance} away, max range is ${maxRange}`, faithCost: 0, actionCost: 0 };

  // Calculate costs
  let actionCost = 1;
  let faithCost = 0;

  // Evangelist Beautiful Feet: Light Tiles cost 0 actions
  if (player.characterId === 'evangelist' && targetTile.type === 'Light') {
    actionCost = 0;
  }

  // Broken Ground costs 2 actions
  if (targetTile.type === 'BrokenGround') {
    actionCost = 2;
  }

  // Shadow tiles cost 1 Faith to enter
  if (targetTile.type === 'Shadow' && targetTile.shadowCubes > 0) {
    faithCost = 1;
    if (player.faithCurrent < faithCost) {
      return { valid: false, reason: 'Not enough Faith to enter Shadow tile', faithCost, actionCost };
    }
  }

  if (state.actionsRemaining < actionCost) {
    return { valid: false, reason: `Need ${actionCost} actions, have ${state.actionsRemaining}`, faithCost, actionCost };
  }

  return { valid: true, faithCost, actionCost };
}

export function executeMove(
  state: GameState,
  playerId: string,
  target: Coord
): GameState {
  const check = canMove(state, playerId, target);
  if (!check.valid) throw new Error(`Invalid move: ${check.reason}`);

  const player = getPlayer(state, playerId);

  // Deduct action cost
  state = { ...state, actionsRemaining: state.actionsRemaining - check.actionCost };

  // Deduct faith cost for shadow tiles
  if (check.faithCost > 0) {
    state = updatePlayer(state, playerId, {
      faithCurrent: player.faithCurrent - check.faithCost,
    });
  }

  // Move player on board
  state = movePlayerOnBoard(state, playerId, player.position, target);

  // Update player position
  state = updatePlayer(state, playerId, { position: target });

  state = addLog(state, state.phase, `${CHARACTERS[player.characterId].name} moved to (${target.row},${target.col}).${check.faithCost > 0 ? ' Lost 1 Faith entering shadow.' : ''}`);

  return state;
}

export function canCleanse(
  state: GameState,
  playerId: string
): { valid: boolean; reason?: string } {
  const player = getPlayer(state, playerId);
  if (player.isEliminated) return { valid: false, reason: 'Player is eliminated' };
  if (state.actionsRemaining < 1) return { valid: false, reason: 'No actions remaining' };

  const tile = getTile(state.board, player.position);
  if (tile.shadowCubes <= 0 && tile.strongholdLayers <= 0) {
    return { valid: false, reason: 'No cubes or stronghold layers to cleanse' };
  }

  return { valid: true };
}

export function executeCleanse(state: GameState, playerId: string): GameState {
  const check = canCleanse(state, playerId);
  if (!check.valid) throw new Error(`Invalid cleanse: ${check.reason}`);

  const player = getPlayer(state, playerId);
  const tile = getTile(state.board, player.position);

  state = { ...state, actionsRemaining: state.actionsRemaining - 1 };

  if (tile.strongholdLayers > 0) {
    // Cleansing a stronghold — reduce layers
    const newLayers = tile.strongholdLayers - 1;
    state = { ...state, board: updateTile(state.board, player.position, { strongholdLayers: newLayers }) };

    if (newLayers === 0) {
      state = { ...state, strongholdsRemaining: state.strongholdsRemaining - 1 };
      state = addLog(state, state.phase, `${CHARACTERS[player.characterId].name} cleansed a Stronghold at (${player.position.row},${player.position.col})! ${state.strongholdsRemaining} remaining.`);
    } else {
      state = addLog(state, state.phase, `${CHARACTERS[player.characterId].name} weakened Stronghold at (${player.position.row},${player.position.col}). ${newLayers} layers remaining.`);
    }
  } else {
    // Cleansing shadow cubes
    let cubesToRemove = 1;

    // Sword of the Spirit armor: cleanse removes 2
    if (hasArmor(state, 'swordOfTheSpirit')) cubesToRemove = 2;

    // Apostle Authority passive: +1 cube removed when present
    const apostleOnTile = state.players.find(
      (p) => p.characterId === 'apostle' && !p.isEliminated && coordEqual(p.position, player.position)
    );
    if (apostleOnTile) cubesToRemove += 1;

    // Teacher Hidden in the Word passive: +1 cube removed
    if (player.characterId === 'teacher') cubesToRemove += 1;

    const actualRemoved = Math.min(cubesToRemove, tile.shadowCubes);
    state = { ...state, board: removeCubes(state.board, player.position, actualRemoved) };
    state = { ...state, totalCubesRemoved: state.totalCubesRemoved + actualRemoved };

    state = addLog(state, state.phase, `${CHARACTERS[player.characterId].name} cleansed ${actualRemoved} cube(s) at (${player.position.row},${player.position.col}).`);

    // Check for armor unlocks
    state = checkArmorUnlock(state);
  }

  return state;
}

export function canBattle(
  state: GameState,
  playerId: string,
  enemyId: string
): { valid: boolean; reason?: string } {
  const player = getPlayer(state, playerId);
  if (player.isEliminated) return { valid: false, reason: 'Player is eliminated' };
  if (state.actionsRemaining < 1) return { valid: false, reason: 'No actions remaining' };

  const enemy = state.enemies.find((e) => e.id === enemyId);
  if (!enemy) return { valid: false, reason: 'Enemy not found' };
  if (!coordEqual(player.position, enemy.position)) {
    return { valid: false, reason: 'Enemy is not on your tile' };
  }

  return { valid: true };
}

export function executeBattle(
  state: GameState,
  playerId: string,
  enemyId: string
): GameState {
  const check = canBattle(state, playerId, enemyId);
  if (!check.valid) throw new Error(`Invalid battle: ${check.reason}`);

  const player = getPlayer(state, playerId);
  const enemy = state.enemies.find((e) => e.id === enemyId)!;
  const enemyDef = ENEMIES[enemy.tier];

  state = { ...state, actionsRemaining: state.actionsRemaining - 1 };

  // Roll dice
  let results: number[];
  [results, state = { ...state }] = (() => {
    const [r, newRng] = rollDice(state.rng, enemyDef.diceCount);
    return [r, { ...state, rng: newRng }];
  })();

  // Check for hit: any die >= threshold
  let isHit = results.some((r) => r >= enemyDef.hitThreshold);

  // Sword of the Spirit: +1 damage (auto-hit for simplicity — deals extra hit)
  const swordBonus = hasArmor(state, 'swordOfTheSpirit') ? 1 : 0;

  // Teacher Hidden in the Word: +1 die (already rolled above, so add bonus hit chance)
  // Actually the Teacher passive says "+1 die" — we should give an extra die
  let teacherBonus = 0;
  if (player.characterId === 'teacher') {
    let extraRoll: number[];
    [extraRoll, state = { ...state }] = (() => {
      const [r, newRng] = rollDice(state.rng, 1);
      return [r, { ...state, rng: newRng }];
    })();
    if (extraRoll[0] >= enemyDef.hitThreshold) teacherBonus = 1;
    results = [...results, ...extraRoll];
  }

  const totalHits = (isHit ? 1 : 0) + swordBonus + teacherBonus;

  if (totalHits > 0) {
    const newHitsRemaining = Math.max(0, enemy.hitsRemaining - totalHits);

    if (newHitsRemaining <= 0) {
      // Enemy defeated!
      state = {
        ...state,
        enemies: state.enemies.filter((e) => e.id !== enemyId),
      };

      state = addLog(state, state.phase, `${CHARACTERS[player.characterId].name} defeated ${enemy.tier}! Rolled [${results.join(',')}].`);

      // Principality defeat: unlock next armor
      if (enemy.tier === 'Principality') {
        state = checkArmorUnlock(state, true);
        state = addLog(state, state.phase, 'Principality defeated — unlocking next Armor of God piece!');
      }

      // Power defeat: team draws 1 Scripture card
      if (enemy.tier === 'Power') {
        if (state.scriptureDeck.length > 0) {
          // Give to the player who defeated it
          const card = state.scriptureDeck[0];
          state = {
            ...state,
            scriptureDeck: state.scriptureDeck.slice(1),
          };
          const updatedPlayer = getPlayer(state, playerId);
          state = updatePlayer(state, playerId, {
            scriptureHand: [...updatedPlayer.scriptureHand, card],
          });
          state = addLog(state, state.phase, `Team draws Scripture card as reward for defeating Power.`);
        }
      }
    } else {
      // Enemy takes damage but survives
      state = {
        ...state,
        enemies: state.enemies.map((e) =>
          e.id === enemyId ? { ...e, hitsRemaining: newHitsRemaining } : e
        ),
      };
      state = addLog(state, state.phase, `${CHARACTERS[player.characterId].name} hit ${enemy.tier} (${newHitsRemaining} hits remaining). Rolled [${results.join(',')}].`);
    }
  } else {
    state = addLog(state, state.phase, `${CHARACTERS[player.characterId].name} missed ${enemy.tier}. Rolled [${results.join(',')}].`);
  }

  return state;
}

export function canPray(
  state: GameState,
  playerId: string
): { valid: boolean; reason?: string } {
  const player = getPlayer(state, playerId);
  if (player.isEliminated) return { valid: false, reason: 'Player is eliminated' };
  if (state.actionsRemaining < 1) return { valid: false, reason: 'No actions remaining' };
  if (player.faithCurrent >= player.faithMax) return { valid: false, reason: 'Faith is already at maximum' };

  return { valid: true };
}

export function executePray(state: GameState, playerId: string): GameState {
  const check = canPray(state, playerId);
  if (!check.valid) throw new Error(`Invalid pray: ${check.reason}`);

  const player = getPlayer(state, playerId);

  state = { ...state, actionsRemaining: state.actionsRemaining - 1 };
  state = updatePlayer(state, playerId, {
    faithCurrent: Math.min(player.faithCurrent + 1, player.faithMax),
    totalPrayActions: player.totalPrayActions + 1,
  });

  state = addLog(state, state.phase, `${CHARACTERS[player.characterId].name} prayed. Faith restored to ${Math.min(player.faithCurrent + 1, player.faithMax)}.`);

  return state;
}

export function canEncourage(
  state: GameState,
  playerId: string,
  targetPlayerId: string
): { valid: boolean; reason?: string } {
  const player = getPlayer(state, playerId);
  const target = getPlayer(state, targetPlayerId);

  if (player.isEliminated) return { valid: false, reason: 'Player is eliminated' };
  if (target.isEliminated) return { valid: false, reason: 'Target is eliminated' };
  if (state.actionsRemaining < 1) return { valid: false, reason: 'No actions remaining' };
  if (player.faithCurrent < 1) return { valid: false, reason: 'Not enough Faith to give' };
  if (playerId === targetPlayerId) return { valid: false, reason: 'Cannot encourage yourself' };

  // Must be adjacent
  if (!isAdjacentToPlayer(player, target.position)) {
    return { valid: false, reason: 'Target player is not adjacent' };
  }

  return { valid: true };
}

export function executeEncourage(
  state: GameState,
  playerId: string,
  targetPlayerId: string
): GameState {
  const check = canEncourage(state, playerId, targetPlayerId);
  if (!check.valid) throw new Error(`Invalid encourage: ${check.reason}`);

  const player = getPlayer(state, playerId);
  const target = getPlayer(state, targetPlayerId);

  state = { ...state, actionsRemaining: state.actionsRemaining - 1 };
  state = updatePlayer(state, playerId, {
    faithCurrent: player.faithCurrent - 1,
  });
  state = updatePlayer(state, targetPlayerId, {
    faithCurrent: Math.min(target.faithCurrent + 1, target.faithMax),
  });

  state = addLog(state, state.phase, `${CHARACTERS[player.characterId].name} encouraged ${CHARACTERS[target.characterId].name}. Gave 1 Faith.`);

  return state;
}

export function canFortify(
  state: GameState,
  playerId: string
): { valid: boolean; reason?: string } {
  const player = getPlayer(state, playerId);
  if (player.isEliminated) return { valid: false, reason: 'Player is eliminated' };
  if (state.actionsRemaining < 2) return { valid: false, reason: 'Need 2 actions to Fortify' };

  const tile = getTile(state.board, player.position);
  if (tile.prayerToken) return { valid: false, reason: 'Tile already has a Prayer Token' };

  return { valid: true };
}

export function executeFortify(state: GameState, playerId: string): GameState {
  const check = canFortify(state, playerId);
  if (!check.valid) throw new Error(`Invalid fortify: ${check.reason}`);

  const player = getPlayer(state, playerId);

  state = { ...state, actionsRemaining: state.actionsRemaining - 2 };
  state = {
    ...state,
    board: updateTile(state.board, player.position, { prayerToken: true }),
  };

  state = addLog(state, state.phase, `${CHARACTERS[player.characterId].name} fortified tile (${player.position.row},${player.position.col}) with a Prayer Token.`);

  return state;
}

/** Get the number of bonus actions from adjacent Prayer Tokens. */
export function getPrayerTokenBonus(state: GameState, player: PlayerState): number {
  const adjacent = canMoveDiagonally(player)
    ? getAllAdjacent(player.position)
    : getOrthogonalAdjacent(player.position);

  let bonus = 0;
  for (const coord of adjacent) {
    if (getTile(state.board, coord).prayerToken) {
      bonus += 1;
    }
  }
  return bonus;
}
