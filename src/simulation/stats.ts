import type { GameState } from '../engine/types';
import { TOTAL_STRONGHOLDS, ARMOR_PIECES } from '../engine/constants';

export interface SimulationResults {
  gamesPlayed: number;
  wins: number;
  losses: number;
  winRate: number;
  avgRounds: number;
  medianRounds: number;
  maxRounds: number;
  minRounds: number;
  lossReasons: Record<string, number>;
  avgDarknessMeterAtEnd: number;
  armorUnlockRates: Record<string, number>;
  avgStrongholdsCleansed: number;
  avgTotalCubesRemoved: number;
  avgEnemiesAtEnd: number;
  characterStats: Record<string, {
    avgFaithAtEnd: number;
    timesEliminated: number;
    avgScriptureCardsPlayed: number;
  }>;
}

export function createEmptyResults(): SimulationResults {
  return {
    gamesPlayed: 0, wins: 0, losses: 0, winRate: 0,
    avgRounds: 0, medianRounds: 0, maxRounds: 0, minRounds: 0,
    lossReasons: {}, avgDarknessMeterAtEnd: 0, armorUnlockRates: {},
    avgStrongholdsCleansed: 0, avgTotalCubesRemoved: 0, avgEnemiesAtEnd: 0,
    characterStats: {},
  };
}

/**
 * Lightweight stats collector using running sums instead of per-game arrays.
 * Only keeps a small sample of round values for the median.
 */
export class StatsCollector {
  private count = 0;
  private wins = 0;
  private losses = 0;
  private sumRounds = 0;
  private sumMeter = 0;
  private sumStrongholds = 0;
  private sumCubesRemoved = 0;
  private sumEnemies = 0;
  private maxRounds = 0;
  private minRounds = Infinity;
  private lossReasons: Record<string, number> = {};
  private armorCounts: Record<string, number> = {};
  private charFaithSum: Record<string, number> = {};
  private charFaithCount: Record<string, number> = {};
  private charEliminated: Record<string, number> = {};
  // Keep a reservoir sample of round values for median (max 500 samples)
  private roundSamples: number[] = [];

  record(finalState: GameState): void {
    this.count++;
    this.sumRounds += finalState.round;
    this.sumMeter += finalState.darknessMeter;
    this.sumStrongholds += TOTAL_STRONGHOLDS - finalState.strongholdsRemaining;
    this.sumCubesRemoved += finalState.totalCubesRemoved;
    this.sumEnemies += finalState.enemies.length;

    if (finalState.round > this.maxRounds) this.maxRounds = finalState.round;
    if (finalState.round < this.minRounds) this.minRounds = finalState.round;

    // Reservoir sampling for median
    if (this.roundSamples.length < 500) {
      this.roundSamples.push(finalState.round);
    } else {
      const j = Math.floor(Math.random() * this.count);
      if (j < 500) this.roundSamples[j] = finalState.round;
    }

    if (finalState.status === 'won') {
      this.wins++;
    } else {
      this.losses++;
      const reason = finalState.lossReason || 'Unknown';
      this.lossReasons[reason] = (this.lossReasons[reason] || 0) + 1;
    }

    for (const armorId of finalState.armorUnlocked) {
      this.armorCounts[armorId] = (this.armorCounts[armorId] || 0) + 1;
    }

    for (const player of finalState.players) {
      const cid = player.characterId;
      this.charFaithSum[cid] = (this.charFaithSum[cid] || 0) + player.faithCurrent;
      this.charFaithCount[cid] = (this.charFaithCount[cid] || 0) + 1;
      if (player.isEliminated) {
        this.charEliminated[cid] = (this.charEliminated[cid] || 0) + 1;
      }
    }
  }

  /** Merge pre-computed batch results (for worker batching). */
  mergeBatchResults(results: SimulationResults, batchSize: number): void {
    this.count += batchSize;
    this.wins += results.wins;
    this.losses += results.losses;
    this.sumRounds += results.avgRounds * batchSize;
    this.sumMeter += results.avgDarknessMeterAtEnd * batchSize;
    this.sumStrongholds += results.avgStrongholdsCleansed * batchSize;
    this.sumCubesRemoved += results.avgTotalCubesRemoved * batchSize;
    this.sumEnemies += results.avgEnemiesAtEnd * batchSize;
    if (results.maxRounds > this.maxRounds) this.maxRounds = results.maxRounds;
    if (results.minRounds < this.minRounds) this.minRounds = results.minRounds;

    for (const [reason, count] of Object.entries(results.lossReasons)) {
      this.lossReasons[reason] = (this.lossReasons[reason] || 0) + count;
    }
    // Armor rates are percentages — convert back to counts
    for (const piece of ARMOR_PIECES) {
      const rate = results.armorUnlockRates[piece.name] || 0;
      const count = Math.round((rate / 100) * batchSize);
      this.armorCounts[piece.id] = (this.armorCounts[piece.id] || 0) + count;
    }
    for (const [cid, stats] of Object.entries(results.characterStats)) {
      const n = batchSize; // approximate
      this.charFaithSum[cid] = (this.charFaithSum[cid] || 0) + stats.avgFaithAtEnd * n;
      this.charFaithCount[cid] = (this.charFaithCount[cid] || 0) + n;
      this.charEliminated[cid] = (this.charEliminated[cid] || 0) + stats.timesEliminated;
    }
    // Use the batch median as a sample
    if (this.roundSamples.length < 500) {
      this.roundSamples.push(results.medianRounds);
    }
  }

  getResults(): SimulationResults {
    const n = this.count;
    if (n === 0) return createEmptyResults();

    const sorted = [...this.roundSamples].sort((a, b) => a - b);

    const armorUnlockRates: Record<string, number> = {};
    for (const piece of ARMOR_PIECES) {
      armorUnlockRates[piece.name] = ((this.armorCounts[piece.id] || 0) / n) * 100;
    }

    const characterStats: Record<string, any> = {};
    for (const cid of Object.keys(this.charFaithSum)) {
      const cnt = this.charFaithCount[cid] || 1;
      characterStats[cid] = {
        avgFaithAtEnd: this.charFaithSum[cid] / cnt,
        timesEliminated: this.charEliminated[cid] || 0,
        avgScriptureCardsPlayed: 0,
      };
    }

    return {
      gamesPlayed: n,
      wins: this.wins,
      losses: this.losses,
      winRate: (this.wins / n) * 100,
      avgRounds: this.sumRounds / n,
      medianRounds: sorted.length > 0 ? sorted[Math.floor(sorted.length / 2)] : 0,
      maxRounds: this.maxRounds,
      minRounds: this.minRounds === Infinity ? 0 : this.minRounds,
      lossReasons: this.lossReasons,
      avgDarknessMeterAtEnd: this.sumMeter / n,
      armorUnlockRates,
      avgStrongholdsCleansed: this.sumStrongholds / n,
      avgTotalCubesRemoved: this.sumCubesRemoved / n,
      avgEnemiesAtEnd: this.sumEnemies / n,
      characterStats,
    };
  }
}

/** Format results as a readable string table. */
export function formatResults(results: SimulationResults): string {
  const lines: string[] = [];
  lines.push(`=== Simulation Results (${results.gamesPlayed} games) ===`);
  lines.push(`Win Rate:    ${results.winRate.toFixed(1)}% (${results.wins}W / ${results.losses}L)`);
  lines.push(`Avg Rounds:  ${results.avgRounds.toFixed(1)} (median: ${results.medianRounds}, range: ${results.minRounds}-${results.maxRounds})`);
  lines.push(`Avg Meter:   ${results.avgDarknessMeterAtEnd.toFixed(1)}`);
  lines.push(`Avg Cubes Removed: ${results.avgTotalCubesRemoved.toFixed(0)}`);
  lines.push(`Avg Strongholds Cleansed: ${results.avgStrongholdsCleansed.toFixed(1)} / 7`);
  lines.push(`Avg Enemies at End: ${results.avgEnemiesAtEnd.toFixed(1)}`);
  lines.push('');
  lines.push('--- Loss Reasons ---');
  for (const [reason, count] of Object.entries(results.lossReasons).sort((a, b) => b[1] - a[1])) {
    const pct = ((count / results.losses) * 100).toFixed(1);
    lines.push(`  ${reason.substring(0, 60)}: ${count} (${pct}%)`);
  }
  lines.push('');
  lines.push('--- Armor Unlock Rates ---');
  for (const [name, rate] of Object.entries(results.armorUnlockRates)) {
    lines.push(`  ${name}: ${rate.toFixed(1)}%`);
  }
  lines.push('');
  lines.push('--- Character Stats ---');
  for (const [cid, stats] of Object.entries(results.characterStats)) {
    lines.push(`  ${cid}: avgFaith=${stats.avgFaithAtEnd.toFixed(1)}, eliminated=${stats.timesEliminated}`);
  }
  return lines.join('\n');
}
