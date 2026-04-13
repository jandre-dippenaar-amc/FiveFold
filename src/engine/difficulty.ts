import type { Difficulty } from './types';
import { DIFFICULTY_PRESETS } from './constants';

/** Get the difficulty preset by ID. */
export function getDifficultyPreset(difficulty: Difficulty) {
  const preset = DIFFICULTY_PRESETS.find((d) => d.id === difficulty);
  if (!preset) throw new Error(`Unknown difficulty: ${difficulty}`);
  return preset;
}
