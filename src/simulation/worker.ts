import { runSimulation } from './runner';
import type { SimulationConfig } from './runner';
import { StatsCollector } from './stats';

const BATCH_SIZE = 200;

self.onmessage = (e: MessageEvent<SimulationConfig>) => {
  const config = e.data;
  const totalGames = config.games;
  const collector = new StatsCollector();
  let completed = 0;

  try {
    // Run in batches to keep memory bounded
    while (completed < totalGames) {
      const batchSize = Math.min(BATCH_SIZE, totalGames - completed);

      const batchResults = runSimulation({
        ...config,
        games: batchSize,
        seed: (config.seed ?? Date.now()) + completed,
        onProgress: (batchCompleted) => {
          const total = completed + batchCompleted;
          if (total % Math.max(1, Math.floor(totalGames / 100)) === 0 || total === totalGames) {
            self.postMessage({ type: 'progress', completed: total, total: totalGames });
          }
        },
      });

      // Merge batch results into the collector
      collector.mergeBatchResults(batchResults, batchSize);
      completed += batchSize;

      // Post progress after each batch
      self.postMessage({ type: 'progress', completed, total: totalGames });
    }

    self.postMessage({ type: 'done', results: collector.getResults() });
  } catch (err) {
    self.postMessage({ type: 'error', error: String(err) });
  }
};
