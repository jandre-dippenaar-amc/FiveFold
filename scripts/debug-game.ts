import { createGameState } from '../src/engine/state';
import { executeFullRound } from '../src/engine/phases';
import { aiPlayerTurn } from '../src/simulation/aiPlayer';
import { STRATEGIES } from '../src/simulation/strategies';
import { extractMetrics } from '../src/simulation/evaluator';

let state = createGameState({
  playerCount: 5,
  characterIds: ['pastor', 'apostle', 'evangelist', 'prophet', 'teacher'],
  difficulty: 'seeker',
  seed: 42,
});
const w = STRATEGIES.balanced;

for (let r = 0; r < 12; r++) {
  if (state.status !== 'playing') break;
  const m = extractMetrics(state);
  console.log(
    `R${state.round}: cubes=${m.totalCubes} meter=${m.meter} enemies=${m.enemies} ` +
    `sh=${m.strongholdsCleansed}/7 armor=${m.armor} faith=${m.totalFaith} lowest=${m.lowestFaith}`
  );
  state = executeFullRound(state, (s, pi) => aiPlayerTurn(s, pi, w));
}
console.log(`\nStatus: ${state.status} | ${state.lossReason || 'WON'}`);
console.log(`\nLast 20 log entries:`);
state.log.slice(-20).forEach((e) => console.log(`  [${e.phase}] ${e.description}`));
