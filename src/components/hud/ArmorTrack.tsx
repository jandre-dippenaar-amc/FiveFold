import { useGameStore } from '../../store/gameStore';
import { ARMOR_PIECES } from '../../engine/constants';

export function ArmorTrack() {
  const state = useGameStore((s) => s.state);
  if (!state) return null;

  return (
    <div className="flex flex-col gap-1 p-3 bg-slate-800/60 rounded-lg border border-slate-700/30">
      <div className="flex items-center justify-between">
        <span className="text-xs text-slate-400 uppercase tracking-wider">Armor of God</span>
        <span className="text-xs text-slate-500">{state.totalCubesRemoved} cubes removed</span>
      </div>
      <div className="grid grid-cols-6 gap-1">
        {ARMOR_PIECES.map((piece) => {
          const unlocked = state.armorUnlocked.includes(piece.id as any);
          return (
            <div
              key={piece.id}
              className={`text-center p-1 rounded transition-all ${
                unlocked
                  ? 'bg-amber-600/30 border border-amber-500/50 text-amber-300'
                  : 'bg-slate-700/30 border border-slate-600/20 text-slate-500'
              }`}
              title={`${piece.name}: ${piece.effect} (${piece.cubesRequired} cubes)`}
            >
              <div className="text-[10px] font-semibold truncate">{piece.name.split(' ').pop()}</div>
              <div className="text-[8px]">{piece.cubesRequired}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
