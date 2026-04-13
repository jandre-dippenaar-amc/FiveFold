import type { GameState } from './types';
import {
  MAX_DARKNESS_METER,
  MAX_PRINCIPALITIES,
  MAX_CUBES_BEFORE_LOSS,
  JERUSALEM_COORD,
} from './constants';
import { getTile } from './board';
import { addLog, getAlivePlayers } from './state';
import { hasArmor } from './armor';
import { coordEqual } from '../utils/grid';

/** Check all loss conditions. Returns updated state with loss status if triggered. */
export function checkLossConditions(state: GameState): GameState {
  if (state.status !== 'playing') return state;

  // Loss 1: Darkness Meter reaches 8
  if (state.darknessMeter >= MAX_DARKNESS_METER) {
    return {
      ...state,
      status: 'lost',
      lossReason: 'Overwhelmed — the Darkness Meter reached level 8.',
    };
  }

  // Loss 2: Player at 0 Faith without Helmet of Salvation
  const helmetUnlocked = hasArmor(state, 'helmetOfSalvation');
  if (!helmetUnlocked) {
    const fallen = state.players.find((p) => !p.isEliminated && p.faithCurrent <= 0);
    if (fallen) {
      return {
        ...state,
        status: 'lost',
        lossReason: `A Player Falls — ${fallen.characterId} reached 0 Faith before the Helmet of Salvation was unlocked.`,
      };
    }
  }

  // Loss 3: 3 Principalities on board simultaneously
  const principalityCount = state.enemies.filter((e) => e.tier === 'Principality').length;
  if (principalityCount >= MAX_PRINCIPALITIES) {
    return {
      ...state,
      status: 'lost',
      lossReason: 'Three Principalities — the highest powers of darkness have established dominion.',
    };
  }

  // Loss 4: 5th cube on any tile (Shadow Flood)
  for (let r = 0; r < 7; r++) {
    for (let c = 0; c < 7; c++) {
      const tile = getTile(state.board, { row: r, col: c });
      if (tile.shadowCubes >= MAX_CUBES_BEFORE_LOSS) {
        return {
          ...state,
          status: 'lost',
          lossReason: `Shadow Flood — a 5th Shadow Cube was placed on tile (${r},${c}).`,
        };
      }
    }
  }

  return state;
}

/** Check win condition. */
export function checkWinCondition(state: GameState): GameState {
  if (state.status !== 'playing') return state;

  // Win: All 7 Strongholds cleared AND all surviving players on Jerusalem
  if (state.strongholdsRemaining > 0) return state;

  const alive = getAlivePlayers(state);
  if (alive.length === 0) return state;

  const allOnJerusalem = alive.every((p) => coordEqual(p.position, JERUSALEM_COORD));

  if (allOnJerusalem) {
    return {
      ...state,
      status: 'won',
    };
  }

  return state;
}

/** Handle players at 0 Faith with Helmet of Salvation. */
export function handleHelmetRespawn(state: GameState): GameState {
  if (!hasArmor(state, 'helmetOfSalvation')) return state;

  for (const player of state.players) {
    if (!player.isEliminated && player.faithCurrent <= 0) {
      // Respawn at Jerusalem with 3 Faith
      state = {
        ...state,
        players: state.players.map((p) =>
          p.id === player.id
            ? { ...p, faithCurrent: 3, position: JERUSALEM_COORD }
            : p
        ),
      };
      state = addLog(state, state.phase, `${player.characterId} fell but the Helmet of Salvation saved them — respawned at Jerusalem with 3 Faith!`);
    }
  }

  return state;
}
