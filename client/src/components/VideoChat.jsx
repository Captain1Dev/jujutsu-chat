import { useCallback, useEffect, useRef, useState } from 'react';
import { useSocket } from '../hooks/useSocket.js';
import { useWebRTC } from '../hooks/useWebRTC.js';
import { GESTURE_LABELS, SPELL_SEQUENCE } from '../utils/gestures.js';
import { createSpellEngine } from '../utils/spellEngine.js';
import LocalVideo from './LocalVideo.jsx';
import RemoteVideo from './RemoteVideo.jsx';
import NextButton from './NextButton.jsx';
import SpellOverlay from './SpellOverlay.jsx';

const STATUS_MESSAGES = {
  idle: 'Requesting camera access...',
  waiting: 'Looking for a stranger...',
  connecting: 'Connecting...',
  connected: 'Connected',
  'partner-left': 'Stranger disconnected. Finding someone new...',
};

export default function VideoChat() {
  const { socket, connected } = useSocket();
  const [localStream, setLocalStream] = useState(null);
  const [error, setError] = useState(null);
  const [gesture, setGesture] = useState(null);
  const [sequenceProgress, setSequenceProgress] = useState([]);
  const [activeSpell, setActiveSpell] = useState(null);
  const spellEngineRef = useRef(null);
  const spellKeyRef = useRef(0);

  const triggerSpell = useCallback((name) => {
    spellKeyRef.current += 1;
    setActiveSpell(`${name}-${spellKeyRef.current}`);
  }, []);

  const handleGestureChange = useCallback((detected) => {
    setGesture(detected);
  }, []);

  const { remoteStream, status, joinQueue, handleNext, sendSpell, setOnSpell } =
    useWebRTC(socket, localStream);

  useEffect(() => {
    spellEngineRef.current = createSpellEngine((name) => {
      triggerSpell(name);
      sendSpell(name);
    });
  }, [sendSpell, triggerSpell]);

  useEffect(() => {
    setOnSpell((data) => {
      if (data?.type === 'spell' && data?.name) {
        triggerSpell(data.name);
      }
    });
  }, [setOnSpell, triggerSpell]);

  useEffect(() => {
    if (!gesture || status !== 'connected') return;

    const result = spellEngineRef.current?.push(gesture);
    if (result) {
      setSequenceProgress(result.progress);
    }
  }, [gesture, status]);

  useEffect(() => {
    if (status !== 'connected') {
      spellEngineRef.current?.reset();
      setSequenceProgress([]);
    }
  }, [status]);

  const initCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      setLocalStream(stream);
      setError(null);
    } catch (err) {
      setError('Camera/microphone access is required to use JutsuChat.');
      console.error(err);
    }
  }, []);

  useEffect(() => {
    initCamera();
  }, [initCamera]);

  useEffect(() => {
    return () => {
      if (localStream) {
        localStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [localStream]);

  useEffect(() => {
    if (localStream) {
      localStream.getTracks().forEach((track) => {
        track.onended = () => setError('Camera or microphone was disconnected.');
      });
    }
  }, [localStream]);

  useEffect(() => {
    if (socket && connected && localStream && status === 'idle') {
      joinQueue();
    }
  }, [socket, connected, localStream, status, joinQueue]);

  useEffect(() => {
    if (status === 'partner-left' && socket) {
      const timer = setTimeout(() => joinQueue(), 1500);
      return () => clearTimeout(timer);
    }
  }, [status, socket, joinQueue]);

  const onNext = () => {
    handleNext();
  };

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="text-center max-w-md">
          <h1 className="text-2xl font-bold mb-4">JutsuChat</h1>
          <p className="text-red-400 mb-4">{error}</p>
          <button
            type="button"
            onClick={initCamera}
            className="px-6 py-2 rounded-full bg-blue-600 hover:bg-blue-500 font-semibold"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-black">
      <RemoteVideo stream={remoteStream} />
      <SpellOverlay spellName={activeSpell} />
      <LocalVideo stream={localStream} onGestureChange={handleGestureChange} />

      <div className="absolute top-0 left-0 right-0 z-10 p-4 bg-gradient-to-b from-black/70 to-transparent">
        <h1 className="text-xl font-bold tracking-wide">JutsuChat</h1>
        <p className="text-sm text-zinc-300 mt-1">
          {STATUS_MESSAGES[status] ?? status}
          {!connected && ' (reconnecting to server...)'}
        </p>
        {gesture && (
          <p className="text-sm text-green-400 mt-1 font-medium">
            Sign: {GESTURE_LABELS[gesture]}
          </p>
        )}
        {status === 'connected' && (
          <div className="flex gap-2 mt-2 text-xs sm:text-sm">
            {SPELL_SEQUENCE.map((sign) => {
              const index = SPELL_SEQUENCE.indexOf(sign);
              const done = sequenceProgress.length > index;
              const current =
                sequenceProgress.length === index && gesture === sign;
              return (
                <span
                  key={sign}
                  className={`px-2 py-0.5 rounded ${
                    done
                      ? 'bg-orange-600 text-white'
                      : current
                        ? 'bg-orange-500/40 text-orange-200 ring-1 ring-orange-400'
                        : 'bg-zinc-800 text-zinc-400'
                  }`}
                >
                  {GESTURE_LABELS[sign]}
                </span>
              );
            })}
          </div>
        )}
      </div>

      {!remoteStream && status !== 'connected' && (
        <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-lg text-zinc-300">
              {STATUS_MESSAGES[status] ?? 'Loading...'}
            </p>
          </div>
        </div>
      )}

      <div className="absolute bottom-0 left-0 right-0 z-20 p-6 flex justify-center bg-gradient-to-t from-black/80 to-transparent">
        <NextButton
          onClick={onNext}
          disabled={!socket || !connected || status === 'idle'}
        />
      </div>
    </div>
  );
}
