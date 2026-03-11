/**
 * Custom Node server that runs Next.js + Socket.IO on the same port.
 * Usage:  node server.mjs          (production, after `next build`)
 *         node server.mjs --dev    (development, replaces `next dev`)
 */
import { createServer } from "http";
import next from "next";
import { Server as IOServer } from "socket.io";

const dev = process.argv.includes("--dev");
const port = parseInt(process.env.PORT || "3000", 10);

const app = next({ dev });
const handler = app.getRequestHandler();

/** userId → Set<socketId> */
const userSockets = new Map();

app.prepare().then(() => {
  const httpServer = createServer(handler);

  const io = new IOServer(httpServer, {
    path: "/api/socketio",
    addTrailingSlash: false,
    cors: { origin: "*" },
  });

  io.on("connection", (socket) => {
    const userId = socket.handshake.auth?.userId;

    if (userId) {
      if (!userSockets.has(userId)) {
        userSockets.set(userId, new Set());
      }
      userSockets.get(userId).add(socket.id);
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

  // Expose io on globalThis so server actions can use notifyUser
  globalThis._io = io;
  globalThis._userSockets = userSockets;

  httpServer.listen(port, () => {
    console.log(`> Ready on http://localhost:${port} (${dev ? "dev" : "prod"})`);
  });
});
