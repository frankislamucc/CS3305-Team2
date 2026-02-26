import type { Server as IOServer } from "socket.io";

/**
 * Utility to emit WebSocket events from server actions.
 *
 * The Socket.IO instance and user-socket map live on `globalThis`
 * (set by server.mjs). This module simply reads them.
 */

interface GlobalWithIO {
  _io?: IOServer;
  _userSockets?: Map<string, Set<string>>;
}

const g = globalThis as unknown as GlobalWithIO;

export function getIO(): IOServer | undefined {
  return g._io;
}

/**
 * Emit a `whiteboard-shared` event to a specific user
 * across all their connected sockets.
 */
export function notifyUser(
  targetUserId: string,
  payload: {
    sharedCanvasId: string;
    canvasName: string;
    fromUsername: string;
  },
) {
  const io = g._io;
  const userSockets = g._userSockets;
  if (!io || !userSockets) return;

  const sockets = userSockets.get(targetUserId);
  if (sockets) {
    for (const sid of sockets) {
      io.to(sid).emit("whiteboard-shared", payload);
    }
  }
}
