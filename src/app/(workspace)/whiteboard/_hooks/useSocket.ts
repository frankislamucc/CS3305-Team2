"use client";

import { useEffect, useRef, useCallback } from "react";
import { io, Socket } from "socket.io-client";

export interface WhiteboardSharedEvent {
  sharedCanvasId: string;
  canvasName: string;
  fromUsername: string;
}

/**
 * Hook that connects to the Socket.IO server and listens for
 * `whiteboard-shared` events addressed to the current user.
 */
export function useSocket(
  userId: string | null,
  onWhiteboardShared: (event: WhiteboardSharedEvent) => void,
) {
  const socketRef = useRef<Socket | null>(null);
  const cbRef = useRef(onWhiteboardShared);
  cbRef.current = onWhiteboardShared;

  useEffect(() => {
    if (!userId) return;

    const socket = io({
      path: "/api/socketio",
      auth: { userId },
      transports: ["websocket", "polling"],
    });

    socket.on("whiteboard-shared", (data: WhiteboardSharedEvent) => {
      cbRef.current(data);
    });

    socketRef.current = socket;

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [userId]);

  return socketRef;
}
