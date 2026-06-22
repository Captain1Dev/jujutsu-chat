import { useCallback, useEffect, useRef, useState } from 'react';

const ICE_SERVERS = {
  iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
};

function attachDataChannel(channel, dataChannelRef, onSpellRef) {
  dataChannelRef.current = channel;

  channel.onopen = () => {
    console.log('[datachannel] open');
  };

  channel.onclose = () => {
    if (dataChannelRef.current === channel) {
      dataChannelRef.current = null;
    }
  };

  channel.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      onSpellRef.current?.(data);
    } catch (err) {
      console.warn('Invalid spell message:', err);
    }
  };
}

export function useWebRTC(socket, localStream) {
  const pcRef = useRef(null);
  const roomIdRef = useRef(null);
  const pendingCandidatesRef = useRef([]);
  const localStreamRef = useRef(localStream);
  const statusRef = useRef('idle');
  const dataChannelRef = useRef(null);
  const onSpellRef = useRef(null);
  const roleRef = useRef(null);

  const [remoteStream, setRemoteStream] = useState(null);
  const [status, setStatus] = useState('idle');

  const updateStatus = useCallback((next) => {
    statusRef.current = next;
    setStatus(next);
  }, []);

  useEffect(() => {
    localStreamRef.current = localStream;
  }, [localStream]);

  const cleanupPeer = useCallback(() => {
    if (dataChannelRef.current) {
      dataChannelRef.current.close();
      dataChannelRef.current = null;
    }
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
    roomIdRef.current = null;
    roleRef.current = null;
    pendingCandidatesRef.current = [];
    setRemoteStream(null);
  }, []);

  const flushPendingCandidates = useCallback(async () => {
    const pc = pcRef.current;
    if (!pc || !pc.remoteDescription) return;

    const pending = [...pendingCandidatesRef.current];
    pendingCandidatesRef.current = [];

    for (const candidate of pending) {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (err) {
        console.warn('Failed to add ICE candidate:', err);
      }
    }
  }, []);

  const addIceCandidate = useCallback(async (candidate) => {
    const pc = pcRef.current;
    if (!pc || !candidate) return;

    if (!pc.remoteDescription) {
      pendingCandidatesRef.current.push(candidate);
      return;
    }

    try {
      await pc.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (err) {
      console.warn('Failed to add ICE candidate:', err);
    }
  }, []);

  const setupDataChannel = useCallback((pc, isOfferer) => {
    if (isOfferer) {
      const channel = pc.createDataChannel('spells', { ordered: true });
      attachDataChannel(channel, dataChannelRef, onSpellRef);
    } else {
      pc.ondatachannel = (event) => {
        attachDataChannel(event.channel, dataChannelRef, onSpellRef);
      };
    }
  }, []);

  const createPeerConnection = useCallback(
    (roomId, isOfferer) => {
      cleanupPeer();

      const pc = new RTCPeerConnection(ICE_SERVERS);
      pcRef.current = pc;
      roomIdRef.current = roomId;
      roleRef.current = isOfferer ? 'offerer' : 'answerer';

      setupDataChannel(pc, isOfferer);

      const stream = localStreamRef.current;
      if (stream) {
        stream.getTracks().forEach((track) => {
          pc.addTrack(track, stream);
        });
      }

      pc.ontrack = (event) => {
        const [streamFromEvent] = event.streams;
        const stream =
          streamFromEvent ?? new MediaStream([event.track]);
        setRemoteStream(stream);
        updateStatus('connected');
      };

      pc.onicecandidate = (event) => {
        if (event.candidate && socket && roomIdRef.current) {
          socket.emit('ice-candidate', {
            candidate: event.candidate,
            roomId: roomIdRef.current,
          });
        }
      };

      pc.onconnectionstatechange = () => {
        if (pc.connectionState === 'connected') {
          updateStatus('connected');
        } else if (
          pc.connectionState === 'failed' ||
          pc.connectionState === 'disconnected'
        ) {
          updateStatus('partner-left');
        }
      };

      return pc;
    },
    [cleanupPeer, setupDataChannel, socket, updateStatus],
  );

  const startAsOfferer = useCallback(
    async (roomId) => {
      try {
        updateStatus('connecting');
        roomIdRef.current = roomId;
        const pc = createPeerConnection(roomId, true);
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socket.emit('offer', { sdp: offer, roomId });
      } catch (err) {
        console.error('Failed to start as offerer:', err);
        updateStatus('waiting');
      }
    },
    [createPeerConnection, socket, updateStatus],
  );

  const handleOffer = useCallback(
    async ({ sdp, roomId }) => {
      const activeRoomId = roomId ?? roomIdRef.current;
      if (!activeRoomId) return;

      try {
        updateStatus('connecting');
        roomIdRef.current = activeRoomId;
        const pc = createPeerConnection(activeRoomId, false);
        await pc.setRemoteDescription(new RTCSessionDescription(sdp));
        await flushPendingCandidates();
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.emit('answer', { sdp: answer, roomId: activeRoomId });
      } catch (err) {
        console.error('Failed to handle offer:', err);
        updateStatus('waiting');
      }
    },
    [createPeerConnection, flushPendingCandidates, socket, updateStatus],
  );

  const handleAnswer = useCallback(
    async ({ sdp }) => {
      const pc = pcRef.current;
      if (!pc) return;

      try {
        await pc.setRemoteDescription(new RTCSessionDescription(sdp));
        await flushPendingCandidates();
      } catch (err) {
        console.error('Failed to handle answer:', err);
        updateStatus('waiting');
      }
    },
    [flushPendingCandidates, updateStatus],
  );

  const sendSpell = useCallback((payload) => {
    const channel = dataChannelRef.current;
    if (channel?.readyState === 'open') {
      const message =
        typeof payload === 'string' ? { type: 'spell', name: payload } : payload;
      channel.send(JSON.stringify(message));
    }
  }, []);

  const setOnSpell = useCallback((handler) => {
    onSpellRef.current = handler;
  }, []);

  const joinQueue = useCallback(() => {
    if (!socket) return;
    cleanupPeer();
    updateStatus('waiting');
    socket.emit('join');
  }, [cleanupPeer, socket, updateStatus]);

  const handleNext = useCallback(() => {
    if (!socket) return;
    cleanupPeer();
    updateStatus('waiting');
    socket.emit('next');
  }, [cleanupPeer, socket, updateStatus]);

  useEffect(() => {
    if (!socket) return;

    const onWaiting = () => updateStatus('waiting');

    const onMatched = ({ roomId, role }) => {
      roomIdRef.current = roomId;
      if (role === 'offerer') {
        startAsOfferer(roomId);
      } else {
        updateStatus('connecting');
      }
    };

    const onOffer = (payload) => {
      handleOffer(payload);
    };

    const onAnswer = (payload) => {
      handleAnswer(payload);
    };

    const onIceCandidate = ({ candidate }) => {
      addIceCandidate(candidate);
    };

    const onPartnerLeft = () => {
      cleanupPeer();
      updateStatus('partner-left');
    };

    const onDisconnected = () => {
      joinQueue();
    };

    const onReconnect = () => {
      if (statusRef.current !== 'connected') {
        joinQueue();
      }
    };

    socket.on('waiting', onWaiting);
    socket.on('matched', onMatched);
    socket.on('offer', onOffer);
    socket.on('answer', onAnswer);
    socket.on('ice-candidate', onIceCandidate);
    socket.on('partner-left', onPartnerLeft);
    socket.on('disconnected', onDisconnected);
    socket.io.on('reconnect', onReconnect);

    return () => {
      socket.off('waiting', onWaiting);
      socket.off('matched', onMatched);
      socket.off('offer', onOffer);
      socket.off('answer', onAnswer);
      socket.off('ice-candidate', onIceCandidate);
      socket.off('partner-left', onPartnerLeft);
      socket.off('disconnected', onDisconnected);
      socket.io.off('reconnect', onReconnect);
    };
  }, [
    socket,
    updateStatus,
    startAsOfferer,
    handleOffer,
    handleAnswer,
    addIceCandidate,
    cleanupPeer,
    joinQueue,
  ]);

  return {
    remoteStream,
    status,
    joinQueue,
    handleNext,
    cleanupPeer,
    sendSpell,
    setOnSpell,
  };
}
