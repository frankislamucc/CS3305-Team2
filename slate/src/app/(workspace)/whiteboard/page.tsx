"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { LineData } from "./_types";
import dynamic from "next/dynamic";
import { CanvasHandle } from "./_types";
import GestureEngine from "./_components/GestureEngine";
import {
  saveCanvasAction,
  loadCanvasAction,
  loadCanvasByIdAction,
  renameCanvasAction,
} from "./actions/canvas";
import {
  listSharedCanvasesAction,
  loadSharedCanvasAction,
  type SharedCanvasSummary,
} from "./actions/share";
import WhiteboardName from "./_components/ui/WhiteboardName";
import WhiteboardSidebar from "./_components/ui/WhiteboardSidebar";
import ShareDialog from "./_components/ui/ShareDialog";
import ToastContainer, { type ToastData } from "./_components/ui/Toast";
import { useUser } from "./_components/UserContext";
import { useSocket, type WhiteboardSharedEvent } from "./_hooks/useSocket";

const Canvas = dynamic(() => import("./_components/Canvas"), {
  ssr: false,
});

export default function WhiteboardPage() {
  const [lines, setLines] = useState<LineData[]>([]);
  const [canvasId, setCanvasId] = useState<string | null>(null);
  const [canvasName, setCanvasName] = useState<string>("Untitled");
  const canvasRef = useRef<CanvasHandle>(null);
  const [cameraLocation, setCameraLocation] = useState<"front" | "back">("front");
  const [sidebarRefreshKey, setSidebarRefreshKey] = useState(0);

  // Sharing state
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [toasts, setToasts] = useState<ToastData[]>([]);
  const [viewingShared, setViewingShared] = useState<{
    fromUsername: string;
    sharedId: string;
  } | null>(null);

  const user = useUser();

  // ── Toast helpers ──
  const addToast = useCallback((message: string, type: ToastData["type"] = "info") => {
    const id = crypto.randomUUID();
    setToasts((prev) => [...prev, { id, message, type }]);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // ── WebSocket: listen for incoming shares ──
  const handleIncomingShare = useCallback(
    (event: WhiteboardSharedEvent) => {
      addToast(
        `📩 ${event.fromUsername} shared "${event.canvasName}" with you!`,
        "info",
      );
      // Refresh sidebar to show the new shared canvas
      setSidebarRefreshKey((k) => k + 1);
    },
    [addToast],
  );

  useSocket(user?.userId ?? null, handleIncomingShare);

  // Load the most recent canvas on mount
  useEffect(() => {
    async function loadCanvas() {
      try {
        const result = await loadCanvasAction();
        if (result.success && result.lines && result.lines.length > 0) {
          setLines(result.lines);
          setCanvasId(result.canvasId ?? null);
          setCanvasName(result.name ?? "Untitled");
        }
      } catch (err) {
        console.error("Failed to load canvas:", err);
      }
    }
    loadCanvas();
  }, []);

  // Save the current canvas to MongoDB
  const saveCanvas = useCallback(
    async (currentLines: LineData[], currentCanvasId: string | null) => {
      try {
        const result = await saveCanvasAction(currentLines, currentCanvasId);
        if (result.success && result.canvasId && !currentCanvasId) {
          setCanvasId(result.canvasId);
          setSidebarRefreshKey((k) => k + 1);
        }
      } catch (err) {
        console.error("Failed to save canvas:", err);
      }
    },
    [],
  );

  const toggleCamera = (currentLocation: string) => {
    setCameraLocation(currentLocation === "front" ? "back" : "front");
  };

  const handleDrawEnd = useCallback(() => {
    const canvasHandler = canvasRef.current;
    if (canvasHandler === null) return;
    const curLine: LineData | null = canvasHandler.exportLine();
    if (curLine) {
      const updated = [...lines, curLine];
      setLines(updated);
      saveCanvas(updated, canvasId);
      canvasHandler.clear();
    }
  }, [lines, canvasId, saveCanvas]);

  const handleRename = useCallback(
    async (newName: string) => {
      if (!canvasId) {
        const result = await saveCanvasAction(lines, null, newName);
        if (result.success && result.canvasId) {
          setCanvasId(result.canvasId);
        }
      } else {
        await renameCanvasAction(canvasId, newName);
      }
      setCanvasName(newName);
      setSidebarRefreshKey((k) => k + 1);
    },
    [canvasId, lines],
  );

  const handleSelectCanvas = useCallback(
    async (id: string) => {
      if (id === canvasId) return;
      try {
        const result = await loadCanvasByIdAction(id);
        if (result.success) {
          setLines(result.lines ?? []);
          setCanvasId(result.canvasId ?? null);
          setCanvasName(result.name ?? "Untitled");
          setViewingShared(null);
          canvasRef.current?.clearCanvas();
        }
      } catch (err) {
        console.error("Failed to load canvas:", err);
      }
    },
    [canvasId],
  );

  const handleSelectSharedCanvas = useCallback(
    async (shared: SharedCanvasSummary) => {
      try {
        const result = await loadSharedCanvasAction(shared.id);
        if (result.success) {
          setLines(result.lines ?? []);
          setCanvasId(null); // shared canvases are read-only view
          setCanvasName(result.name ?? "Untitled");
          setViewingShared({
            fromUsername: result.fromUsername ?? shared.fromUsername,
            sharedId: shared.id,
          });
          canvasRef.current?.clearCanvas();
        }
      } catch (err) {
        console.error("Failed to load shared canvas:", err);
      }
    },
    [],
  );

  const handleNewCanvas = useCallback(() => {
    setLines([]);
    setCanvasId(null);
    setCanvasName("Untitled");
    setViewingShared(null);
    canvasRef.current?.clearCanvas();
  }, []);

  return (
    <>
      <WhiteboardSidebar
        activeCanvasId={canvasId}
        onSelectCanvas={handleSelectCanvas}
        onNewCanvas={handleNewCanvas}
        refreshKey={sidebarRefreshKey}
        onSelectSharedCanvas={handleSelectSharedCanvas}
        viewingSharedId={viewingShared?.sharedId ?? null}
      />
      <div className="flex flex-col flex-1 min-w-0">
        <div className="flex items-center gap-2 px-4 py-2">
          <WhiteboardName name={canvasName} onRename={handleRename} />

          {/* Shared-from indicator */}
          {viewingShared && (
            <span className="px-3 py-1 text-sm font-semibold bg-purple-600 text-white border border-purple-400 rounded-full shadow">
              Shared by {viewingShared.fromUsername}
            </span>
          )}

          <div className="w-px h-5 bg-gray-600" />

          {/* Share button — only for canvases the user owns */}
          {canvasId && !viewingShared && (
            <button
              onClick={() => setShowShareDialog(true)}
              className="px-3 py-1 text-sm bg-purple-600 text-white rounded hover:bg-purple-700 cursor-pointer flex items-center gap-1.5"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 8a3 3 0 100-6 3 3 0 000 6zm-6 6a3 3 0 100-6 3 3 0 000 6zm6 6a3 3 0 100-6 3 3 0 000 6zm-2.5-8.5l-5-3m0 6l5-3" />
              </svg>
              Share
            </button>
          )}

          <button
            onClick={() => saveCanvas(lines, canvasId)}
            className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 cursor-pointer"
          >
            Save
          </button>
          <button
            onClick={() => toggleCamera(cameraLocation)}
            className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 cursor-pointer"
          >
            {cameraLocation === "front" ? "Switch to Back Camera" : "Switch to Front Camera"}
          </button>
          <button
            onClick={() => canvasRef.current?.zoomOut()}
            className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 cursor-pointer"
          >
            Zoom Out
          </button>
          <button
            onClick={() => canvasRef.current?.zoomIn()}
            className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 cursor-pointer"
          >
            Zoom In
          </button>
          <button
            onClick={() => canvasRef.current?.resetZoom()}
            className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 cursor-pointer"
          >
            Reset Zoom
          </button>
          <button
            onClick={() => {
              canvasRef.current?.clearCanvas();
              setLines([]);
              saveCanvas([], canvasId);
            }}
            className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 cursor-pointer"
          >
            Clear Canvas
          </button>
        </div>
        <div className="relative flex-1">
          <GestureEngine canvasRef={canvasRef} onDrawEnd={handleDrawEnd} cameraLocation={cameraLocation} />
          <Canvas lines={lines} canvasRef={canvasRef} />
        </div>
      </div>

      {/* Share dialog */}
      {showShareDialog && canvasId && (
        <ShareDialog
          canvasId={canvasId}
          canvasName={canvasName}
          onClose={() => setShowShareDialog(false)}
        />
      )}

      {/* Toast notifications */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </>
  );
}