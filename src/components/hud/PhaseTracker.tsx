import { useGameStore } from '../../store/gameStore';
import { CHARACTERS } from '../../engine/constants';

const PHASE_LABELS = ['Prayer', 'Action', 'Darkness', 'Enemy', 'Check'] as const;
const PHASE_ICONS = ['🙏', '⚔', '🌑', '👹', '⚖'] as const;

export function PhaseTracker() {
  const state = useGameStore((s) => s.state);
  if (!state) return null;

  const currentPlayer = state.players[state.currentPlayerIndex];
  const currentIdx = PHASE_LABELS.indexOf(state.phase as any);

  return (
    <div className="flex flex-col gap-2 p-3 bg-slate-800/60 rounded-lg border border-slate-700/30 w-full max-w-lg">
      {/* Phase steps */}
      <div className="flex gap-1">
        {PHASE_LABELS.map((phase, i) => {
          const isCurrent = phase === state.phase;
          const isDone = i < currentIdx;
          return (
            <div key={phase} className="flex-1 text-center">
              <div
                className={`h-1.5 rounded-full transition-colors mb-1 ${
                  isCurrent ? 'bg-amber-400' : isDone ? 'bg-amber-700' : 'bg-slate-600/50'
                }`}
              />
              <div className={`text-[9px] leading-tight ${
                isCurrent ? 'text-amber-400 font-semibold' : isDone ? 'text-amber-700' : 'text-slate-600'
              }`}>
                {PHASE_ICONS[i]} {phase}
              </div>
            </div>
          );
        })}
      </div>

      {/* Current turn info */}
      <div className="flex items-center justify-between text-sm">
        <span className="text-slate-400">
          Round {state.round}
          {state.phase === 'Action' && currentPlayer && (
            <span className="text-slate-300"> — {CHARACTERS[currentPlayer.characterId].name}'s Turn</span>
          )}
        </span>
        {state.phase === 'Action' && (
          <span className="text-emerald-400 font-mono">{state.actionsRemaining} actions</span>
        )}
      </div>
    </div>
  );
}
