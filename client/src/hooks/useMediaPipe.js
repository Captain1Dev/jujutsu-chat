import { useEffect, useRef, useState } from 'react';
import { Hands } from '@mediapipe/hands';
import { Camera } from '@mediapipe/camera_utils';
import { drawConnectors, drawLandmarks, HAND_CONNECTIONS } from '@mediapipe/drawing_utils';
import { detectSpellSign } from '../utils/gestures.js';
import { createGestureStabilizer } from '../utils/gestureStabilizer.js';

const MEDIAPIPE_CDN = 'https://cdn.jsdelivr.net/npm/@mediapipe/hands';

export function useMediaPipe(videoRef, enabled) {
  const canvasRef = useRef(null);
  const [gesture, setGesture] = useState(null);
  const [tracking, setTracking] = useState(false);
  const stabilizerRef = useRef(createGestureStabilizer());

  useEffect(() => {
    if (!enabled || !videoRef.current) {
      return undefined;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!canvas) {
      return undefined;
    }

    let active = true;
    stabilizerRef.current = createGestureStabilizer({
      confirmFrames: 7,
      releaseFrames: 5,
    });

    const hands = new Hands({
      locateFile: (file) => `${MEDIAPIPE_CDN}/${file}`,
    });

    hands.setOptions({
      maxNumHands: 2,
      modelComplexity: 1,
      minDetectionConfidence: 0.7,
      minTrackingConfidence: 0.65,
    });

    hands.onResults((results) => {
      if (!active) return;

      const ctx = canvas.getContext('2d');
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;

      ctx.save();
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      let rawSign = null;

      if (results.multiHandLandmarks?.length) {
        for (const landmarks of results.multiHandLandmarks) {
          drawConnectors(ctx, landmarks, HAND_CONNECTIONS, {
            color: '#00FF88',
            lineWidth: 2,
          });
          drawLandmarks(ctx, landmarks, {
            color: '#FF0066',
            lineWidth: 1,
            radius: 3,
          });
        }

        rawSign = detectSpellSign(results.multiHandLandmarks);
      }

      ctx.restore();

      const stableSign = stabilizerRef.current.update(rawSign);
      setGesture(stableSign);
    });

    const camera = new Camera(video, {
      onFrame: async () => {
        if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
          await hands.send({ image: video });
        }
      },
      width: 640,
      height: 480,
    });

    camera.start().then(() => {
      if (active) setTracking(true);
    });

    return () => {
      active = false;
      setTracking(false);
      setGesture(null);
      stabilizerRef.current.reset();
      camera.stop();
      hands.close();
    };
  }, [enabled, videoRef]);

  return { canvasRef, gesture, tracking };
}
