import { useState } from 'react';
import { useGameStore } from '../../store/gameStore';
import { CHARACTERS, CHARACTER_COLORS, DIFFICULTY_PRESETS } from '../../engine/constants';
import type { CharacterId, Difficulty, GameConfig } from '../../engine/types';
import { motion, AnimatePresence } from 'framer-motion';

const ALL_CHARACTERS: CharacterId[] = ['pastor', 'apostle', 'evangelist', 'prophet', 'teacher'];

export function GameSetup() {
  const { newGame } = useGameStore();
  const [selectedChars, setSelectedChars] = useState<CharacterId[]>(['pastor', 'evangelist', 'apostle']);
  const [difficulty, setDifficulty] = useState<Difficulty>('faithful');
  const [hoveredChar, setHoveredChar] = useState<CharacterId | null>(null);

  const toggleChar = (id: CharacterId) => {
    if (selectedChars.includes(id)) {
      if (selectedChars.length <= 2) return;
      setSelectedChars(selectedChars.filter((c) => c !== id));
    } else {
      if (selectedChars.length >= 5) return;
      setSelectedChars([...selectedChars, id]);
    }
  };

  const startGame = () => {
    const config: GameConfig = {
      playerCount: selectedChars.length,
      characterIds: selectedChars,
      difficulty,
      seed: Date.now(),
    };
    newGame(config);
  };

  const previewChar = hoveredChar ? CHARACTERS[hoveredChar] : null;

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-[#0a0a0f]">
      <div className="max-w-2xl w-full space-y-8">
        {/* Title */}
        <motion.div
          className="text-center space-y-3"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <h1 className="text-5xl font-bold text-amber-400 tracking-wide" style={{ fontFamily: 'Georgia, serif' }}>
            Five Fold
          </h1>
          <p className="text-sm text-slate-400 italic max-w-md mx-auto leading-relaxed" style={{ fontFamily: 'Georgia, serif' }}>
            "So Christ himself gave the apostles, the prophets, the evangelists, the pastors and teachers,
            to equip his people for works of service."
          </p>
          <p className="text-xs text-amber-600/60">Ephesians 4:11-12</p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Left: Character Selection */}
          <motion.div
            className="space-y-3"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
          >
            <h2 className="text-xs text-slate-400 uppercase tracking-widest font-semibold">
              Choose Characters <span className="text-amber-400">({selectedChars.length}/5)</span>
            </h2>
            <div className="space-y-2">
              {ALL_CHARACTERS.map((id) => {
                const char = CHARACTERS[id];
                const selected = selectedChars.includes(id);
                const color = CHARACTER_COLORS[id];
                return (
                  <motion.button
                    key={id}
                    onClick={() => toggleChar(id)}
                    onMouseEnter={() => setHoveredChar(id)}
                    onMouseLeave={() => setHoveredChar(null)}
                    className={`w-full text-left p-3 rounded-lg border transition-all ${
                      selected
                        ? 'bg-slate-800/70 border-slate-500/40'
                        : 'bg-slate-900/40 border-slate-700/20 opacity-40 hover:opacity-70'
                    }`}
                    whileHover={{ x: 4 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0 transition-all"
                        style={{ backgroundColor: selected ? color : '#1e293b', borderColor: color, borderWidth: '2px', borderStyle: 'solid' }}
                      >
                        {char.name.charAt(4).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm text-slate-200 font-medium">{char.name}</div>
                        <div className="text-[10px] text-slate-500 truncate">
                          {char.ministryTitle} — Faith {char.faithMax} — {char.difficulty}
                        </div>
                      </div>
                      {selected && <div className="ml-auto text-amber-400 text-xs">✓</div>}
                    </div>
                  </motion.button>
                );
              })}
            </div>
          </motion.div>

          {/* Right: Character preview + Difficulty */}
          <motion.div
            className="space-y-4"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: 0.3 }}
          >
            {/* Character preview */}
            <div className="bg-slate-800/40 rounded-lg border border-slate-700/20 p-4 min-h-[180px]">
              <AnimatePresence mode="wait">
                {previewChar ? (
                  <motion.div
                    key={previewChar.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    className="space-y-2"
                  >
                    <div className="text-sm font-semibold" style={{ color: CHARACTER_COLORS[previewChar.id] }}>
                      {previewChar.name} — {previewChar.ministryTitle}
                    </div>
                    <p className="text-[11px] text-slate-400 leading-relaxed">{previewChar.roleSummary}</p>
                    <div className="space-y-1 text-[10px]">
                      <div><span className="text-blue-400">Ministry:</span> <span className="text-slate-300">{previewChar.ministryAbility.name}</span> — {previewChar.ministryAbility.description}</div>
                      <div><span className="text-purple-400">Passive:</span> <span className="text-slate-300">{previewChar.passive.name}</span> — {previewChar.passive.description}</div>
                      <div><span className="text-amber-400">Anointing:</span> <span className="text-slate-300">{previewChar.anointing.name}</span> — {previewChar.anointing.description}</div>
                    </div>
                    <div className="text-[9px] text-slate-500 italic">{previewChar.scriptureReference}</div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="empty"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex items-center justify-center h-full text-slate-600 text-sm"
                  >
                    Hover a character to see details
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Difficulty */}
            <div className="space-y-2">
              <h2 className="text-xs text-slate-400 uppercase tracking-widest font-semibold">Difficulty</h2>
              <div className="grid grid-cols-2 gap-2">
                {DIFFICULTY_PRESETS.map((preset) => {
                  const colors = {
                    seeker: 'border-green-600/40 bg-green-950/20',
                    faithful: 'border-blue-600/40 bg-blue-950/20',
                    tested: 'border-orange-600/40 bg-orange-950/20',
                    refinedByFire: 'border-red-600/40 bg-red-950/20',
                  };
                  return (
                    <button
                      key={preset.id}
                      onClick={() => setDifficulty(preset.id)}
                      className={`p-2.5 rounded-lg border text-left transition-all ${
                        difficulty === preset.id
                          ? `${colors[preset.id]} ring-1 ring-slate-400/30`
                          : 'bg-slate-900/30 border-slate-700/20 opacity-50 hover:opacity-80'
                      }`}
                    >
                      <div className="text-xs text-slate-200 font-medium">{preset.name}</div>
                      <div className="text-[9px] text-slate-500 mt-0.5">{preset.description}</div>
                    </button>
                  );
                })}
              </div>
            </div>
          </motion.div>
        </div>

        {/* Start Button */}
        <motion.button
          onClick={startGame}
          className="w-full py-3.5 bg-gradient-to-r from-amber-700 to-amber-600 hover:from-amber-600 hover:to-amber-500 text-white font-bold rounded-xl transition-all text-lg shadow-lg shadow-amber-900/30"
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.98 }}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          Begin ({selectedChars.length} Players)
        </motion.button>
      </div>
    </div>
  );
}
