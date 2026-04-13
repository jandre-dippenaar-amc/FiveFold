import { create } from 'zustand';
import type { GameState, GameConfig, Coord, ScriptureTargets, MinistryTargets, AnointingTargets } from '../engine/types';
import { createGameState, getCurrentPlayer } from '../engine/state';
import { executeMove, executeCleanse, executeBattle, executePray, executeEncourage, executeFortify, canMove } from '../engine/actions';
import { executeMinistry, executeAnointing } from '../engine/characters';
import { executeScripture } from '../engine/cards';
import { executePrayerPhase, beginPlayerTurn, executeDarknessPhase, executeEnemyPhase, executeCheckPhase, advanceRound } from '../engine/phases';

interface GameStore {
  state: GameState | null;
  selectedTile: Coord | null;
  validMoveTargets: Coord[];
  animating: boolean;
  gameLog: string[];

  // Actions
  newGame: (config: GameConfig) => void;
  selectTile: (coord: Coord | null) => void;

  // Player actions
  move: (target: Coord) => void;
  cleanse: () => void;
  battle: (enemyId: string) => void;
  pray: () => void;
  encourage: (targetPlayerId: string) => void;
  fortify: () => void;
  playScripture: (cardInstanceId: string, targets?: ScriptureTargets) => void;
  useMinistry: (targets?: MinistryTargets) => void;
  useAnointing: (targets?: AnointingTargets) => void;

  // Phase progression
  endTurn: () => void;
  advanceToNextPhase: () => void;
  runAutomatedPhases: () => void;
}

export const useGameStore = create<GameStore>((set, get) => ({
  state: null,
  selectedTile: null,
  validMoveTargets: [],
  animating: false,
  gameLog: [],

  newGame: (config) => {
    const state = createGameState(config);
    // Start Prayer Phase then begin first player turn
    let s = executePrayerPhase(state);
    s = beginPlayerTurn(s, 0);
    set({ state: s, selectedTile: null, validMoveTargets: [], gameLog: s.log.map(e => e.description) });
  },

  selectTile: (coord) => {
    const { state } = get();
    if (!state || state.phase !== 'Action') {
      set({ selectedTile: coord, validMoveTargets: [] });
      return;
    }

    if (coord) {
      // Calculate valid move targets from this tile
      const player = getCurrentPlayer(state);
      if (player && !player.isEliminated) {
        const targets: Coord[] = [];
        for (let r = 0; r < 7; r++) {
          for (let c = 0; c < 7; c++) {
            if (canMove(state, player.id, { row: r, col: c }).valid) {
              targets.push({ row: r, col: c });
            }
          }
        }
        set({ selectedTile: coord, validMoveTargets: targets });
      }
    } else {
      set({ selectedTile: null, validMoveTargets: [] });
    }
  },

  move: (target) => {
    const { state } = get();
    if (!state) return;
    const player = getCurrentPlayer(state);
    try {
      const next = executeMove(state, player.id, target);
      set({ state: next, selectedTile: null, validMoveTargets: [], gameLog: next.log.map(e => e.description) });
    } catch (e) { console.error(e); }
  },

  cleanse: () => {
    const { state } = get();
    if (!state) return;
    const player = getCurrentPlayer(state);
    try {
      const next = executeCleanse(state, player.id);
      set({ state: next, gameLog: next.log.map(e => e.description) });
    } catch (e) { console.error(e); }
  },

  battle: (enemyId) => {
    const { state } = get();
    if (!state) return;
    const player = getCurrentPlayer(state);
    try {
      const next = executeBattle(state, player.id, enemyId);
      set({ state: next, gameLog: next.log.map(e => e.description) });
    } catch (e) { console.error(e); }
  },

  pray: () => {
    const { state } = get();
    if (!state) return;
    const player = getCurrentPlayer(state);
    try {
      const next = executePray(state, player.id);
      set({ state: next, gameLog: next.log.map(e => e.description) });
    } catch (e) { console.error(e); }
  },

  encourage: (targetPlayerId) => {
    const { state } = get();
    if (!state) return;
    const player = getCurrentPlayer(state);
    try {
      const next = executeEncourage(state, player.id, targetPlayerId);
      set({ state: next, gameLog: next.log.map(e => e.description) });
    } catch (e) { console.error(e); }
  },

  fortify: () => {
    const { state } = get();
    if (!state) return;
    const player = getCurrentPlayer(state);
    try {
      const next = executeFortify(state, player.id);
      set({ state: next, gameLog: next.log.map(e => e.description) });
    } catch (e) { console.error(e); }
  },

  playScripture: (cardInstanceId, targets) => {
    const { state } = get();
    if (!state) return;
    const player = getCurrentPlayer(state);
    try {
      const next = executeScripture(state, player.id, cardInstanceId, targets);
      set({ state: next, gameLog: next.log.map(e => e.description) });
    } catch (e) { console.error(e); }
  },

  useMinistry: (targets) => {
    const { state } = get();
    if (!state) return;
    const player = getCurrentPlayer(state);
    try {
      const next = executeMinistry(state, player.id, targets);
      set({ state: next, gameLog: next.log.map(e => e.description) });
    } catch (e) { console.error(e); }
  },

  useAnointing: (targets) => {
    const { state } = get();
    if (!state) return;
    const player = getCurrentPlayer(state);
    try {
      const next = executeAnointing(state, player.id, targets);
      set({ state: next, gameLog: next.log.map(e => e.description) });
    } catch (e) { console.error(e); }
  },

  endTurn: () => {
    const { state } = get();
    if (!state || state.phase !== 'Action') return;

    // Find next alive player
    let nextIndex = state.currentPlayerIndex + 1;
    while (nextIndex < state.players.length && state.players[nextIndex].isEliminated) {
      nextIndex++;
    }

    if (nextIndex < state.players.length) {
      // Next player's turn
      const next = beginPlayerTurn(state, nextIndex);
      set({ state: next, selectedTile: null, validMoveTargets: [], gameLog: next.log.map(e => e.description) });
    } else {
      // All players done — run automated phases
      get().runAutomatedPhases();
    }
  },

  advanceToNextPhase: () => {
    get().runAutomatedPhases();
  },

  runAutomatedPhases: () => {
    let { state } = get();
    if (!state) return;

    // Darkness Phase
    if (state.status === 'playing') {
      state = executeDarknessPhase(state);
    }

    // Enemy Phase
    if (state.status === 'playing') {
      state = executeEnemyPhase(state);
    }

    // Check Phase
    if (state.status === 'playing') {
      state = executeCheckPhase(state);
    }

    // If still playing, advance to next round
    if (state.status === 'playing') {
      state = advanceRound(state);
      state = executePrayerPhase(state);
      state = beginPlayerTurn(state, 0);
    }

    set({ state, selectedTile: null, validMoveTargets: [], gameLog: state.log.map(e => e.description) });
  },
}));
