import { runSimulation } from './runner';
import type { SimulationConfig } from './runner';

self.onmessage = (e: MessageEvent<SimulationConfig>) => {
  try {
    const results = runSimulation({
      ...e.data,
      onProgress: (completed, total) => {
        if (completed % Math.max(1, Math.floor(total / 50)) === 0 || completed === total) {
          self.postMessage({ type: 'progress', completed, total });
        }
      },
    });
    self.postMessage({ type: 'done', results });
  } catch (err) {
    self.postMessage({ type: 'error', error: String(err) });
  }
};
