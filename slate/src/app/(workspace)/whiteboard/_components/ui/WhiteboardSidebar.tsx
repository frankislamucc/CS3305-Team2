"use client";

import { useCallback, useEffect, useState } from "react";
import {
  listCanvasesAction,
  deleteCanvasAction,
  type CanvasSummary,
} from "../../actions/canvas";
import {
  listSharedCanvasesAction,
  type SharedCanvasSummary,
} from "../../actions/share";

interface WhiteboardSidebarProps {
  activeCanvasId: string | null;
  onSelectCanvas: (canvasId: string) => void;
  onNewCanvas: () => void;
  /** Bumped by the parent whenever a save/rename happens so the list refreshes */
  refreshKey?: number;
  /** Called when user clicks a shared canvas */
  onSelectSharedCanvas?: (shared: SharedCanvasSummary) => void;
  /** The id of the currently-viewed shared record (for highlight) */
  viewingSharedId?: string | null;
}

export default function WhiteboardSidebar({
  activeCanvasId,
  onSelectCanvas,
  onNewCanvas,
  refreshKey,
  onSelectSharedCanvas,
  viewingSharedId,
}: WhiteboardSidebarProps) {
  const [canvases, setCanvases] = useState<CanvasSummary[]>([]);
  const [sharedCanvases, setSharedCanvases] = useState<SharedCanvasSummary[]>(
    [],
  );
  const [isLoading, setIsLoading] = useState(true);
  const [collapsed, setCollapsed] = useState(false);

  const fetchCanvases = useCallback(async () => {
    setIsLoading(true);
    try {
      const [ownResult, sharedResult] = await Promise.all([
        listCanvasesAction(),
        listSharedCanvasesAction(),
      ]);
      if (ownResult.success && ownResult.canvases) {
        setCanvases(ownResult.canvases);
      }
      if (sharedResult.success && sharedResult.canvases) {
        setSharedCanvases(sharedResult.canvases);
      }
    } catch (err) {
      console.error("Failed to list canvases:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load on mount + whenever refreshKey changes
  useEffect(() => {
    fetchCanvases();
  }, [fetchCanvases, refreshKey]);

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!confirm("Delete this whiteboard?")) return;
    const result = await deleteCanvasAction(id);
    if (result.success) {
      setCanvases((prev) => prev.filter((c) => c.id !== id));
      if (id === activeCanvasId) {
        onNewCanvas();
      }
    }
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return d.toLocaleDateString();
  };

  if (collapsed) {
    return (
      <div className="flex flex-col items-center w-10 bg-gray-900 border-r border-gray-800 py-2 shrink-0">
        <button
          onClick={() => setCollapsed(false)}
          title="Expand sidebar"
          className="p-1.5 rounded hover:bg-gray-800 text-gray-400 hover:text-white transition-colors cursor-pointer"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 5l7 7-7 7"
            />
          </svg>
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-56 bg-gray-900 border-r border-gray-800 shrink-0">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-800">
        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
          Whiteboards
        </span>
        <div className="flex items-center gap-1">
          <button
            onClick={onNewCanvas}
            title="New whiteboard"
            className="p-1 rounded hover:bg-gray-800 text-gray-400 hover:text-white transition-colors cursor-pointer"
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
                d="M12 4v16m8-8H4"
              />
            </svg>
          </button>
          <button
            onClick={() => setCollapsed(true)}
            title="Collapse sidebar"
            className="p-1 rounded hover:bg-gray-800 text-gray-400 hover:text-white transition-colors cursor-pointer"
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
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* ── My Whiteboards (scrollable) ── */}
      <div className="flex-1 overflow-y-auto py-1 min-h-0">
        {isLoading ? (
          <div className="px-3 py-4 text-xs text-gray-500 text-center">
            Loading…
          </div>
        ) : canvases.length > 0 ? (
          <>
            <div className="px-3 pt-2 pb-1 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
              My Whiteboards
            </div>
            {canvases.map((canvas) => (
              <div
                key={canvas.id}
                onClick={() => onSelectCanvas(canvas.id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter") onSelectCanvas(canvas.id);
                }}
                className={`w-full text-left px-3 py-2 group flex items-center justify-between transition-colors cursor-pointer ${
                  canvas.id === activeCanvasId && !viewingSharedId
                    ? "bg-gray-800 text-white"
                    : "text-gray-300 hover:bg-gray-800/60 hover:text-white"
                }`}
              >
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium truncate">
                    {canvas.name}
                  </div>
                  <div className="text-xs text-gray-500">
                    {formatDate(canvas.updatedAt)}
                  </div>
                </div>
                <button
                  onClick={(e) => handleDelete(e, canvas.id)}
                  title="Delete whiteboard"
                  className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-red-900/50 text-gray-500 hover:text-red-400 transition-all cursor-pointer"
                >
                  <svg
                    className="w-3.5 h-3.5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                </button>
              </div>
            ))}
          </>
        ) : (
          <div className="px-3 py-4 text-xs text-gray-500 text-center">
            {sharedCanvases.length > 0
              ? "No personal whiteboards yet"
              : "No whiteboards yet."}
            <br />
            <button
              onClick={onNewCanvas}
              className="text-blue-400 hover:underline mt-1 cursor-pointer"
            >
              Create one
            </button>
          </div>
        )}
      </div>

      {/* ── Shared with me (pinned to bottom) ── */}
      {sharedCanvases.length > 0 && (
        <div className="border-t border-gray-800 max-h-[40%] overflow-y-auto shrink-0">
          <div className="px-3 pt-2 pb-1 text-[10px] font-semibold text-purple-400 uppercase tracking-wider flex items-center gap-1.5 sticky top-0 bg-gray-900 z-10">
            <svg
              className="w-3 h-3"
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
            Shared with me
          </div>
          {sharedCanvases.map((shared) => (
            <div
              key={shared.id}
              onClick={() => onSelectSharedCanvas?.(shared)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter") onSelectSharedCanvas?.(shared);
              }}
              className={`w-full text-left px-3 py-2 group flex items-center justify-between transition-colors cursor-pointer border-l-2 ${
                viewingSharedId === shared.id
                  ? "bg-purple-900/30 text-purple-200 border-purple-500"
                  : "text-gray-300 hover:bg-purple-900/20 hover:text-purple-200 border-transparent hover:border-purple-500/50"
              }`}
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-medium truncate">
                    {shared.canvasName}
                  </span>
                  {!shared.seen && (
                    <span
                      className="w-2 h-2 rounded-full bg-purple-400 shrink-0"
                      title="New"
                    />
                  )}
                </div>
                <div className="text-xs text-purple-400/70">
                  from {shared.fromUsername} · {formatDate(shared.sharedAt)}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
