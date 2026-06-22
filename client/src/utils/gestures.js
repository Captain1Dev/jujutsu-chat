/**
 * Hand gesture and jutsu sign detection from MediaPipe landmarks.
 * Uses confidence scoring — only one sign wins per frame.
 */

const DEFAULT_MIN_SCORE = 0.68;
const DEFAULT_MIN_MARGIN = 0.08;

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function clamp01(value) {
  return Math.max(0, Math.min(1, value));
}

function isThumbExtended(landmarks) {
  const wrist = landmarks[0];
  return distance(landmarks[4], wrist) > distance(landmarks[3], wrist) * 1.05;
}

function isFingerExtended(landmarks, tipIndex, pipIndex) {
  const wrist = landmarks[0];
  return (
    distance(landmarks[tipIndex], wrist) >
    distance(landmarks[pipIndex], wrist) * 1.02
  );
}

function isFingerCurled(landmarks, tipIndex, pipIndex) {
  const mcpIndex = pipIndex - 1;
  return (
    distance(landmarks[tipIndex], landmarks[mcpIndex]) <
    distance(landmarks[pipIndex], landmarks[mcpIndex]) * 1.05
  );
}

function countExtendedFingers(landmarks) {
  let count = 0;
  if (isThumbExtended(landmarks)) count += 1;

  for (const [tip, pip] of [
    [8, 6],
    [12, 10],
    [16, 14],
    [20, 18],
  ]) {
    if (isFingerExtended(landmarks, tip, pip)) count += 1;
  }

  return count;
}

function handArea(landmarks) {
  const xs = landmarks.map((point) => point.x);
  const ys = landmarks.map((point) => point.y);
  return (Math.max(...xs) - Math.min(...xs)) * (Math.max(...ys) - Math.min(...ys));
}

function pickDominantHand(hands) {
  return hands.reduce((best, current) =>
    handArea(current) > handArea(best) ? current : best,
  );
}

function scoreTigerOneHand(landmarks) {
  let score = 0;
  if (isFingerExtended(landmarks, 8, 6)) score += 0.35;
  if (!isFingerExtended(landmarks, 12, 10)) score += 0.2;
  if (!isFingerExtended(landmarks, 16, 14)) score += 0.15;
  if (!isFingerExtended(landmarks, 20, 18)) score += 0.15;
  if (!isThumbExtended(landmarks)) score += 0.1;

  if (countExtendedFingers(landmarks) >= 4) score *= 0.3;

  return clamp01(score);
}

function scoreDragonOneHand(landmarks) {
  let score = 0;
  if (isFingerExtended(landmarks, 8, 6)) score += 0.3;
  if (isFingerExtended(landmarks, 12, 10)) score += 0.3;
  if (!isFingerExtended(landmarks, 16, 14)) score += 0.2;
  if (!isFingerExtended(landmarks, 20, 18)) score += 0.2;

  if (countExtendedFingers(landmarks) >= 4) score *= 0.2;

  return clamp01(score);
}

function scoreBirdOneHand(landmarks) {
  let score = 0;
  const extended = countExtendedFingers(landmarks);

  if (extended >= 4) score += 0.45;
  if (extended === 5) score += 0.15;

  const fingerSpread = distance(landmarks[8], landmarks[20]);
  if (fingerSpread > 0.12) score += 0.15;
  if (fingerSpread > 0.18) score += 0.1;

  for (const [tip, pip] of [
    [8, 6],
    [12, 10],
    [16, 14],
    [20, 18],
  ]) {
    if (isFingerExtended(landmarks, tip, pip)) score += 0.04;
  }

  if (scoreTigerOneHand(landmarks) > 0.8) score *= 0.25;
  if (scoreDragonOneHand(landmarks) > 0.8) score *= 0.25;

  return clamp01(score);
}

function isKnucklesForward(landmarks) {
  const middleTip = landmarks[12];
  const middleMcp = landmarks[9];
  const wrist = landmarks[0];

  return (
    countExtendedFingers(landmarks) <= 1 &&
    distance(middleTip, middleMcp) < distance(middleTip, wrist) * 0.85 &&
    isFingerCurled(landmarks, 8, 6) &&
    isFingerCurled(landmarks, 12, 10)
  );
}

function scoreBoarTwoHands(a, b) {
  let score = 0;
  const palmDist = distance(a[9], b[9]);

  if (palmDist < 0.16) return 0;
  if (palmDist > 0.14) score += 0.2;
  if (palmDist > 0.2) score += 0.15;

  if (isKnucklesForward(a)) score += 0.3;
  if (isKnucklesForward(b)) score += 0.3;

  if (countExtendedFingers(a) <= 1) score += 0.05;
  if (countExtendedFingers(b) <= 1) score += 0.05;

  return clamp01(score);
}

function sortHandsLeftRight(hands) {
  return [...hands].sort((handA, handB) => handA[0].x - handB[0].x);
}

function isRamHorns(landmarks) {
  return (
    isFingerExtended(landmarks, 8, 6) &&
    isFingerExtended(landmarks, 12, 10) &&
    !isFingerExtended(landmarks, 16, 14) &&
    !isFingerExtended(landmarks, 20, 18)
  );
}

function countInterlockPoints(handA, handB) {
  const tipsA = [4, 8, 12, 16, 20];
  const tipsB = [4, 8, 12, 16, 20];
  const joints = [3, 6, 10, 14, 18];
  let total = 0;

  for (const tipIndex of tipsA) {
    for (const jointIndex of joints) {
      if (distance(handA[tipIndex], handB[jointIndex]) < 0.15) {
        total += 1;
      }
    }
  }

  for (const tipIndex of tipsB) {
    for (const jointIndex of joints) {
      if (distance(handB[tipIndex], handA[jointIndex]) < 0.15) {
        total += 1;
      }
    }
  }

  return total;
}

function countTipsNearPalm(hand, palmCenter) {
  return [8, 12, 16, 20].filter((index) => distance(hand[index], palmCenter) < 0.16)
    .length;
}

function scoreSnakeTwoHands(a, b) {
  const palmDist = distance(a[9], b[9]);
  const wristDist = distance(a[0], b[0]);

  if (palmDist > 0.38 && wristDist > 0.4) return 0;

  // Ram horns on both hands = not snake
  if (isRamHorns(a) && isRamHorns(b) && palmDist < 0.3) return 0;

  let score = 0.2;
  if (palmDist < 0.32) score += 0.15;
  if (palmDist < 0.24) score += 0.15;
  if (wristDist < 0.28) score += 0.1;

  const interlock = countInterlockPoints(a, b);
  score += Math.min(interlock * 0.1, 0.45);

  const tipsOnOtherPalms =
    countTipsNearPalm(a, b[9]) + countTipsNearPalm(b, a[9]);
  score += Math.min(tipsOnOtherPalms * 0.07, 0.28);

  const extA = countExtendedFingers(a);
  const extB = countExtendedFingers(b);
  if (extA >= 2 && extA <= 4) score += 0.08;
  if (extB >= 2 && extB <= 4) score += 0.08;
  if (extA >= 5 && extB >= 5) score *= 0.45;

  return clamp01(score);
}

function scoreRamTwoHands(a, b) {
  if (!isRamHorns(a) || !isRamHorns(b)) return 0;

  let score = 0.58;
  const palmDist = distance(a[9], b[9]);

  if (palmDist < 0.34) score += 0.12;
  if (palmDist < 0.24) score += 0.08;

  if (isFingerCurled(a, 16, 14)) score += 0.06;
  if (isFingerCurled(a, 20, 18)) score += 0.06;
  if (isFingerCurled(b, 16, 14)) score += 0.06;
  if (isFingerCurled(b, 20, 18)) score += 0.06;

  const lowLinks = [
    distance(a[16], b[16]),
    distance(a[20], b[20]),
    distance(a[16], b[20]),
    distance(a[20], b[16]),
    distance(a[14], b[14]),
    distance(a[18], b[18]),
  ];
  const bestLink = Math.min(...lowLinks);
  if (bestLink < 0.18) score += 0.12;
  if (bestLink < 0.12) score += 0.08;

  return clamp01(score);
}

function scoreDragonTwoHands(a, b) {
  let score = 0;
  const palmDist = distance(a[9], b[9]);

  if (palmDist > 0.18) return 0;
  if (palmDist < 0.16) score += 0.35;

  if (countExtendedFingers(a) <= 1) score += 0.25;
  if (countExtendedFingers(b) <= 1) score += 0.25;

  if (scoreDragonOneHand(a) > 0.55 || scoreDragonOneHand(b) > 0.55) {
    score *= 0.35;
  }

  return clamp01(score);
}

function scoreTigerTwoHands(a, b) {
  let score = 0;
  if (distance(a[9], b[9]) < 0.24) score += 0.15;
  score += scoreTigerOneHand(a) * 0.42;
  score += scoreTigerOneHand(b) * 0.42;
  return clamp01(score);
}

function scoreBirdTwoHands(a, b) {
  let score = 0;
  const palmDist = distance(a[9], b[9]);

  if (palmDist > 0.32) return 0;
  score += scoreBirdOneHand(a) * 0.35;
  score += scoreBirdOneHand(b) * 0.35;

  const wristA = a[0];
  const wristB = b[0];
  const tipsDownA = [8, 12, 16, 20].filter((i) => a[i].y > wristA.y + 0.02).length;
  const tipsDownB = [8, 12, 16, 20].filter((i) => b[i].y > wristB.y + 0.02).length;

  if (tipsDownA >= 3) score += 0.15;
  if (tipsDownB >= 3) score += 0.15;

  return clamp01(score);
}

function collectOneHandScores(landmarks) {
  return new Map([
    ['tiger', scoreTigerOneHand(landmarks)],
    ['dragon', scoreDragonOneHand(landmarks)],
    ['bird', scoreBirdOneHand(landmarks)],
  ]);
}

function collectTwoHandScores(a, b) {
  const scores = new Map();
  const entries = [
    ['snake', scoreSnakeTwoHands(a, b)],
    ['ram', scoreRamTwoHands(a, b)],
    ['boar', scoreBoarTwoHands(a, b)],
    ['dragon', scoreDragonTwoHands(a, b)],
    ['tiger', scoreTigerTwoHands(a, b)],
    ['bird', scoreBirdTwoHands(a, b)],
  ];

  for (const [sign, score] of entries) {
    if (score > 0) scores.set(sign, score);
  }

  return scores;
}

function pickBestSign(scores, minScore = DEFAULT_MIN_SCORE, minMargin = DEFAULT_MIN_MARGIN) {
  const ranked = [...scores.entries()].sort((a, b) => b[1] - a[1]);
  if (ranked.length === 0) return null;

  const [bestSign, bestScore] = ranked[0];
  const secondScore = ranked[1]?.[1] ?? 0;

  if (bestScore < minScore) return null;
  if (bestScore - secondScore < minMargin) return null;

  return bestSign;
}

/** Phase 3 proof-of-concept gestures (single hand). */
export function detectGesture(landmarks) {
  if (!landmarks || landmarks.length < 21) return null;
  if (scoreBirdOneHand(landmarks) >= 0.75) return 'open_palm';
  if (isKnucklesForward(landmarks)) return 'closed_fist';
  return null;
}

/**
 * Jutsu signs for the spell engine.
 * - One hand: Tiger, Dragon, Bird
 * - Two hands: Snake, Ram, Boar (+ two-hand variants)
 * Boar never triggers with one hand.
 */
export function detectSpellSign(multiHandLandmarks) {
  if (!multiHandLandmarks?.length) return null;

  if (multiHandLandmarks.length >= 2) {
    const [a, b] = sortHandsLeftRight(multiHandLandmarks);
    const twoHandScores = collectTwoHandScores(a, b);

    const snakeScore = twoHandScores.get('snake') ?? 0;
    const ramScore = twoHandScores.get('ram') ?? 0;

    if (snakeScore >= 0.55 && snakeScore >= ramScore + 0.04) {
      return 'snake';
    }
    if (ramScore >= 0.58) {
      return 'ram';
    }

    const twoHandBest = pickBestSign(twoHandScores, 0.55, 0.04);
    if (twoHandBest) return twoHandBest;
  }

  const dominantHand = pickDominantHand(multiHandLandmarks);
  return pickBestSign(collectOneHandScores(dominantHand), 0.65, 0.07);
}

/** Debug helper — returns all sign scores for the current frame. */
export function scoreSpellSigns(multiHandLandmarks) {
  if (!multiHandLandmarks?.length) return {};

  const merged = new Map();

  if (multiHandLandmarks.length >= 2) {
    const [a, b] = sortHandsLeftRight(multiHandLandmarks);
    for (const [sign, score] of collectTwoHandScores(a, b)) {
      merged.set(sign, score);
    }
  }

  for (const [sign, score] of collectOneHandScores(
    pickDominantHand(multiHandLandmarks),
  )) {
    merged.set(sign, Math.max(merged.get(sign) ?? 0, score));
  }

  return Object.fromEntries(merged);
}

export const GESTURE_LABELS = {
  open_palm: 'Open Palm',
  closed_fist: 'Closed Fist',
  tiger: 'Tiger',
  snake: 'Snake',
  ram: 'Ram',
  boar: 'Boar',
  bird: 'Bird',
  dragon: 'Dragon',
};

/** Which signs work with one vs two hands (for UI hints). */
export const SIGN_HAND_REQUIREMENTS = {
  tiger: 'one or two',
  dragon: 'one or two',
  bird: 'one or two',
  snake: 'two hands',
  ram: 'two hands',
  boar: 'two hands',
};

/** @deprecated Use SPELL_RECIPES from spellEngine.js */
export const SPELL_SEQUENCE = ['tiger', 'bird', 'dragon'];
