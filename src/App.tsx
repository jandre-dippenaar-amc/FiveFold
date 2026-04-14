import { useState } from 'react';
import { useGameStore } from './store/gameStore';
import { GameSetup } from './components/setup/GameSetup';
import { GameLayout } from './components/layout/GameLayout';
import { SimulationPanel } from './components/simulation/SimulationPanel';
import { RulesPage } from './components/rules/RulesPage';

type Screen = 'menu' | 'game' | 'simulation' | 'rules';

function App() {
  const state = useGameStore((s) => s.state);
  const [screen, setScreen] = useState<Screen>('menu');

  if (state) {
    return <GameLayout />;
  }

  if (screen === 'simulation') {
    return <SimulationPanel onBack={() => setScreen('menu')} />;
  }

  if (screen === 'rules') {
    return <RulesPage onBack={() => setScreen('menu')} />;
  }

  return (
    <div>
      <GameSetup />
      <div className="fixed bottom-4 right-4 flex gap-2">
        <button
          onClick={() => setScreen('rules')}
          className="px-4 py-2 bg-slate-800/80 hover:bg-slate-700/80 text-amber-400/80 text-sm rounded-lg border border-amber-600/20 backdrop-blur-sm"
        >
          Game Rules
        </button>
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
