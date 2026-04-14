import { CHARACTERS, CHARACTER_COLORS, ARMOR_PIECES, SCRIPTURE_CARDS, DARKNESS_CARDS, ENEMIES } from '../../engine/constants';
import type { CharacterId } from '../../engine/types';
import { motion } from 'framer-motion';

export function RulesPage({ onBack }: { onBack: () => void }) {
  return (
    <div className="min-h-screen bg-[#0a0a0f] p-6">
      <div className="max-w-4xl mx-auto space-y-10">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-amber-400" style={{ fontFamily: 'Georgia, serif' }}>
            Five Fold — Complete Rules
          </h1>
          <button onClick={onBack} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm rounded-lg border border-slate-600/30">
            Back to Menu
          </button>
        </div>

        <p className="text-sm text-slate-400 italic leading-relaxed" style={{ fontFamily: 'Georgia, serif' }}>
          "So Christ himself gave the apostles, the prophets, the evangelists, the pastors and teachers,
          to equip his people for works of service, so that the body of Christ may be built up."
          <span className="block text-amber-600/60 mt-1">— Ephesians 4:11–12</span>
        </p>

        {/* Overview */}
        <RulesSection title="Overview">
          <p>
            <strong>Five Fold</strong> is a cooperative board game for 2–5 players set on a spiritual battlefield.
            Players take on the roles of five ministry characters working together to cleanse the land of Darkness.
            The more Darkness you remove, the more powerful your gifts become — but as Light grows, the Enemy escalates its assault.
          </p>
          <InfoGrid items={[
            { label: 'Players', value: '2–5' },
            { label: 'Play Time', value: '75–120 min' },
            { label: 'Type', value: 'Cooperative' },
            { label: 'Inspired By', value: 'Forbidden Desert' },
          ]} />
        </RulesSection>

        {/* The Board */}
        <RulesSection title="The Board">
          <p>
            The board is a <strong>7×7 grid</strong> of modular tiles placed face-down, revealed as players move through them.
            <strong> Jerusalem</strong> sits face-up at the center — it is the final objective where all players must converge to win.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
            <TileCard name="Light Tile" color="bg-indigo-900/40" desc="Safe ground. No penalty to move or act." />
            <TileCard name="Shadow Tile" color="bg-slate-950/70" desc="Contains Shadow Cubes. Costs 1 Faith to enter. Enemies spawn here." />
            <TileCard name="Stronghold" color="bg-red-950/60" desc="Requires 3 Cleanse actions to remove. 7 must be cleared to win." />
            <TileCard name="Broken Ground" color="bg-amber-950/40" desc="Costs 2 actions to cross. Spiritual desolation." />
            <TileCard name="High Place" color="bg-sky-950/40" desc="Player gains +1 action while standing here." />
            <TileCard name="Jerusalem" color="bg-amber-800/30" desc="The objective. All players must converge here to win." />
          </div>
        </RulesSection>

        {/* Setup */}
        <RulesSection title="Setup">
          <ol className="list-decimal list-inside space-y-1.5 text-slate-300">
            <li>Lay the 7×7 grid with <strong>Jerusalem</strong> face-up at center.</li>
            <li>Place 7 <strong>Stronghold tiles</strong> at the corners and key positions.</li>
            <li>Place all other tiles <strong>face-down</strong>.</li>
            <li>Players choose characters and collect their Faith tokens.</li>
            <li>Shuffle the <strong>Darkness Deck</strong> and <strong>Scripture Deck</strong> separately.</li>
            <li>Set the <strong>Darkness Meter to 1</strong> (or per difficulty).</li>
            <li>Place all 6 <strong>Armor of God tiles</strong> to the side — locked.</li>
            <li><strong>Evangelist</strong> starts on Jerusalem. All others start on any edge tile.</li>
            <li>Each player draws their starting Scripture cards.</li>
            <li>Draw <strong>3 Darkness cards</strong> to seed the board.</li>
          </ol>
        </RulesSection>

        {/* Turn Structure */}
        <RulesSection title="Turn Structure">
          <p className="mb-3">Each round follows <strong>five phases</strong> in strict order:</p>

          <PhaseCard phase="1" name="Prayer Phase" color="text-blue-400">
            All players draw Scripture cards back up to their hand limit (4). Resolve any "at round start" Armor effects.
            The team may briefly discuss strategy.
          </PhaseCard>

          <PhaseCard phase="2" name="Action Phase" color="text-emerald-400">
            <p className="mb-2">Players take turns. Each player receives <strong>4 actions</strong>.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <ActionRow icon="👣" name="Move" cost="1" desc="Move to adjacent tile. Shadow = -1 Faith." />
              <ActionRow icon="✨" name="Cleanse" cost="1" desc="Remove 1 Shadow Cube from your tile." />
              <ActionRow icon="⚔️" name="Battle" cost="1" desc="Roll dice against enemy on your tile." />
              <ActionRow icon="🙏" name="Pray" cost="1" desc="Restore 1 Faith (up to max)." />
              <ActionRow icon="💛" name="Encourage" cost="1" desc="Give 1 Faith to adjacent player." />
              <ActionRow icon="🛡" name="Fortify" cost="2" desc="Place a Prayer Token (+1 action to adjacent)." />
              <ActionRow icon="📖" name="Scripture" cost="FREE" desc="Play a card from hand. No action cost!" />
              <ActionRow icon="⭐" name="Ministry" cost="FREE" desc="Character ability. Once per turn." />
            </div>
          </PhaseCard>

          <PhaseCard phase="3" name="Darkness Phase" color="text-purple-400">
            Draw Darkness cards equal to the <strong>current Darkness Meter level</strong>. Resolve each immediately.
            If the deck is empty, reshuffle the discard and advance the Meter by 1.
          </PhaseCard>

          <PhaseCard phase="4" name="Enemy Phase" color="text-red-400">
            <strong>Wickedness</strong> adds 1 cube to its tile. <strong>Powers</strong> move toward nearest player and drain Faith.
            <strong>Principalities</strong> spread 1 cube to every tile in their row AND column.
          </PhaseCard>

          <PhaseCard phase="5" name="Check Phase" color="text-amber-400">
            <ol className="list-decimal list-inside space-y-1">
              <li><strong>Shadow Overflow:</strong> 4+ cubes on a tile → spill 1 to each adjacent → Meter +1.</li>
              <li><strong>Elimination:</strong> 0 Faith = eliminated (unless Helmet of Salvation is active).</li>
              <li><strong>Win Check:</strong> All 7 Strongholds cleared + all survivors on Jerusalem?</li>
              <li><strong>Loss Check:</strong> Any loss condition met?</li>
            </ol>
          </PhaseCard>
        </RulesSection>

        {/* Win & Loss */}
        <RulesSection title="Victory & Defeat">
          <div className="bg-emerald-950/30 border border-emerald-700/30 rounded-lg p-4 mb-4">
            <h4 className="text-emerald-400 font-bold mb-1">Victory — The Unity Convergence</h4>
            <p className="text-slate-300">
              The team wins when <strong>both conditions are met in the same round:</strong>
            </p>
            <ol className="list-decimal list-inside mt-2 text-slate-300">
              <li>All 7 Strongholds have been fully cleansed.</li>
              <li>All surviving players are on the <strong>Jerusalem tile</strong>.</li>
            </ol>
            <p className="text-xs text-emerald-600 italic mt-2">
              "...until we all reach unity in the faith and in the knowledge of the Son of God." — Ephesians 4:13
            </p>
          </div>

          <div className="space-y-2">
            <LossCard title="Overwhelmed" desc="Darkness Meter reaches level 8." tip="Monitor the Meter. Shield of Faith lets you cancel 1 card per round." />
            <LossCard title="A Player Falls" desc="Any player reaches 0 Faith before the Helmet of Salvation is unlocked." tip="Unlock the Helmet (42 cubes) ASAP. Pastor's passive can prevent one elimination." />
            <LossCard title="Three Principalities" desc="3 Principality tokens simultaneously on the board." tip="Never let 2 sit unchallenged. Attack as soon as the second appears." />
            <LossCard title="Shadow Flood" desc="A 5th Shadow Cube is placed on any single tile." tip="Prioritize tiles at 3 cubes before they cascade." />
          </div>
        </RulesSection>

        {/* Characters */}
        <RulesSection title="Characters">
          <div className="space-y-4">
            {(Object.keys(CHARACTERS) as CharacterId[]).map((id) => {
              const c = CHARACTERS[id];
              return (
                <motion.div
                  key={id}
                  className="bg-slate-800/40 border border-slate-700/20 rounded-lg p-4"
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-lg"
                      style={{ backgroundColor: CHARACTER_COLORS[id] }}>
                      {c.name.charAt(4).toUpperCase()}
                    </div>
                    <div>
                      <div className="text-base font-bold text-slate-100">{c.name}</div>
                      <div className="text-xs text-slate-400">{c.ministryTitle} — Faith: {c.faithMax} — {c.difficulty} — Starts: {c.startingPosition === 'jerusalem' ? 'Jerusalem' : 'Edge tile'}</div>
                    </div>
                  </div>
                  <p className="text-xs text-slate-400 mb-3">{c.roleSummary}</p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                    <AbilityCard label="Ministry (Free, 1/turn)" name={c.ministryAbility.name} desc={c.ministryAbility.description} color="text-blue-400" />
                    <AbilityCard label="Passive (Always active)" name={c.passive.name} desc={c.passive.description} color="text-emerald-400" />
                    <AbilityCard label="Anointing (Unlockable)" name={c.anointing.name} desc={c.anointing.description} color="text-amber-400" />
                  </div>
                  <div className="text-[10px] text-slate-500 italic mt-2">{c.scriptureReference}</div>
                </motion.div>
              );
            })}
          </div>
        </RulesSection>

        {/* Armor of God */}
        <RulesSection title="Armor of God">
          <p className="mb-3">
            As the team removes Shadow Cubes, Armor pieces unlock automatically when cumulative thresholds are reached.
            <strong> All Armor effects are GLOBAL</strong> — they apply to every player immediately.
            Defeating a Principality also instantly unlocks the next piece regardless of cube count.
          </p>
          <div className="space-y-2">
            {ARMOR_PIECES.map((a) => (
              <div key={a.id} className="flex items-start gap-3 bg-slate-800/30 rounded-lg p-3 border border-slate-700/20">
                <div className="w-8 h-8 rounded bg-amber-700/30 border border-amber-600/30 flex items-center justify-center text-amber-400 font-bold text-sm shrink-0">
                  {a.unlockOrder}
                </div>
                <div>
                  <div className="text-sm font-bold text-amber-300">{a.name} <span className="text-slate-500 font-normal">({a.cubesRequired} cubes)</span></div>
                  <div className="text-xs text-slate-400">{a.effect}</div>
                  <div className="text-[10px] text-slate-500 italic">{a.scriptureReference}</div>
                </div>
              </div>
            ))}
          </div>
        </RulesSection>

        {/* Enemies */}
        <RulesSection title="Enemies">
          <div className="space-y-3">
            {Object.values(ENEMIES).map((e) => (
              <div key={e.tier} className={`rounded-lg p-4 border ${
                e.tier === 'Principality' ? 'bg-purple-950/30 border-purple-700/30' :
                e.tier === 'Power' ? 'bg-orange-950/30 border-orange-700/30' :
                'bg-slate-800/30 border-slate-700/20'
              }`}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">{e.tier === 'Principality' ? '👑' : e.tier === 'Power' ? '🔥' : '💀'}</span>
                  <div>
                    <div className="text-sm font-bold text-slate-100">{e.name}</div>
                    <div className="text-[10px] text-slate-500">{e.tier === 'Principality' ? 'Boss Tier' : e.tier === 'Power' ? 'Mid Tier' : 'Low Tier'}</div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs text-slate-400">
                  <div><span className="text-slate-500">Spawns:</span> {e.spawnsOn}</div>
                  <div><span className="text-slate-500">Remove:</span> {e.howToRemove}</div>
                  <div><span className="text-slate-500">Each Round:</span> {e.darknessPhaseEffect}</div>
                  <div><span className="text-slate-500">Movement:</span> {e.movement}</div>
                  <div><span className="text-slate-500">Reward:</span> {e.rewardOnDefeat}</div>
                  <div><span className="text-slate-500">Danger:</span> {e.gameOverTrigger}</div>
                </div>
                {e.specialRule && <div className="text-xs text-amber-400/70 mt-2">Special: {e.specialRule}</div>}
              </div>
            ))}
          </div>
        </RulesSection>

        {/* Scripture Cards */}
        <RulesSection title="Scripture Cards (30 total — 2 copies each)">
          <p className="mb-3">
            Scripture cards are <strong>FREE to play</strong> — they cost zero actions. Play them aggressively!
            Each card is used once then discarded. During the Prayer Phase, draw back up to your hand limit (4).
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {SCRIPTURE_CARDS.map((card) => {
              const typeColors: Record<string, string> = {
                Cleansing: 'border-emerald-700/40 bg-emerald-950/20',
                Battle: 'border-red-700/40 bg-red-950/20',
                Healing: 'border-amber-700/40 bg-amber-950/20',
                Movement: 'border-blue-700/40 bg-blue-950/20',
                Unity: 'border-purple-700/40 bg-purple-950/20',
                Disruption: 'border-orange-700/40 bg-orange-950/20',
              };
              return (
                <div key={card.id} className={`rounded-lg p-3 border ${typeColors[card.cardType] || 'border-slate-700/30'}`}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-semibold text-slate-200">{card.name}</span>
                    <span className="text-[9px] text-slate-500 uppercase">{card.cardType} — {card.powerLevel}</span>
                  </div>
                  <p className="text-xs text-slate-400">{card.effect}</p>
                  <div className="text-[9px] text-slate-500 italic mt-1">{card.scriptureReference}</div>
                </div>
              );
            })}
          </div>
        </RulesSection>

        {/* Darkness Cards */}
        <RulesSection title="Darkness Cards (60 total)">
          <p className="mb-3">
            Drawn during the Darkness Phase — the number drawn equals the Darkness Meter level. Each is resolved immediately before drawing the next.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {DARKNESS_CARDS.map((card) => {
              const catColors: Record<string, string> = {
                ShadowSpread: 'border-gray-600/40',
                EnemySummons: 'border-red-700/40',
                Escalation: 'border-orange-700/40',
                Corruption: 'border-purple-700/40',
                Trials: 'border-blue-700/40',
                StrongholdPulse: 'border-amber-700/40',
              };
              return (
                <div key={card.id} className={`rounded-lg p-3 border bg-slate-900/40 ${catColors[card.category] || ''}`}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-semibold text-slate-200">{card.name}</span>
                    <span className="text-[9px] text-slate-500">×{card.countInDeck} — {card.severity}</span>
                  </div>
                  <p className="text-xs text-slate-400">{card.effect}</p>
                  <div className="text-[9px] text-slate-500 mt-1">Target: {card.target}</div>
                </div>
              );
            })}
          </div>
        </RulesSection>

        {/* Difficulty */}
        <RulesSection title="Difficulty Settings">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <DiffCard name="Seeker (Easy)" color="bg-green-950/30 border-green-700/30" items={[
              'Meter starts at 1', '+2 Scripture cards for each player', '10 worst Darkness cards removed'
            ]} />
            <DiffCard name="Faithful (Normal)" color="bg-blue-950/30 border-blue-700/30" items={['Standard rules. No modifications.']} />
            <DiffCard name="Tested (Hard)" color="bg-orange-950/30 border-orange-700/30" items={[
              'Meter starts at 2', '"By His Stripes" & "Greater is He" removed', 'Powers act every other round'
            ]} />
            <DiffCard name="Refined by Fire (Expert)" color="bg-red-950/30 border-red-700/30" items={[
              'Meter starts at 3', '+1 Darkness card drawn per round', 'Principalities can move'
            ]} />
          </div>
        </RulesSection>

        {/* Strategy Tips */}
        <RulesSection title="Strategy Tips">
          <ul className="space-y-2 text-sm text-slate-300">
            <li>Pair the <strong>Pastor with the weakest player</strong> — Darkness targets low-Faith characters.</li>
            <li>The <strong>Prophet is strongest early</strong> — use Revelation before high-impact turns.</li>
            <li><strong>Prioritize Strongholds</strong>, not every Shadow Cube — they're the win condition.</li>
            <li>The <strong>Teacher goes last</strong> — let the team create problems, then solve with Scripture combos.</li>
            <li>The <strong>Apostle belongs at center</strong> — edges waste their amplification.</li>
            <li><strong>Unlock Shield of Faith (30 cubes)</strong> before the hardest Strongholds.</li>
            <li><strong>Never split across opposite corners</strong> — darkness loves isolated believers.</li>
            <li><strong>Scripture cards are free — play them aggressively.</strong> Hoarding is the most common mistake.</li>
            <li><strong>Encourage is underrated.</strong> Giving 1 Faith to a player at 2 keeps them alive another round.</li>
          </ul>
        </RulesSection>

        {/* Closing */}
        <div className="text-center py-8 text-slate-500 text-sm italic" style={{ fontFamily: 'Georgia, serif' }}>
          <p>
            "The whole body, joined and held together by every supporting ligament,
            grows and builds itself up in love, as each part does its work."
          </p>
          <p className="text-amber-600/60 mt-1">— Ephesians 4:16</p>
        </div>

        <button onClick={onBack} className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-600/30 mb-8">
          Back to Menu
        </button>
      </div>
    </div>
  );
}

// ── Sub-components ───────────────────────────────────────────────────

function RulesSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 15 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-50px' }}
      transition={{ duration: 0.3 }}
    >
      <h2 className="text-xl font-bold text-slate-100 mb-3 border-b border-slate-700/40 pb-2" style={{ fontFamily: 'Georgia, serif' }}>
        {title}
      </h2>
      <div className="text-sm text-slate-300 leading-relaxed">{children}</div>
    </motion.section>
  );
}

function InfoGrid({ items }: { items: Array<{ label: string; value: string }> }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3">
      {items.map((item) => (
        <div key={item.label} className="bg-slate-800/40 rounded p-2 text-center border border-slate-700/20">
          <div className="text-xs text-slate-500">{item.label}</div>
          <div className="text-sm font-semibold text-slate-200">{item.value}</div>
        </div>
      ))}
    </div>
  );
}

function TileCard({ name, color, desc }: { name: string; color: string; desc: string }) {
  return (
    <div className={`rounded-lg p-3 border border-slate-700/20 ${color}`}>
      <div className="text-sm font-semibold text-slate-200">{name}</div>
      <div className="text-xs text-slate-400">{desc}</div>
    </div>
  );
}

function PhaseCard({ phase, name, color, children }: { phase: string; name: string; color: string; children: React.ReactNode }) {
  return (
    <div className="bg-slate-800/30 rounded-lg p-4 border border-slate-700/20 mb-3">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-6 h-6 rounded-full bg-slate-700/60 flex items-center justify-center text-xs font-bold text-slate-300">{phase}</div>
        <h4 className={`font-bold ${color}`}>{name}</h4>
      </div>
      <div className="text-xs text-slate-300 leading-relaxed">{children}</div>
    </div>
  );
}

function ActionRow({ icon, name, cost, desc }: { icon: string; name: string; cost: string; desc: string }) {
  return (
    <div className="flex items-start gap-2 bg-slate-900/30 rounded p-2">
      <span className="text-base shrink-0">{icon}</span>
      <div>
        <div className="flex items-center gap-1">
          <span className="font-semibold text-slate-200">{name}</span>
          <span className={`text-[9px] px-1 rounded ${cost === 'FREE' ? 'bg-emerald-700/40 text-emerald-300' : 'bg-slate-700/60 text-slate-400'}`}>
            {cost === 'FREE' ? 'FREE' : `${cost} action`}
          </span>
        </div>
        <div className="text-[10px] text-slate-400">{desc}</div>
      </div>
    </div>
  );
}

function AbilityCard({ label, name, desc, color }: { label: string; name: string; desc: string; color: string }) {
  return (
    <div className="bg-slate-900/40 rounded p-2 border border-slate-700/20">
      <div className="text-[9px] text-slate-500 uppercase">{label}</div>
      <div className={`text-xs font-semibold ${color}`}>{name}</div>
      <div className="text-[10px] text-slate-400 mt-0.5">{desc}</div>
    </div>
  );
}

function LossCard({ title, desc, tip }: { title: string; desc: string; tip: string }) {
  return (
    <div className="bg-red-950/20 border border-red-800/30 rounded-lg p-3">
      <div className="text-sm font-bold text-red-400">{title}</div>
      <div className="text-xs text-slate-300">{desc}</div>
      <div className="text-[10px] text-slate-500 mt-1">Prevention: {tip}</div>
    </div>
  );
}

function DiffCard({ name, color, items }: { name: string; color: string; items: string[] }) {
  return (
    <div className={`rounded-lg p-3 border ${color}`}>
      <div className="text-sm font-bold text-slate-200 mb-1">{name}</div>
      <ul className="text-xs text-slate-400 space-y-0.5">
        {items.map((item, i) => <li key={i}>• {item}</li>)}
      </ul>
    </div>
  );
}
