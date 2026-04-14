// ── Coordinates ──────────────────────────────────────────────────────
export interface Coord {
  row: number;
  col: number;
}

// ── Seeded PRNG state ────────────────────────────────────────────────
export interface RngState {
  seed: number;
  state: number;
}

// ── Tile Types ───────────────────────────────────────────────────────
export type TileType =
  | 'Light'
  | 'Shadow'
  | 'Stronghold'
  | 'BrokenGround'
  | 'HighPlace'
  | 'Jerusalem';

export interface TileState {
  type: TileType;
  coord: Coord;
  faceDown: boolean;
  shadowCubes: number; // 0-4 (5 = instant loss before it can be set)
  enemyIds: string[];
  playerIds: string[];
  prayerToken: boolean;
  strongholdLayers: number; // For Strongholds: starts at 3, cleanse reduces to 0
  isPermanentLight: boolean; // Set by Evangelist's Harvest anointing
}

// ── Characters ───────────────────────────────────────────────────────
export type CharacterId =
  | 'pastor'
  | 'apostle'
  | 'evangelist'
  | 'prophet'
  | 'teacher';

export type Difficulty = 'seeker' | 'faithful' | 'tested' | 'refinedByFire';

export interface CharacterDef {
  id: CharacterId;
  name: string;
  ministryTitle: string;
  faithMax: number;
  startingScriptureCards: number;
  startingPosition: 'edge' | 'jerusalem';
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  scriptureReference: string;
  roleSummary: string;
  ministryAbility: {
    name: string;
    description: string;
  };
  passive: {
    name: string;
    description: string;
  };
  anointing: {
    name: string;
    description: string;
    unlocksWithArmor: ArmorId;
    prayerRequirement: number; // cumulative pray actions needed
  };
  canMoveDiagonally: boolean;
}

// ── Player State ─────────────────────────────────────────────────────
export interface PlayerState {
  id: string;
  characterId: CharacterId;
  position: Coord;
  faithCurrent: number;
  faithMax: number;
  scriptureHand: ScriptureCardInstance[];
  ministryUsedThisTurn: boolean;
  anointingUnlocked: boolean;
  anointingUsedThisTurn: boolean;
  totalPrayActions: number; // tracks cumulative prays for anointing unlock
  isEliminated: boolean;
  isolatedNextTurn: boolean; // from Isolation darkness card
  bonusActionsThisTurn: number; // from Valley of the Shadow, Renewed Strength
  foresightUsedThisRound: boolean; // Prophet's passive
}

// ── Scripture Cards ──────────────────────────────────────────────────
export type ScriptureCardType =
  | 'Cleansing'
  | 'Battle'
  | 'Healing'
  | 'Movement'
  | 'Unity'
  | 'Disruption';

export type ScriptureCardId =
  | 'sentOnes'
  | 'putOnTheFullArmor'
  | 'bindingAndLoosing'
  | 'whereTwoOrThreeGather'
  | 'perfectLoveCastsOutFear'
  | 'greaterIsHe'
  | 'theNameAboveAllNames'
  | 'byHisStripes'
  | 'renewedStrength'
  | 'resistTheDevil'
  | 'spiritOfUnity'
  | 'lightOfTheWorld'
  | 'theWordIsALamp'
  | 'heWhoIsInMe'
  | 'swordOfTheSpiritCard';

export type PowerLevel = 'Standard' | 'Powerful' | 'Legendary';

export interface ScriptureCardDef {
  id: ScriptureCardId;
  name: string;
  cardType: ScriptureCardType;
  scriptureReference: string;
  effect: string;
  powerLevel: PowerLevel;
  bestUsedBy: string;
}

export interface ScriptureCardInstance {
  defId: ScriptureCardId;
  instanceId: string; // unique per card in the game (since 2 copies each)
}

// ── Darkness Cards ───────────────────────────────────────────────────
export type DarknessCategory =
  | 'ShadowSpread'
  | 'EnemySummons'
  | 'Escalation'
  | 'Corruption'
  | 'Trials'
  | 'StrongholdPulse';

export type DarknessSeverity = 'Low' | 'Medium' | 'High' | 'Critical';

export type DarknessCardId =
  | 'creepingDark'
  | 'floodOfDarkness'
  | 'spreadingBlight'
  | 'encroach'
  | 'spiritualWickednessAppears'
  | 'powerManifests'
  | 'principalityRises'
  | 'theEnemyRages'
  | 'nightFalls'
  | 'temptation'
  | 'accusation'
  | 'isolation'
  | 'persecution'
  | 'valleyOfTheShadow'
  | 'darkNightOfTheSoul'
  | 'pulse'
  | 'entrench';

export interface DarknessCardDef {
  id: DarknessCardId;
  name: string;
  category: DarknessCategory;
  severity: DarknessSeverity;
  effect: string;
  target: string;
  countInDeck: number;
  darknessMeterImpact: number;
}

export interface DarknessCardInstance {
  defId: DarknessCardId;
  instanceId: string;
}

// ── Armor of God ─────────────────────────────────────────────────────
export type ArmorId =
  | 'beltOfTruth'
  | 'breastplateOfRighteousness'
  | 'gospelOfPeace'
  | 'shieldOfFaith'
  | 'helmetOfSalvation'
  | 'swordOfTheSpirit';

export type GameImpact =
  | 'Defensive'
  | 'Offensive'
  | 'Mobility'
  | 'Economy'
  | 'Protection';

export interface ArmorPieceDef {
  id: ArmorId;
  name: string;
  armorPiece: string;
  scriptureReference: string;
  effect: string;
  cubesRequired: number;
  unlockOrder: number;
  gameImpact: GameImpact;
}

// ── Enemies ──────────────────────────────────────────────────────────
export type EnemyTier = 'Wickedness' | 'Power' | 'Principality';

export interface EnemyDef {
  tier: EnemyTier;
  name: string;
  spawnsOn: string;
  howToRemove: string;
  movement: string;
  darknessPhaseEffect: string;
  rewardOnDefeat: string;
  gameOverTrigger: string;
  specialRule: string;
  hitsRequired: number;
  diceCount: number;
  hitThreshold: number; // min value on any single die for a hit
}

export interface EnemyState {
  id: string;
  tier: EnemyTier;
  position: Coord;
  hitsRemaining: number;
}

// ── Game Phases ──────────────────────────────────────────────────────
export type Phase =
  | 'Prayer'
  | 'Action'
  | 'Darkness'
  | 'Enemy'
  | 'Check';

// ── Game Actions (discriminated union) ───────────────────────────────
export type GameAction =
  | { type: 'MOVE'; playerId: string; target: Coord }
  | { type: 'CLEANSE'; playerId: string }
  | { type: 'BATTLE'; playerId: string; enemyId: string }
  | { type: 'PRAY'; playerId: string }
  | { type: 'ENCOURAGE'; playerId: string; targetPlayerId: string }
  | { type: 'FORTIFY'; playerId: string }
  | { type: 'USE_SCRIPTURE'; playerId: string; cardInstanceId: string; targets?: ScriptureTargets }
  | { type: 'USE_MINISTRY'; playerId: string; targets?: MinistryTargets }
  | { type: 'USE_ANOINTING'; playerId: string; targets?: AnointingTargets }
  | { type: 'END_TURN'; playerId: string }
  | { type: 'ADVANCE_PHASE' }
  | { type: 'DRAW_DARKNESS_CARD' }
  | { type: 'RESOLVE_ENEMY_PHASE' }
  | { type: 'RESOLVE_CHECK_PHASE' }
  | { type: 'SHIELD_OF_FAITH_CANCEL' } // team decides to cancel a darkness card
  | { type: 'PROPHET_FORESIGHT'; playerId: string } // Prophet discards drawn darkness card
  | { type: 'PASTOR_LAY_DOWN_LIFE'; playerId: string; targetPlayerId: string }; // Pastor prevents elimination

// ── Action Targets ───────────────────────────────────────────────────
export interface ScriptureTargets {
  targetPlayerId?: string;
  targetCoord?: Coord;
  targetEnemyId?: string;
  targetStrongholdCoord?: Coord;
}

export interface MinistryTargets {
  // Pastor Tend
  faithGifts?: Array<{ targetPlayerId: string; amount: number }>;
  // Apostle Sent
  targetPlayerId?: string;
  targetCoord?: Coord;
  // Prophet Revelation — reorder is handled after viewing
  reorderedCardIds?: string[];
}

export interface AnointingTargets {
  // Evangelist Harvest
  targetCoord?: Coord;
  // Apostle Establish — no targets needed (self tile)
  // Prophet Word of Knowledge
  revealCoord?: Coord;
  // Teacher Rightly Divided
  cardInstanceId?: string;
  scriptureTargets?: ScriptureTargets;
}

// ── Game Events (for logging) ────────────────────────────────────────
export interface GameEvent {
  round: number;
  phase: Phase;
  description: string;
  timestamp?: number; // for UI animations
}

// ── Difficulty Presets ────────────────────────────────────────────────
export interface DifficultyPreset {
  id: Difficulty;
  name: string;
  description: string;
  startingDarknessMeter: number;
  extraScriptureCards: number;
  removedDarknessCards: DarknessCardId[];
  powersEveryOtherRound: boolean;
  extraDarknessCardsPerRound: number;
  principalitiesCanMove: boolean;
}

// ── Game Configuration ───────────────────────────────────────────────
export interface GameConfig {
  playerCount: number;
  characterIds: CharacterId[];
  difficulty: Difficulty;
  seed: number;
}

// ── The Complete Game State ──────────────────────────────────────────
export interface GameState {
  config: GameConfig;
  board: TileState[][];
  players: PlayerState[];
  currentPlayerIndex: number;
  phase: Phase;
  actionsRemaining: number;
  round: number;
  darknessMeter: number; // 1-8
  totalCubesRemoved: number;
  armorUnlocked: ArmorId[];
  shieldOfFaithUsedThisRound: boolean;
  enemies: EnemyState[];
  strongholdsRemaining: number;
  scriptureDeck: ScriptureCardInstance[];
  scriptureDiscard: ScriptureCardInstance[];
  darknessDeck: DarknessCardInstance[];
  darknessDiscard: DarknessCardInstance[];
  darknessCardsDrawnThisPhase: number;
  rng: RngState;
  log: GameEvent[];
  status: 'setup' | 'playing' | 'won' | 'lost';
  lossReason: string | null;
  nextEnemyId: number;
  nextCardInstanceId: number;
  // Round effects (reset each round)
  greaterIsHeActive: boolean; // "Greater is He" — all battles auto-succeed this round
  heWhoIsInMeActive: boolean; // "He Who is in Me" — cancel next darkness card
}
