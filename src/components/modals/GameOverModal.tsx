import { useGameStore } from '../../store/gameStore';
import { motion, AnimatePresence } from 'framer-motion';

export function GameOverModal() {
  const state = useGameStore((s) => s.state);
  if (!state || state.status === 'playing' || state.status === 'setup') return null;

  const isWin = state.status === 'won';

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <motion.div
          className={`max-w-md w-full mx-4 p-8 rounded-2xl text-center ${
            isWin ? 'bg-gradient-to-b from-amber-900/80 to-slate-900/90' : 'bg-gradient-to-b from-red-950/80 to-slate-900/90'
          } border ${isWin ? 'border-amber-500/30' : 'border-red-800/30'}`}
          initial={{ scale: 0.8, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          transition={{ type: 'spring', duration: 0.5 }}
        >
          {isWin ? (
            <>
              <div className="text-5xl mb-4">✦</div>
              <h2 className="text-3xl font-bold text-amber-400 mb-3" style={{ fontFamily: 'Georgia, serif' }}>
                Victory!
              </h2>
              <p className="text-sm text-amber-200/80 italic mb-4" style={{ fontFamily: 'Georgia, serif' }}>
                "...until we all reach unity in the faith and in the knowledge of the Son of God
                and become mature, attaining to the whole measure of the fullness of Christ."
              </p>
              <p className="text-xs text-amber-400/60 mb-6">— Ephesians 4:13</p>
            </>
          ) : (
            <>
              <div className="text-5xl mb-4">✝</div>
              <h2 className="text-3xl font-bold text-red-400 mb-3" style={{ fontFamily: 'Georgia, serif' }}>
                Defeated
              </h2>
              <p className="text-sm text-red-200/60 mb-4">{state.lossReason}</p>
            </>
          )}

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3 mb-6 text-center">
            <div>
              <div className="text-xl font-bold text-slate-200">{state.round}</div>
              <div className="text-[10px] text-slate-400">Rounds</div>
            </div>
            <div>
              <div className="text-xl font-bold text-slate-200">{state.totalCubesRemoved}</div>
              <div className="text-[10px] text-slate-400">Cubes Removed</div>
            </div>
            <div>
              <div className="text-xl font-bold text-slate-200">{state.armorUnlocked.length}/6</div>
              <div className="text-[10px] text-slate-400">Armor</div>
            </div>
          </div>

          <button
            onClick={() => useGameStore.setState({ state: null })}
            className={`px-6 py-2 rounded-lg font-bold ${
              isWin ? 'bg-amber-600 hover:bg-amber-500 text-white' : 'bg-red-800 hover:bg-red-700 text-red-100'
            }`}
          >
            Play Again
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
