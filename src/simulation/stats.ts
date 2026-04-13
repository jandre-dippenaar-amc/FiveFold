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
    gamesPlayed: 0,
    wins: 0,
    losses: 0,
    winRate: 0,
    avgRounds: 0,
    medianRounds: 0,
    maxRounds: 0,
    minRounds: 0,
    lossReasons: {},
    avgDarknessMeterAtEnd: 0,
    armorUnlockRates: {},
    avgStrongholdsCleansed: 0,
    avgTotalCubesRemoved: 0,
    avgEnemiesAtEnd: 0,
    characterStats: {},
  };
}

export class StatsCollector {
  private rounds: number[] = [];
  private meterAtEnd: number[] = [];
  private strongholdsCleansed: number[] = [];
  private cubesRemoved: number[] = [];
  private enemiesAtEnd: number[] = [];
  private wins = 0;
  private losses = 0;
  private lossReasons: Record<string, number> = {};
  private armorCounts: Record<string, number> = {};
  private charFaith: Record<string, number[]> = {};
  private charEliminated: Record<string, number> = {};

  record(finalState: GameState): void {
    this.rounds.push(finalState.round);
    this.meterAtEnd.push(finalState.darknessMeter);
    this.strongholdsCleansed.push(TOTAL_STRONGHOLDS - finalState.strongholdsRemaining);
    this.cubesRemoved.push(finalState.totalCubesRemoved);
    this.enemiesAtEnd.push(finalState.enemies.length);

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
      if (!this.charFaith[cid]) this.charFaith[cid] = [];
      this.charFaith[cid].push(player.faithCurrent);
      if (player.isEliminated) {
        this.charEliminated[cid] = (this.charEliminated[cid] || 0) + 1;
      }
    }
  }

  getResults(): SimulationResults {
    const n = this.rounds.length;
    if (n === 0) return createEmptyResults();

    const sorted = [...this.rounds].sort((a, b) => a - b);

    const armorUnlockRates: Record<string, number> = {};
    for (const piece of ARMOR_PIECES) {
      armorUnlockRates[piece.name] = ((this.armorCounts[piece.id] || 0) / n) * 100;
    }

    const characterStats: Record<string, any> = {};
    for (const [cid, faithArr] of Object.entries(this.charFaith)) {
      characterStats[cid] = {
        avgFaithAtEnd: avg(faithArr),
        timesEliminated: this.charEliminated[cid] || 0,
        avgScriptureCardsPlayed: 0, // would need tracking in engine
      };
    }

    return {
      gamesPlayed: n,
      wins: this.wins,
      losses: this.losses,
      winRate: (this.wins / n) * 100,
      avgRounds: avg(this.rounds),
      medianRounds: sorted[Math.floor(n / 2)],
      maxRounds: sorted[n - 1],
      minRounds: sorted[0],
      lossReasons: this.lossReasons,
      avgDarknessMeterAtEnd: avg(this.meterAtEnd),
      armorUnlockRates,
      avgStrongholdsCleansed: avg(this.strongholdsCleansed),
      avgTotalCubesRemoved: avg(this.cubesRemoved),
      avgEnemiesAtEnd: avg(this.enemiesAtEnd),
      characterStats,
    };
  }
}

function avg(arr: number[]): number {
  if (arr.length === 0) return 0;
  return arr.reduce((s, v) => s + v, 0) / arr.length;
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
