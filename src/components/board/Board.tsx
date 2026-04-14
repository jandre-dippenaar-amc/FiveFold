import { useGameStore } from '../../store/gameStore';
import { Tile } from './Tile';

export function Board() {
  const state = useGameStore((s) => s.state);
  if (!state) return null;

  return (
    <div
      className="grid grid-cols-7 gap-1.5 p-3 bg-slate-900/60 rounded-xl border border-slate-700/30 w-full h-full max-w-[700px] max-h-[700px]"
      style={{ aspectRatio: '1 / 1' }}
    >
      {state.board.map((row, r) =>
        row.map((tile, c) => <Tile key={`${r}-${c}`} tile={tile} />)
      )}
    </div>
  );
}
