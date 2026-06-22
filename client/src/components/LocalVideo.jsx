import { useEffect, useRef } from 'react';
import { useMediaPipe } from '../hooks/useMediaPipe.js';
import { GESTURE_LABELS } from '../utils/gestures.js';

export default function LocalVideo({ stream, onGestureChange }) {
  const videoRef = useRef(null);
  const { canvasRef, gesture, tracking } = useMediaPipe(videoRef, !!stream);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  useEffect(() => {
    onGestureChange?.(gesture);
  }, [gesture, onGestureChange]);

  return (
    <div className="absolute bottom-20 right-4 z-20 w-40 h-28 sm:w-52 sm:h-40 rounded-lg overflow-hidden border-2 border-white/30 shadow-lg bg-zinc-900">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="w-full h-full object-cover"
        style={{ transform: 'scaleX(-1)' }}
      />
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none opacity-0"
        style={{ transform: 'scaleX(-1)' }}
        aria-hidden="true"
      />
      {tracking && gesture && (
        <div className="absolute bottom-1 left-1 right-1 text-center text-[10px] sm:text-xs font-semibold bg-black/70 rounded px-1 py-0.5 text-green-400">
          {GESTURE_LABELS[gesture]}
        </div>
      )}
    </div>
  );
}
