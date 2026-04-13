import type { TileState } from '../../engine/types';
import { CHARACTERS, CHARACTER_COLORS, JERUSALEM_COORD } from '../../engine/constants';
import { useGameStore } from '../../store/gameStore';
import { coordEqual } from '../../utils/grid';
import { motion } from 'framer-motion';

const TILE_COLORS: Record<string, string> = {
  Light: 'bg-slate-700/60',
  Shadow: 'bg-slate-900/80',
  Stronghold: 'bg-red-950/80 border-red-800/50',
  BrokenGround: 'bg-amber-950/60',
  HighPlace: 'bg-cyan-950/60',
  Jerusalem: 'bg-amber-600/30 border-amber-400/60',
};

export function Tile({ tile }: { tile: TileState }) {
  const { state, selectedTile, validMoveTargets } = useGameStore();
  const store = useGameStore();

  if (!state) return null;

  const isSelected = selectedTile && coordEqual(selectedTile, tile.coord);
  const isValidTarget = validMoveTargets.some((t) => coordEqual(t, tile.coord));
  const isJerusalem = coordEqual(tile.coord, JERUSALEM_COORD);
  const currentPlayer = state.players[state.currentPlayerIndex];
  const isPlayerTile = currentPlayer && coordEqual(currentPlayer.position, tile.coord);

  const handleClick = () => {
    if (state.phase !== 'Action') return;
    if (isValidTarget) {
      store.move(tile.coord);
    } else if (isPlayerTile) {
      store.selectTile(tile.coord);
    }
  };

  return (
    <motion.div
      className={`
        relative w-full aspect-square rounded-md border cursor-pointer
        transition-all duration-150 overflow-hidden
        ${tile.faceDown ? 'bg-slate-800/90 border-slate-600/30' : TILE_COLORS[tile.type] || 'bg-slate-700/60'}
        ${isSelected ? 'ring-2 ring-amber-400' : ''}
        ${isValidTarget ? 'ring-2 ring-emerald-400/70 bg-emerald-900/20' : ''}
        ${isJerusalem && !tile.faceDown ? 'shadow-[0_0_15px_rgba(202,138,4,0.3)]' : ''}
        border-slate-600/20
      `}
      onClick={handleClick}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      layout
    >
      {/* Tile type indicator */}
      {!tile.faceDown && (
        <div className="absolute top-0.5 left-1 text-[8px] text-slate-400 font-mono">
          {tile.type === 'Jerusalem' ? '✦' : tile.type === 'Stronghold' ? '⬛' : tile.type === 'HighPlace' ? '▲' : tile.type === 'BrokenGround' ? '░' : ''}
        </div>
      )}

      {/* Face-down overlay */}
      {tile.faceDown && (
        <div className="absolute inset-0 flex items-center justify-center text-slate-500 text-lg">?</div>
      )}

      {/* Shadow cubes */}
      {tile.shadowCubes > 0 && !tile.faceDown && (
        <div className="absolute top-0.5 right-1 flex gap-0.5">
          {Array.from({ length: Math.min(tile.shadowCubes, 4) }).map((_, i) => (
            <div
              key={i}
              className={`w-2 h-2 rounded-sm ${
                tile.shadowCubes >= 3 ? 'bg-red-600' : 'bg-slate-950'
              } border border-slate-600/50`}
            />
          ))}
        </div>
      )}

      {/* Stronghold layers */}
      {tile.strongholdLayers > 0 && (
        <div className="absolute bottom-0.5 left-1 text-[9px] text-red-400 font-bold">
          ⬛{tile.strongholdLayers}
        </div>
      )}

      {/* Prayer token */}
      {tile.prayerToken && (
        <div className="absolute bottom-0.5 right-1 text-[10px]">🙏</div>
      )}

      {/* Player tokens */}
      <div className="absolute inset-0 flex items-center justify-center gap-0.5 flex-wrap p-1">
        {state.players
          .filter((p) => !p.isEliminated && coordEqual(p.position, tile.coord))
          .map((p) => (
            <div
              key={p.id}
              className="w-4 h-4 rounded-full border-2 flex items-center justify-center text-[7px] font-bold text-white"
              style={{
                backgroundColor: CHARACTER_COLORS[p.characterId],
                borderColor: state.currentPlayerIndex === state.players.indexOf(p) ? '#fbbf24' : 'transparent',
              }}
            >
              {CHARACTERS[p.characterId].name[4]}
            </div>
          ))}

        {/* Enemy tokens */}
        {state.enemies
          .filter((e) => coordEqual(e.position, tile.coord))
          .map((e) => (
            <div
              key={e.id}
              className={`w-4 h-4 rounded-full flex items-center justify-center text-[8px] ${
                e.tier === 'Principality' ? 'bg-purple-800 text-purple-200' :
                e.tier === 'Power' ? 'bg-orange-800 text-orange-200' :
                'bg-gray-700 text-gray-300'
              }`}
            >
              {e.tier === 'Principality' ? '👑' : e.tier === 'Power' ? '🔥' : '💀'}
            </div>
          ))}
      </div>

      {/* Coord label */}
      <div className="absolute bottom-0 right-0 text-[6px] text-slate-500 px-0.5">
        {tile.coord.row},{tile.coord.col}
      </div>
    </motion.div>
  );
}
