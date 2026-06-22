/**
 * Requires a sign to appear consistently across frames before confirming.
 */
export function createGestureStabilizer({
  confirmFrames = 10,
  releaseFrames = 6,
} = {}) {
  let stableSign = null;
  let candidateSign = null;
  let candidateFrames = 0;
  let releaseFramesCount = 0;

  const update = (rawSign) => {
    if (rawSign === stableSign) {
      candidateSign = rawSign;
      candidateFrames = confirmFrames;
      releaseFramesCount = 0;
      return stableSign;
    }

    if (!rawSign) {
      releaseFramesCount += 1;
      candidateSign = null;
      candidateFrames = 0;

      if (releaseFramesCount >= releaseFrames) {
        stableSign = null;
      }

      return stableSign;
    }

    releaseFramesCount = 0;

    if (rawSign === candidateSign) {
      candidateFrames += 1;
    } else {
      candidateSign = rawSign;
      candidateFrames = 1;
    }

    if (candidateFrames >= confirmFrames) {
      stableSign = rawSign;
    }

    return stableSign;
  };

  const reset = () => {
    stableSign = null;
    candidateSign = null;
    candidateFrames = 0;
    releaseFramesCount = 0;
  };

  return { update, reset };
}
