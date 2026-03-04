
"use client";

// Utility function to format bytes
function formatBytes(bytes: number): string {
  const units = ["B", "KB", "MB", "GB"];
  let size = bytes;
  let unitIdx = 0;
  while (size >= 1024 && unitIdx < units.length - 1) {
    size /= 1024;
    unitIdx++;
  }
  return `${size.toFixed(unitIdx === 0 ? 0 : 1)} ${units[unitIdx]}`;
}

import { useEffect, useState } from "react";
import Link from "next/link";
import ColorBends from "@/components/ui/ColorBends";
import {
  fetchRecordingsAction,
  getRecordingDataAction,
  deleteRecordingAction,
  type RecordingSummary,
} from "../whiteboard/actions/recording";

export default function RecordingsPage() {
  const [recordings, setRecordings] = useState<RecordingSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [previews, setPreviews] = useState<Record<string, string>>({});

  useEffect(() => {
    async function loadRecordings() {
      try {
        const result = await fetchRecordingsAction();
        if (result.success && result.recordings) {
          setRecordings(result.recordings);
        } else {
          setError(result.errorMessage || "Failed to load recordings");
        }
      } catch (err) {
        setError("Error loading recordings");
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadRecordings();
  }, []);

  async function handlePreview(recordingId: string, mimeType: string) {
    if (previews[recordingId]) return; // Already loaded
    try {
      const result = await getRecordingDataAction(recordingId);
      if (result.success && result.data) {
        // Convert base64 back to binary
        const binaryString = atob(result.data);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        const blob = new Blob([bytes], { type: mimeType });
        const url = URL.createObjectURL(blob);
        setPreviews((prev) => ({ ...prev, [recordingId]: url }));
      } else {
        setError(result.errorMessage || "Failed to load preview");
      }
    } catch (err) {
      setError("Error loading preview");
      console.error(err);
    }
  }

  async function handleDownload(recordingId: string, filename: string) {
    setDownloading(recordingId);
    try {
      const result = await getRecordingDataAction(recordingId);
      if (result.success && result.data) {
        // Convert base64 back to binary
        const binaryString = atob(result.data);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        const blob = new Blob([bytes], { type: result.mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = result.filename || filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      } else {
        setError(result.errorMessage || "Failed to download recording");
      }
    } catch (err) {
      setError("Error downloading recording");
      console.error(err);
    } finally {
      setDownloading(null);
    }
  }

  async function handleDelete(recordingId: string) {
    if (!window.confirm("Are you sure you want to delete this recording?")) {
      return;
    }
    setDeleting(recordingId);
    try {
      const result = await deleteRecordingAction(recordingId);
      if (result.success) {
        setRecordings((prev) => prev.filter((rec) => rec.id !== recordingId));
        setPreviews((prev) => {
          const newPreviews = { ...prev };
          delete newPreviews[recordingId];
          return newPreviews;
        });
      } else {
        setError(result.errorMessage || "Failed to delete recording");
      }
    } catch (err) {
      setError("Error deleting recording");
      console.error(err);
    } finally {
      setDeleting(null);
    }
  }

  if (loading) {
    return (
      <>
        <ColorBends
          className="fixed inset-0 -z-10"
          colors={["#ff5c7a", "#8a5cff", "#00ffd1"]}
          rotation={0}
          speed={0.2}
          scale={1}
          frequency={1}
          warpStrength={1}
          mouseInfluence={1}
          parallax={0.5}
          noise={0.1}
          transparent
          autoRotate={0}
        />
        <div className="flex flex-col flex-1 items-center justify-center min-h-screen">
          <div className="backdrop-blur-xl bg-white/60 border border-neutral-200 rounded-2xl px-8 py-6 shadow-[0_8px_32px_rgba(0,0,0,0.08)]">
            <p className="text-neutral-600 text-lg">Loading recordings...</p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      {/* Animated background — same as settings / landing page */}
      <ColorBends
        className="fixed inset-0 -z-10"
        colors={["#ff5c7a", "#8a5cff", "#00ffd1"]}
        rotation={0}
        speed={0.2}
        scale={1}
        frequency={1}
        warpStrength={1}
        mouseInfluence={1}
        parallax={0.5}
        noise={0.1}
        transparent
        autoRotate={0}
      />

      <div className="min-h-screen flex flex-col items-center px-4 pb-16 pt-8">
        {/* Page header */}
        <div className="text-center mb-10 max-w-2xl">
          <h1 className="text-4xl font-bold text-neutral-900 mb-3 tracking-tight">
            My Recordings
          </h1>
          <p className="text-neutral-500 text-sm">
            View, preview, and download your screen recordings
          </p>
        </div>

        <div className="w-full max-w-4xl">
          {/* Back to whiteboard */}
          <div className="flex justify-end mb-6">
            <Link
              href="/whiteboard"
              className="backdrop-blur-xl bg-white/60 border border-neutral-200 rounded-xl px-5 py-2.5 text-sm font-medium text-neutral-700 shadow-[0_4px_16px_rgba(0,0,0,0.06)] transition-all duration-200 hover:bg-white/80 hover:border-neutral-300 hover:shadow-[0_4px_24px_rgba(0,0,0,0.1)]"
            >
              ← Back to Whiteboard
            </Link>
          </div>

          {error && (
            <div className="mb-6 backdrop-blur-xl bg-red-50/60 border border-red-200 rounded-2xl p-4 shadow-[0_8px_32px_rgba(0,0,0,0.08)] text-red-700 text-sm">
              {error}
            </div>
          )}

          {recordings.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24">
              <div className="backdrop-blur-xl bg-white/60 border border-neutral-200 rounded-2xl px-10 py-10 shadow-[0_8px_32px_rgba(0,0,0,0.08)] text-center">
                <p className="text-lg font-semibold text-neutral-700 mb-2">No recordings yet</p>
                <p className="text-sm text-neutral-500">
                  Create and save a screen recording from the whiteboard
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {recordings.map((rec) => (
                <div
                  key={rec.id}
                  className="backdrop-blur-xl bg-white/60 border border-neutral-200 rounded-2xl p-5 shadow-[0_8px_32px_rgba(0,0,0,0.08)] transition-all duration-200 hover:bg-white/80 hover:border-neutral-300 hover:shadow-[0_8px_40px_rgba(0,0,0,0.12)]"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-neutral-900 text-base">{rec.filename}</p>
                      <p className="text-sm text-neutral-500 mt-0.5">
                        {formatBytes(rec.sizeBytes)} · {new Date(rec.createdAt).toLocaleString()}
                      </p>
                    </div>
                    <div className="flex gap-2 ml-4">
                      <button
                        onClick={() => handleDownload(rec.id, rec.filename)}
                        disabled={downloading === rec.id}
                        className="px-4 py-2 text-sm font-medium rounded-xl bg-neutral-900/10 border border-neutral-300 text-neutral-700 shadow-[0_2px_0_rgba(0,0,0,0.08)] transition-all duration-200 hover:bg-neutral-900/20 hover:border-neutral-400 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
                      >
                        {downloading === rec.id ? "Downloading..." : "Download"}
                      </button>
                      <button
                        onClick={() => handleDelete(rec.id)}
                        disabled={deleting === rec.id}
                        className="px-4 py-2 text-sm font-medium rounded-xl bg-red-500/10 border border-red-300 text-red-700 shadow-[0_2px_0_rgba(0,0,0,0.08)] transition-all duration-200 hover:bg-red-500/20 hover:border-red-400 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
                      >
                        {deleting === rec.id ? "Deleting..." : "Delete"}
                      </button>
                    </div>
                  </div>
                  {rec.mimeType.startsWith("video") && (
                    <div className="mt-4">
                      {!!previews[rec.id] ? (
                        <video src={previews[rec.id]} controls className="w-full max-w-md rounded-xl shadow-[0_4px_16px_rgba(0,0,0,0.1)] cursor-pointer" />
                      ) : (
                        <img
                          src="/icons/video-thumbnail.png"
                          alt="Preview"
                          className="w-32 h-20 object-cover rounded-xl shadow-[0_4px_16px_rgba(0,0,0,0.1)] cursor-pointer transition-all duration-200 hover:shadow-[0_4px_24px_rgba(0,0,0,0.15)]"
                          onClick={() => handlePreview(rec.id, rec.mimeType)}
                        />
                      )}
                    </div>
                  )}
                  {rec.mimeType.startsWith("audio") && (
                    <div className="mt-4">
                      {!!previews[rec.id] ? (
                        <audio src={previews[rec.id]} controls className="w-full max-w-md rounded-xl shadow-[0_4px_16px_rgba(0,0,0,0.1)]" />
                      ) : (
                        <button
                          onClick={() => handlePreview(rec.id, rec.mimeType)}
                          className="px-4 py-2 text-sm font-medium rounded-xl bg-neutral-900/10 border border-neutral-300 text-neutral-700 shadow-[0_2px_0_rgba(0,0,0,0.08)] transition-all duration-200 hover:bg-neutral-900/20 hover:border-neutral-400 cursor-pointer"
                        >
                          Load Audio Preview
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
