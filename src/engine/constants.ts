import type {
  CharacterDef,
  CharacterId,
  ScriptureCardDef,
  DarknessCardDef,
  ArmorPieceDef,
  EnemyDef,
  DifficultyPreset,
  Coord,
} from './types';

// ── Characters ───────────────────────────────────────────────────────

export const CHARACTERS: Record<CharacterId, CharacterDef> = {
  pastor: {
    id: 'pastor',
    name: 'The Pastor',
    ministryTitle: 'Shepherd',
    faithMax: 10,
    startingScriptureCards: 1,
    startingPosition: 'edge',
    difficulty: 'Beginner',
    scriptureReference: 'John 10:11 / Ezekiel 34:15-16',
    roleSummary:
      'Healer, protector, team sustainer. Highest Faith Track in the game. Stay near the most vulnerable teammates.',
    ministryAbility: {
      name: 'Tend',
      description:
        'Give up to 2 Faith tokens to any adjacent players, split as desired.',
    },
    passive: {
      name: 'Lay Down Your Life',
      description:
        'When an adjacent player would lose their last Faith token, the Pastor may sacrifice 2 of their own to prevent their elimination.',
    },
    anointing: {
      name: 'Still Waters',
      description: 'All players on the board restore 1 Faith token immediately.',
      unlocksWithArmor: 'breastplateOfRighteousness',
      prayerRequirement: 3,
    },
    canMoveDiagonally: false,
  },
  apostle: {
    id: 'apostle',
    name: 'The Apostle',
    ministryTitle: 'Foundation Builder',
    faithMax: 8,
    startingScriptureCards: 2,
    startingPosition: 'edge',
    difficulty: 'Intermediate',
    scriptureReference: 'Ephesians 2:19-20',
    roleSummary:
      'Strategic heart of the team. Commander, coordinator, amplifier. Works best placed centrally to reach every player.',
    ministryAbility: {
      name: 'Sent',
      description:
        'Once per turn, move one other player up to 2 spaces at no action cost.',
    },
    passive: {
      name: 'Authority',
      description:
        'When present during a Cleanse action, remove 1 extra Shadow Cube.',
    },
    anointing: {
      name: 'Establish',
      description:
        'Place a Prayer Token on your tile. All players adjacent gain +1 action per turn.',
      unlocksWithArmor: 'gospelOfPeace',
      prayerRequirement: 3,
    },
    canMoveDiagonally: false,
  },
  evangelist: {
    id: 'evangelist',
    name: 'The Evangelist',
    ministryTitle: 'Light Bearer',
    faithMax: 6,
    startingScriptureCards: 1,
    startingPosition: 'jerusalem',
    difficulty: 'Beginner',
    scriptureReference: 'Romans 10:14-15 / Isaiah 52:7',
    roleSummary:
      'Rapid response, wide-area cleansing, maximum mobility. Fragile but fast. Starts on Jerusalem.',
    ministryAbility: {
      name: 'Preach',
      description:
        'Remove 1 Shadow Cube from each tile adjacent to your current tile.',
    },
    passive: {
      name: 'Beautiful Feet',
      description:
        'Movement on Light Tiles costs 0 actions. Move 2 spaces for 1 action on any tile type.',
    },
    anointing: {
      name: 'Harvest',
      description:
        'Convert one Shadow Tile to a permanent Light Tile. Remove all cubes and place a Light marker.',
      unlocksWithArmor: 'beltOfTruth',
      prayerRequirement: 3,
    },
    canMoveDiagonally: true, // Beautiful Feet — asymmetric mobility like Forbidden Desert
  },
  prophet: {
    id: 'prophet',
    name: 'The Prophet',
    ministryTitle: 'Seer',
    faithMax: 7,
    startingScriptureCards: 3,
    startingPosition: 'edge',
    difficulty: 'Advanced',
    scriptureReference: 'Amos 3:7 / 1 Corinthians 14:3',
    roleSummary:
      'Information control, chaos reduction, early warning system. Most powerful early game.',
    ministryAbility: {
      name: 'Revelation',
      description:
        'Look at the top 3 Darkness cards and reorder them in any order.',
    },
    passive: {
      name: 'Foresight',
      description:
        'Once per round, when a Darkness card is drawn, discard it and draw a replacement (discarded card to bottom of deck).',
    },
    anointing: {
      name: 'Word of Knowledge',
      description:
        'Name a tile coordinate. Reveal it and see all Darkness cards targeting it this round.',
      unlocksWithArmor: 'shieldOfFaith',
      prayerRequirement: 3,
    },
    canMoveDiagonally: false,
  },
  teacher: {
    id: 'teacher',
    name: 'The Teacher',
    ministryTitle: 'Word Wielder',
    faithMax: 7,
    startingScriptureCards: 3,
    startingPosition: 'edge',
    difficulty: 'Advanced',
    scriptureReference: '2 Timothy 2:15 / Hebrews 4:12',
    roleSummary:
      'Power plays, Scripture combo engine, clutch moments. Best played last each round to solve the problems the team created.',
    ministryAbility: {
      name: 'Study',
      description:
        'Draw 2 Scripture cards. Keep 1, return 1 to the bottom of the deck.',
    },
    passive: {
      name: 'Hidden in the Word',
      description:
        'Scripture cards played by the Teacher are enhanced (+1 die, +1 cube removed, or +1 Faith restored).',
    },
    anointing: {
      name: 'Rightly Divided',
      description: 'Play a Scripture card and resolve its effect twice.',
      unlocksWithArmor: 'swordOfTheSpirit',
      prayerRequirement: 3,
    },
    canMoveDiagonally: false,
  },
};

// ── Armor of God ─────────────────────────────────────────────────────

export const ARMOR_PIECES: ArmorPieceDef[] = [
  {
    id: 'beltOfTruth',
    name: 'Belt of Truth',
    armorPiece: 'Belt of Truth',
    scriptureReference: 'Ephesians 6:14a',
    effect:
      "All 'Deception' Darkness cards are discarded when drawn. Truth exposes lies before they land.",
    cubesRequired: 5,
    unlockOrder: 1,
    gameImpact: 'Defensive',
  },
  {
    id: 'breastplateOfRighteousness',
    name: 'Breastplate of Righteousness',
    armorPiece: 'Breastplate of Righteousness',
    scriptureReference: 'Ephesians 6:14b',
    effect:
      'All players reduce Faith loss by 1 (minimum 1) from any Darkness card effect.',
    cubesRequired: 12,
    unlockOrder: 2,
    gameImpact: 'Protection',
  },
  {
    id: 'gospelOfPeace',
    name: 'Gospel of Peace',
    armorPiece: 'Gospel of Peace (Boots)',
    scriptureReference: 'Ephesians 6:15',
    effect: 'All players may move 1 extra space per movement action spent.',
    cubesRequired: 20,
    unlockOrder: 3,
    gameImpact: 'Mobility',
  },
  {
    id: 'shieldOfFaith',
    name: 'Shield of Faith',
    armorPiece: 'Shield of Faith',
    scriptureReference: 'Ephesians 6:16',
    effect:
      'Once per round (team decision), completely cancel one Darkness card effect.',
    cubesRequired: 30,
    unlockOrder: 4,
    gameImpact: 'Defensive',
  },
  {
    id: 'helmetOfSalvation',
    name: 'Helmet of Salvation',
    armorPiece: 'Helmet of Salvation',
    scriptureReference: 'Ephesians 6:17a',
    effect:
      'Players cannot be permanently eliminated. Reach 0 Faith — return to Jerusalem with 3 tokens.',
    cubesRequired: 42,
    unlockOrder: 5,
    gameImpact: 'Protection',
  },
  {
    id: 'swordOfTheSpirit',
    name: 'Sword of the Spirit',
    armorPiece: 'Sword of the Spirit',
    scriptureReference: 'Ephesians 6:17b',
    effect:
      'All Cleanse actions remove 2 Shadow Cubes instead of 1. All Battle actions deal +1 damage. The Word of God strikes twice.',
    cubesRequired: 55,
    unlockOrder: 6,
    gameImpact: 'Offensive',
  },
];

// ── Scripture Cards ──────────────────────────────────────────────────

export const SCRIPTURE_CARDS: ScriptureCardDef[] = [
  {
    id: 'sentOnes',
    name: 'Sent Ones',
    cardType: 'Movement',
    scriptureReference: 'Romans 10:15',
    effect:
      'Move any 2 players up to 3 tiles each (their choice of destination).',
    powerLevel: 'Powerful',
    bestUsedBy: 'Apostle or Teacher',
  },
  {
    id: 'putOnTheFullArmor',
    name: 'Put On the Full Armor',
    cardType: 'Healing',
    scriptureReference: 'Ephesians 6:11',
    effect: 'Any player gains +2 Faith tokens.',
    powerLevel: 'Standard',
    bestUsedBy: 'Any player',
  },
  {
    id: 'bindingAndLoosing',
    name: 'Binding and Loosing',
    cardType: 'Cleansing',
    scriptureReference: 'Matthew 16:19',
    effect:
      'Choose a Stronghold. It cannot pulse or spawn enemies this round.',
    powerLevel: 'Standard',
    bestUsedBy: 'Any player before tackling a reinforced Stronghold',
  },
  {
    id: 'whereTwoOrThreeGather',
    name: 'Where Two or Three Gather',
    cardType: 'Unity',
    scriptureReference: 'Matthew 18:20',
    effect:
      'All players on the same tile as you gain 1 Faith and draw 1 Scripture card.',
    powerLevel: 'Standard',
    bestUsedBy: 'Any player on a crowded tile',
  },
  {
    id: 'perfectLoveCastsOutFear',
    name: 'Perfect Love Casts Out Fear',
    cardType: 'Disruption',
    scriptureReference: '1 John 4:18',
    effect:
      'Discard all Corruption Darkness cards in the discard pile. Darkness Meter -1.',
    powerLevel: 'Powerful',
    bestUsedBy: 'Any player — best at Meter 6+',
  },
  {
    id: 'greaterIsHe',
    name: 'Greater is He',
    cardType: 'Battle',
    scriptureReference: '1 John 4:4',
    effect:
      'For this round, all Battle checks succeed automatically. No dice needed.',
    powerLevel: 'Legendary',
    bestUsedBy: 'Teacher (double = all battles auto-succeed for 2 rounds)',
  },
  {
    id: 'theNameAboveAllNames',
    name: 'The Name Above All Names',
    cardType: 'Battle',
    scriptureReference: 'Philippians 2:9-10',
    effect:
      'All Principalities on the board take 1 Battle damage immediately (counts toward their removal).',
    powerLevel: 'Powerful',
    bestUsedBy: 'Any player — especially before a Principality fight',
  },
  {
    id: 'byHisStripes',
    name: 'By His Stripes',
    cardType: 'Healing',
    scriptureReference: 'Isaiah 53:5',
    effect: 'All players restore their Faith to full immediately.',
    powerLevel: 'Legendary',
    bestUsedBy:
      'Teacher (double = everyone heals to full twice, resetting faith)',
  },
  {
    id: 'renewedStrength',
    name: 'Renewed Strength',
    cardType: 'Healing',
    scriptureReference: 'Isaiah 40:31',
    effect: 'You gain 2 extra actions this turn.',
    powerLevel: 'Powerful',
    bestUsedBy: 'Any player when exhausted',
  },
  {
    id: 'resistTheDevil',
    name: 'Resist the Devil',
    cardType: 'Battle',
    scriptureReference: 'James 4:7',
    effect:
      'Remove any 1 enemy from the board immediately. No Battle check required.',
    powerLevel: 'Powerful',
    bestUsedBy: 'Teacher (double effect = removes 2 enemies)',
  },
  {
    id: 'spiritOfUnity',
    name: 'Spirit of Unity',
    cardType: 'Unity',
    scriptureReference: 'Psalm 133:1',
    effect:
      'If all players are within 3 tiles of each other: Darkness Meter -2.',
    powerLevel: 'Powerful',
    bestUsedBy:
      'Best when the team is dispersed and wants to re-converge',
  },
  {
    id: 'lightOfTheWorld',
    name: 'Light of the World',
    cardType: 'Cleansing',
    scriptureReference: 'John 8:12',
    effect:
      'Remove all Shadow Cubes from your tile and every adjacent tile instantly.',
    powerLevel: 'Legendary',
    bestUsedBy: 'Any player',
  },
  {
    id: 'theWordIsALamp',
    name: 'The Word is a Lamp',
    cardType: 'Cleansing',
    scriptureReference: 'Psalm 119:105',
    effect:
      'Reveal all face-down tiles within 3 spaces. The Prophet may reorder 3 Darkness cards.',
    powerLevel: 'Powerful',
    bestUsedBy: 'Prophet synergy — reveals tiles AND reorders deck',
  },
  {
    id: 'heWhoIsInMe',
    name: 'He Who is in Me',
    cardType: 'Disruption',
    scriptureReference: '1 John 4:4',
    effect: 'Cancel the next Darkness card drawn this Darkness Phase.',
    powerLevel: 'Standard',
    bestUsedBy: 'Any player — best when Meter is at 5+',
  },
  {
    id: 'swordOfTheSpiritCard',
    name: 'Sword of the Spirit',
    cardType: 'Cleansing',
    scriptureReference: 'Ephesians 6:17',
    effect:
      'Remove 1 Stronghold layer (reduces Cleanse requirement by 1 for this Stronghold).',
    powerLevel: 'Powerful',
    bestUsedBy: 'Any player during a Stronghold assault',
  },
];

// ── Darkness Cards ───────────────────────────────────────────────────

export const DARKNESS_CARDS: DarknessCardDef[] = [
  {
    id: 'creepingDark',
    name: 'Creeping Dark',
    category: 'ShadowSpread',
    severity: 'Low',
    effect: 'Add 1 Shadow Cube to a randomly rolled tile (roll 2d6 for coordinates).',
    target: 'Random tile',
    countInDeck: 6,
    darknessMeterImpact: 0,
  },
  {
    id: 'floodOfDarkness',
    name: 'Flood of Darkness',
    category: 'ShadowSpread',
    severity: 'High',
    effect:
      'Add 1 Shadow Cube to 2 random tiles adjacent to players.',
    target: '2 tiles with most player proximity',
    countInDeck: 5,
    darknessMeterImpact: 0,
  },
  {
    id: 'spreadingBlight',
    name: 'Spreading Blight',
    category: 'ShadowSpread',
    severity: 'High',
    effect:
      'Add 1 Shadow Cube to every tile that currently has 2 or more cubes on it.',
    target: 'All tiles with existing Shadow Cubes',
    countInDeck: 4,
    darknessMeterImpact: 0,
  },
  {
    id: 'encroach',
    name: 'Encroach',
    category: 'ShadowSpread',
    severity: 'Medium',
    effect:
      'Add 1 Shadow Cube to every tile adjacent to the largest active Stronghold on the board.',
    target: 'All tiles adjacent to largest Stronghold',
    countInDeck: 5,
    darknessMeterImpact: 0,
  },
  {
    id: 'spiritualWickednessAppears',
    name: 'Spiritual Wickedness Appears',
    category: 'EnemySummons',
    severity: 'Low',
    effect:
      'Place 1 Wickedness token on a Shadow tile with 2+ Shadow Cubes. If no such tile exists, add 2 cubes to any tile instead.',
    target: 'Shadow tile with 2+ cubes',
    countInDeck: 6,
    darknessMeterImpact: 0,
  },
  {
    id: 'powerManifests',
    name: 'Power Manifests',
    category: 'EnemySummons',
    severity: 'Medium',
    effect:
      'Place 1 Power token on any tile adjacent to the player with the fewest Faith tokens.',
    target: 'Adjacent to most-vulnerable player',
    countInDeck: 5,
    darknessMeterImpact: 0,
  },
  {
    id: 'principalityRises',
    name: 'Principality Rises',
    category: 'EnemySummons',
    severity: 'Critical',
    effect:
      'Place 1 Principality token on the nearest Stronghold tile. If no Strongholds remain, place on the darkest tile (most Shadow Cubes).',
    target: 'Nearest Stronghold tile',
    countInDeck: 4,
    darknessMeterImpact: 0,
  },
  {
    id: 'theEnemyRages',
    name: 'The Enemy Rages',
    category: 'Escalation',
    severity: 'High',
    effect: 'Advance the Darkness Meter by 1.',
    target: 'Darkness Meter',
    countInDeck: 4,
    darknessMeterImpact: 1,
  },
  {
    id: 'nightFalls',
    name: 'Night Falls',
    category: 'Escalation',
    severity: 'Critical',
    effect:
      'Advance the Darkness Meter by 2 and add 3 Shadow Cubes to any 3 tiles of your choice (place on highest-threat tiles).',
    target: 'Darkness Meter + 3 tiles',
    countInDeck: 4,
    darknessMeterImpact: 2,
  },
  {
    id: 'temptation',
    name: 'Temptation',
    category: 'Corruption',
    severity: 'Medium',
    effect: 'The player with the fewest Faith tokens loses 1 Faith token.',
    target: 'Most vulnerable player',
    countInDeck: 3,
    darknessMeterImpact: 0,
  },
  {
    id: 'accusation',
    name: 'Accusation',
    category: 'Corruption',
    severity: 'Medium',
    effect:
      'A named player must either discard their held Scripture card or lose 2 Faith tokens (their choice).',
    target: 'Named player (highest Scripture card count)',
    countInDeck: 2,
    darknessMeterImpact: 0,
  },
  {
    id: 'isolation',
    name: 'Isolation',
    category: 'Corruption',
    severity: 'Medium',
    effect:
      'Choose one player. That player may not use their Ministry Ability on their next turn.',
    target: 'Named player',
    countInDeck: 2,
    darknessMeterImpact: 0,
  },
  {
    id: 'persecution',
    name: 'Persecution',
    category: 'Trials',
    severity: 'Critical',
    effect:
      'Every player loses 1 Faith. The Darkness Meter advances by 1.',
    target: 'All players',
    countInDeck: 2,
    darknessMeterImpact: 1,
  },
  {
    id: 'valleyOfTheShadow',
    name: 'Valley of the Shadow',
    category: 'Trials',
    severity: 'High',
    effect:
      'The player with the most Faith loses 3 Faith. If they survive, they gain 1 bonus action on their next turn.',
    target: 'Highest-Faith player',
    countInDeck: 2,
    darknessMeterImpact: 1,
  },
  {
    id: 'darkNightOfTheSoul',
    name: 'Dark Night of the Soul',
    category: 'Trials',
    severity: 'High',
    effect:
      'The Prophet must discard all Scripture cards they currently hold. If the Prophet is not in play, the player with the most cards discards 2.',
    target: 'The Prophet',
    countInDeck: 1,
    darknessMeterImpact: 0,
  },
  {
    id: 'pulse',
    name: 'Pulse',
    category: 'StrongholdPulse',
    severity: 'High',
    effect:
      'Each active Stronghold on the board adds 1 Shadow Cube to each of its adjacent tiles.',
    target: 'All tiles adjacent to all active Strongholds',
    countInDeck: 3,
    darknessMeterImpact: 0,
  },
  {
    id: 'entrench',
    name: 'Entrench',
    category: 'StrongholdPulse',
    severity: 'Critical',
    effect:
      'Add an extra Stronghold layer to one Stronghold of your choice (now requires 4 Cleanse actions to remove instead of 3).',
    target: 'One Stronghold (most Cleanse actions already invested)',
    countInDeck: 2,
    darknessMeterImpact: 0,
  },
];

// ── Enemies ──────────────────────────────────────────────────────────

export const ENEMIES: Record<string, EnemyDef> = {
  Wickedness: {
    tier: 'Wickedness',
    name: 'Wickedness',
    spawnsOn: 'Shadow tiles with 2+ Shadow Cubes.',
    howToRemove: '1 Battle action on same tile. Roll 1d6, 3+ = success.',
    movement: 'Does not move.',
    darknessPhaseEffect: 'Adds 1 Shadow Cube to its tile.',
    rewardOnDefeat: 'None.',
    gameOverTrigger:
      'None directly — but contributes to Shadow overflow and Meter advancement.',
    specialRule:
      'At Darkness Meter 7, every Shadow tile with 3+ cubes auto-spawns a Wickedness token each round.',
    hitsRequired: 1,
    diceCount: 1,
    hitThreshold: 3,
  },
  Power: {
    tier: 'Power',
    name: 'Power',
    spawnsOn: 'Adjacent to any player.',
    howToRemove:
      '2 Battle actions (each: roll 2d6, 4+ on at least one die = 1 hit). Requires 2 hits total. Multiple players can contribute.',
    movement: 'Moves 1 tile toward the nearest player each Darkness Phase.',
    darknessPhaseEffect:
      'When adjacent to a player, that player loses 1 Faith token.',
    rewardOnDefeat: 'The whole team draws 1 Scripture card.',
    gameOverTrigger: 'None directly.',
    specialRule: 'At Meter level 3, Powers move 1 extra space per round.',
    hitsRequired: 2,
    diceCount: 2,
    hitThreshold: 4,
  },
  Principality: {
    tier: 'Principality',
    name: 'Principality',
    spawnsOn:
      'Nearest Stronghold tile. If no Strongholds remain, spawns on the darkest tile on the board.',
    howToRemove:
      '3 Battle actions total (each: roll 2d6, 5+ on at least one die = 1 hit). Multiple players must combine actions. Hits persist between turns.',
    movement: 'Does not move.',
    darknessPhaseEffect:
      'Spreads 1 Shadow Cube to every tile in the same row AND column as the Principality.',
    rewardOnDefeat:
      'Immediately unlock the next Armor of God piece, regardless of Shadow Cube count.',
    gameOverTrigger:
      '3 Principalities simultaneously on the board = immediate Game Over.',
    specialRule:
      'In Refined by Fire (Expert) mode, Principalities move 1 tile per round. Any player on its tile at round start loses 2 Faith.',
    hitsRequired: 3,
    diceCount: 2,
    hitThreshold: 5,
  },
};

// ── Board Layout ─────────────────────────────────────────────────────

export const BOARD_SIZE = 7;

/** Jerusalem center tile (0-indexed) */
export const JERUSALEM_COORD: Coord = { row: 3, col: 3 };

/** Stronghold positions (0-indexed from Notion's 1-indexed coords) */
export const STRONGHOLD_COORDS: Coord[] = [
  { row: 0, col: 0 },
  { row: 0, col: 6 },
  { row: 3, col: 0 },
  { row: 3, col: 6 },
  { row: 6, col: 0 },
  { row: 6, col: 6 },
  { row: 2, col: 3 },
];

/** Tile distribution for the 41 non-fixed tiles (excludes 7 Strongholds + 1 Jerusalem) */
export const TILE_BAG = {
  Light: 18,
  Shadow: 14,
  BrokenGround: 5,
  HighPlace: 4,
} as const;

/** Starting shadow cubes on Shadow tiles: min 1, max 2 */
export const SHADOW_TILE_STARTING_CUBES = { min: 1, max: 2 } as const;

/** Actions per turn */
export const ACTIONS_PER_TURN = 4;

/** Scripture hand limit */
export const SCRIPTURE_HAND_LIMIT = 4;

/** Copies of each scripture card in the deck */
export const SCRIPTURE_COPIES = 2;

/** Maximum shadow cubes before instant loss */
export const MAX_CUBES_BEFORE_LOSS = 5;

/** Overflow threshold — spill to adjacent when this many cubes on one tile */
export const OVERFLOW_THRESHOLD = 4;

/** Maximum darkness meter level — reaching this = loss */
export const MAX_DARKNESS_METER = 8;

/** Maximum simultaneous Principalities before loss */
export const MAX_PRINCIPALITIES = 3;

/** Stronghold layers (cleanse actions) to remove a Stronghold */
export const STRONGHOLD_DEFAULT_LAYERS = 3;

/** Total Strongholds to clear for win condition */
export const TOTAL_STRONGHOLDS = 7;

// ── Difficulty Presets ────────────────────────────────────────────────

export const DIFFICULTY_PRESETS: DifficultyPreset[] = [
  {
    id: 'seeker',
    name: 'Seeker (Easy)',
    description: 'Meter at 1. +2 Scripture cards each. Remove 15 worst Darkness cards.',
    startingDarknessMeter: 1,
    extraScriptureCards: 2,
    removedDarknessCards: [
      // Remove the 15 most punishing cards for a friendlier experience
      'nightFalls', 'nightFalls', 'nightFalls', 'nightFalls',       // all Night Falls (meter+2 each)
      'spreadingBlight', 'spreadingBlight', 'spreadingBlight',       // 3/4 Spreading Blight
      'principalityRises', 'principalityRises', 'principalityRises', // 3/4 Principality Rises
      'pulse', 'pulse', 'pulse',                                     // all Pulse (devastates with 7 strongholds)
      'persecution', 'persecution',                                   // all Persecution
    ],
    powersEveryOtherRound: false,
    extraDarknessCardsPerRound: 0,
    principalitiesCanMove: false,
  },
  {
    id: 'faithful',
    name: 'Faithful (Normal)',
    description: 'Standard rules.',
    startingDarknessMeter: 1,
    extraScriptureCards: 0,
    removedDarknessCards: [],
    powersEveryOtherRound: false,
    extraDarknessCardsPerRound: 0,
    principalitiesCanMove: false,
  },
  {
    id: 'tested',
    name: 'Tested (Hard)',
    description:
      'Meter at 2. Remove "By His Stripes" & "Greater is He." Powers every other round.',
    startingDarknessMeter: 2,
    extraScriptureCards: 0,
    removedDarknessCards: [],
    powersEveryOtherRound: true,
    extraDarknessCardsPerRound: 0,
    principalitiesCanMove: false,
  },
  {
    id: 'refinedByFire',
    name: 'Refined by Fire (Expert)',
    description:
      'Meter at 3. +1 Darkness card/round. Principalities can move.',
    startingDarknessMeter: 3,
    extraScriptureCards: 0,
    removedDarknessCards: [],
    powersEveryOtherRound: false,
    extraDarknessCardsPerRound: 1,
    principalitiesCanMove: true,
  },
];

/** Scripture cards removed in "Tested" difficulty */
export const TESTED_REMOVED_SCRIPTURE: string[] = [
  'byHisStripes',
  'greaterIsHe',
];

// ── Character accent colors (for UI) ─────────────────────────────────

export const CHARACTER_COLORS: Record<CharacterId, string> = {
  apostle: '#2563eb',
  prophet: '#d97706',
  evangelist: '#059669',
  pastor: '#dc2626',
  teacher: '#7c3aed',
};
