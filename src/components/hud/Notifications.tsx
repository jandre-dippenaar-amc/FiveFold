import { useState, useEffect, useRef } from 'react';
import { useGameStore } from '../../store/gameStore';
import { motion, AnimatePresence } from 'framer-motion';

interface Notification {
  id: number;
  text: string;
  type: 'info' | 'danger' | 'success' | 'warning';
}

let notifId = 0;

export function Notifications() {
  const gameLog = useGameStore((s) => s.gameLog);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const prevLogLen = useRef(0);

  useEffect(() => {
    if (gameLog.length <= prevLogLen.current) {
      prevLogLen.current = gameLog.length;
      return;
    }

    // Get new log entries
    const newEntries = gameLog.slice(prevLogLen.current);
    prevLogLen.current = gameLog.length;

    const newNotifs: Notification[] = newEntries
      .filter((entry) => {
        // Only show important events as notifications
        return (
          entry.includes('Armor Unlocked') ||
          entry.includes('Principality') ||
          entry.includes('defeated') ||
          entry.includes('Shadow Overflow') ||
          entry.includes('eliminated') ||
          entry.includes('Stronghold') && entry.includes('cleansed') ||
          entry.includes('Darkness Card:') ||
          entry.includes('--- ') // Phase transitions
        );
      })
      .map((text) => ({
        id: ++notifId,
        text: text.replace('--- ', '').replace(' ---', ''),
        type: text.includes('Armor Unlocked') || text.includes('defeated') || text.includes('cleansed')
          ? 'success' as const
          : text.includes('Overflow') || text.includes('eliminated') || text.includes('Principality Rises')
          ? 'danger' as const
          : text.includes('Darkness')
          ? 'warning' as const
          : 'info' as const,
      }));

    if (newNotifs.length > 0) {
      setNotifications((prev) => [...prev, ...newNotifs].slice(-5));
    }

    // Auto-dismiss after 3 seconds
    const timer = setTimeout(() => {
      setNotifications((prev) => prev.slice(newNotifs.length));
    }, 3500);

    return () => clearTimeout(timer);
  }, [gameLog.length]);

  const colors = {
    info: 'bg-blue-900/80 border-blue-600/40 text-blue-200',
    danger: 'bg-red-900/80 border-red-600/40 text-red-200',
    success: 'bg-emerald-900/80 border-emerald-600/40 text-emerald-200',
    warning: 'bg-amber-900/80 border-amber-600/40 text-amber-200',
  };

  return (
    <div className="fixed top-12 right-4 z-30 space-y-1 pointer-events-none max-w-xs">
      <AnimatePresence>
        {notifications.map((notif) => (
          <motion.div
            key={notif.id}
            className={`px-3 py-1.5 rounded-lg border text-xs backdrop-blur-sm ${colors[notif.type]}`}
            initial={{ opacity: 0, x: 50, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 50, scale: 0.9 }}
            transition={{ duration: 0.2 }}
          >
            {notif.text}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
