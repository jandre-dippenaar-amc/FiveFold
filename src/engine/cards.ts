import type {
  GameState,
  ScriptureTargets,
  ScriptureCardId,
  DarknessCardId,
  Coord,
  PlayerState,
} from './types';
import {
  SCRIPTURE_CARDS,
  DARKNESS_CARDS,
  CHARACTERS,
  SCRIPTURE_HAND_LIMIT,
} from './constants';
import { getTile, updateTile, addCubes, getActiveStrongholds, getLargestStronghold, getDarkestTile, findTiles } from './board';
import { getPlayer, updatePlayer, addLog, getAlivePlayers, nextEnemyId } from './state';
import { checkArmorUnlock, hasArmor } from './armor';
import { getOrthogonalAdjacent, coordEqual, manhattanDistance } from '../utils/grid';
import { shuffle, randomInt, randomPick } from '../utils/random';

// ── Scripture Card System ────────────────────────────────────────────

export function canPlayScripture(
  state: GameState,
  playerId: string,
  cardInstanceId: string
): { valid: boolean; reason?: string } {
  const player = getPlayer(state, playerId);
  if (player.isEliminated) return { valid: false, reason: 'Player is eliminated' };

  const card = player.scriptureHand.find((c) => c.instanceId === cardInstanceId);
  if (!card) return { valid: false, reason: 'Card not in hand' };

  return { valid: true };
}

export function executeScripture(
  state: GameState,
  playerId: string,
  cardInstanceId: string,
  targets?: ScriptureTargets
): GameState {
  const check = canPlayScripture(state, playerId, cardInstanceId);
  if (!check.valid) throw new Error(`Invalid scripture: ${check.reason}`);

  const player = getPlayer(state, playerId);
  const card = player.scriptureHand.find((c) => c.instanceId === cardInstanceId)!;
  const cardDef = SCRIPTURE_CARDS.find((d) => d.id === card.defId)!;

  // Remove card from hand and add to discard
  state = updatePlayer(state, playerId, {
    scriptureHand: player.scriptureHand.filter((c) => c.instanceId !== cardInstanceId),
  });
  state = { ...state, scriptureDiscard: [...state.scriptureDiscard, card] };

  state = addLog(state, state.phase, `${CHARACTERS[player.characterId].name} played "${cardDef.name}" (${cardDef.scriptureReference}).`);

  // Resolve effect
  state = resolveScriptureEffect(state, playerId, card.defId, targets);

  return state;
}

function resolveScriptureEffect(
  state: GameState,
  playerId: string,
  cardId: ScriptureCardId,
  targets?: ScriptureTargets
): GameState {
  const player = getPlayer(state, playerId);
  const isTeacher = player.characterId === 'teacher';

  switch (cardId) {
    case 'lightOfTheWorld': {
      // Remove all cubes from your tile and every adjacent tile
      const pos = player.position;
      const adjacent = getOrthogonalAdjacent(pos);
      const tiles = [pos, ...adjacent];
      let removed = 0;
      for (const coord of tiles) {
        const tile = getTile(state.board, coord);
        if (tile.shadowCubes > 0) {
          removed += tile.shadowCubes;
          state = { ...state, board: updateTile(state.board, coord, { shadowCubes: 0 }) };
        }
      }
      if (isTeacher) removed += 0; // Teacher bonus: +1 cube removed (already captured above for all)
      state = { ...state, totalCubesRemoved: state.totalCubesRemoved + removed };
      if (removed > 0) state = checkArmorUnlock(state);
      state = addLog(state, state.phase, `Light of the World removed ${removed} cubes!`);
      return state;
    }

    case 'swordOfTheSpiritCard': {
      // Remove 1 Stronghold layer
      const coord = targets?.targetStrongholdCoord;
      if (coord) {
        const tile = getTile(state.board, coord);
        if (tile.strongholdLayers > 0) {
          let layersToRemove = 1;
          if (isTeacher) layersToRemove += 1; // Teacher bonus
          const newLayers = Math.max(0, tile.strongholdLayers - layersToRemove);
          state = { ...state, board: updateTile(state.board, coord, { strongholdLayers: newLayers }) };
          if (newLayers === 0) {
            state = { ...state, strongholdsRemaining: state.strongholdsRemaining - 1 };
            state = addLog(state, state.phase, `Sword of the Spirit cleansed a Stronghold!`);
          }
        }
      }
      return state;
    }

    case 'bindingAndLoosing': {
      // Stronghold cannot pulse or spawn this round — tracked via game event log
      state = addLog(state, state.phase, 'Binding and Loosing — a Stronghold is sealed this round.');
      return state;
    }

    case 'theWordIsALamp': {
      // Reveal face-down tiles within 3 spaces of the player (practical for physical play)
      let board = state.board;
      let revealed = 0;
      for (let r = 0; r < 7; r++) {
        for (let c = 0; c < 7; c++) {
          const dist = manhattanDistance(player.position, { row: r, col: c });
          if (dist <= 3 && board[r][c].faceDown) {
            board = updateTile(board, { row: r, col: c }, { faceDown: false });
            revealed++;
          }
        }
      }
      state = { ...state, board };
      state = addLog(state, state.phase, `The Word is a Lamp — revealed ${revealed} tiles within 3 spaces!`);
      return state;
    }

    case 'greaterIsHe': {
      state = { ...state, greaterIsHeActive: true };
      state = addLog(state, state.phase, 'Greater is He — all Battle checks auto-succeed this round!');
      return state;
    }

    case 'theNameAboveAllNames': {
      // All Principalities take 1 damage
      let hits = 1;
      if (isTeacher) hits += 1;
      state = {
        ...state,
        enemies: state.enemies.map((e) => {
          if (e.tier === 'Principality') {
            const newHits = Math.max(0, e.hitsRemaining - hits);
            return { ...e, hitsRemaining: newHits };
          }
          return e;
        }),
      };
      // Remove defeated principalities
      const defeated = state.enemies.filter((e) => e.tier === 'Principality' && e.hitsRemaining <= 0);
      if (defeated.length > 0) {
        state = { ...state, enemies: state.enemies.filter((e) => e.hitsRemaining > 0) };
        for (const d of defeated) {
          state = checkArmorUnlock(state, true);
          state = addLog(state, state.phase, `Principality at (${d.position.row},${d.position.col}) defeated by The Name Above All Names!`);
        }
      }
      return state;
    }

    case 'byHisStripes': {
      // All players restore Faith to full
      state = {
        ...state,
        players: state.players.map((p) =>
          p.isEliminated ? p : { ...p, faithCurrent: p.faithMax }
        ),
      };
      state = addLog(state, state.phase, 'By His Stripes — all players restored to full Faith!');
      return state;
    }

    case 'putOnTheFullArmor': {
      // Any player gains +2 Faith
      const targetId = targets?.targetPlayerId || playerId;
      const target = getPlayer(state, targetId);
      let faithGain = 2;
      if (isTeacher) faithGain += 1;
      state = updatePlayer(state, targetId, {
        faithCurrent: Math.min(target.faithCurrent + faithGain, target.faithMax),
      });
      return state;
    }

    case 'renewedStrength': {
      // +2 extra actions this turn
      let bonus = 2;
      if (isTeacher) bonus += 1;
      state = updatePlayer(state, playerId, {
        bonusActionsThisTurn: player.bonusActionsThisTurn + bonus,
      });
      state = { ...state, actionsRemaining: state.actionsRemaining + bonus };
      state = addLog(state, state.phase, `Renewed Strength — gained ${bonus} extra actions!`);
      return state;
    }

    case 'resistTheDevil': {
      // Remove any 1 enemy immediately
      const enemyId = targets?.targetEnemyId;
      if (enemyId) {
        const enemy = state.enemies.find((e) => e.id === enemyId);
        if (enemy) {
          state = { ...state, enemies: state.enemies.filter((e) => e.id !== enemyId) };
          state = addLog(state, state.phase, `Resist the Devil — removed ${enemy.tier}!`);
          if (enemy.tier === 'Principality') {
            state = checkArmorUnlock(state, true);
          }
        }
      }
      return state;
    }

    case 'sentOnes': {
      // Move any 2 players up to 3 tiles each — handled by UI/AI targeting
      state = addLog(state, state.phase, 'Sent Ones — players may be repositioned.');
      return state;
    }

    case 'whereTwoOrThreeGather': {
      // All players on same tile gain 1 Faith and draw 1 Scripture
      const pos = player.position;
      const playersOnTile = state.players.filter(
        (p) => !p.isEliminated && coordEqual(p.position, pos)
      );
      let faithGain = 1;
      if (isTeacher) faithGain += 1;
      for (const p of playersOnTile) {
        state = updatePlayer(state, p.id, {
          faithCurrent: Math.min(p.faithCurrent + faithGain, p.faithMax),
        });
        // Draw scripture card if deck not empty and hand not full
        const updatedP = getPlayer(state, p.id);
        if (state.scriptureDeck.length > 0 && updatedP.scriptureHand.length < SCRIPTURE_HAND_LIMIT) {
          const card = state.scriptureDeck[0];
          state = { ...state, scriptureDeck: state.scriptureDeck.slice(1) };
          state = updatePlayer(state, p.id, {
            scriptureHand: [...updatedP.scriptureHand, card],
          });
        }
      }
      state = addLog(state, state.phase, `Where Two or Three Gather — ${playersOnTile.length} player(s) gained Faith and drew Scripture.`);
      return state;
    }

    case 'perfectLoveCastsOutFear': {
      // Discard all Corruption cards from discard. Meter -1.
      state = {
        ...state,
        darknessDiscard: state.darknessDiscard.filter((c) => {
          const def = DARKNESS_CARDS.find((d) => d.id === c.defId);
          return def?.category !== 'Corruption';
        }),
        darknessMeter: Math.max(1, state.darknessMeter - 1),
      };
      state = addLog(state, state.phase, 'Perfect Love Casts Out Fear — Corruption purged, Darkness Meter -1!');
      return state;
    }

    case 'spiritOfUnity': {
      // If all players within 3 tiles of each other: Meter -2
      const alive = getAlivePlayers(state);
      let allClose = true;
      for (let i = 0; i < alive.length && allClose; i++) {
        for (let j = i + 1; j < alive.length && allClose; j++) {
          if (manhattanDistance(alive[i].position, alive[j].position) > 3) {
            allClose = false;
          }
        }
      }
      if (allClose) {
        let reduction = 2;
        if (isTeacher) reduction += 1;
        state = { ...state, darknessMeter: Math.max(1, state.darknessMeter - reduction) };
        state = addLog(state, state.phase, `Spirit of Unity — all players close, Darkness Meter -${reduction}!`);
      } else {
        state = addLog(state, state.phase, 'Spirit of Unity — players too spread out, no effect.');
      }
      return state;
    }

    case 'heWhoIsInMe': {
      state = { ...state, heWhoIsInMeActive: true };
      state = addLog(state, state.phase, 'He Who is in Me — next Darkness card will be cancelled.');
      return state;
    }

    default:
      return state;
  }
}

// ── Darkness Card System ─────────────────────────────────────────────

/** Draw and resolve a darkness card. Returns updated state. */
export function drawAndResolveDarknessCard(state: GameState): GameState {
  if (state.darknessDeck.length === 0) {
    // Reshuffle discard into deck, advance meter
    const [reshuffled, newRng] = shuffle(state.rng, state.darknessDiscard);
    state = {
      ...state,
      darknessDeck: reshuffled,
      darknessDiscard: [],
      rng: newRng,
      darknessMeter: state.darknessMeter + 1,
    };
    state = addLog(state, state.phase, 'Darkness deck exhausted — reshuffled, Meter +1!');

    if (state.darknessDeck.length === 0) return state;
  }

  // "He Who is in Me" — cancel the next darkness card
  if (state.heWhoIsInMeActive) {
    const cancelled = state.darknessDeck[0];
    const cancelledDef = DARKNESS_CARDS.find((d) => d.id === cancelled.defId);
    state = {
      ...state,
      darknessDeck: state.darknessDeck.slice(1),
      darknessDiscard: [...state.darknessDiscard, cancelled],
      heWhoIsInMeActive: false,
    };
    state = addLog(state, state.phase, `He Who is in Me cancelled "${cancelledDef?.name}"!`);
    return state;
  }

  const card = state.darknessDeck[0];
  state = {
    ...state,
    darknessDeck: state.darknessDeck.slice(1),
    darknessDiscard: [...state.darknessDiscard, card],
    darknessCardsDrawnThisPhase: state.darknessCardsDrawnThisPhase + 1,
  };

  const cardDef = DARKNESS_CARDS.find((d) => d.id === card.defId)!;

  // Belt of Truth: discard 'Deception' cards (we treat Corruption category as deception)
  // Note: The Belt says "Deception" cards — there's no explicit "Deception" category,
  // so we interpret it as cards in the Corruption category (Temptation, Accusation, Isolation)
  if (hasArmor(state, 'beltOfTruth') && cardDef.category === 'Corruption') {
    state = addLog(state, state.phase, `Belt of Truth discarded "${cardDef.name}" — truth exposes lies!`);
    return state;
  }

  // Shield of Faith: cancel one card per round (team decision)
  // This is handled by the SHIELD_OF_FAITH_CANCEL action, not automatically

  // Breastplate of Righteousness: reduce Faith loss by 1 (applied within resolvers)

  state = addLog(state, state.phase, `Darkness Card: "${cardDef.name}" — ${cardDef.effect}`);

  // Apply meter impact
  if (cardDef.darknessMeterImpact > 0) {
    state = { ...state, darknessMeter: state.darknessMeter + cardDef.darknessMeterImpact };
  }

  state = resolveDarknessEffect(state, card.defId);

  return state;
}

function resolveDarknessEffect(state: GameState, cardId: DarknessCardId): GameState {
  const breastplate = hasArmor(state, 'breastplateOfRighteousness');

  switch (cardId) {
    case 'creepingDark': {
      // Add 1 cube to a random tile
      let row: number, col: number;
      [row, state = { ...state }] = (() => {
        const [v, rng] = randomInt(state.rng, 0, 6);
        return [v, { ...state, rng }];
      })();
      [col, state = { ...state }] = (() => {
        const [v, rng] = randomInt(state.rng, 0, 6);
        return [v, { ...state, rng }];
      })();
      state = { ...state, board: addCubes(state.board, { row, col }, 1) };
      return state;
    }

    case 'floodOfDarkness': {
      // Add 1 cube to 2 random tiles adjacent to players (practical: just pick from neighbors)
      const alive = getAlivePlayers(state);
      const adjacentTiles: Coord[] = [];
      for (const p of alive) {
        for (const adj of getOrthogonalAdjacent(p.position)) {
          if (!adjacentTiles.some((t) => coordEqual(t, adj))) {
            adjacentTiles.push(adj);
          }
        }
      }
      // Pick up to 2 random adjacent tiles
      for (let i = 0; i < 2 && adjacentTiles.length > 0; i++) {
        let picked: Coord;
        [picked, state = { ...state }] = (() => {
          const [v, rng] = randomPick(state.rng, adjacentTiles);
          return [v, { ...state, rng }];
        })();
        state = { ...state, board: addCubes(state.board, picked, 1) };
        // Remove picked so we don't pick it twice
        const idx = adjacentTiles.findIndex((t) => coordEqual(t, picked));
        if (idx >= 0) adjacentTiles.splice(idx, 1);
      }
      return state;
    }

    case 'spreadingBlight': {
      // Add 1 cube to every tile with 2+ cubes (practical: fewer tiles to check)
      for (let r = 0; r < 7; r++) {
        for (let c = 0; c < 7; c++) {
          const tile = getTile(state.board, { row: r, col: c });
          if (tile.shadowCubes >= 2) {
            state = { ...state, board: addCubes(state.board, { row: r, col: c }, 1) };
          }
        }
      }
      return state;
    }

    case 'encroach': {
      // Add 1 cube to every tile adjacent to the largest Stronghold
      const stronghold = getLargestStronghold(state.board);
      if (stronghold) {
        const adjacent = getOrthogonalAdjacent(stronghold.coord);
        for (const coord of adjacent) {
          state = { ...state, board: addCubes(state.board, coord, 1) };
        }
      }
      return state;
    }

    case 'spiritualWickednessAppears': {
      // Spawn Wickedness on shadow tile with 2+ cubes
      const candidates = findTiles(state.board, (t) => t.type === 'Shadow' && t.shadowCubes >= 2);
      if (candidates.length > 0) {
        let picked: typeof candidates[number];
        [picked, state = { ...state }] = (() => {
          const [v, rng] = randomPick(state.rng, candidates);
          return [v, { ...state, rng }];
        })();
        let id: string;
        [id, state] = nextEnemyId(state);
        state = {
          ...state,
          enemies: [...state.enemies, { id, tier: 'Wickedness', position: picked.coord, hitsRemaining: 1 }],
        };
      } else {
        // No valid tile — add 2 cubes to random tile
        let row: number, col: number;
        [row, state = { ...state }] = (() => { const [v, rng] = randomInt(state.rng, 0, 6); return [v, { ...state, rng }]; })();
        [col, state = { ...state }] = (() => { const [v, rng] = randomInt(state.rng, 0, 6); return [v, { ...state, rng }]; })();
        state = { ...state, board: addCubes(state.board, { row, col }, 2) };
      }
      return state;
    }

    case 'powerManifests': {
      // Spawn Power adjacent to most vulnerable player
      const alive = getAlivePlayers(state);
      if (alive.length === 0) return state;
      const weakest = alive.reduce((min, p) => p.faithCurrent < min.faithCurrent ? p : min);
      const adjacent = getOrthogonalAdjacent(weakest.position);
      if (adjacent.length > 0) {
        let coord: Coord;
        [coord, state = { ...state }] = (() => {
          const [v, rng] = randomPick(state.rng, adjacent);
          return [v, { ...state, rng }];
        })();
        let id: string;
        [id, state] = nextEnemyId(state);
        state = {
          ...state,
          enemies: [...state.enemies, { id, tier: 'Power', position: coord, hitsRemaining: 2 }],
        };
      }
      return state;
    }

    case 'principalityRises': {
      // Spawn Principality on nearest Stronghold
      const strongholds = getActiveStrongholds(state.board);
      let spawnCoord: Coord;
      if (strongholds.length > 0) {
        spawnCoord = strongholds[0].coord;
      } else {
        const darkest = getDarkestTile(state.board);
        spawnCoord = darkest ? darkest.coord : { row: 3, col: 3 };
      }
      let id: string;
      [id, state] = nextEnemyId(state);
      state = {
        ...state,
        enemies: [...state.enemies, { id, tier: 'Principality', position: spawnCoord, hitsRemaining: 3 }],
      };
      return state;
    }

    case 'theEnemyRages': {
      // Meter already advanced via darknessMeterImpact
      return state;
    }

    case 'nightFalls': {
      // Meter already advanced. Add 3 cubes to 3 highest-threat tiles
      const tiles = findTilesWithMostCubes(state, 3);
      for (const coord of tiles) {
        state = { ...state, board: addCubes(state.board, coord, 1) };
      }
      return state;
    }

    case 'temptation': {
      // Weakest player loses 1 Faith
      const alive = getAlivePlayers(state);
      if (alive.length === 0) return state;
      const weakest = alive.reduce((min, p) => p.faithCurrent < min.faithCurrent ? p : min);
      let loss = 1;
      if (breastplate) loss = Math.max(0, loss - 1);
      if (loss > 0) {
        state = updatePlayer(state, weakest.id, { faithCurrent: Math.max(0, weakest.faithCurrent - loss) });
      }
      return state;
    }

    case 'accusation': {
      // Player with most scripture cards: discard 1 card or lose 2 Faith
      const alive = getAlivePlayers(state);
      if (alive.length === 0) return state;
      const target = alive.reduce((max, p) => p.scriptureHand.length > max.scriptureHand.length ? p : max);
      // AI: discard card if have any, otherwise lose Faith
      if (target.scriptureHand.length > 0) {
        state = updatePlayer(state, target.id, {
          scriptureHand: target.scriptureHand.slice(1),
        });
        state = addLog(state, state.phase, `${CHARACTERS[target.characterId].name} discarded a Scripture card from Accusation.`);
      } else {
        let loss = 2;
        if (breastplate) loss = Math.max(1, loss - 1);
        state = updatePlayer(state, target.id, { faithCurrent: Math.max(0, target.faithCurrent - loss) });
      }
      return state;
    }

    case 'isolation': {
      // Random player can't use Ministry next turn
      const alive = getAlivePlayers(state);
      if (alive.length === 0) return state;
      let target: PlayerState;
      [target, state = { ...state }] = (() => {
        const [v, rng] = randomPick(state.rng, alive);
        return [v, { ...state, rng }];
      })();
      state = updatePlayer(state, target.id, { isolatedNextTurn: true });
      state = addLog(state, state.phase, `${CHARACTERS[target.characterId].name} is isolated — cannot use Ministry next turn.`);
      return state;
    }

    case 'persecution': {
      // All players lose 1 Faith (meter already advanced)
      for (const p of getAlivePlayers(state)) {
        let loss = 1;
        if (breastplate) loss = Math.max(0, loss - 1);
        if (loss > 0) {
          state = updatePlayer(state, p.id, { faithCurrent: Math.max(0, p.faithCurrent - loss) });
        }
      }
      return state;
    }

    case 'valleyOfTheShadow': {
      // Strongest player loses 3 Faith, gains 1 bonus action if survived
      const alive = getAlivePlayers(state);
      if (alive.length === 0) return state;
      const strongest = alive.reduce((max, p) => p.faithCurrent > max.faithCurrent ? p : max);
      let loss = 3;
      if (breastplate) loss = Math.max(1, loss - 1);
      const newFaith = Math.max(0, strongest.faithCurrent - loss);
      state = updatePlayer(state, strongest.id, {
        faithCurrent: newFaith,
        bonusActionsThisTurn: newFaith > 0 ? strongest.bonusActionsThisTurn + 1 : strongest.bonusActionsThisTurn,
      });
      return state;
    }

    case 'darkNightOfTheSoul': {
      // Prophet discards all Scripture cards. If no Prophet, player with most cards discards 2.
      const prophet = state.players.find((p) => p.characterId === 'prophet' && !p.isEliminated);
      if (prophet) {
        state = {
          ...state,
          scriptureDiscard: [...state.scriptureDiscard, ...prophet.scriptureHand],
        };
        state = updatePlayer(state, prophet.id, { scriptureHand: [] });
      } else {
        const alive = getAlivePlayers(state);
        if (alive.length > 0) {
          const target = alive.reduce((max, p) => p.scriptureHand.length > max.scriptureHand.length ? p : max);
          const discarded = target.scriptureHand.slice(0, 2);
          state = {
            ...state,
            scriptureDiscard: [...state.scriptureDiscard, ...discarded],
          };
          state = updatePlayer(state, target.id, {
            scriptureHand: target.scriptureHand.slice(2),
          });
        }
      }
      return state;
    }

    case 'pulse': {
      // Each active Stronghold adds 1 cube to each adjacent tile
      const strongholds = getActiveStrongholds(state.board);
      for (const s of strongholds) {
        const adjacent = getOrthogonalAdjacent(s.coord);
        for (const coord of adjacent) {
          state = { ...state, board: addCubes(state.board, coord, 1) };
        }
      }
      return state;
    }

    case 'entrench': {
      // Add 1 Stronghold layer to a Stronghold
      const strongholds = getActiveStrongholds(state.board);
      if (strongholds.length > 0) {
        // Pick the one with most layers already (hardest)
        const target = strongholds.reduce((max, s) => s.strongholdLayers > max.strongholdLayers ? s : max);
        state = {
          ...state,
          board: updateTile(state.board, target.coord, {
            strongholdLayers: target.strongholdLayers + 1,
          }),
        };
      }
      return state;
    }

    default:
      return state;
  }
}

// ── Card Helpers ──────────────────────────────────────────────────────

/** Find N tiles with the most shadow cubes (for Night Falls). */
function findTilesWithMostCubes(state: GameState, count: number): Coord[] {
  const tiles: Array<{ coord: Coord; cubes: number }> = [];

  for (let r = 0; r < 7; r++) {
    for (let c = 0; c < 7; c++) {
      tiles.push({ coord: { row: r, col: c }, cubes: getTile(state.board, { row: r, col: c }).shadowCubes });
    }
  }

  tiles.sort((a, b) => b.cubes - a.cubes);
  return tiles.slice(0, count).map((t) => t.coord);
}

/** Draw scripture cards up to hand limit (Prayer Phase). */
export function drawScriptureToHandLimit(state: GameState, playerId: string): GameState {
  const player = getPlayer(state, playerId);
  const cardsNeeded = SCRIPTURE_HAND_LIMIT - player.scriptureHand.length;

  if (cardsNeeded <= 0 || state.scriptureDeck.length === 0) return state;

  const drawCount = Math.min(cardsNeeded, state.scriptureDeck.length);
  const drawn = state.scriptureDeck.slice(0, drawCount);
  const remaining = state.scriptureDeck.slice(drawCount);

  state = {
    ...state,
    scriptureDeck: remaining,
  };
  state = updatePlayer(state, playerId, {
    scriptureHand: [...player.scriptureHand, ...drawn],
  });

  return state;
}
