import { describe, it, expect } from 'vitest';
import { createGameState, getPlayer, getAlivePlayers } from '../../src/engine/state';
import { CHARACTERS, TOTAL_STRONGHOLDS } from '../../src/engine/constants';
import type { GameConfig } from '../../src/engine/types';

const defaultConfig: GameConfig = {
  playerCount: 3,
  characterIds: ['pastor', 'apostle', 'evangelist'],
  difficulty: 'faithful',
  seed: 42,
};

describe('createGameState', () => {
  it('creates a valid initial game state', () => {
    const state = createGameState(defaultConfig);
    expect(state.status).toBe('playing');
    expect(state.round).toBe(1);
    expect(state.phase).toBe('Prayer');
    expect(state.darknessMeter).toBe(1);
    expect(state.strongholdsRemaining).toBe(TOTAL_STRONGHOLDS);
    expect(state.armorUnlocked).toEqual([]);
    expect(state.totalCubesRemoved).toBe(0);
    expect(state.lossReason).toBeNull();
  });

  it('creates the correct number of players', () => {
    const state = createGameState(defaultConfig);
    expect(state.players.length).toBe(3);
  });

  it('assigns correct characters and starting stats', () => {
    const state = createGameState(defaultConfig);
    const pastor = state.players.find((p) => p.characterId === 'pastor')!;
    expect(pastor.faithCurrent).toBe(CHARACTERS.pastor.faithMax);
    expect(pastor.faithMax).toBe(10);
    expect(pastor.scriptureHand.length).toBe(CHARACTERS.pastor.startingScriptureCards);
    expect(pastor.isEliminated).toBe(false);
  });

  it('places Evangelist on Jerusalem', () => {
    const state = createGameState(defaultConfig);
    const evangelist = state.players.find((p) => p.characterId === 'evangelist')!;
    expect(evangelist.position).toEqual({ row: 3, col: 3 });
  });

  it('places other characters on edge tiles', () => {
    const state = createGameState(defaultConfig);
    const pastor = state.players.find((p) => p.characterId === 'pastor')!;
    const pos = pastor.position;
    const isEdge = pos.row === 0 || pos.row === 6 || pos.col === 0 || pos.col === 6;
    expect(isEdge).toBe(true);
  });

  it('has shuffled scripture and darkness decks', () => {
    const state = createGameState(defaultConfig);
    expect(state.scriptureDeck.length).toBeGreaterThan(0);
    expect(state.darknessDeck.length).toBeGreaterThan(0);
    expect(state.scriptureDiscard).toEqual([]);
    expect(state.darknessDiscard).toEqual([]);
  });

  it('is deterministic with the same seed', () => {
    const s1 = createGameState(defaultConfig);
    const s2 = createGameState(defaultConfig);
    expect(s1.players.map((p) => p.position)).toEqual(s2.players.map((p) => p.position));
    expect(s1.scriptureDeck.map((c) => c.defId)).toEqual(s2.scriptureDeck.map((c) => c.defId));
  });

  it('applies Seeker difficulty correctly', () => {
    const state = createGameState({ ...defaultConfig, difficulty: 'seeker' });
    expect(state.darknessMeter).toBe(1);
    // Seeker gives +2 extra scripture cards
    const pastor = state.players.find((p) => p.characterId === 'pastor')!;
    expect(pastor.scriptureHand.length).toBe(CHARACTERS.pastor.startingScriptureCards + 2);
  });

  it('applies Refined by Fire difficulty correctly', () => {
    const state = createGameState({ ...defaultConfig, difficulty: 'refinedByFire' });
    expect(state.darknessMeter).toBe(3);
  });
});
