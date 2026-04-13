import { useState } from 'react';
import { useGameStore } from '../../store/gameStore';
import { CHARACTERS, DIFFICULTY_PRESETS } from '../../engine/constants';
import type { CharacterId, Difficulty, GameConfig } from '../../engine/types';

const ALL_CHARACTERS: CharacterId[] = ['pastor', 'apostle', 'evangelist', 'prophet', 'teacher'];

export function GameSetup() {
  const { newGame } = useGameStore();
  const [playerCount, setPlayerCount] = useState(3);
  const [selectedChars, setSelectedChars] = useState<CharacterId[]>(['pastor', 'apostle', 'evangelist']);
  const [difficulty, setDifficulty] = useState<Difficulty>('faithful');

  const toggleChar = (id: CharacterId) => {
    if (selectedChars.includes(id)) {
      if (selectedChars.length <= 2) return; // min 2
      setSelectedChars(selectedChars.filter((c) => c !== id));
      setPlayerCount(selectedChars.length - 1);
    } else {
      if (selectedChars.length >= 5) return; // max 5
      setSelectedChars([...selectedChars, id]);
      setPlayerCount(selectedChars.length + 1);
    }
  };

  const startGame = () => {
    const config: GameConfig = {
      playerCount,
      characterIds: selectedChars,
      difficulty,
      seed: Date.now(),
    };
    newGame(config);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-lg w-full space-y-6">
        {/* Title */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold text-amber-400" style={{ fontFamily: 'Georgia, serif' }}>
            Five Fold
          </h1>
          <p className="text-sm text-slate-400 italic" style={{ fontFamily: 'Georgia, serif' }}>
            "So Christ himself gave the apostles, the prophets, the evangelists, the pastors and teachers..."
          </p>
          <p className="text-xs text-slate-500">Ephesians 4:11-12</p>
        </div>

        {/* Character Selection */}
        <div className="space-y-2">
          <h2 className="text-sm text-slate-300 uppercase tracking-wider">Choose Characters ({selectedChars.length})</h2>
          <div className="grid grid-cols-1 gap-2">
            {ALL_CHARACTERS.map((id) => {
              const char = CHARACTERS[id];
              const selected = selectedChars.includes(id);
              return (
                <button
                  key={id}
                  onClick={() => toggleChar(id)}
                  className={`text-left p-3 rounded-lg border transition-all ${
                    selected
                      ? 'bg-slate-700/60 border-amber-500/50'
                      : 'bg-slate-800/40 border-slate-700/20 opacity-50 hover:opacity-80'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold"
                      style={{ backgroundColor: selected ? `var(--color-${id})` : '#374151' }}
                    >
                      {char.name[4]}
                    </div>
                    <div className="flex-1">
                      <div className="text-sm text-slate-200">{char.name}</div>
                      <div className="text-[10px] text-slate-400">{char.ministryTitle} — Faith {char.faithMax} — {char.difficulty}</div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Difficulty */}
        <div className="space-y-2">
          <h2 className="text-sm text-slate-300 uppercase tracking-wider">Difficulty</h2>
          <div className="grid grid-cols-2 gap-2">
            {DIFFICULTY_PRESETS.map((preset) => (
              <button
                key={preset.id}
                onClick={() => setDifficulty(preset.id)}
                className={`p-2 rounded-lg border text-left transition-all ${
                  difficulty === preset.id
                    ? 'bg-slate-700/60 border-amber-500/50'
                    : 'bg-slate-800/40 border-slate-700/20 hover:border-slate-600/40'
                }`}
              >
                <div className="text-sm text-slate-200">{preset.name}</div>
                <div className="text-[10px] text-slate-400">{preset.description}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Start Button */}
        <button
          onClick={startGame}
          className="w-full py-3 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-lg transition-colors text-lg"
        >
          Begin
        </button>
      </div>
    </div>
  );
}
