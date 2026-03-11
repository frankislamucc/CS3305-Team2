import { NextRequest } from "next/server";
import { Server as IOServer } from "socket.io";

/**
 * This route bootstraps the Socket.IO server on the first request.
 * Next.js (Pages or App Router) doesn't natively expose the raw HTTP server,
 * so we attach Socket.IO to the underlying Node server via the
 * `(res.socket as any).server` escape-hatch that works in `next dev` and
 * custom Node servers.
 *
 * In production you would typically run a standalone Socket.IO server or use
 * an adapter (Redis, etc.).
 */

interface ExtendedGlobal {
  _io?: IOServer;
}

const g = globalThis as unknown as ExtendedGlobal;

/** Map userId → Set of socket ids */
const userSockets = new Map<string, Set<string>>();

function ensureIO(httpServer: any): IOServer {
  if (g._io) return g._io;

  const io = new IOServer(httpServer, {
    path: "/api/socketio",
    addTrailingSlash: false,
    cors: { origin: "*" },
  });

  io.on("connection", (socket) => {
    const userId = socket.handshake.auth?.userId as string | undefined;

    if (userId) {
      if (!userSockets.has(userId)) {
        userSockets.set(userId, new Set());
      }
      userSockets.get(userId)!.add(socket.id);
    }

    socket.on("disconnect", () => {
      if (userId) {
        userSockets.get(userId)?.delete(socket.id);
        if (userSockets.get(userId)?.size === 0) {
          userSockets.delete(userId);
        }
      }
    });
  });

  g._io = io;
  return io;
}

/** Emit to a specific user across all their connected sockets */
export function notifyUser(
  targetUserId: string,
  payload: {
    sharedCanvasId: string;
    canvasName: string;
    fromUsername: string;
  },
) {
  const io = g._io;
  if (!io) return;

  const sockets = userSockets.get(targetUserId);
  if (sockets) {
    for (const sid of sockets) {
      io.to(sid).emit("whiteboard-shared", payload);
    }
  }
}

export async function GET(req: NextRequest) {
  // The GET is only used to bootstrap socket.io on the server.
  // Socket.IO itself handles the upgrade via its own middleware.
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const httpServer = (req as any)?.socket?.server;
    if (httpServer && !g._io) {
      ensureIO(httpServer);
    }
  } catch {
    // Socket.IO may already be running; that's fine.
  }

  return new Response("Socket.IO server running", { status: 200 });
}
