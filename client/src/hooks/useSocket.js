import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';

const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001';
const IS_PRODUCTION = import.meta.env.PROD;
const USING_LOCAL_SERVER =
  IS_PRODUCTION && SERVER_URL.includes('localhost');

export function useSocket() {
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const [connectionError, setConnectionError] = useState(
    USING_LOCAL_SERVER
      ? 'VITE_SERVER_URL is not set on Vercel. Add your Render server URL and redeploy.'
      : null,
  );

  useEffect(() => {
    const instance = io(SERVER_URL, {
      autoConnect: true,
      transports: ['websocket', 'polling'],
      reconnection: true,
    });

    instance.on('connect', () => {
      setConnected(true);
      setConnectionError(null);
    });

    instance.on('disconnect', () => {
      setConnected(false);
    });

    instance.on('connect_error', (err) => {
      setConnected(false);
      setConnectionError(
        `Cannot reach signaling server at ${SERVER_URL}. Check VITE_SERVER_URL on Vercel and CLIENT_ORIGIN on Render.`,
      );
      console.error('[socket] connect_error:', err.message);
    });

    setSocket(instance);

    return () => {
      instance.disconnect();
    };
  }, []);

  return { socket, connected, connectionError, serverUrl: SERVER_URL };
}
