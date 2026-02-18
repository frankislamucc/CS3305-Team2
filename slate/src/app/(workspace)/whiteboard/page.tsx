"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { LineData } from "./_types";
import dynamic from "next/dynamic";
import { CanvasHandle } from "./_types";
import GestureEngine from "./_components/GestureEngine";

export default function WhiteboardPage() {
  const Canvas = dynamic(() => import("./_components/Canvas"), {
    ssr: false,
  });
  const [lines, setLines] = useState<LineData[]>([]);
  const [canvasId, setCanvasId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const canvasRef = useRef<CanvasHandle>(null);

  // Load the most recent canvas on mount
  useEffect(() => {
    async function loadCanvas() {
      try {
        const listRes = await fetch("/api/canvas");
        const listData = await listRes.json();
        if (listData.success && listData.canvases?.length > 0) {
          const latest = listData.canvases[0];
          const res = await fetch(`/api/canvas?id=${latest._id}`);
          const data = await res.json();
          if (data.success) {
            setCanvasId(data.canvas._id);
            setLines(data.canvas.lines);
          }
        }
      } catch (err) {
        console.error("Failed to load canvas:", err);
      }
    }
    loadCanvas();
  }, []);

  // Save the current canvas to MongoDB
  const saveCanvas = useCallback(async (currentLines: LineData[], currentCanvasId: string | null) => {
    setIsSaving(true);
    try {
      const res = await fetch("/api/canvas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: currentCanvasId,
          lines: currentLines,
        }),
      });
      const data = await res.json();
      if (data.success && !currentCanvasId) {
        setCanvasId(data.canvas._id);
      }
    } catch (err) {
      console.error("Failed to save canvas:", err);
    } finally {
      setIsSaving(false);
    }
  }, []);

  const handleDrawEnd = () => {
    const canvasHandler = canvasRef.current;
    if (canvasHandler === null) return;
    const curLine: LineData | null = canvasHandler.exportLine();
    if (curLine) {
      setLines((prev) => {
        const updated = [...prev, curLine];
        // Auto-save after each stroke
        saveCanvas(updated, canvasId);
        return updated;
      });
      // don't persist curLine state across renders
      canvasHandler.clear();
    }
  };

  return (
    <div className="flex flex-col flex-1">
      <div className="flex items-center gap-2 p-2">
        <button
          onClick={() => saveCanvas(lines, canvasId)}
          disabled={isSaving}
          className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {isSaving ? "Saving…" : "Save"}
        </button>
        {isSaving && <span className="text-xs text-gray-400">Saving…</span>}
      </div>
      <Canvas lines={lines} canvasRef={canvasRef} />
      <GestureEngine canvasRef={canvasRef} onDrawEnd={handleDrawEnd} />
    </div>
  );
}
