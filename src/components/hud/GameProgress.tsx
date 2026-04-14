import { useGameStore } from '../../store/gameStore';
import { TOTAL_STRONGHOLDS, BOARD_SIZE, MAX_DARKNESS_METER } from '../../engine/constants';
import { getTile } from '../../engine/board';

export function GameProgress() {
  const state = useGameStore((s) => s.state);
  if (!state) return null;

  // Count danger tiles
  let tilesAt3 = 0, tilesAt4 = 0, totalCubes = 0;
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      const cubes = getTile(state.board, { row: r, col: c }).shadowCubes;
      totalCubes += cubes;
      if (cubes >= 4) tilesAt4++;
      else if (cubes >= 3) tilesAt3++;
    }
  }

  const strongholdsDone = TOTAL_STRONGHOLDS - state.strongholdsRemaining;
  const principalities = state.enemies.filter((e) => e.tier === 'Principality').length;

  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1 px-4 py-1.5 bg-slate-900/60 border-b border-slate-800/50 text-[10px]">
      <Stat label="Strongholds" value={`${strongholdsDone}/${TOTAL_STRONGHOLDS}`} color={strongholdsDone >= 7 ? 'text-emerald-400' : 'text-amber-400'} />
      <Stat label="Meter" value={`${state.darknessMeter}/${MAX_DARKNESS_METER}`} color={state.darknessMeter >= 6 ? 'text-red-400' : state.darknessMeter >= 4 ? 'text-amber-400' : 'text-slate-300'} />
      <Stat label="Cubes" value={String(totalCubes)} color={totalCubes > 20 ? 'text-red-400' : 'text-slate-300'} />
      <Stat label="Enemies" value={String(state.enemies.length)} color={state.enemies.length > 3 ? 'text-red-400' : 'text-slate-300'} />
      {principalities > 0 && <Stat label="Principalities" value={`${principalities}/3`} color="text-purple-400" />}
      {tilesAt3 > 0 && <Stat label="Overflow Risk" value={`${tilesAt3} tiles at 3`} color="text-amber-400" />}
      {tilesAt4 > 0 && <Stat label="CRITICAL" value={`${tilesAt4} tiles at 4!`} color="text-red-400" />}
      <Stat label="Armor" value={`${state.armorUnlocked.length}/6`} color="text-amber-300" />
      <Stat label="Removed" value={String(state.totalCubesRemoved)} color="text-emerald-400" />
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <span className="text-slate-500">
      {label}: <span className={`font-semibold ${color}`}>{value}</span>
    </span>
  );
}
