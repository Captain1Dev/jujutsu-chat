/**
 * Hand gesture and jutsu sign detection from MediaPipe landmarks.
 */

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
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

function isIndexOnlyExtended(landmarks) {
  return (
    isFingerExtended(landmarks, 8, 6) &&
    !isFingerExtended(landmarks, 12, 10) &&
    !isFingerExtended(landmarks, 16, 14) &&
    !isFingerExtended(landmarks, 20, 18) &&
    !isThumbExtended(landmarks)
  );
}

function isPeaceSign(landmarks) {
  return (
    isFingerExtended(landmarks, 8, 6) &&
    isFingerExtended(landmarks, 12, 10) &&
    !isFingerExtended(landmarks, 16, 14) &&
    !isFingerExtended(landmarks, 20, 18)
  );
}

function isPalmOpen(landmarks) {
  return countExtendedFingers(landmarks) >= 4;
}

function isClosedFist(landmarks) {
  return countExtendedFingers(landmarks) <= 1;
}

function isPalmFacingDown(landmarks) {
  const wrist = landmarks[0];
  const tipYs = [8, 12, 16, 20].map((i) => landmarks[i].y);
  const avgTipY = tipYs.reduce((sum, y) => sum + y, 0) / tipYs.length;
  return avgTipY > wrist.y + 0.04;
}

function handsAreClose(handA, handB, threshold = 0.18) {
  return distance(handA[9], handB[9]) < threshold;
}

function isTigerSign(hands) {
  if (hands.length >= 2) {
    return (
      handsAreClose(hands[0], hands[1]) &&
      isIndexOnlyExtended(hands[0]) &&
      isIndexOnlyExtended(hands[1])
    );
  }
  return hands.length === 1 && isIndexOnlyExtended(hands[0]);
}

function isBirdSign(hands) {
  if (hands.length >= 2) {
    return (
      handsAreClose(hands[0], hands[1], 0.22) &&
      isPalmFacingDown(hands[0]) &&
      isPalmFacingDown(hands[1])
    );
  }
  return hands.length === 1 && isPalmOpen(hands[0]);
}

function isDragonSign(hands) {
  if (hands.length >= 2) {
    return (
      handsAreClose(hands[0], hands[1], 0.14) &&
      isClosedFist(hands[0]) &&
      isClosedFist(hands[1])
    );
  }
  return hands.length === 1 && isPeaceSign(hands[0]);
}

/** Phase 3 proof-of-concept gestures (single hand). */
export function detectGesture(landmarks) {
  if (!landmarks || landmarks.length < 21) return null;
  if (isPalmOpen(landmarks)) return 'open_palm';
  if (isClosedFist(landmarks)) return 'closed_fist';
  return null;
}

/** Jutsu signs for the spell engine (supports one or two hands). */
export function detectSpellSign(multiHandLandmarks) {
  if (!multiHandLandmarks?.length) return null;

  if (isTigerSign(multiHandLandmarks)) return 'tiger';
  if (isBirdSign(multiHandLandmarks)) return 'bird';
  if (isDragonSign(multiHandLandmarks)) return 'dragon';

  return null;
}

export const GESTURE_LABELS = {
  open_palm: 'Open Palm',
  closed_fist: 'Closed Fist',
  tiger: 'Tiger',
  bird: 'Bird',
  dragon: 'Dragon',
};

export const SPELL_SEQUENCE = ['tiger', 'bird', 'dragon'];
