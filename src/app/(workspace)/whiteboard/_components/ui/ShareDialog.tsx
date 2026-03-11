"use client";

import { useState } from "react";
import { shareCanvasAction } from "../../actions/share";

interface ShareDialogProps {
  canvasId: string;
  canvasName: string;
  onClose: () => void;
}

export default function ShareDialog({
  canvasId,
  canvasName,
  onClose,
}: ShareDialogProps) {
  const [username, setUsername] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  const handleShare = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) return;

    setStatus("loading");
    setMessage("");

    const result = await shareCanvasAction(canvasId, username.trim());

    if (result.success) {
      setStatus("success");
      setMessage(`Whiteboard "${canvasName}" shared with ${username.trim()} successfully!`);
      setUsername("");
      // Auto-close after a delay
      setTimeout(() => onClose(), 2000);
    } else {
      setStatus("error");
      setMessage(result.errorMessage ?? "Failed to share whiteboard");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-gray-900 border border-gray-700 rounded-xl shadow-2xl w-full max-w-md mx-4 p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">Share Whiteboard</h2>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-gray-800 text-gray-400 hover:text-white transition-colors cursor-pointer"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Canvas name */}
        <p className="text-sm text-gray-400 mb-4">
          Sharing: <span className="text-white font-medium">{canvasName}</span>
        </p>

        {/* Form */}
        <form onSubmit={handleShare} className="space-y-4">
          <div>
            <label htmlFor="share-username" className="block text-sm text-gray-300 mb-1.5">
              Recipient&apos;s Username
            </label>
            <input
              id="share-username"
              type="text"
              value={username}
              onChange={(e) => {
                setUsername(e.target.value);
                if (status !== "idle") {
                  setStatus("idle");
                  setMessage("");
                }
              }}
              placeholder="Enter username…"
              autoFocus
              disabled={status === "loading" || status === "success"}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
            />
          </div>

          {/* Status message */}
          {message && (
            <div
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${
                status === "success"
                  ? "bg-green-900/40 text-green-300 border border-green-800"
                  : "bg-red-900/40 text-red-300 border border-red-800"
              }`}
            >
              {status === "success" ? (
                <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M12 3a9 9 0 100 18 9 9 0 000-18z" />
                </svg>
              )}
              <span>{message}</span>
            </div>
          )}

          {/* Buttons */}
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-300 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!username.trim() || status === "loading" || status === "success"}
              className="px-4 py-2 text-sm text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {status === "loading" ? (
                <span className="flex items-center gap-2">
                  <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25" />
                    <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" className="opacity-75" />
                  </svg>
                  Sharing…
                </span>
              ) : status === "success" ? (
                "Shared!"
              ) : (
                "Share"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
