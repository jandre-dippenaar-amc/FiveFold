import { runSimulation } from './runner';
import type { SimulationConfig } from './runner';

// Single batch — the parent will spawn multiple workers for large runs
self.onmessage = (e: MessageEvent<SimulationConfig>) => {
  try {
    const results = runSimulation({
      ...e.data,
      onProgress: (completed, total) => {
        if (completed % Math.max(1, Math.floor(total / 20)) === 0 || completed === total) {
          self.postMessage({ type: 'progress', completed, total });
        }
      },
    });
    self.postMessage({ type: 'done', results });
  } catch (err) {
    self.postMessage({ type: 'error', error: String(err) });
  }
};
