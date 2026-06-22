/**
 * Simple FIFO matchmaking queue.
 * Pairs two waiting users into a room and tracks active rooms.
 */

const waitingQueue = [];
const rooms = new Map(); // roomId -> { users: [socketId, socketId] }
const socketToRoom = new Map(); // socketId -> roomId

function generateRoomId() {
  return `room_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Add a socket to the waiting queue or match immediately if someone is waiting.
 * @returns {{ matched: boolean, roomId?: string, partnerId?: string, role?: 'offerer' | 'answerer' }}
 */
export function joinQueue(socketId) {
  if (socketToRoom.has(socketId)) {
    return { matched: false, error: 'already_in_room' };
  }

  if (waitingQueue.includes(socketId)) {
    return { matched: false, error: 'already_waiting' };
  }

  if (waitingQueue.length > 0) {
    const partnerId = waitingQueue.shift();
    const roomId = generateRoomId();

    rooms.set(roomId, { users: [partnerId, socketId] });
    socketToRoom.set(partnerId, roomId);
    socketToRoom.set(socketId, roomId);

    return {
      matched: true,
      roomId,
      partnerId,
      role: 'answerer',
    };
  }

  waitingQueue.push(socketId);
  return { matched: false };
}

export function leaveQueue(socketId) {
  const index = waitingQueue.indexOf(socketId);
  if (index !== -1) {
    waitingQueue.splice(index, 1);
    return true;
  }
  return false;
}

export function getRoom(socketId) {
  const roomId = socketToRoom.get(socketId);
  if (!roomId) return null;

  const room = rooms.get(roomId);
  if (!room) return null;

  const partnerId = room.users.find((id) => id !== socketId) ?? null;
  return { roomId, partnerId };
}

export function destroyRoom(socketId) {
  const roomId = socketToRoom.get(socketId);
  if (!roomId) return null;

  const room = rooms.get(roomId);
  if (!room) {
    socketToRoom.delete(socketId);
    return null;
  }

  const partnerId = room.users.find((id) => id !== socketId) ?? null;

  for (const userId of room.users) {
    socketToRoom.delete(userId);
  }
  rooms.delete(roomId);

  return { roomId, partnerId };
}

export function getStats() {
  return {
    waiting: waitingQueue.length,
    activeRooms: rooms.size,
    connectedUsers: socketToRoom.size + waitingQueue.length,
  };
}
