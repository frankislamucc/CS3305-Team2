"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { LineData } from "./_types";
import dynamic from "next/dynamic";
import { CanvasHandle } from "./_types";
import GestureEngine from "./_components/GestureEngine";
import {
  saveCanvasAction,
  loadCanvasAction,
  renameCanvasAction,
} from "./actions/canvas";

const Canvas = dynamic(() => import("./_components/Canvas"), {
  ssr: false,
});

export default function WhiteboardPage() {
  const [lines, setLines] = useState<LineData[]>([]);
  const [canvasId, setCanvasId] = useState<string | null>(null);
  const [canvasName, setCanvasName] = useState<string>("Untitled");
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const canvasRef = useRef<CanvasHandle>(null);

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
    async (currentLines: LineData[], currentCanvasId: string | null, name?: string) => {
      setIsSaving(true);
      try {
        const result = await saveCanvasAction(currentLines, currentCanvasId, name);
        if (result.success && result.canvasId && !currentCanvasId) {
          setCanvasId(result.canvasId);
        }
      } catch (err) {
        console.error("Failed to save canvas:", err);
      } finally {
        setIsSaving(false);
      }
    },
    [],
  );

  const handleDrawEnd = () => {
    const canvasHandler = canvasRef.current;
    if (canvasHandler === null) return;
    const curLine: LineData | null = canvasHandler.exportLine();
    if (curLine) {
      setLines((prev) => {
        const updated = [...prev, curLine];
        // Auto-save after each stroke
        saveCanvas(updated, canvasId, canvasName);
        return updated;
      });
      // don't persist curLine state across renders
      canvasHandler.clear();
    }
  };

  const handleStartRename = () => {
    setEditName(canvasName);
    setIsEditing(true);
  };

  const isRenamingRef = useRef(false);

  const handleRename = async () => {
    if (isRenamingRef.current) return;
    isRenamingRef.current = true;

    const trimmed = editName.trim();
    if (!trimmed || trimmed === canvasName) {
      setIsEditing(false);
      isRenamingRef.current = false;
      return;
    }
    setCanvasName(trimmed);
    setIsEditing(false);
    if (canvasId) {
      await renameCanvasAction(canvasId, trimmed);
    }
    isRenamingRef.current = false;
  };

  const handleRenameKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleRename();
    } else if (e.key === "Escape") {
      setIsEditing(false);
    }
  };

  return (
    <div className="flex flex-col flex-1">
      <div className="flex items-center gap-3 px-4 py-2">
        {isEditing ? (
          <input
            autoFocus
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            onBlur={handleRename}
            onKeyDown={handleRenameKeyDown}
            className="px-2 py-1 text-sm bg-gray-800 text-white border border-gray-600 rounded outline-none focus:border-blue-500"
            maxLength={50}
          />
        ) : (
          <button
            onClick={handleStartRename}
            className="text-sm text-gray-800 hover:text-black hover:bg-gray-200 px-2 py-1 rounded transition-colors cursor-pointer"
            title="Click to rename"
          >
            {canvasName}
          </button>
        )}
        <button
          onClick={() => saveCanvas(lines, canvasId, canvasName)}
          disabled={isSaving}
          className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 cursor-pointer"
        >
          {isSaving ? "Saving…" : "Save"}
        </button>
        {isSaving && (
          <span className="text-xs text-gray-400">Saving…</span>
        )}
      </div>
      <Canvas lines={lines} canvasRef={canvasRef} />
      <GestureEngine canvasRef={canvasRef} onDrawEnd={handleDrawEnd} />
    </div>
  );
}
