import { useGameStore } from './store/gameStore';
import { GameSetup } from './components/setup/GameSetup';
import { GameLayout } from './components/layout/GameLayout';

function App() {
  const state = useGameStore((s) => s.state);

  if (!state) {
    return <GameSetup />;
  }

  return <GameLayout />;
}

export default App;
