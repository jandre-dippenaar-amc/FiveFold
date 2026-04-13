import type { PlayerState } from '../../engine/types';
import { CHARACTERS, CHARACTER_COLORS, SCRIPTURE_CARDS } from '../../engine/constants';
import { useGameStore } from '../../store/gameStore';
import { canCleanse, canPray, canBattle } from '../../engine/actions';
import { canUseMinistry } from '../../engine/characters';

export function CharacterPanel({ player, isActive }: { player: PlayerState; isActive: boolean }) {
  const { state, cleanse, pray, endTurn, useMinistry } = useGameStore();
  if (!state) return null;

  const charDef = CHARACTERS[player.characterId];
  const color = CHARACTER_COLORS[player.characterId];

  const canDoActions = isActive && state.phase === 'Action' && !player.isEliminated;

  return (
    <div
      className={`p-3 rounded-lg border transition-all ${
        isActive
          ? 'bg-slate-800/80 border-amber-500/50 shadow-lg'
          : 'bg-slate-800/30 border-slate-700/20 opacity-60'
      } ${player.isEliminated ? 'opacity-30' : ''}`}
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-2">
        <div
          className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white"
          style={{ backgroundColor: color }}
        >
          {charDef.name[4]}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold text-slate-200 truncate">{charDef.name}</div>
          <div className="text-[10px] text-slate-400">{charDef.ministryTitle}</div>
        </div>
      </div>

      {/* Faith dots */}
      <div className="flex gap-0.5 mb-2">
        {Array.from({ length: player.faithMax }).map((_, i) => (
          <div
            key={i}
            className={`w-3 h-3 rounded-full border transition-all ${
              i < player.faithCurrent
                ? 'bg-amber-400 border-amber-500'
                : 'bg-slate-700 border-slate-600'
            }`}
          />
        ))}
      </div>

      {/* Scripture hand */}
      {player.scriptureHand.length > 0 && (
        <div className="mb-2">
          <div className="text-[9px] text-slate-500 mb-0.5">Scripture Hand</div>
          <div className="flex flex-wrap gap-0.5">
            {player.scriptureHand.map((card) => {
              const def = SCRIPTURE_CARDS.find((d) => d.id === card.defId);
              const typeColor = def?.cardType === 'Cleansing' ? 'bg-emerald-800/50 text-emerald-300' :
                def?.cardType === 'Battle' ? 'bg-red-800/50 text-red-300' :
                def?.cardType === 'Healing' ? 'bg-amber-800/50 text-amber-300' :
                def?.cardType === 'Movement' ? 'bg-blue-800/50 text-blue-300' :
                def?.cardType === 'Unity' ? 'bg-purple-800/50 text-purple-300' :
                'bg-orange-800/50 text-orange-300';
              return (
                <button
                  key={card.instanceId}
                  className={`px-1.5 py-0.5 rounded text-[8px] font-medium ${typeColor} hover:opacity-80`}
                  title={def ? `${def.name}: ${def.effect}` : ''}
                  onClick={() => {
                    if (canDoActions) {
                      useGameStore.getState().playScripture(card.instanceId);
                    }
                  }}
                >
                  {def?.name.substring(0, 12) || '?'}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Action buttons */}
      {canDoActions && (
        <div className="flex flex-wrap gap-1">
          {canCleanse(state, player.id).valid && (
            <button onClick={cleanse} className="px-2 py-0.5 text-[10px] bg-emerald-700/60 hover:bg-emerald-600/60 rounded text-emerald-200">
              Cleanse
            </button>
          )}
          {canPray(state, player.id).valid && (
            <button onClick={pray} className="px-2 py-0.5 text-[10px] bg-amber-700/60 hover:bg-amber-600/60 rounded text-amber-200">
              Pray
            </button>
          )}
          {canUseMinistry(state, player.id).valid && (
            <button onClick={() => useMinistry()} className="px-2 py-0.5 text-[10px] bg-blue-700/60 hover:bg-blue-600/60 rounded text-blue-200">
              {charDef.ministryAbility.name}
            </button>
          )}
          {state.enemies.some((e) => e.position.row === player.position.row && e.position.col === player.position.col) && (
            <button
              onClick={() => {
                const enemy = state.enemies.find((e) => e.position.row === player.position.row && e.position.col === player.position.col);
                if (enemy && canBattle(state, player.id, enemy.id).valid) {
                  useGameStore.getState().battle(enemy.id);
                }
              }}
              className="px-2 py-0.5 text-[10px] bg-red-700/60 hover:bg-red-600/60 rounded text-red-200"
            >
              Battle
            </button>
          )}
          <button onClick={endTurn} className="px-2 py-0.5 text-[10px] bg-slate-600/60 hover:bg-slate-500/60 rounded text-slate-300 ml-auto">
            End Turn
          </button>
        </div>
      )}
    </div>
  );
}
