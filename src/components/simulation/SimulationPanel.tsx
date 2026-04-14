import { useState } from 'react';
import { runSimulation, type SimulationConfig } from '../../simulation/runner';
import type { SimulationResults } from '../../simulation/stats';
import type { Difficulty } from '../../engine/types';
import type { StrategyId } from '../../simulation/strategies';
import { motion } from 'framer-motion';

export function SimulationPanel() {
  const [games, setGames] = useState(100);
  const [players, setPlayers] = useState(5);
  const [difficulty, setDifficulty] = useState<Difficulty>('faithful');
  const [strategy, setStrategy] = useState<StrategyId>('balanced');
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState<SimulationResults | null>(null);
  const [elapsed, setElapsed] = useState(0);

  const run = () => {
    setRunning(true);
    setResults(null);

    // Use setTimeout to let the UI update before blocking
    setTimeout(() => {
      const start = Date.now();
      const config: SimulationConfig = {
        games,
        playerCount: players,
        difficulty,
        strategy,
        seed: Date.now(),
      };
      const r = runSimulation(config);
      setElapsed((Date.now() - start) / 1000);
      setResults(r);
      setRunning(false);
    }, 50);
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] p-6">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-amber-400" style={{ fontFamily: 'Georgia, serif' }}>
            AI Simulation Lab
          </h1>
          <button
            onClick={() => window.history.back()}
            className="text-xs text-slate-500 hover:text-slate-300"
          >
            Back to Menu
          </button>
        </div>

        <p className="text-sm text-slate-400">
          Run AI-controlled games to test balance. The AI uses heuristic evaluation to make strategic decisions.
        </p>

        {/* Controls */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <label className="text-[10px] text-slate-500 uppercase">Games</label>
            <select
              value={games}
              onChange={(e) => setGames(Number(e.target.value))}
              className="w-full mt-1 bg-slate-800 border border-slate-600/30 rounded px-2 py-1.5 text-sm text-slate-200"
            >
              <option value={10}>10</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
              <option value={250}>250</option>
              <option value={500}>500</option>
              <option value={1000}>1,000</option>
            </select>
          </div>
          <div>
            <label className="text-[10px] text-slate-500 uppercase">Players</label>
            <select
              value={players}
              onChange={(e) => setPlayers(Number(e.target.value))}
              className="w-full mt-1 bg-slate-800 border border-slate-600/30 rounded px-2 py-1.5 text-sm text-slate-200"
            >
              {[2, 3, 4, 5].map((n) => (
                <option key={n} value={n}>{n} Players</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[10px] text-slate-500 uppercase">Difficulty</label>
            <select
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value as Difficulty)}
              className="w-full mt-1 bg-slate-800 border border-slate-600/30 rounded px-2 py-1.5 text-sm text-slate-200"
            >
              <option value="seeker">Seeker (Easy)</option>
              <option value="faithful">Faithful (Normal)</option>
              <option value="tested">Tested (Hard)</option>
              <option value="refinedByFire">Refined by Fire</option>
            </select>
          </div>
          <div>
            <label className="text-[10px] text-slate-500 uppercase">AI Strategy</label>
            <select
              value={strategy}
              onChange={(e) => setStrategy(e.target.value as StrategyId)}
              className="w-full mt-1 bg-slate-800 border border-slate-600/30 rounded px-2 py-1.5 text-sm text-slate-200"
            >
              <option value="balanced">Balanced</option>
              <option value="aggressive">Aggressive</option>
              <option value="defensive">Defensive</option>
              <option value="rush">Rush</option>
              <option value="random">Random</option>
            </select>
          </div>
        </div>

        <button
          onClick={run}
          disabled={running}
          className={`w-full py-2.5 rounded-lg font-bold transition-all ${
            running
              ? 'bg-slate-700 text-slate-400 cursor-wait'
              : 'bg-amber-700 hover:bg-amber-600 text-white'
          }`}
        >
          {running ? 'Running simulation...' : `Run ${games} Games`}
        </button>

        {/* Results */}
        {results && (
          <motion.div
            className="space-y-4"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            {/* Summary cards */}
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

            {/* Loss reasons */}
            {results.losses > 0 && (
              <div className="bg-slate-800/40 rounded-lg border border-slate-700/20 p-4">
                <h3 className="text-xs text-slate-400 uppercase tracking-wider mb-2">Loss Reasons</h3>
                <div className="space-y-1">
                  {Object.entries(results.lossReasons)
                    .sort(([, a], [, b]) => b - a)
                    .slice(0, 5)
                    .map(([reason, count]) => (
                      <div key={reason} className="flex items-center justify-between text-xs">
                        <span className="text-slate-400 truncate max-w-[300px]">{reason}</span>
                        <span className="text-slate-300 font-mono shrink-0 ml-2">
                          {count} ({((count / results.losses) * 100).toFixed(0)}%)
                        </span>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* Armor unlock rates */}
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

            {/* Character stats */}
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
