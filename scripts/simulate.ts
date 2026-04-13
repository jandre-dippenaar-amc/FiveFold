import { runSimulation, formatResults } from '../src/simulation/index';
import type { SimulationConfig } from '../src/simulation/index';
import type { Difficulty } from '../src/engine/types';
import type { StrategyId } from '../src/simulation/strategies';

// Parse CLI args
const args = process.argv.slice(2);
function getArg(name: string, defaultVal: string): string {
  const idx = args.indexOf(`--${name}`);
  return idx >= 0 && args[idx + 1] ? args[idx + 1] : defaultVal;
}

const games = parseInt(getArg('games', '100'), 10);
const players = parseInt(getArg('players', '5'), 10);
const difficulty = getArg('difficulty', 'faithful') as Difficulty;
const strategy = getArg('strategy', 'balanced') as StrategyId;
const seed = parseInt(getArg('seed', String(Date.now())), 10);

console.log(`\nFive Fold Simulation`);
console.log(`Games: ${games} | Players: ${players} | Difficulty: ${difficulty} | Strategy: ${strategy} | Seed: ${seed}\n`);

const startTime = Date.now();

const config: SimulationConfig = {
  games,
  playerCount: players,
  difficulty,
  strategy,
  seed,
  onProgress: (completed, total) => {
    if (completed % Math.max(1, Math.floor(total / 20)) === 0 || completed === total) {
      const pct = ((completed / total) * 100).toFixed(0);
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      process.stdout.write(`\r  Progress: ${completed}/${total} (${pct}%) — ${elapsed}s`);
    }
  },
};

const results = runSimulation(config);
const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

console.log(`\n\n`);
console.log(formatResults(results));
console.log(`\nCompleted in ${elapsed}s (${(games / parseFloat(elapsed)).toFixed(0)} games/sec)`);
