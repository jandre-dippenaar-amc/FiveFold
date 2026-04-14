import { useState, useRef, useCallback } from 'react';
import type { SimulationConfig } from '../../simulation/runner';
import type { SimulationResults } from '../../simulation/stats';
import type { Difficulty } from '../../engine/types';
import type { StrategyId } from '../../simulation/strategies';
import { ARMOR_PIECES } from '../../engine/constants';
import { motion } from 'framer-motion';
import SimWorker from '../../simulation/worker?worker';

const BATCH_SIZE = 25; // Games per worker — worker is killed after each batch to free memory

export function SimulationPanel({ onBack }: { onBack?: () => void } = {}) {
  const [games, setGames] = useState(100);
  const [players, setPlayers] = useState(5);
  const [difficulty, setDifficulty] = useState<Difficulty>('faithful');
  const [strategy, setStrategy] = useState<StrategyId>('balanced');
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState({ completed: 0, total: 0 });
  const [results, setResults] = useState<SimulationResults | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const workerRef = useRef<Worker | null>(null);
  const cancelledRef = useRef(false);
  const startTimeRef = useRef(0);

  const run = useCallback(() => {
    workerRef.current?.terminate();
    cancelledRef.current = false;

    setRunning(true);
    setResults(null);
    setProgress({ completed: 0, total: games });
    startTimeRef.current = Date.now();

    // Accumulate results across batches
    let completed = 0;
    let wins = 0, losses = 0;
    let sumRounds = 0, sumMeter = 0, sumStrongholds = 0, sumCubes = 0, sumEnemies = 0;
    let maxR = 0, minR = Infinity;
    const lossReasons: Record<string, number> = {};
    const armorCounts: Record<string, number> = {};
    const charFaithSum: Record<string, number> = {};
    const charFaithCount: Record<string, number> = {};
    const charElim: Record<string, number> = {};

    function runNextBatch() {
      if (cancelledRef.current || completed >= games) {
        // Finalize
        const n = completed;
        if (n === 0) { setRunning(false); return; }

        const armorUnlockRates: Record<string, number> = {};
        for (const piece of ARMOR_PIECES) {
          armorUnlockRates[piece.name] = ((armorCounts[piece.id] || 0) / n) * 100;
        }
        const characterStats: Record<string, any> = {};
        for (const cid of Object.keys(charFaithSum)) {
          characterStats[cid] = {
            avgFaithAtEnd: charFaithSum[cid] / (charFaithCount[cid] || 1),
            timesEliminated: charElim[cid] || 0,
            avgScriptureCardsPlayed: 0,
          };
        }
        setElapsed((Date.now() - startTimeRef.current) / 1000);
        setResults({
          gamesPlayed: n, wins, losses, winRate: (wins / n) * 100,
          avgRounds: sumRounds / n, medianRounds: Math.round(sumRounds / n),
          maxRounds: maxR, minRounds: minR === Infinity ? 0 : minR,
          lossReasons, avgDarknessMeterAtEnd: sumMeter / n,
          armorUnlockRates, avgStrongholdsCleansed: sumStrongholds / n,
          avgTotalCubesRemoved: sumCubes / n, avgEnemiesAtEnd: sumEnemies / n,
          characterStats,
        });
        setRunning(false);
        return;
      }

      const batchSize = Math.min(BATCH_SIZE, games - completed);

      // Spawn a FRESH worker for each batch — old worker's heap gets fully GC'd
      const worker = new SimWorker();
      workerRef.current = worker;

      // Catch silent OOM crashes
      worker.onerror = () => {
        console.warn(`Worker crashed at batch starting at game ${completed}. Skipping batch.`);
        worker.terminate();
        workerRef.current = null;
        completed += batchSize;
        setTimeout(runNextBatch, 50);
      };

      worker.onmessage = (e) => {
        const msg = e.data;
        if (msg.type === 'progress') {
          setProgress({ completed: completed + msg.completed, total: games });
        } else if (msg.type === 'done') {
          const r = msg.results as SimulationResults;

          // Merge into running totals
          wins += r.wins;
          losses += r.losses;
          sumRounds += r.avgRounds * batchSize;
          sumMeter += r.avgDarknessMeterAtEnd * batchSize;
          sumStrongholds += r.avgStrongholdsCleansed * batchSize;
          sumCubes += r.avgTotalCubesRemoved * batchSize;
          sumEnemies += r.avgEnemiesAtEnd * batchSize;
          if (r.maxRounds > maxR) maxR = r.maxRounds;
          if (r.minRounds < minR) minR = r.minRounds;
          for (const [reason, count] of Object.entries(r.lossReasons)) {
            lossReasons[reason] = (lossReasons[reason] || 0) + count;
          }
          for (const [name, rate] of Object.entries(r.armorUnlockRates)) {
            const id = ARMOR_PIECES.find((p) => p.name === name)?.id;
            if (id) armorCounts[id] = (armorCounts[id] || 0) + Math.round((rate / 100) * batchSize);
          }
          for (const [cid, stats] of Object.entries(r.characterStats)) {
            charFaithSum[cid] = (charFaithSum[cid] || 0) + stats.avgFaithAtEnd * batchSize;
            charFaithCount[cid] = (charFaithCount[cid] || 0) + batchSize;
            charElim[cid] = (charElim[cid] || 0) + stats.timesEliminated;
          }

          completed += batchSize;
          setProgress({ completed, total: games });

          // Kill this worker to free its memory
          worker.terminate();
          workerRef.current = null;

          // Schedule next batch — gives browser time to GC
          setTimeout(runNextBatch, 10);
        } else if (msg.type === 'error') {
          console.error('Simulation batch error:', msg.error);
          worker.terminate();
          workerRef.current = null;
          // Try to continue with next batch
          completed += batchSize;
          setTimeout(runNextBatch, 10);
        }
      };

      const config: SimulationConfig = {
        games: batchSize,
        playerCount: players,
        difficulty,
        strategy,
        seed: Date.now() + completed,
      };
      worker.postMessage(config);
    }

    runNextBatch();
  }, [games, players, difficulty, strategy]);

  const cancel = useCallback(() => {
    cancelledRef.current = true;
    workerRef.current?.terminate();
    workerRef.current = null;
    setRunning(false);
  }, []);

  const progressPct = progress.total > 0 ? (progress.completed / progress.total) * 100 : 0;

  return (
    <div className="min-h-screen bg-[#0a0a0f] p-6">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-amber-400" style={{ fontFamily: 'Georgia, serif' }}>
            AI Simulation Lab
          </h1>
          <button onClick={() => onBack?.()} className="text-xs text-slate-500 hover:text-slate-300">
            Back to Menu
          </button>
        </div>

        <p className="text-sm text-slate-400">
          Run AI-controlled games to test balance. Simulations run in a background thread — the UI stays responsive.
        </p>

        {/* Controls */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <label className="text-[10px] text-slate-500 uppercase">Games</label>
            <select value={games} onChange={(e) => setGames(Number(e.target.value))} disabled={running}
              className="w-full mt-1 bg-slate-800 border border-slate-600/30 rounded px-2 py-1.5 text-sm text-slate-200 disabled:opacity-50">
              <option value={10}>10</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
              <option value={250}>250</option>
              <option value={500}>500</option>
              <option value={1000}>1,000</option>
              <option value={2000}>2,000</option>
              <option value={5000}>5,000</option>
            </select>
          </div>
          <div>
            <label className="text-[10px] text-slate-500 uppercase">Players</label>
            <select value={players} onChange={(e) => setPlayers(Number(e.target.value))} disabled={running}
              className="w-full mt-1 bg-slate-800 border border-slate-600/30 rounded px-2 py-1.5 text-sm text-slate-200 disabled:opacity-50">
              {[2, 3, 4, 5].map((n) => <option key={n} value={n}>{n} Players</option>)}
            </select>
          </div>
          <div>
            <label className="text-[10px] text-slate-500 uppercase">Difficulty</label>
            <select value={difficulty} onChange={(e) => setDifficulty(e.target.value as Difficulty)} disabled={running}
              className="w-full mt-1 bg-slate-800 border border-slate-600/30 rounded px-2 py-1.5 text-sm text-slate-200 disabled:opacity-50">
              <option value="seeker">Seeker (Easy)</option>
              <option value="faithful">Faithful (Normal)</option>
              <option value="tested">Tested (Hard)</option>
              <option value="refinedByFire">Refined by Fire</option>
            </select>
          </div>
          <div>
            <label className="text-[10px] text-slate-500 uppercase">AI Strategy</label>
            <select value={strategy} onChange={(e) => setStrategy(e.target.value as StrategyId)} disabled={running}
              className="w-full mt-1 bg-slate-800 border border-slate-600/30 rounded px-2 py-1.5 text-sm text-slate-200 disabled:opacity-50">
              <option value="balanced">Balanced</option>
              <option value="aggressive">Aggressive</option>
              <option value="defensive">Defensive</option>
              <option value="rush">Rush</option>
              <option value="random">Random</option>
            </select>
          </div>
        </div>

        {/* Run / Cancel button */}
        {running ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-400">
                Running... {progress.completed}/{progress.total} games ({progressPct.toFixed(0)}%)
              </span>
              <button onClick={cancel} className="text-red-400 hover:text-red-300 text-xs">
                Cancel
              </button>
            </div>
            <div className="w-full h-2 bg-slate-700 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-amber-500 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${progressPct}%` }}
                transition={{ duration: 0.2 }}
              />
            </div>
          </div>
        ) : (
          <button onClick={run}
            className="w-full py-2.5 rounded-lg font-bold bg-amber-700 hover:bg-amber-600 text-white transition-all">
            Run {games.toLocaleString()} Games
          </button>
        )}

        {/* Results */}
        {results && (
          <motion.div className="space-y-4" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <ResultCard label="Win Rate" value={`${results.winRate.toFixed(1)}%`} color={results.winRate > 30 ? 'text-green-400' : results.winRate > 10 ? 'text-amber-400' : 'text-red-400'} />
              <ResultCard label="Avg Rounds" value={results.avgRounds.toFixed(1)} color="text-blue-400" />
              <ResultCard label="Avg Meter" value={results.avgDarknessMeterAtEnd.toFixed(1)} color="text-purple-400" />
              <ResultCard label="Completed in" value={`${elapsed.toFixed(1)}s`} color="text-slate-400" />
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <ResultCard label="Wins / Losses" value={`${results.wins}W / ${results.losses}L`} color="text-slate-300" />
              <ResultCard label="Avg Strongholds" value={`${results.avgStrongholdsCleansed.toFixed(1)}/7`} color="text-amber-400" />
              <ResultCard label="Avg Cubes Removed" value={String(Math.round(results.avgTotalCubesRemoved))} color="text-emerald-400" />
              <ResultCard label="Avg Enemies Left" value={results.avgEnemiesAtEnd.toFixed(1)} color="text-red-400" />
            </div>

            {results.losses > 0 && (
              <div className="bg-slate-800/40 rounded-lg border border-slate-700/20 p-4">
                <h3 className="text-xs text-slate-400 uppercase tracking-wider mb-2">Loss Reasons</h3>
                <div className="space-y-1">
                  {Object.entries(results.lossReasons).sort(([, a], [, b]) => b - a).slice(0, 8).map(([reason, count]) => (
                    <div key={reason} className="flex items-center justify-between text-xs">
                      <span className="text-slate-400 truncate max-w-[350px]">{reason}</span>
                      <span className="text-slate-300 font-mono shrink-0 ml-2">
                        {count} ({((count / results.losses) * 100).toFixed(0)}%)
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="bg-slate-800/40 rounded-lg border border-slate-700/20 p-4">
              <h3 className="text-xs text-slate-400 uppercase tracking-wider mb-2">Armor Unlock Rates</h3>
              <div className="space-y-1">
                {Object.entries(results.armorUnlockRates).map(([name, rate]) => (
                  <div key={name} className="flex items-center justify-between text-xs">
                    <span className="text-amber-300">{name}</span>
                    <div className="flex items-center gap-2">
                      <div className="w-24 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                        <div className="h-full bg-amber-500 rounded-full" style={{ width: `${rate}%` }} />
                      </div>
                      <span className="text-slate-400 font-mono w-12 text-right">{rate.toFixed(0)}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-slate-800/40 rounded-lg border border-slate-700/20 p-4">
              <h3 className="text-xs text-slate-400 uppercase tracking-wider mb-2">Character Stats</h3>
              <div className="space-y-1">
                {Object.entries(results.characterStats).map(([cid, stats]) => (
                  <div key={cid} className="flex items-center justify-between text-xs">
                    <span className="text-slate-300 capitalize">{cid}</span>
                    <span className="text-slate-400 font-mono">
                      Avg Faith: {stats.avgFaithAtEnd.toFixed(1)} | Eliminated: {stats.timesEliminated}x
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}

function ResultCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="bg-slate-800/40 rounded-lg border border-slate-700/20 p-3 text-center">
      <div className={`text-xl font-bold ${color}`}>{value}</div>
      <div className="text-[10px] text-slate-500 uppercase">{label}</div>
    </div>
  );
}
