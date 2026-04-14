import { useGameStore } from '../../store/gameStore';
import { CHARACTERS } from '../../engine/constants';

const PHASE_LABELS = ['Prayer', 'Action', 'Darkness', 'Enemy', 'Check'] as const;

export function PhaseTracker() {
  const state = useGameStore((s) => s.state);
  if (!state) return null;

  const currentPlayer = state.players[state.currentPlayerIndex];

  return (
    <div className="flex flex-col gap-2 p-3 bg-slate-800/60 rounded-lg border border-slate-700/30 w-full max-w-md">
      <div className="flex items-center justify-between">
        <span className="text-sm text-slate-400">Round {state.round}</span>
        <span className="text-sm font-mono text-amber-400">{state.phase} Phase</span>
      </div>

      {/* Phase dots */}
      <div className="flex gap-1">
        {PHASE_LABELS.map((phase) => (
          <div
            key={phase}
            className={`flex-1 h-1.5 rounded-full transition-colors ${
              phase === state.phase ? 'bg-amber-400' :
              PHASE_LABELS.indexOf(phase) < PHASE_LABELS.indexOf(state.phase as any) ? 'bg-amber-700' :
              'bg-slate-600'
            }`}
          />
        ))}
      </div>

      {state.phase === 'Action' && currentPlayer && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-300">{CHARACTERS[currentPlayer.characterId].name}'s Turn</span>
          <span className="text-emerald-400 font-mono">{state.actionsRemaining} actions</span>
        </div>
      )}
    </div>
  );
}
