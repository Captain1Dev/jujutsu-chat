import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import {
  joinQueue,
  leaveQueue,
  getRoom,
  destroyRoom,
  getStats,
} from './matchmaker.js';

const PORT = process.env.PORT || 3001;

function getAllowedOrigins() {
  const raw = process.env.CLIENT_ORIGIN || 'http://localhost:5173';
  return raw
    .split(',')
    .map((origin) => origin.trim().replace(/\/$/, ''))
    .filter(Boolean);
}

function normalizeOrigin(origin) {
  return origin?.replace(/\/$/, '') ?? '';
}

function isOriginAllowed(origin) {
  if (!origin) return true;

  const normalized = normalizeOrigin(origin);
  const allowedOrigins = getAllowedOrigins();

  if (allowedOrigins.includes('*') || allowedOrigins.includes(normalized)) {
    return true;
  }

  if (
    normalized.endsWith('.vercel.app') &&
    allowedOrigins.some((allowed) => allowed.includes('vercel.app'))
  ) {
    return true;
  }

  return allowedOrigins.some((allowed) => {
    if (!allowed.includes('*')) return false;
    const pattern = allowed
      .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      .replace(/\\\*/g, '.*');
    return new RegExp(`^${pattern}$`).test(normalized);
  });
}

function corsOriginCallback(origin, callback) {
  if (isOriginAllowed(origin)) {
    callback(null, true);
  } else {
    console.warn(`[cors] blocked origin: ${origin}`);
    callback(null, false);
  }
}

const app = express();
app.use(cors({ origin: corsOriginCallback }));
app.use(express.json());

app.get('/health', (req, res) => {
  const data = { status: 'ok', ...getStats() };

  if (req.accepts('html')) {
    res.type('html').send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>JutsuChat Server</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 640px; margin: 2rem auto; padding: 0 1rem; color: #111; }
    h1 { font-size: 1.5rem; }
    pre { background: #f4f4f5; padding: 1rem; border-radius: 8px; overflow-x: auto; }
    .ok { color: #16a34a; font-weight: 600; }
  </style>
</head>
<body>
  <h1>JutsuChat Signaling Server</h1>
  <p class="ok">Server is running.</p>
  <pre>${JSON.stringify(data, null, 2)}</pre>
  <p>The React client (Phase 2) will run at <strong>http://localhost:5173</strong>.</p>
</body>
</html>`);
    return;
  }

  res.json(data);
});

app.get('/', (_req, res) => {
  res.redirect('/health');
});

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: corsOriginCallback,
    methods: ['GET', 'POST'],
  },
});

io.on('connection', (socket) => {
  console.log(`[connect] ${socket.id}`);

  socket.on('join', () => {
    const result = joinQueue(socket.id);

    if (result.error) {
      socket.emit('error', { message: result.error });
      return;
    }

    if (result.matched) {
      const partnerSocket = io.sockets.sockets.get(result.partnerId);
      partnerSocket?.join(result.roomId);
      socket.join(result.roomId);

      socket.emit('matched', {
        roomId: result.roomId,
        partnerId: result.partnerId,
        role: result.role,
      });

      io.to(result.partnerId).emit('matched', {
        roomId: result.roomId,
        partnerId: socket.id,
        role: 'offerer',
      });

      console.log(`[matched] room=${result.roomId} offerer=${result.partnerId} answerer=${socket.id}`);
    } else {
      socket.emit('waiting');
      console.log(`[waiting] ${socket.id} (queue size: ${getStats().waiting})`);
    }
  });

  socket.on('offer', ({ sdp, roomId }) => {
    const room = getRoom(socket.id);
    if (!room || room.roomId !== roomId) return;

    io.to(room.partnerId).emit('offer', { sdp, roomId, from: socket.id });
  });

  socket.on('answer', ({ sdp, roomId }) => {
    const room = getRoom(socket.id);
    if (!room || room.roomId !== roomId) return;

    io.to(room.partnerId).emit('answer', { sdp, roomId, from: socket.id });
  });

  socket.on('ice-candidate', ({ candidate, roomId }) => {
    const room = getRoom(socket.id);
    if (!room || room.roomId !== roomId) return;

    io.to(room.partnerId).emit('ice-candidate', { candidate, roomId, from: socket.id });
  });

  socket.on('next', () => {
    const destroyed = destroyRoom(socket.id);
    leaveQueue(socket.id);

    if (destroyed?.partnerId) {
      io.to(destroyed.partnerId).emit('partner-left');
      io.sockets.sockets.get(destroyed.partnerId)?.leave(destroyed.roomId);
    }

    socket.leave(destroyed?.roomId ?? '');
    socket.emit('disconnected');

    console.log(`[next] ${socket.id} left room`);
  });

  socket.on('disconnect', () => {
    const destroyed = destroyRoom(socket.id);
    leaveQueue(socket.id);

    if (destroyed?.partnerId) {
      io.to(destroyed.partnerId).emit('partner-left');
    }

    console.log(`[disconnect] ${socket.id}`);
  });
});

httpServer.listen(PORT, () => {
  console.log(`JutsuChat signaling server running on http://localhost:${PORT}`);
  console.log(`Accepting connections from ${getAllowedOrigins().join(', ')}`);
});
