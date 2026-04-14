import { useState } from 'react';
import type { TileState } from '../../engine/types';
import { CHARACTERS, CHARACTER_COLORS, JERUSALEM_COORD } from '../../engine/constants';
import { useGameStore } from '../../store/gameStore';
import { coordEqual } from '../../utils/grid';
import { motion } from 'framer-motion';

const TILE_BG: Record<string, string> = {
  Light: 'bg-indigo-900/40 border-indigo-700/30',
  Shadow: 'bg-slate-950/70 border-purple-900/40',
  Stronghold: 'bg-red-950/60 border-red-700/50',
  BrokenGround: 'bg-amber-950/40 border-amber-800/30',
  HighPlace: 'bg-sky-950/40 border-sky-700/30',
  Jerusalem: 'bg-amber-800/30 border-amber-500/60',
};

const TILE_ICONS: Record<string, string> = {
  Jerusalem: '✦',
  Stronghold: '🏛',
  HighPlace: '⛰',
  BrokenGround: '⚠',
  Light: '',
  Shadow: '',
};

export function Tile({ tile }: { tile: TileState }) {
  const state = useGameStore((s) => s.state);
  const selectedTile = useGameStore((s) => s.selectedTile);
  const validMoveTargets = useGameStore((s) => s.validMoveTargets);
  const move = useGameStore((s) => s.move);
  const selectTile = useGameStore((s) => s.selectTile);
  const [hovered, setHovered] = useState(false);

  if (!state) return null;

  const isSelected = selectedTile && coordEqual(selectedTile, tile.coord);
  const isValidTarget = validMoveTargets.some((t) => coordEqual(t, tile.coord));
  const isJerusalem = coordEqual(tile.coord, JERUSALEM_COORD);
  const currentPlayer = state.players[state.currentPlayerIndex];
  const isCurrentPlayerTile = currentPlayer && !currentPlayer.isEliminated && coordEqual(currentPlayer.position, tile.coord);

  const playersOnTile = state.players.filter((p) => !p.isEliminated && coordEqual(p.position, tile.coord));
  const enemiesOnTile = state.enemies.filter((e) => coordEqual(e.position, tile.coord));

  const handleClick = () => {
    if (isValidTarget && state.phase === 'Action') {
      move(tile.coord);
    } else if (isCurrentPlayerTile && state.phase === 'Action') {
      selectTile(isSelected ? null : tile.coord);
    } else {
      // Click any tile to see its details
      selectTile(isSelected ? null : tile.coord);
    }
  };

  const tooltipLines: string[] = [];
  if (!tile.faceDown) {
    tooltipLines.push(`${tile.type} (${tile.coord.row},${tile.coord.col})`);
    if (tile.shadowCubes > 0) tooltipLines.push(`Shadow Cubes: ${tile.shadowCubes}`);
    if (tile.strongholdLayers > 0) tooltipLines.push(`Stronghold: ${tile.strongholdLayers} layers`);
    if (tile.prayerToken) tooltipLines.push('Prayer Token active');
    for (const p of playersOnTile) tooltipLines.push(`${CHARACTERS[p.characterId].name}`);
    for (const e of enemiesOnTile) tooltipLines.push(`${e.tier} (${e.hitsRemaining} HP)`);
  } else {
    tooltipLines.push(`Unknown (${tile.coord.row},${tile.coord.col})`);
  }

  return (
    <motion.div
      className={`
        relative w-full aspect-square rounded border cursor-pointer select-none
        transition-all duration-150 overflow-hidden
        ${tile.faceDown ? 'bg-slate-700/50 border-slate-500/30' : TILE_BG[tile.type] || 'bg-slate-800/40 border-slate-600/20'}
        ${isSelected ? 'ring-2 ring-amber-400 z-10' : ''}
        ${isValidTarget ? 'ring-2 ring-green-400/80 z-10' : ''}
        ${isCurrentPlayerTile && state.phase === 'Action' && !isSelected ? 'ring-2 ring-amber-400/60 animate-pulse' : ''}
        ${isJerusalem && !tile.faceDown ? 'shadow-[0_0_20px_rgba(202,138,4,0.25)]' : ''}
      `}
      onClick={handleClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      whileHover={{ scale: 1.06 }}
      whileTap={{ scale: 0.94 }}
    >
      {/* Tile type icon */}
      {!tile.faceDown && TILE_ICONS[tile.type] && (
        <div className="absolute top-0 left-0.5 text-[9px] opacity-50">
          {TILE_ICONS[tile.type]}
        </div>
      )}

      {/* Face-down */}
      {tile.faceDown && (
        <div className="absolute inset-0 flex items-center justify-center text-slate-600 text-base font-serif">?</div>
      )}

      {/* Shadow cubes — top right corner */}
      {tile.shadowCubes > 0 && !tile.faceDown && (
        <div className="absolute top-0.5 right-0.5 flex gap-px">
          {Array.from({ length: Math.min(tile.shadowCubes, 4) }).map((_, i) => (
            <div
              key={i}
              className={`w-[6px] h-[6px] rounded-[1px] ${
                tile.shadowCubes >= 4 ? 'bg-red-500 animate-pulse' :
                tile.shadowCubes >= 3 ? 'bg-red-600' :
                'bg-gray-800'
              } border border-gray-600/40`}
            />
          ))}
        </div>
      )}

      {/* Stronghold pillar */}
      {tile.strongholdLayers > 0 && (
        <div className="absolute bottom-0 left-0.5 text-[8px] text-red-400/80 font-bold font-mono">
          L{tile.strongholdLayers}
        </div>
      )}

      {/* Prayer token */}
      {tile.prayerToken && (
        <div className="absolute bottom-0 right-0.5 text-[8px] text-amber-300">+</div>
      )}

      {/* Player and enemy tokens — centered */}
      <div className="absolute inset-0 flex items-center justify-center gap-px flex-wrap p-0.5">
        {playersOnTile.map((p) => {
          const idx = state.players.indexOf(p);
          const isActive = idx === state.currentPlayerIndex;
          return (
            <div
              key={p.id}
              className={`w-[14px] h-[14px] rounded-full flex items-center justify-center text-[6px] font-bold text-white shadow-sm ${
                isActive ? 'ring-1 ring-white/80' : ''
              }`}
              style={{ backgroundColor: CHARACTER_COLORS[p.characterId] }}
              title={CHARACTERS[p.characterId].name}
            >
              {CHARACTERS[p.characterId].name.charAt(4).toUpperCase()}
            </div>
          );
        })}

        {enemiesOnTile.map((e) => (
          <div
            key={e.id}
            className={`w-[14px] h-[14px] rounded flex items-center justify-center text-[7px] ${
              e.tier === 'Principality' ? 'bg-purple-700 text-white' :
              e.tier === 'Power' ? 'bg-orange-700 text-white' :
              'bg-gray-600 text-gray-200'
            }`}
            title={`${e.tier} (${e.hitsRemaining} HP)`}
          >
            {e.tier === 'Principality' ? 'P' : e.tier === 'Power' ? 'W' : 'w'}
          </div>
        ))}
      </div>

      {/* Valid move indicator */}
      {isValidTarget && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-3 h-3 rounded-full bg-green-400/30 border border-green-400/60 animate-pulse" />
        </div>
      )}

      {/* Tooltip */}
      {hovered && (
        <div className="absolute z-50 left-1/2 -translate-x-1/2 bottom-full mb-1 px-2 py-1 bg-slate-900/95 border border-slate-600/50 rounded text-[9px] text-slate-300 whitespace-nowrap pointer-events-none shadow-lg">
          {tooltipLines.map((line, i) => (
            <div key={i} className={i === 0 ? 'font-semibold text-slate-100' : ''}>{line}</div>
          ))}
        </div>
      )}
    </motion.div>
  );
}
