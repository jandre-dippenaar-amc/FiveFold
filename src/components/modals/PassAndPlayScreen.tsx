import { useGameStore } from '../../store/gameStore';
import { CHARACTERS, CHARACTER_COLORS } from '../../engine/constants';
import { motion } from 'framer-motion';

interface Props {
  onReady: () => void;
}

export function PassAndPlayScreen({ onReady }: Props) {
  const state = useGameStore((s) => s.state);
  if (!state || state.phase !== 'Action') return null;

  const player = state.players[state.currentPlayerIndex];
  if (!player || player.isEliminated) return null;

  const charDef = CHARACTERS[player.characterId];
  const color = CHARACTER_COLORS[player.characterId];

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#0a0a0f]/95 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="text-center space-y-6 max-w-md"
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        transition={{ type: 'spring', duration: 0.4 }}
      >
        <div
          className="w-20 h-20 rounded-full mx-auto flex items-center justify-center text-3xl font-bold text-white"
          style={{ backgroundColor: color, boxShadow: `0 0 40px ${color}40` }}
        >
          {charDef.name.charAt(4).toUpperCase()}
        </div>

        <div>
          <h2 className="text-2xl font-bold text-slate-100" style={{ fontFamily: 'Georgia, serif' }}>
            {charDef.name}
          </h2>
          <p className="text-sm text-slate-400 mt-1">{charDef.ministryTitle}</p>
        </div>

        <div className="text-sm text-slate-500">
          Round {state.round} — {state.actionsRemaining} Actions
        </div>

        <p className="text-xs text-slate-400 max-w-sm mx-auto">
          Pass the device to the {charDef.name.toLowerCase().replace('the ', '')} player.
        </p>

        <motion.button
          onClick={onReady}
          className="px-8 py-3 rounded-xl font-bold text-white transition-all text-lg"
          style={{ backgroundColor: color }}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
        >
          I'm Ready
        </motion.button>
      </motion.div>
    </motion.div>
  );
}
