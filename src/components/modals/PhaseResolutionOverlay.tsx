import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface Props {
  events: string[];
  phase: string;
  onDone: () => void;
}

export function PhaseResolutionOverlay({ events, phase, onDone }: Props) {
  const [visibleCount, setVisibleCount] = useState(0);

  useEffect(() => {
    if (visibleCount < events.length) {
      const timer = setTimeout(() => setVisibleCount((c) => c + 1), 400);
      return () => clearTimeout(timer);
    }
  }, [visibleCount, events.length]);

  const allShown = visibleCount >= events.length;

  const phaseColors: Record<string, string> = {
    Darkness: 'text-purple-400 border-purple-500/30',
    Enemy: 'text-red-400 border-red-500/30',
    Check: 'text-amber-400 border-amber-500/30',
  };

  return (
    <motion.div
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className={`max-w-md w-full mx-4 p-6 rounded-xl bg-slate-900/95 border ${phaseColors[phase] || 'border-slate-600/30'}`}
        initial={{ scale: 0.9 }}
        animate={{ scale: 1 }}
      >
        <h3 className={`text-lg font-bold mb-4 ${phaseColors[phase]?.split(' ')[0] || 'text-slate-300'}`}
          style={{ fontFamily: 'Georgia, serif' }}>
          {phase} Phase
        </h3>

        <div className="space-y-1.5 max-h-60 overflow-y-auto mb-4">
          <AnimatePresence>
            {events.slice(0, visibleCount).map((event, i) => (
              <motion.div
                key={i}
                className={`text-xs px-2 py-1 rounded ${
                  event.includes('Darkness Card:') ? 'bg-purple-900/30 text-purple-300' :
                  event.includes('defeated') || event.includes('Armor') ? 'bg-emerald-900/30 text-emerald-300' :
                  event.includes('Overflow') || event.includes('loses') ? 'bg-red-900/30 text-red-300' :
                  'bg-slate-800/40 text-slate-400'
                }`}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.2 }}
              >
                {event}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        <button
          onClick={onDone}
          className={`w-full py-2 rounded-lg font-medium transition-all ${
            allShown
              ? 'bg-slate-700 hover:bg-slate-600 text-slate-200'
              : 'bg-slate-800 text-slate-500'
          }`}
        >
          {allShown ? 'Continue' : `Resolving... (${visibleCount}/${events.length})`}
        </button>
      </motion.div>
    </motion.div>
  );
}
