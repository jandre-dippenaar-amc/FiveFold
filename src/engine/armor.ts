import type { GameState, ArmorId } from './types';
import { ARMOR_PIECES, CHARACTERS } from './constants';
import { addLog } from './state';

/** Get the next armor piece to unlock (by unlock order). */
export function getNextArmorToUnlock(state: GameState): typeof ARMOR_PIECES[number] | null {
  const unlockedSet = new Set(state.armorUnlocked);
  for (const piece of ARMOR_PIECES) {
    if (!unlockedSet.has(piece.id)) {
      return piece;
    }
  }
  return null;
}

/** Check if any new armor should be unlocked based on cubes removed.
 *  If forcePrincipalityUnlock is true, unlock the next piece regardless of threshold. */
export function checkArmorUnlock(
  state: GameState,
  forcePrincipalityUnlock = false
): GameState {
  let changed = true;

  while (changed) {
    changed = false;
    const next = getNextArmorToUnlock(state);
    if (!next) break;

    const shouldUnlock =
      forcePrincipalityUnlock ||
      state.totalCubesRemoved >= next.cubesRequired;

    if (shouldUnlock) {
      state = {
        ...state,
        armorUnlocked: [...state.armorUnlocked, next.id as ArmorId],
      };
      state = addLog(
        state,
        state.phase,
        `Armor Unlocked: ${next.name}! (${next.scriptureReference}) — ${next.effect}`
      );
      changed = true;

      // Only force-unlock one piece per Principality defeat
      if (forcePrincipalityUnlock) {
        forcePrincipalityUnlock = false;
      }
    }
  }

  // Check anointing unlocks for all players
  state = checkAnointingUnlocks(state);

  return state;
}

/** Check if any players should have their anointing unlocked. */
function checkAnointingUnlocks(state: GameState): GameState {
  const unlockedSet = new Set(state.armorUnlocked);

  return {
    ...state,
    players: state.players.map((player) => {
      if (player.anointingUnlocked || player.isEliminated) return player;

      const charDef = CHARACTERS[player.characterId];
      const armorReq = charDef.anointing.unlocksWithArmor;
      const prayReq = charDef.anointing.prayerRequirement;

      if (unlockedSet.has(armorReq) && player.totalPrayActions >= prayReq) {
        return { ...player, anointingUnlocked: true };
      }
      return player;
    }),
  };
}

/** Check if a specific armor piece is unlocked. */
export function hasArmor(state: GameState, armorId: ArmorId): boolean {
  return state.armorUnlocked.includes(armorId);
}
