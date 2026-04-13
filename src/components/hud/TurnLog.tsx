import { useGameStore } from '../../store/gameStore';
import { useRef, useEffect } from 'react';

export function TurnLog() {
  const gameLog = useGameStore((s) => s.gameLog);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [gameLog.length]);

  return (
    <div className="flex flex-col gap-1 p-3 bg-slate-800/60 rounded-lg border border-slate-700/30">
      <span className="text-xs text-slate-400 uppercase tracking-wider">Event Log</span>
      <div ref={scrollRef} className="h-32 overflow-y-auto text-xs text-slate-400 space-y-0.5 font-mono">
        {gameLog.slice(-30).map((entry, i) => (
          <div key={i} className={entry.includes('---') ? 'text-amber-500 font-semibold mt-1' : ''}>
            {entry}
          </div>
        ))}
      </div>
    </div>
  );
}
