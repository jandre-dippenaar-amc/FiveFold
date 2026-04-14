import { useState, useEffect } from 'react';
import { useGameStore } from '../../store/gameStore';
import { motion, AnimatePresence } from 'framer-motion';

interface TutorialStep {
  id: string;
  title: string;
  text: string;
  trigger: (state: any) => boolean;
  position?: 'center' | 'top' | 'bottom-left' | 'bottom-right';
}

const TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to Five Fold!',
    text: 'You are a team of ministry characters working together to cleanse the land of Darkness. Remove all 7 Strongholds and converge on Jerusalem to win. Watch the Darkness Meter — if it hits 8, you lose!',
    trigger: (state) => state.round === 1 && state.phase === 'Action' && state.currentPlayerIndex === 0,
    position: 'center',
  },
  {
    id: 'actions',
    title: 'Your Turn — 4 Actions',
    text: 'Each turn you get 4 actions. You can: Move (click a highlighted tile), Cleanse (remove Shadow Cubes), Battle (fight enemies), Pray (restore Faith), or Encourage (give Faith to adjacent ally). Scripture cards and Ministry abilities are FREE — use them aggressively!',
    trigger: (state) => state.round === 1 && state.phase === 'Action' && state.currentPlayerIndex === 0,
    position: 'bottom-left',
  },
  {
    id: 'movement',
    title: 'Moving',
    text: 'Click your character\'s tile to see valid moves (green highlights). Shadow tiles cost 1 Faith to enter. Broken Ground costs 2 actions. The Evangelist can move diagonally and gets free movement on Light tiles!',
    trigger: (state) => state.round === 1 && state.phase === 'Action',
    position: 'bottom-left',
  },
  {
    id: 'strongholds',
    title: 'Strongholds — Your Win Condition',
    text: 'The 7 Stronghold tiles (red, with "L3") require 3 Cleanse actions each to remove. Clear all 7, then get everyone to Jerusalem (gold center tile) in the same round to win!',
    trigger: (state) => state.round === 1,
    position: 'bottom-right',
  },
  {
    id: 'darkness',
    title: 'Darkness Phase',
    text: 'After all players act, Darkness cards are drawn equal to the Meter level. These add cubes, spawn enemies, and escalate the threat. The Prophet can reorder upcoming Darkness cards!',
    trigger: (state) => state.round === 2 && state.phase === 'Action' && state.currentPlayerIndex === 0,
    position: 'top',
  },
  {
    id: 'overflow',
    title: '⚠ Shadow Overflow',
    text: 'When a tile reaches 4 cubes, it overflows — spilling 1 cube to each neighbor and raising the Darkness Meter. If ANY tile hits 5 cubes, you INSTANTLY LOSE. Prioritize tiles with 3 cubes!',
    trigger: (state) => state.round === 2,
    position: 'center',
  },
  {
    id: 'enemies',
    title: 'Enemies',
    text: 'Wickedness (💀) adds cubes to its tile. Powers (🔥) chase players and drain Faith. Principalities (👑) spread darkness across their entire row AND column — kill them fast! 3 Principalities on board = instant loss.',
    trigger: (state) => state.enemies.length > 0 && state.round <= 5,
    position: 'bottom-right',
  },
  {
    id: 'armor',
    title: 'Armor of God',
    text: 'As you remove cubes, you unlock Armor pieces that help the whole team. Belt of Truth (5 cubes), Breastplate (12), Boots (20), Shield (30), Helmet (42), Sword (55). Defeating a Principality also unlocks the next piece!',
    trigger: (state) => state.armorUnlocked.length >= 1 && state.round <= 8,
    position: 'bottom-right',
  },
  {
    id: 'scripture',
    title: 'Scripture Cards',
    text: 'Scripture cards are FREE to play — no action cost! "By His Stripes" heals everyone to full. "Light of the World" clears all cubes nearby. "Resist the Devil" instantly removes an enemy. Don\'t hoard them!',
    trigger: (state) => state.round === 3 && state.phase === 'Action',
    position: 'bottom-left',
  },
];

export function TutorialOverlay() {
  const state = useGameStore((s) => s.state);
  const [shownSteps, setShownSteps] = useState<Set<string>>(new Set());
  const [currentStep, setCurrentStep] = useState<TutorialStep | null>(null);
  const [tutorialEnabled, setTutorialEnabled] = useState(true);

  useEffect(() => {
    if (!state || !tutorialEnabled) {
      setCurrentStep(null);
      return;
    }

    // Find the first unshown step whose trigger matches
    for (const step of TUTORIAL_STEPS) {
      if (!shownSteps.has(step.id) && step.trigger(state)) {
        setCurrentStep(step);
        return;
      }
    }
    setCurrentStep(null);
  }, [state?.round, state?.phase, state?.currentPlayerIndex, state?.enemies.length, state?.armorUnlocked.length, tutorialEnabled]);

  const dismiss = () => {
    if (currentStep) {
      setShownSteps((prev) => new Set([...prev, currentStep.id]));
      setCurrentStep(null);
    }
  };

  const dismissAll = () => {
    setTutorialEnabled(false);
    setCurrentStep(null);
  };

  if (!currentStep) return null;

  const positionClasses = {
    center: 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2',
    top: 'top-4 left-1/2 -translate-x-1/2',
    'bottom-left': 'bottom-4 left-4',
    'bottom-right': 'bottom-4 right-4',
  };

  return (
    <AnimatePresence>
      <motion.div
        className={`fixed z-40 ${positionClasses[currentStep.position || 'center']} max-w-sm`}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
      >
        <div className="bg-slate-900/95 border border-amber-500/30 rounded-xl p-4 shadow-2xl shadow-black/50 backdrop-blur-sm">
          <div className="flex items-start justify-between gap-2 mb-2">
            <h3 className="text-sm font-bold text-amber-400" style={{ fontFamily: 'Georgia, serif' }}>
              {currentStep.title}
            </h3>
            <button onClick={dismiss} className="text-slate-500 hover:text-slate-300 text-xs shrink-0">✕</button>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">{currentStep.text}</p>
          <div className="flex items-center justify-between mt-3">
            <button
              onClick={dismissAll}
              className="text-[10px] text-slate-500 hover:text-slate-400"
            >
              Skip all tips
            </button>
            <button
              onClick={dismiss}
              className="px-3 py-1 text-xs bg-amber-700/60 hover:bg-amber-600/60 rounded text-amber-200"
            >
              Got it
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
