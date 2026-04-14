import { motion } from 'framer-motion';

interface Props {
  onClose: () => void;
}

export function RulesReference({ onClose }: Props) {
  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="max-w-2xl w-full mx-4 max-h-[85vh] overflow-y-auto bg-slate-900/95 border border-slate-600/30 rounded-xl p-6"
        initial={{ scale: 0.9 }}
        animate={{ scale: 1 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-amber-400" style={{ fontFamily: 'Georgia, serif' }}>Quick Reference</h2>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300">Close</button>
        </div>

        <div className="space-y-4 text-sm text-slate-300">
          {/* Actions */}
          <Section title="Actions (4 per turn)">
            <Row icon="👣" label="Move" cost="1 action" desc="Move to adjacent tile. Shadow tiles cost 1 Faith to enter." />
            <Row icon="✨" label="Cleanse" cost="1 action" desc="Remove 1 Shadow Cube from your tile (2 with Sword of Spirit)." />
            <Row icon="⚔" label="Battle" cost="1 action" desc="Roll dice against an enemy on your tile." />
            <Row icon="🙏" label="Pray" cost="1 action" desc="Restore 1 Faith (up to max)." />
            <Row icon="💛" label="Encourage" cost="1 action" desc="Give 1 Faith to an adjacent player." />
            <Row icon="🛡" label="Fortify" cost="2 actions" desc="Place a Prayer Token (+1 action to adjacent players)." />
            <Row icon="📖" label="Scripture" cost="FREE" desc="Play a Scripture card from your hand." />
            <Row icon="⭐" label="Ministry" cost="FREE (1/turn)" desc="Use your character's special ability." />
          </Section>

          {/* Win/Loss */}
          <Section title="Victory">
            <p>Clear all 7 Strongholds AND get all surviving players to Jerusalem in the same round.</p>
          </Section>

          <Section title="Defeat (any one = instant loss)">
            <Row icon="📊" label="Meter 8" cost="" desc="Darkness Meter reaches level 8." />
            <Row icon="💔" label="0 Faith" cost="" desc="Any player hits 0 Faith without the Helmet of Salvation." />
            <Row icon="👑" label="3 Principalities" cost="" desc="3 Principality enemies on the board simultaneously." />
            <Row icon="⬛" label="5th Cube" cost="" desc="5 Shadow Cubes on any single tile." />
          </Section>

          {/* Enemies */}
          <Section title="Enemies">
            <Row icon="💀" label="Wickedness" cost="1d6, 3+" desc="Adds 1 cube/round. 1 hit to kill." />
            <Row icon="🔥" label="Power" cost="2d6, 4+" desc="Moves toward players, drains Faith. 2 hits to kill." />
            <Row icon="👑" label="Principality" cost="2d6, 5+" desc="Spreads cubes to entire row+column. 3 hits. Defeat = unlock Armor." />
          </Section>

          {/* Overflow */}
          <Section title="Shadow Overflow">
            <p>When a tile reaches 4 cubes: spill 1 cube to each adjacent tile and Darkness Meter +1. Can cascade! 5th cube = instant loss.</p>
          </Section>

          {/* Armor */}
          <Section title="Armor of God (unlocks by total cubes removed)">
            <Row icon="1" label="Belt of Truth (5)" cost="" desc="Discard Corruption darkness cards on draw." />
            <Row icon="2" label="Breastplate (12)" cost="" desc="All Faith loss reduced by 1." />
            <Row icon="3" label="Boots of Peace (20)" cost="" desc="+1 movement range for all." />
            <Row icon="4" label="Shield of Faith (30)" cost="" desc="Cancel 1 Darkness card per round." />
            <Row icon="5" label="Helmet of Salvation (42)" cost="" desc="No permanent elimination (respawn at Jerusalem)." />
            <Row icon="6" label="Sword of Spirit (55)" cost="" desc="Cleanse removes 2 cubes. Battle +1 damage." />
          </Section>
        </div>
      </motion.div>
    </motion.div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-xs font-bold text-amber-400/80 uppercase tracking-wider mb-1.5">{title}</h3>
      <div className="space-y-1">{children}</div>
    </div>
  );
}

function Row({ icon, label, cost, desc }: { icon: string; label: string; cost: string; desc: string }) {
  return (
    <div className="flex items-start gap-2 text-xs">
      <span className="w-5 text-center shrink-0">{icon}</span>
      <span className="font-medium text-slate-200 w-28 shrink-0">{label}</span>
      {cost && <span className="text-amber-400 w-20 shrink-0">{cost}</span>}
      <span className="text-slate-400">{desc}</span>
    </div>
  );
}
