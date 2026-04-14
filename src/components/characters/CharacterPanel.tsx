import { useState } from 'react';
import type { PlayerState } from '../../engine/types';
import { CHARACTERS, CHARACTER_COLORS, SCRIPTURE_CARDS } from '../../engine/constants';
import { useGameStore } from '../../store/gameStore';
import { canCleanse, canPray, canBattle, canEncourage } from '../../engine/actions';
import { canUseMinistry } from '../../engine/characters';
import { getAlivePlayers } from '../../engine/state';
import { coordEqual } from '../../utils/grid';
import { motion, AnimatePresence } from 'framer-motion';

export function CharacterPanel({ player, isActive }: { player: PlayerState; isActive: boolean }) {
  const state = useGameStore((s) => s.state);
  const [showCardDetail, setShowCardDetail] = useState<string | null>(null);
  const [showEncouragePicker, setShowEncouragePicker] = useState(false);

  if (!state) return null;

  const charDef = CHARACTERS[player.characterId];
  const color = CHARACTER_COLORS[player.characterId];
  const canDoActions = isActive && state.phase === 'Action' && !player.isEliminated;

  // Find encourageable players
  const encourageTargets = canDoActions
    ? getAlivePlayers(state).filter(
        (p) => p.id !== player.id && canEncourage(state, player.id, p.id).valid
      )
    : [];

  return (
    <div
      className={`p-3 rounded-lg border transition-all min-w-[200px] lg:min-w-0 ${
        isActive
          ? 'bg-slate-800/80 border-slate-500/40 shadow-lg'
          : 'bg-slate-800/30 border-slate-700/20 opacity-50'
      } ${player.isEliminated ? 'opacity-20' : ''}`}
      style={isActive ? { borderColor: `${color}40` } : undefined}
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-2">
        <div
          className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
          style={{ backgroundColor: color }}
        >
          {charDef.name.charAt(4).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold text-slate-200 truncate">{charDef.name}</div>
          <div className="text-[9px] text-slate-400">{charDef.ministryTitle}</div>
        </div>
        {isActive && (
          <div className="text-[10px] text-amber-400 font-mono shrink-0">{state.actionsRemaining}A</div>
        )}
      </div>

      {/* Faith dots */}
      <div className="flex gap-0.5 mb-2 flex-wrap">
        {Array.from({ length: player.faithMax }).map((_, i) => (
          <motion.div
            key={i}
            className={`w-2.5 h-2.5 rounded-full border transition-all ${
              i < player.faithCurrent
                ? 'bg-amber-400 border-amber-500'
                : 'bg-slate-700 border-slate-600'
            }`}
            animate={i === player.faithCurrent - 1 ? { scale: [1, 1.3, 1] } : {}}
            transition={{ duration: 0.3 }}
          />
        ))}
      </div>

      {/* Scripture hand */}
      {player.scriptureHand.length > 0 && (
        <div className="mb-2">
          <div className="text-[8px] text-slate-500 mb-0.5 uppercase tracking-wider">Scripture ({player.scriptureHand.length})</div>
          <div className="flex flex-wrap gap-0.5">
            {player.scriptureHand.map((card) => {
              const def = SCRIPTURE_CARDS.find((d) => d.id === card.defId);
              if (!def) return null;
              const typeColors: Record<string, string> = {
                Cleansing: 'bg-emerald-800/50 text-emerald-300 hover:bg-emerald-700/60',
                Battle: 'bg-red-800/50 text-red-300 hover:bg-red-700/60',
                Healing: 'bg-amber-800/50 text-amber-300 hover:bg-amber-700/60',
                Movement: 'bg-blue-800/50 text-blue-300 hover:bg-blue-700/60',
                Unity: 'bg-purple-800/50 text-purple-300 hover:bg-purple-700/60',
                Disruption: 'bg-orange-800/50 text-orange-300 hover:bg-orange-700/60',
              };
              return (
                <button
                  key={card.instanceId}
                  className={`px-1.5 py-0.5 rounded text-[8px] font-medium transition-all ${
                    typeColors[def.cardType] || 'bg-slate-700 text-slate-300'
                  } ${!canDoActions ? 'cursor-default' : 'cursor-pointer'}`}
                  title={`${def.name} (${def.cardType}): ${def.effect}`}
                  onClick={() => {
                    if (canDoActions) {
                      if (showCardDetail === card.instanceId) {
                        // Play the card
                        useGameStore.getState().playScripture(card.instanceId);
                        setShowCardDetail(null);
                      } else {
                        setShowCardDetail(card.instanceId);
                      }
                    }
                  }}
                >
                  {def.name.length > 14 ? def.name.substring(0, 12) + '..' : def.name}
                </button>
              );
            })}
          </div>

          {/* Card detail popup */}
          <AnimatePresence>
            {showCardDetail && canDoActions && (
              <motion.div
                className="mt-1 p-2 bg-slate-700/80 rounded-lg border border-slate-600/30 text-[10px]"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
              >
                {(() => {
                  const card = player.scriptureHand.find((c) => c.instanceId === showCardDetail);
                  const def = card ? SCRIPTURE_CARDS.find((d) => d.id === card.defId) : null;
                  if (!def) return null;
                  return (
                    <>
                      <div className="font-bold text-slate-200">{def.name}</div>
                      <div className="text-slate-500 italic text-[9px]">{def.scriptureReference}</div>
                      <div className="text-slate-300 mt-1">{def.effect}</div>
                      <div className="flex gap-2 mt-2">
                        <button
                          onClick={() => {
                            useGameStore.getState().playScripture(showCardDetail);
                            setShowCardDetail(null);
                          }}
                          className="px-2 py-0.5 bg-amber-700/60 hover:bg-amber-600/60 rounded text-amber-200 text-[9px]"
                        >
                          Play Card (Free)
                        </button>
                        <button
                          onClick={() => setShowCardDetail(null)}
                          className="px-2 py-0.5 bg-slate-600/60 rounded text-slate-400 text-[9px]"
                        >
                          Cancel
                        </button>
                      </div>
                    </>
                  );
                })()}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Action buttons */}
      {canDoActions && (
        <div className="flex flex-wrap gap-1">
          {canCleanse(state, player.id).valid && (
            <ActionBtn onClick={() => useGameStore.getState().cleanse()} color="emerald" label="Cleanse" />
          )}
          {state.enemies.some((e) => coordEqual(e.position, player.position)) && (() => {
            const enemy = state.enemies.find((e) => coordEqual(e.position, player.position));
            return enemy && canBattle(state, player.id, enemy.id).valid ? (
              <ActionBtn onClick={() => useGameStore.getState().battle(enemy.id)} color="red" label={`Battle ${enemy.tier}`} />
            ) : null;
          })()}
          {canPray(state, player.id).valid && (
            <ActionBtn onClick={() => useGameStore.getState().pray()} color="amber" label="Pray" />
          )}
          {encourageTargets.length > 0 && (
            <div className="relative">
              <ActionBtn onClick={() => setShowEncouragePicker(!showEncouragePicker)} color="pink" label="Encourage" />
              <AnimatePresence>
                {showEncouragePicker && (
                  <motion.div
                    className="absolute bottom-full mb-1 left-0 bg-slate-800 border border-slate-600/30 rounded-lg p-1 space-y-0.5 z-20"
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 5 }}
                  >
                    {encourageTargets.map((target) => (
                      <button
                        key={target.id}
                        onClick={() => {
                          useGameStore.getState().encourage(target.id);
                          setShowEncouragePicker(false);
                        }}
                        className="block w-full px-2 py-0.5 text-[9px] text-left text-slate-300 hover:bg-slate-700 rounded"
                      >
                        {CHARACTERS[target.characterId].name} (Faith: {target.faithCurrent})
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
          {canUseMinistry(state, player.id).valid && (
            <ActionBtn onClick={() => useGameStore.getState().useMinistry()} color="blue" label={charDef.ministryAbility.name} />
          )}
          <ActionBtn onClick={() => useGameStore.getState().endTurn()} color="slate" label="End Turn" className="ml-auto" />
        </div>
      )}
    </div>
  );
}

function ActionBtn({ onClick, color, label, className = '' }: { onClick: () => void; color: string; label: string; className?: string }) {
  const colorMap: Record<string, string> = {
    emerald: 'bg-emerald-700/60 hover:bg-emerald-600/60 text-emerald-200',
    red: 'bg-red-700/60 hover:bg-red-600/60 text-red-200',
    amber: 'bg-amber-700/60 hover:bg-amber-600/60 text-amber-200',
    blue: 'bg-blue-700/60 hover:bg-blue-600/60 text-blue-200',
    pink: 'bg-pink-700/60 hover:bg-pink-600/60 text-pink-200',
    slate: 'bg-slate-600/60 hover:bg-slate-500/60 text-slate-300',
  };
  return (
    <button
      onClick={onClick}
      className={`px-2 py-0.5 text-[10px] rounded transition-all ${colorMap[color] || colorMap.slate} ${className}`}
    >
      {label}
    </button>
  );
}
