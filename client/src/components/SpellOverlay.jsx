import { useEffect, useState } from 'react';

export default function SpellOverlay({ spellName }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!spellName) return undefined;

    setVisible(true);
    const timer = setTimeout(() => setVisible(false), 2200);
    return () => clearTimeout(timer);
  }, [spellName]);

  if (!visible) return null;

  return (
    <div className="absolute inset-0 z-30 pointer-events-none overflow-hidden">
      <div className="fireball-trail" />
      <div className="fireball-core" />
      <p className="absolute top-1/3 left-1/2 -translate-x-1/2 text-3xl sm:text-5xl font-black text-orange-400 fireball-text drop-shadow-[0_0_12px_rgba(251,146,60,0.9)]">
        FIREBALL!
      </p>
    </div>
  );
}
