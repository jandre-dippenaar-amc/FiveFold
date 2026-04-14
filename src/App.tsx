import { useState } from 'react';
import { useGameStore } from './store/gameStore';
import { GameSetup } from './components/setup/GameSetup';
import { GameLayout } from './components/layout/GameLayout';
import { SimulationPanel } from './components/simulation/SimulationPanel';

type Screen = 'menu' | 'game' | 'simulation';

function App() {
  const state = useGameStore((s) => s.state);
  const [screen, setScreen] = useState<Screen>('menu');

  // If game state exists, show game
  if (state) {
    return <GameLayout />;
  }

  // Show menu or simulation
  if (screen === 'simulation') {
    return (
      <div>
        <SimulationPanel />
        <div className="fixed bottom-4 left-4">
          <button
            onClick={() => setScreen('menu')}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm rounded-lg border border-slate-600/30"
          >
            Back to Menu
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <GameSetup />
      <div className="fixed bottom-4 right-4 flex gap-2">
        <button
          onClick={() => setScreen('simulation')}
          className="px-4 py-2 bg-slate-800/80 hover:bg-slate-700/80 text-slate-400 text-sm rounded-lg border border-slate-600/30 backdrop-blur-sm"
        >
          AI Simulation Lab
        </button>
      </div>
    </div>
  );
}

export default App;
