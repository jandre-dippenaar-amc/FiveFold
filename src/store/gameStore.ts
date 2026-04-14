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
  gameLog: string[];
  showPassScreen: boolean;
  phaseEvents: string[] | null;
  phaseEventsType: string;

  newGame: (config: GameConfig) => void;
  selectTile: (coord: Coord | null) => void;
  dismissPassScreen: () => void;
  dismissPhaseOverlay: () => void;

  move: (target: Coord) => void;
  cleanse: () => void;
  battle: (enemyId: string) => void;
  pray: () => void;
  encourage: (targetPlayerId: string) => void;
  fortify: () => void;
  playScripture: (cardInstanceId: string, targets?: ScriptureTargets) => void;
  useMinistry: (targets?: MinistryTargets) => void;
  useAnointing: (targets?: AnointingTargets) => void;

  endTurn: () => void;
  advanceToNextPhase: () => void;
  runAutomatedPhases: () => void;
}

function updateFromState(state: GameState) {
  return { state, gameLog: state.log.map((e) => e.description) };
}

export const useGameStore = create<GameStore>((set, get) => ({
  state: null,
  selectedTile: null,
  validMoveTargets: [],
  gameLog: [],
  showPassScreen: false,
  phaseEvents: null,
  phaseEventsType: '',

  newGame: (config) => {
    let s = createGameState(config);
    s = executePrayerPhase(s);
    s = beginPlayerTurn(s, 0);
    set({ ...updateFromState(s), selectedTile: null, validMoveTargets: [], showPassScreen: true, phaseEvents: null });
  },

  selectTile: (coord) => {
    const { state } = get();
    if (!state || state.phase !== 'Action') {
      set({ selectedTile: coord, validMoveTargets: [] });
      return;
    }
    if (coord) {
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

  dismissPassScreen: () => set({ showPassScreen: false }),

  dismissPhaseOverlay: () => {
    const { state } = get();
    if (!state) return;

    // After dismissing phase overlay, start next round
    if (state.status === 'playing') {
      let s = state;
      s = advanceRound(s);
      s = executePrayerPhase(s);
      s = beginPlayerTurn(s, 0);
      set({ ...updateFromState(s), phaseEvents: null, showPassScreen: true, selectedTile: null, validMoveTargets: [] });
    } else {
      set({ phaseEvents: null });
    }
  },

  move: (target) => {
    const { state } = get();
    if (!state) return;
    const player = getCurrentPlayer(state);
    try {
      const next = executeMove(state, player.id, target);
      set({ ...updateFromState(next), selectedTile: null, validMoveTargets: [] });
    } catch (e) { console.error(e); }
  },

  cleanse: () => {
    const { state } = get();
    if (!state) return;
    try {
      set(updateFromState(executeCleanse(state, getCurrentPlayer(state).id)));
    } catch (e) { console.error(e); }
  },

  battle: (enemyId) => {
    const { state } = get();
    if (!state) return;
    try {
      set(updateFromState(executeBattle(state, getCurrentPlayer(state).id, enemyId)));
    } catch (e) { console.error(e); }
  },

  pray: () => {
    const { state } = get();
    if (!state) return;
    try {
      set(updateFromState(executePray(state, getCurrentPlayer(state).id)));
    } catch (e) { console.error(e); }
  },

  encourage: (targetPlayerId) => {
    const { state } = get();
    if (!state) return;
    try {
      set(updateFromState(executeEncourage(state, getCurrentPlayer(state).id, targetPlayerId)));
    } catch (e) { console.error(e); }
  },

  fortify: () => {
    const { state } = get();
    if (!state) return;
    try {
      set(updateFromState(executeFortify(state, getCurrentPlayer(state).id)));
    } catch (e) { console.error(e); }
  },

  playScripture: (cardInstanceId, targets) => {
    const { state } = get();
    if (!state) return;
    try {
      set(updateFromState(executeScripture(state, getCurrentPlayer(state).id, cardInstanceId, targets)));
    } catch (e) { console.error(e); }
  },

  useMinistry: (targets) => {
    const { state } = get();
    if (!state) return;
    try {
      set(updateFromState(executeMinistry(state, getCurrentPlayer(state).id, targets)));
    } catch (e) { console.error(e); }
  },

  useAnointing: (targets) => {
    const { state } = get();
    if (!state) return;
    try {
      set(updateFromState(executeAnointing(state, getCurrentPlayer(state).id, targets)));
    } catch (e) { console.error(e); }
  },

  endTurn: () => {
    const { state } = get();
    if (!state || state.phase !== 'Action') return;

    let nextIndex = state.currentPlayerIndex + 1;
    while (nextIndex < state.players.length && state.players[nextIndex].isEliminated) {
      nextIndex++;
    }

    if (nextIndex < state.players.length) {
      const next = beginPlayerTurn(state, nextIndex);
      set({ ...updateFromState(next), selectedTile: null, validMoveTargets: [], showPassScreen: true });
    } else {
      get().runAutomatedPhases();
    }
  },

  advanceToNextPhase: () => {
    get().runAutomatedPhases();
  },

  runAutomatedPhases: () => {
    let { state } = get();
    if (!state) return;

    const logBefore = state.log.length;

    if (state.status === 'playing') state = executeDarknessPhase(state);
    if (state.status === 'playing') state = executeEnemyPhase(state);
    if (state.status === 'playing') state = executeCheckPhase(state);

    // Collect events from the automated phases
    const newEvents = state.log.slice(logBefore).map((e) => e.description);

    set({
      ...updateFromState(state),
      selectedTile: null,
      validMoveTargets: [],
      phaseEvents: newEvents.length > 0 ? newEvents : null,
      phaseEventsType: 'Darkness / Enemy / Check',
    });
  },
}));
