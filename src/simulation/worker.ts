import { runSimulation } from './runner';
import type { SimulationConfig } from './runner';

const BATCH_SIZE = 50;

self.onmessage = (e: MessageEvent<SimulationConfig>) => {
  const config = e.data;
  const totalGames = config.games;
  let completed = 0;

  // Accumulate raw sums for lightweight aggregation
  let wins = 0, losses = 0;
  let sumRounds = 0, sumMeter = 0, sumStrongholds = 0, sumCubes = 0, sumEnemies = 0;
  let maxR = 0, minR = Infinity;
  const lossReasons: Record<string, number> = {};
  const armorCounts: Record<string, number> = {};
  const charFaithSum: Record<string, number> = {};
  const charFaithCount: Record<string, number> = {};
  const charElim: Record<string, number> = {};

  function runBatch() {
    const batchSize = Math.min(BATCH_SIZE, totalGames - completed);
    if (batchSize <= 0) {
      // Done — compute final results
      const n = completed;
      const armorUnlockRates: Record<string, number> = {};
      const armorNames: Record<string, string> = {
        beltOfTruth: 'Belt of Truth', breastplateOfRighteousness: 'Breastplate of Righteousness',
        gospelOfPeace: 'Gospel of Peace', shieldOfFaith: 'Shield of Faith',
        helmetOfSalvation: 'Helmet of Salvation', swordOfTheSpirit: 'Sword of the Spirit',
      };
      for (const [id, name] of Object.entries(armorNames)) {
        armorUnlockRates[name] = ((armorCounts[id] || 0) / n) * 100;
      }

      const characterStats: Record<string, any> = {};
      for (const cid of Object.keys(charFaithSum)) {
        characterStats[cid] = {
          avgFaithAtEnd: charFaithSum[cid] / (charFaithCount[cid] || 1),
          timesEliminated: charElim[cid] || 0,
          avgScriptureCardsPlayed: 0,
        };
      }

      self.postMessage({
        type: 'done',
        results: {
          gamesPlayed: n, wins, losses,
          winRate: (wins / n) * 100,
          avgRounds: sumRounds / n,
          medianRounds: Math.round(sumRounds / n),
          maxRounds: maxR,
          minRounds: minR === Infinity ? 0 : minR,
          lossReasons,
          avgDarknessMeterAtEnd: sumMeter / n,
          armorUnlockRates,
          avgStrongholdsCleansed: sumStrongholds / n,
          avgTotalCubesRemoved: sumCubes / n,
          avgEnemiesAtEnd: sumEnemies / n,
          characterStats,
        },
      });
      return;
    }

    try {
      const batchResults = runSimulation({
        ...config,
        games: batchSize,
        seed: (config.seed ?? Date.now()) + completed,
      });

      // Merge into running totals
      wins += batchResults.wins;
      losses += batchResults.losses;
      sumRounds += batchResults.avgRounds * batchSize;
      sumMeter += batchResults.avgDarknessMeterAtEnd * batchSize;
      sumStrongholds += batchResults.avgStrongholdsCleansed * batchSize;
      sumCubes += batchResults.avgTotalCubesRemoved * batchSize;
      sumEnemies += batchResults.avgEnemiesAtEnd * batchSize;
      if (batchResults.maxRounds > maxR) maxR = batchResults.maxRounds;
      if (batchResults.minRounds < minR) minR = batchResults.minRounds;

      for (const [reason, count] of Object.entries(batchResults.lossReasons)) {
        lossReasons[reason] = (lossReasons[reason] || 0) + count;
      }
      for (const [name, rate] of Object.entries(batchResults.armorUnlockRates)) {
        // Reverse-lookup ID from name
        const id = Object.entries({
          beltOfTruth: 'Belt of Truth', breastplateOfRighteousness: 'Breastplate of Righteousness',
          gospelOfPeace: 'Gospel of Peace', shieldOfFaith: 'Shield of Faith',
          helmetOfSalvation: 'Helmet of Salvation', swordOfTheSpirit: 'Sword of the Spirit',
        }).find(([, n]) => n === name)?.[0];
        if (id) armorCounts[id] = (armorCounts[id] || 0) + Math.round((rate / 100) * batchSize);
      }
      for (const [cid, stats] of Object.entries(batchResults.characterStats)) {
        charFaithSum[cid] = (charFaithSum[cid] || 0) + stats.avgFaithAtEnd * batchSize;
        charFaithCount[cid] = (charFaithCount[cid] || 0) + batchSize;
        charElim[cid] = (charElim[cid] || 0) + stats.timesEliminated;
      }

      completed += batchSize;
      self.postMessage({ type: 'progress', completed, total: totalGames });

      // Yield to the event loop so the worker can receive cancel messages
      // and the GC can clean up the batch's game states
      setTimeout(runBatch, 0);
    } catch (err) {
      self.postMessage({ type: 'error', error: String(err) });
    }
  }

  runBatch();
};
