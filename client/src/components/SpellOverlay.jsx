import { useEffect, useState } from 'react';

const SPELL_CONFIG = {
  fireball: {
    title: 'FIREBALL!',
    titleClass: 'text-orange-400 drop-shadow-[0_0_12px_rgba(251,146,60,0.9)]',
    effectClass: 'fireball-effect',
  },
  water_dragon: {
    title: 'WATER DRAGON!',
    titleClass: 'text-cyan-300 drop-shadow-[0_0_12px_rgba(34,211,238,0.9)]',
    effectClass: 'water-dragon-effect',
  },
  earth_wall: {
    title: 'EARTH WALL!',
    titleClass: 'text-amber-600 drop-shadow-[0_0_12px_rgba(180,83,9,0.9)]',
    effectClass: 'earth-wall-effect',
  },
};

function parseSpellId(spellName) {
  if (!spellName) return null;
  return spellName.split('-')[0];
}

export default function SpellOverlay({ spellName }) {
  const [visible, setVisible] = useState(false);
  const spellId = parseSpellId(spellName);
  const config = spellId ? SPELL_CONFIG[spellId] : null;

  useEffect(() => {
    if (!spellName) return undefined;

    setVisible(true);
    const timer = setTimeout(() => setVisible(false), 2400);
    return () => clearTimeout(timer);
  }, [spellName]);

  if (!visible || !config) return null;

  return (
    <div className="absolute inset-0 z-30 pointer-events-none overflow-hidden">
      <div className={config.effectClass}>
        {spellId === 'fireball' && (
          <>
            <div className="fireball-trail" />
            <div className="fireball-core" />
          </>
        )}
        {spellId === 'water_dragon' && (
          <>
            <div className="water-dragon-wave water-dragon-wave-1" />
            <div className="water-dragon-wave water-dragon-wave-2" />
            <div className="water-dragon-splash" />
          </>
        )}
        {spellId === 'earth_wall' && (
          <>
            <div className="earth-wall-pillar earth-wall-pillar-1" />
            <div className="earth-wall-pillar earth-wall-pillar-2" />
            <div className="earth-wall-pillar earth-wall-pillar-3" />
            <div className="earth-wall-rubble" />
          </>
        )}
      </div>
      <p
        className={`absolute top-1/3 left-1/2 -translate-x-1/2 text-3xl sm:text-5xl font-black spell-title ${config.titleClass}`}
      >
        {config.title}
      </p>
    </div>
  );
}
