import { CHARACTERS, CHARACTER_COLORS, ENEMIES } from '../../engine/constants';
import { useGameStore } from '../../store/gameStore';
import { coordEqual } from '../../utils/grid';
import { motion } from 'framer-motion';

const TILE_TYPE_NAMES: Record<string, { name: string; desc: string; icon: string }> = {
  Light: { name: 'Light Tile', desc: 'Safe ground. No penalty to move or act.', icon: '☀' },
  Shadow: { name: 'Shadow Tile', desc: 'Costs 1 Faith to enter. Enemies spawn here.', icon: '🌑' },
  Stronghold: { name: 'Stronghold', desc: 'Requires multiple Cleanse actions to remove.', icon: '🏛' },
  BrokenGround: { name: 'Broken Ground', desc: 'Costs 2 actions to cross.', icon: '⚠' },
  HighPlace: { name: 'High Place', desc: '+1 bonus action while standing here.', icon: '⛰' },
  Jerusalem: { name: 'Jerusalem', desc: 'The objective. All players must converge here to win.', icon: '✦' },
};

export function TileDetail() {
  const state = useGameStore((s) => s.state);
  const selectedTile = useGameStore((s) => s.selectedTile);
  const selectTile = useGameStore((s) => s.selectTile);

  if (!state || !selectedTile) return null;

  const tile = state.board[selectedTile.row][selectedTile.col];
  const tileInfo = TILE_TYPE_NAMES[tile.type] || { name: tile.type, desc: '', icon: '?' };

  const playersOnTile = state.players.filter(
    (p) => !p.isEliminated && coordEqual(p.position, tile.coord)
  );
  const enemiesOnTile = state.enemies.filter((e) => coordEqual(e.position, tile.coord));

  return (
      <motion.div
        key={`${tile.coord.row}-${tile.coord.col}`}
        className="bg-slate-800/90 border border-slate-600/40 rounded-lg p-3 backdrop-blur-sm"
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.15 }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="text-lg">{tileInfo.icon}</span>
            <div>
              <div className="text-sm font-bold text-slate-100">{tileInfo.name}</div>
              <div className="text-[10px] text-slate-500">Position ({tile.coord.row}, {tile.coord.col})</div>
            </div>
          </div>
          <button
            onClick={() => selectTile(null)}
            className="text-slate-500 hover:text-slate-300 text-xs"
          >
            ✕
          </button>
        </div>

        <p className="text-[11px] text-slate-400 mb-2">{tileInfo.desc}</p>

        {/* Status rows */}
        <div className="space-y-1.5">
          {/* Face down */}
          {tile.faceDown && (
            <StatusRow icon="❓" label="Unrevealed" value="Move here to reveal" color="text-slate-400" />
          )}

          {/* Shadow Cubes */}
          {tile.shadowCubes > 0 && (
            <StatusRow
              icon="⬛"
              label="Shadow Cubes"
              value={`${tile.shadowCubes} / 5`}
              color={tile.shadowCubes >= 3 ? 'text-red-400' : tile.shadowCubes >= 2 ? 'text-amber-400' : 'text-slate-300'}
              warning={tile.shadowCubes >= 3 ? '⚠ Overflow danger! Will spill at 4.' : tile.shadowCubes >= 4 ? '🔥 CRITICAL! 5th cube = instant loss!' : undefined}
            />
          )}
          {tile.shadowCubes === 0 && !tile.faceDown && (
            <StatusRow icon="✨" label="Shadow Cubes" value="None — clear" color="text-emerald-400" />
          )}

          {/* Stronghold */}
          {tile.strongholdLayers > 0 && (
            <StatusRow
              icon="🏛"
              label="Stronghold Layers"
              value={`${tile.strongholdLayers} remaining (need ${tile.strongholdLayers} Cleanse actions)`}
              color="text-red-300"
            />
          )}
          {tile.type === 'Stronghold' && tile.strongholdLayers === 0 && (
            <StatusRow icon="✅" label="Stronghold" value="CLEANSED!" color="text-emerald-400" />
          )}

          {/* Prayer Token */}
          {tile.prayerToken && (
            <StatusRow icon="🙏" label="Prayer Token" value="+1 action bonus to adjacent players" color="text-amber-300" />
          )}

          {/* Permanent Light */}
          {tile.isPermanentLight && (
            <StatusRow icon="💡" label="Permanent Light" value="Converted by Evangelist's Harvest" color="text-amber-300" />
          )}

          {/* Players */}
          {playersOnTile.length > 0 && (
            <div className="pt-1 border-t border-slate-700/40">
              <div className="text-[10px] text-slate-500 uppercase mb-1">Players Here</div>
              {playersOnTile.map((p) => {
                const charDef = CHARACTERS[p.characterId];
                return (
                  <div key={p.id} className="flex items-center gap-2 py-0.5">
                    <div
                      className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white"
                      style={{ backgroundColor: CHARACTER_COLORS[p.characterId] }}
                    >
                      {charDef.name.charAt(4).toUpperCase()}
                    </div>
                    <div className="text-xs text-slate-200">{charDef.name}</div>
                    <div className="text-[10px] text-amber-400 ml-auto">
                      Faith: {p.faithCurrent}/{p.faithMax}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Enemies */}
          {enemiesOnTile.length > 0 && (
            <div className="pt-1 border-t border-slate-700/40">
              <div className="text-[10px] text-slate-500 uppercase mb-1">Enemies Here</div>
              {enemiesOnTile.map((e) => {
                const enemyDef = ENEMIES[e.tier];
                const icons = { Wickedness: '💀', Power: '🔥', Principality: '👑' };
                const colors = { Wickedness: 'text-gray-300', Power: 'text-orange-300', Principality: 'text-purple-300' };
                return (
                  <div key={e.id} className="py-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-sm">{icons[e.tier]}</span>
                      <span className={`text-xs font-bold ${colors[e.tier]}`}>{e.tier}</span>
                      <span className="text-[10px] text-red-400 ml-auto">
                        HP: {e.hitsRemaining}/{enemyDef.hitsRequired}
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-500 ml-6">
                      {e.tier === 'Wickedness' ? 'Adds 1 cube/round. Roll 1d6, 3+ to hit.' :
                       e.tier === 'Power' ? 'Moves toward you, drains Faith. Roll 2d6, 4+ to hit.' :
                       'Spreads cubes to entire row+column! Roll 2d6, 5+ to hit.'}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </motion.div>
  );
}

function StatusRow({ icon, label, value, color, warning }: {
  icon: string; label: string; value: string; color: string; warning?: string;
}) {
  return (
    <div>
      <div className="flex items-center gap-1.5 text-xs">
        <span className="text-sm w-5 text-center">{icon}</span>
        <span className="text-slate-400">{label}:</span>
        <span className={`font-medium ${color}`}>{value}</span>
      </div>
      {warning && (
        <div className="text-[10px] text-red-400 ml-6 mt-0.5">{warning}</div>
      )}
    </div>
  );
}
