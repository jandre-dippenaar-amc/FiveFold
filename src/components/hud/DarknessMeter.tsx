import { useGameStore } from '../../store/gameStore';
import { MAX_DARKNESS_METER } from '../../engine/constants';

export function DarknessMeter() {
  const state = useGameStore((s) => s.state);
  if (!state) return null;

  const level = state.darknessMeter;
  const isDanger = level >= 5;
  const isCritical = level >= 7;

  return (
    <div className="flex flex-col gap-1 p-3 bg-slate-800/60 rounded-lg border border-slate-700/30">
      <span className="text-xs text-slate-400 uppercase tracking-wider">Darkness Meter</span>
      <div className="flex gap-0.5">
        {Array.from({ length: MAX_DARKNESS_METER }).map((_, i) => (
          <div
            key={i}
            className={`flex-1 h-6 rounded-sm transition-all duration-300 ${
              i < level
                ? isCritical ? 'bg-red-500 animate-pulse' :
                  isDanger ? 'bg-red-700' :
                  'bg-purple-700'
                : 'bg-slate-700/50'
            }`}
          />
        ))}
      </div>
      <div className="text-right text-xs font-mono">
        <span className={isCritical ? 'text-red-400 font-bold' : isDanger ? 'text-red-500' : 'text-slate-400'}>
          {level} / {MAX_DARKNESS_METER}
        </span>
      </div>
    </div>
  );
}
