import type { GameState, Coord } from './types';
import { DIFFICULTY_PRESETS } from './constants';
import { getTile, addCubes } from './board';
import { updatePlayer, addLog, getAlivePlayers } from './state';
import { hasArmor } from './armor';
import {
  getRowAndColumn,
  manhattanDistance,
  coordEqual,
  isOrthogonallyAdjacent,
} from '../utils/grid';

/** Resolve the Enemy Phase — all enemies act. */
export function resolveEnemyPhase(state: GameState): GameState {
  const preset = DIFFICULTY_PRESETS.find((d) => d.id === state.config.difficulty)!;
  const breastplate = hasArmor(state, 'breastplateOfRighteousness');

  // Process each enemy
  for (const enemy of [...state.enemies]) {
    // Check if enemy still exists (may have been removed)
    if (!state.enemies.find((e) => e.id === enemy.id)) continue;

    switch (enemy.tier) {
      case 'Wickedness': {
        // Adds 1 Shadow Cube to its tile
        state = { ...state, board: addCubes(state.board, enemy.position, 1) };
        state = addLog(state, state.phase, `Wickedness at (${enemy.position.row},${enemy.position.col}) added 1 cube.`);
        break;
      }

      case 'Power': {
        // Skip movement on even rounds if powersEveryOtherRound
        const shouldSkip = preset.powersEveryOtherRound && state.round % 2 === 0;
        if (shouldSkip) break;

        // Move toward nearest player
        const alive = getAlivePlayers(state);
        if (alive.length === 0) break;

        const nearest = alive.reduce((min, p) =>
          manhattanDistance(enemy.position, p.position) < manhattanDistance(enemy.position, min.position) ? p : min
        );

        let moveSteps = 1;
        // At Meter 3+, Powers move extra space
        if (state.darknessMeter >= 3) moveSteps += 1;

        let currentPos = enemy.position;
        for (let step = 0; step < moveSteps; step++) {
          const newPos = moveToward(currentPos, nearest.position);
          if (coordEqual(newPos, currentPos)) break;
          currentPos = newPos;
        }

        // Update enemy position
        state = {
          ...state,
          enemies: state.enemies.map((e) =>
            e.id === enemy.id ? { ...e, position: currentPos } : e
          ),
        };

        // If adjacent to a player, that player loses 1 Faith
        for (const p of alive) {
          if (isOrthogonallyAdjacent(currentPos, p.position)) {
            let loss = 1;
            if (breastplate) loss = Math.max(0, loss - 1);
            if (loss > 0) {
              state = updatePlayer(state, p.id, {
                faithCurrent: Math.max(0, p.faithCurrent - loss),
              });
              state = addLog(state, state.phase, `Power drained 1 Faith from ${p.characterId}.`);
            }
          }
        }

        state = addLog(state, state.phase, `Power moved to (${currentPos.row},${currentPos.col}).`);
        break;
      }

      case 'Principality': {
        // Spread 1 cube to every tile in same row AND column
        const tiles = getRowAndColumn(enemy.position);
        for (const coord of tiles) {
          state = { ...state, board: addCubes(state.board, coord, 1) };
        }
        state = addLog(state, state.phase, `Principality at (${enemy.position.row},${enemy.position.col}) spread darkness across row and column (${tiles.length} tiles).`);

        // Expert mode: Principalities move
        if (preset.principalitiesCanMove) {
          const alive = getAlivePlayers(state);
          if (alive.length > 0) {
            const nearest = alive.reduce((min, p) =>
              manhattanDistance(enemy.position, p.position) < manhattanDistance(enemy.position, min.position) ? p : min
            );
            const newPos = moveToward(enemy.position, nearest.position);
            state = {
              ...state,
              enemies: state.enemies.map((e) =>
                e.id === enemy.id ? { ...e, position: newPos } : e
              ),
            };

            // Player on Principality tile at round start loses 2 Faith
            for (const p of alive) {
              if (coordEqual(newPos, p.position)) {
                let loss = 2;
                if (breastplate) loss = Math.max(1, loss - 1);
                state = updatePlayer(state, p.id, {
                  faithCurrent: Math.max(0, p.faithCurrent - loss),
                });
              }
            }
          }
        }
        break;
      }
    }
  }

  // Special rule: Meter 7 — every shadow tile with 3+ cubes auto-spawns Wickedness
  if (state.darknessMeter >= 7) {
    for (let r = 0; r < 7; r++) {
      for (let c = 0; c < 7; c++) {
        const tile = getTile(state.board, { row: r, col: c });
        if (tile.type === 'Shadow' && tile.shadowCubes >= 3) {
          // Check if there's already a Wickedness on this tile
          const hasWickedness = state.enemies.some(
            (e) => e.tier === 'Wickedness' && coordEqual(e.position, { row: r, col: c })
          );
          if (!hasWickedness) {
            let id: string;
            [id, state] = (() => {
              const eid = `enemy-${state.nextEnemyId}`;
              return [eid, { ...state, nextEnemyId: state.nextEnemyId + 1 }];
            })();
            state = {
              ...state,
              enemies: [...state.enemies, { id, tier: 'Wickedness', position: { row: r, col: c }, hitsRemaining: 1 }],
            };
          }
        }
      }
    }
  }

  return state;
}

/** Move one step toward target (orthogonal only). */
function moveToward(from: Coord, to: Coord): Coord {
  const dr = to.row - from.row;
  const dc = to.col - from.col;

  // Prefer moving along the axis with the greater distance
  if (Math.abs(dr) >= Math.abs(dc)) {
    return { row: from.row + Math.sign(dr), col: from.col };
  } else {
    return { row: from.row, col: from.col + Math.sign(dc) };
  }
}
