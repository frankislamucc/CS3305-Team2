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
import WhiteboardName from "./_components/ui/WhiteboardName";
import WhiteboardSidebar from "./_components/ui/WhiteboardSidebar";

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

  // wrapping in a callback to try and prevent the crashing

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
        // Canvas hasn't been persisted yet — save it first so we have an id
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
          canvasRef.current?.clearCanvas();
        }
      } catch (err) {
        console.error("Failed to load canvas:", err);
      }
    },
    [canvasId],
  );

  const handleNewCanvas = useCallback(() => {
    setLines([]);
    setCanvasId(null);
    setCanvasName("Untitled");
    canvasRef.current?.clearCanvas();
  }, []);

  return (
    <>
      <WhiteboardSidebar
        activeCanvasId={canvasId}
        onSelectCanvas={handleSelectCanvas}
        onNewCanvas={handleNewCanvas}
        refreshKey={sidebarRefreshKey}
      />
      <div className="flex flex-col flex-1 min-w-0">
        <div className="flex items-center gap-2 px-4 py-2">
          <WhiteboardName name={canvasName} onRename={handleRename} />
          <div className="w-px h-5 bg-gray-600" />
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
    </>
  );
}