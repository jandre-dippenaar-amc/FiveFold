import { useState } from 'react';
import { useGameStore } from '../../store/gameStore';
import { Board } from '../board/Board';
import { TileDetail } from '../board/TileDetail';
import { CharacterPanel } from '../characters/CharacterPanel';
import { PhaseTracker } from '../hud/PhaseTracker';
import { DarknessMeter } from '../hud/DarknessMeter';
import { ArmorTrack } from '../hud/ArmorTrack';
import { TurnLog } from '../hud/TurnLog';
import { TutorialOverlay } from '../hud/TutorialOverlay';
import { Notifications } from '../hud/Notifications';
import { GameOverModal } from '../modals/GameOverModal';
import { PassAndPlayScreen } from '../modals/PassAndPlayScreen';
import { PhaseResolutionOverlay } from '../modals/PhaseResolutionOverlay';
import { RulesReference } from '../modals/RulesReference';
import { TOTAL_STRONGHOLDS } from '../../engine/constants';

export function GameLayout() {
  const state = useGameStore((s) => s.state);
  const showPassScreen = useGameStore((s) => s.showPassScreen);
  const phaseEvents = useGameStore((s) => s.phaseEvents);
  const phaseEventsType = useGameStore((s) => s.phaseEventsType);
  const dismissPassScreen = useGameStore((s) => s.dismissPassScreen);
  const dismissPhaseOverlay = useGameStore((s) => s.dismissPhaseOverlay);

  const [showRules, setShowRules] = useState(false);

  if (!state) return null;

  return (
    <div className="min-h-screen bg-[#0a0a0f] flex flex-col">
      {/* Top bar */}
      <div className="px-4 py-2 border-b border-slate-800/50 flex items-center justify-between bg-slate-900/30 shrink-0">
        <div className="flex items-center gap-4">
          <h1 className="text-lg font-bold text-amber-400/80" style={{ fontFamily: 'Georgia, serif' }}>Five Fold</h1>
          <span className="text-xs text-slate-500">Round {state.round}</span>
        </div>
        <div className="flex items-center gap-4 text-xs text-slate-400">
          <span>Strongholds: <span className="text-amber-400 font-bold">{TOTAL_STRONGHOLDS - state.strongholdsRemaining}</span>/{TOTAL_STRONGHOLDS}</span>
          <span>Enemies: <span className="text-red-400">{state.enemies.length}</span></span>
          <button
            onClick={() => setShowRules(true)}
            className="text-blue-400 hover:text-blue-300 transition-colors"
          >
            Rules
          </button>
          <button
            onClick={() => useGameStore.setState({ state: null })}
            className="text-slate-500 hover:text-red-400 transition-colors"
          >
            Quit
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col lg:flex-row gap-3 p-3 overflow-hidden">
        {/* Left sidebar — Character panels */}
        <div className="lg:w-56 xl:w-64 flex flex-row lg:flex-col gap-2 overflow-x-auto lg:overflow-y-auto lg:overflow-x-hidden shrink-0">
          {state.players.map((player, i) => (
            <CharacterPanel
              key={player.id}
              player={player}
              isActive={i === state.currentPlayerIndex && state.phase === 'Action'}
            />
          ))}
        </div>

        {/* Center — Board */}
        <div className="flex-1 flex flex-col items-center gap-3 min-w-0 min-h-0">
          <PhaseTracker />
          <div className="flex-1 w-full flex items-center justify-center min-h-0">
            <Board />
          </div>
          {state.phase === 'Action' && (
            <div className="text-xs text-slate-500 text-center">
              Click your character's pulsing tile to move, or click any tile for details
            </div>
          )}
        </div>

        {/* Right sidebar — Meters, tile detail, and log */}
        <div className="lg:w-64 xl:w-72 flex flex-col gap-2 shrink-0 overflow-y-auto">
          <TileDetail />
          <DarknessMeter />
          <ArmorTrack />
          <TurnLog />
        </div>
      </div>

      {/* Notifications */}
      <Notifications />

      {/* Overlays — only one at a time, in priority order */}
      {showPassScreen && state.status === 'playing' && !phaseEvents ? (
        <PassAndPlayScreen onReady={dismissPassScreen} />
      ) : phaseEvents && state.status === 'playing' ? (
        <PhaseResolutionOverlay
          events={phaseEvents}
          phase={phaseEventsType}
          onDone={dismissPhaseOverlay}
        />
      ) : (
        <TutorialOverlay />
      )}

      {/* Rules reference */}
      {showRules && <RulesReference onClose={() => setShowRules(false)} />}

      {/* Game over */}
      <GameOverModal />
    </div>
  );
}
