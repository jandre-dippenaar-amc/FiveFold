import { useGameStore } from '../../store/gameStore';
import { Board } from '../board/Board';
import { CharacterPanel } from '../characters/CharacterPanel';
import { PhaseTracker } from '../hud/PhaseTracker';
import { DarknessMeter } from '../hud/DarknessMeter';
import { ArmorTrack } from '../hud/ArmorTrack';
import { TurnLog } from '../hud/TurnLog';
import { GameOverModal } from '../modals/GameOverModal';
import { TOTAL_STRONGHOLDS } from '../../engine/constants';

export function GameLayout() {
  const state = useGameStore((s) => s.state);
  if (!state) return null;

  return (
    <div className="min-h-screen flex flex-col lg:flex-row gap-4 p-4">
      {/* Left sidebar — Character panels */}
      <div className="lg:w-64 flex flex-row lg:flex-col gap-2 overflow-x-auto lg:overflow-x-visible">
        {state.players.map((player, i) => (
          <CharacterPanel
            key={player.id}
            player={player}
            isActive={i === state.currentPlayerIndex && state.phase === 'Action'}
          />
        ))}
      </div>

      {/* Center — Board */}
      <div className="flex-1 flex flex-col items-center gap-4">
        <PhaseTracker />
        <Board />

        {/* Stronghold counter */}
        <div className="text-sm text-slate-400">
          Strongholds: <span className="text-amber-400 font-bold">{TOTAL_STRONGHOLDS - state.strongholdsRemaining}</span> / {TOTAL_STRONGHOLDS} cleansed
        </div>
      </div>

      {/* Right sidebar — Meters and log */}
      <div className="lg:w-72 flex flex-col gap-2">
        <DarknessMeter />
        <ArmorTrack />
        <TurnLog />

        {/* Deck status */}
        <div className="flex gap-2 text-xs text-slate-400 p-2">
          <span>Scripture: {state.scriptureDeck.length}</span>
          <span>Darkness: {state.darknessDeck.length}</span>
          <span>Enemies: {state.enemies.length}</span>
        </div>
      </div>

      <GameOverModal />
    </div>
  );
}
