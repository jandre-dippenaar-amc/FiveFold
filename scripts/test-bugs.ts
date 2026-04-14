import { createGameState } from '../src/engine/state';
import { canMove, executeMove, executeBattle, canBattle } from '../src/engine/actions';
import { executeScripture } from '../src/engine/cards';
import { beginPlayerTurn } from '../src/engine/phases';
import { getTile } from '../src/engine/board';
import type { GameState } from '../src/engine/types';

// BUG 1: Broken Ground should cost 2 actions
console.log('=== BUG 1: Broken Ground cost ===');
let state = createGameState({ playerCount: 3, characterIds: ['pastor', 'apostle', 'evangelist'], difficulty: 'faithful', seed: 42 });
state = beginPlayerTurn(state, 0);
const pastor = state.players[0];
console.log(`Pastor at (${pastor.position.row},${pastor.position.col}) actions=${state.actionsRemaining}`);

for (let r = 0; r < 7; r++) {
  for (let c = 0; c < 7; c++) {
    const tile = getTile(state.board, { row: r, col: c });
    if (tile.type === 'BrokenGround') {
      const check = canMove(state, pastor.id, { row: r, col: c });
      console.log(`  BG(${r},${c}) valid=${check.valid} actionCost=${check.actionCost} ${check.reason || ''}`);
      if (check.valid) {
        const ns = executeMove(state, pastor.id, { row: r, col: c });
        console.log(`  -> moved! actions: ${state.actionsRemaining} -> ${ns.actionsRemaining} (cost ${state.actionsRemaining - ns.actionsRemaining})`);
      }
    }
  }
}

// BUG 2: "Greater is He" should make ALL battles auto-succeed this round
console.log('\n=== BUG 2: Greater is He auto-succeed ===');
let state2 = createGameState({ playerCount: 3, characterIds: ['pastor', 'apostle', 'evangelist'], difficulty: 'faithful', seed: 100 });
state2 = beginPlayerTurn(state2, 0);

// Add a Power enemy on the pastor's tile
const pastorPos = state2.players[0].position;
state2 = {
  ...state2,
  enemies: [...state2.enemies, { id: 'test-enemy', tier: 'Power' as const, position: pastorPos, hitsRemaining: 2 }],
};

// Find "Greater is He" card in hand or add one
const greaterCard = state2.players[0].scriptureHand.find(c => c.defId === 'greaterIsHe');
if (greaterCard) {
  console.log('Pastor has Greater is He card');
  state2 = executeScripture(state2, state2.players[0].id, greaterCard.instanceId);
  console.log('Played Greater is He');
} else {
  console.log('Pastor does NOT have Greater is He — adding one');
  state2 = {
    ...state2,
    players: state2.players.map((p, i) => i === 0 ? {
      ...p,
      scriptureHand: [...p.scriptureHand, { defId: 'greaterIsHe' as any, instanceId: 'test-gh' }]
    } : p)
  };
  state2 = executeScripture(state2, state2.players[0].id, 'test-gh');
  console.log('Played Greater is He');
}

// Now check if battle auto-succeeds
// The log should say auto-succeed, but the actual battle logic needs to check for it
const enemy = state2.enemies.find(e => e.id === 'test-enemy');
if (enemy) {
  console.log(`Enemy still on tile: ${enemy.tier} HP=${enemy.hitsRemaining}`);
  const battleCheck = canBattle(state2, state2.players[0].id, 'test-enemy');
  console.log(`Can battle: ${battleCheck.valid}`);
  if (battleCheck.valid) {
    const afterBattle = executeBattle(state2, state2.players[0].id, 'test-enemy');
    const enemyAfter = afterBattle.enemies.find(e => e.id === 'test-enemy');
    console.log(`After battle: enemy ${enemyAfter ? 'HP=' + enemyAfter.hitsRemaining : 'DEFEATED'}`);
    // Check log for what happened
    const battleLog = afterBattle.log.slice(-3).map(e => e.description);
    battleLog.forEach(l => console.log('  LOG: ' + l));
  }
}
