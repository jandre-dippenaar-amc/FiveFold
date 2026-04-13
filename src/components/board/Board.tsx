import { useGameStore } from '../../store/gameStore';
import { Tile } from './Tile';

export function Board() {
  const state = useGameStore((s) => s.state);
  if (!state) return null;

  return (
    <div className="grid grid-cols-7 gap-1 p-2 bg-slate-900/50 rounded-xl border border-slate-700/30 max-w-[560px] mx-auto">
      {state.board.map((row, r) =>
        row.map((tile, c) => <Tile key={`${r}-${c}`} tile={tile} />)
      )}
    </div>
  );
}
