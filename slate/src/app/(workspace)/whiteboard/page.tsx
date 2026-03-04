"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { LineData } from "./_types";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
  saveSharedCanvasAction,
  type SharedCanvasSummary,
} from "./actions/share";
import WhiteboardName from "./_components/ui/WhiteboardName";
import WhiteboardSidebar from "./_components/ui/WhiteboardSidebar";
import ShareDialog from "./_components/ui/ShareDialog";
import ToastContainer from "./_components/ui/Toast";
import { ToastData } from "./_types";
import { useUser } from "./_components/UserContext";
import { useSocket, type WhiteboardSharedEvent } from "./_hooks/useSocket";
import OptionButton from "./_components/ui/OptionButton";
import { UndoRedo } from "./_components/UndoRedo";
import RecordingControls from "./RecordingControls";

const Canvas = dynamic(() => import("./_components/Canvas"), {
  ssr: false,
});

export default function WhiteboardPage() {
  const [lines, setLines] = useState<LineData[]>([]);
  const [canvasId, setCanvasId] = useState<string | null>(null);
  const [canvasName, setCanvasName] = useState<string>("Untitled");
  const canvasRef = useRef<CanvasHandle>(null);
  const [cameraLocation, setCameraLocation] = useState<"front" | "back">(
    "front",
  );
  const [sidebarRefreshKey, setSidebarRefreshKey] = useState(0);

  // undo/redo tracking
  const undoRedo = useRef<UndoRedo>(new UndoRedo());
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const updateHistoryFlags = useCallback(() => {
    setCanUndo(undoRedo.current.getUndoCount() > 0);
    setCanRedo(undoRedo.current.getRedoCount() > 0);
  }, []);

  // Sharing state
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [toasts, setToasts] = useState<ToastData[]>([]);
  const [viewingShared, setViewingShared] = useState<{
    fromUsername: string;
    sharedId: string;
    copyCanvasId: string | null;
  } | null>(null);

  // Keep a ref in sync so callbacks always read the latest value
  const viewingSharedRef = useRef(viewingShared);
  useEffect(() => {
    viewingSharedRef.current = viewingShared;
  }, [viewingShared]);

  const user = useUser();

  // ── Toast helpers ──
  const addToast = useCallback(
    (message: string, type: ToastData["type"] = "info") => {
      const id = crypto.randomUUID();
      setToasts((prev) => [...prev, { id, message, type }]);
    },
    [],
  );

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
        // Always read the latest shared state from the ref
        const shared = viewingSharedRef.current;
        if (shared) {
          const result = await saveSharedCanvasAction(
            shared.sharedId,
            currentLines,
          );
          if (result.success && result.copyCanvasId) {
            setViewingShared((prev) =>
              prev ? { ...prev, copyCanvasId: result.copyCanvasId! } : prev,
            );
          } else if (!result.success) {
            addToast(result.errorMessage ?? "Failed to save", "error");
          }
          return;
        }

        const result = await saveCanvasAction(currentLines, currentCanvasId);
        if (result.success && result.canvasId && !currentCanvasId) {
          setCanvasId(result.canvasId);
          setSidebarRefreshKey((k) => k + 1);
        }
      } catch (err) {
        console.error("Failed to save canvas:", err);
        addToast("Failed to save canvas", "error");
      }
    },
    [addToast],
  );

  const toggleCamera = (currentLocation: string) => {
    setCameraLocation(currentLocation === "front" ? "back" : "front");
  };

  const performUndo = useCallback(() => {
    const action = undoRedo.current.undo();
    if (!action) return;

    let newLines: LineData[];
    switch (action.type) {
      case "addLine":
        newLines = lines.slice(0, -1);
        break;
      case "addLines":
        newLines = lines.slice(0, -action.lines.length);
        break;
      case "clearCanvas":
        newLines = action.lines;
        break;
      case "replaceAll":
        newLines = action.oldLines;
        break;
    }

    setLines(newLines);
    saveCanvas(newLines, canvasId);
    updateHistoryFlags();
  }, [lines, canvasId, saveCanvas, updateHistoryFlags]);

  const performRedo = useCallback(() => {
    const action = undoRedo.current.redo();
    if (!action) return;

    let newLines: LineData[];
    switch (action.type) {
      case "addLine":
        newLines = [...lines, action.line];
        break;
      case "addLines":
        newLines = [...lines, ...action.lines];
        break;
      case "clearCanvas":
        newLines = [];
        break;
      case "replaceAll":
        newLines = action.newLines;
        break;
    }

    setLines(newLines);
    saveCanvas(newLines, canvasId);
    updateHistoryFlags();
  }, [lines, canvasId, saveCanvas, updateHistoryFlags]);

  // Keyboard shortcuts for undo (Ctrl+Z), redo (Ctrl+Y), help (Ctrl+H)
  const router = useRouter();
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "z") {
        e.preventDefault();
        performUndo();
      } else if ((e.ctrlKey || e.metaKey) && e.key === "y") {
        e.preventDefault();
        performRedo();
      } else if ((e.ctrlKey || e.metaKey) && e.key === "h") {
        e.preventDefault();
        router.push("/settings");
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [performUndo, performRedo, router]);

  const handleDrawEnd = useCallback(() => {
    const canvasHandler = canvasRef.current;
    if (canvasHandler === null) return;
    const curLine: LineData | null = canvasHandler.exportLine();
    if (curLine) {
      // Add line to undo/redo history
      undoRedo.current.addLine(curLine);
      updateHistoryFlags();

      const updated = [...lines, curLine];
      setLines(updated);
      saveCanvas(updated, canvasId);
      canvasHandler.clear();
    }
  }, [lines, canvasId, saveCanvas, updateHistoryFlags]);

  // ── Copy & Paste: add pasted lines to the canvas ──
  const handlePaste = useCallback(
    (pastedLines: LineData[]) => {
      undoRedo.current.addLines(pastedLines);
      updateHistoryFlags();

      const updated = [...lines, ...pastedLines];
      setLines(updated);
      saveCanvas(updated, canvasId);
    },
    [lines, canvasId, saveCanvas, updateHistoryFlags],
  );

  const handleCut = useCallback(
    (remainingLines: LineData[]) => {
      undoRedo.current.replaceAll(lines, remainingLines);
      updateHistoryFlags();
      setLines(remainingLines);
      saveCanvas(remainingLines, canvasId);
    },
    [lines, canvasId, saveCanvas, updateHistoryFlags],
  );

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
          undoRedo.current.clear();
          updateHistoryFlags();
        }
      } catch (err) {
        console.error("Failed to load canvas:", err);
      }
    },
    [canvasId, updateHistoryFlags],
  );

  const handleSelectSharedCanvas = useCallback(
    async (shared: SharedCanvasSummary) => {
      try {
        const result = await loadSharedCanvasAction(shared.id);
        if (result.success) {
          setLines(result.lines ?? []);
          setCanvasId(null);
          setCanvasName(result.name ?? "Untitled");
          setViewingShared({
            fromUsername: result.fromUsername ?? shared.fromUsername,
            sharedId: shared.id,
            copyCanvasId: result.copyCanvasId ?? null,
          });
          canvasRef.current?.clearCanvas();
          undoRedo.current.clear();
          updateHistoryFlags();
        }
      } catch (err) {
        console.error("Failed to load shared canvas:", err);
      }
    },
    [updateHistoryFlags],
  );

  const handleNewCanvas = useCallback(() => {
    setLines([]);
    setCanvasId(null);
    setCanvasName("Untitled");
    setViewingShared(null);
    canvasRef.current?.clearCanvas();
    undoRedo.current.clear();
    updateHistoryFlags();
  }, [updateHistoryFlags]);

  const isViewOnly = !!viewingShared;

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
          <WhiteboardName
            name={canvasName}
            onRename={isViewOnly ? undefined : handleRename}
          />

          {/* Shared-from indicator + view-only badge */}
          {viewingShared && (
            <>
              <span className="px-3 py-1 text-sm font-semibold bg-purple-600 text-white border border-purple-400 rounded-full shadow">
                Shared by {viewingShared.fromUsername}
              </span>
              <span className="px-3 py-1 text-sm font-medium bg-gray-700 text-gray-300 border border-gray-600 rounded-full">
                🔒 View Only
              </span>
            </>
          )}

          <div className="w-px h-5 bg-gray-600" />

          {/* Share button — only for canvases the user owns */}
          {canvasId && !viewingShared && (
            <button
              onClick={() => setShowShareDialog(true)}
              className="px-3 py-1 text-sm bg-purple-600 text-white rounded hover:bg-purple-700 cursor-pointer flex items-center gap-1.5"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15 8a3 3 0 100-6 3 3 0 000 6zm-6 6a3 3 0 100-6 3 3 0 000 6zm6 6a3 3 0 100-6 3 3 0 000 6zm-2.5-8.5l-5-3m0 6l5-3"
                />
              </svg>
              Share
            </button>
          )}

          <OptionButton
            onClick={() => saveCanvas(lines, canvasId)}
            isDisabled={isViewOnly}
            text="Save"
          />
          {/* <OptionButton
            onClick={performUndo}
            isDisabled={isViewOnly || !canUndo}
            text="Undo"
          />
          <OptionButton
            onClick={performRedo}
            isDisabled={isViewOnly || !canRedo}
            text="Redo"
          /> */}
          <OptionButton
            onClick={() => toggleCamera(cameraLocation)}
            isDisabled={false}
            text={
              cameraLocation === "front"
                ? "Switch to Back Camera"
                : "Switch to Front Camera"
            }
          />
          <OptionButton
            onClick={() => canvasRef.current?.zoomOut()}
            text="Zoom Out"
          />
          <OptionButton
            onClick={() => canvasRef.current?.zoomIn()}
            text="Zoom In"
          />
          <OptionButton
            onClick={() => canvasRef.current?.resetZoom()}
            text="Reset Zoom"
          />

          <OptionButton
            onClick={() => {
              canvasRef.current?.clearCanvas();
              undoRedo.current.clearCanvas(lines);
              setLines([]);
              saveCanvas([], canvasId);
              updateHistoryFlags();
            }}
            isDisabled={isViewOnly}
            text="Clear Canvas"
          />
          <div className="w-px h-5 bg-gray-600" />
          <RecordingControls
            onRecordingStart={() => addToast("Recording started", "info")}
            onRecordingStop={() => addToast("Recording stopped", "info")}
            onRecordingSaved={(recordingId) =>
              addToast("Recording saved successfully", "success")
            }
            onError={(error) => addToast(`Recording error: ${error}`, "error")}
          />
          <Link
            href="/settings"
            className="px-3 py-1 text-sm rounded bg-gray-600 text-white hover:bg-gray-500 cursor-pointer flex items-center gap-1.5"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M12 18h.01"
              />
              <circle cx="12" cy="12" r="10" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Help
          </Link>
        </div>
        <div className="relative flex-1">
          <GestureEngine
            canvasRef={canvasRef}
            onDrawEnd={handleDrawEnd}
            cameraLocation={cameraLocation}
            viewOnly={isViewOnly}
            onUndo={performUndo}
            onRedo={performRedo}
          />
          <Canvas
            lines={lines}
            canvasRef={canvasRef}
            onPaste={isViewOnly ? undefined : handlePaste}
            onCut={isViewOnly ? undefined : handleCut}
            viewOnly={isViewOnly}
          />
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
