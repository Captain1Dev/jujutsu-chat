import { SPELL_SEQUENCE } from './gestures.js';

const WINDOW_MS = 3000;
const HOLD_MS = 400;

/**
 * Tracks Tiger -> Bird -> Dragon within a 3-second window.
 * Returns progress and fires onCast when the full sequence completes.
 */
export function createSpellEngine(onCast) {
  let progress = [];
  let windowStart = 0;
  let lastSign = null;
  let lastSignAt = 0;

  const reset = () => {
    progress = [];
    windowStart = 0;
    lastSign = null;
    lastSignAt = 0;
  };

  const push = (sign) => {
    if (!sign) return { progress: [...progress], cast: null };

    const now = Date.now();

    if (sign === lastSign && now - lastSignAt < HOLD_MS) {
      return { progress: [...progress], cast: null };
    }

    if (!windowStart || now - windowStart > WINDOW_MS) {
      progress = [];
      windowStart = now;
    }

    const expected = SPELL_SEQUENCE[progress.length];
    let cast = null;

    if (sign === expected) {
      progress.push(sign);
      lastSign = sign;
      lastSignAt = now;

      if (progress.length === SPELL_SEQUENCE.length) {
        cast = 'fireball';
        onCast?.(cast);
        reset();
      }
    } else if (sign === SPELL_SEQUENCE[0]) {
      progress = [sign];
      windowStart = now;
      lastSign = sign;
      lastSignAt = now;
    } else {
      progress = [];
      windowStart = 0;
      lastSign = sign;
      lastSignAt = now;
    }

    return { progress: [...progress], cast };
  };

  return { push, reset, getProgress: () => [...progress] };
}
