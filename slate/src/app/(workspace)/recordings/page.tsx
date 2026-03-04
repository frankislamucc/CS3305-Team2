
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
      <div className="flex flex-col flex-1 items-center justify-center">
        <p className="text-gray-600">Loading recordings...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 min-w-0 p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">My Recordings</h1>
        <Link
          href="/whiteboard"
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
        >
          Back to Whiteboard
        </Link>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}

      {recordings.length === 0 ? (
        <div className="flex flex-col items-center justify-center flex-1 text-gray-500">
          <p className="text-lg">No recordings yet</p>
          <p className="text-sm">Create and save a screen recording from the whiteboard</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {recordings.map((rec) => (
            <div
              key={rec.id}
              className="flex flex-col gap-2 p-4 border rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="font-semibold text-gray-800">{rec.filename}</p>
                  <p className="text-sm text-gray-600">
                    {formatBytes(rec.sizeBytes)} · {new Date(rec.createdAt).toLocaleString()}
                  </p>
                </div>
                <div className="flex gap-2 ml-4">
                  <button
                    onClick={() => handleDownload(rec.id, rec.filename)}
                    disabled={downloading === rec.id}
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 transition-colors"
                  >
                    {downloading === rec.id ? "Downloading..." : "Download"}
                  </button>
                  <button
                    onClick={() => handleDelete(rec.id)}
                    disabled={deleting === rec.id}
                    className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 transition-colors"
                  >
                    {deleting === rec.id ? "Deleting..." : "Delete"}
                  </button>
                </div>
              </div>
              {rec.mimeType.startsWith("video") && (
                <div className="mt-2">
                  {!!previews[rec.id] ? (
                    <video src={previews[rec.id]} controls className="w-full max-w-md rounded shadow cursor-pointer" />
                  ) : (
                    <img
                      src="/icons/video-thumbnail.png"
                      alt="Preview"
                      className="w-32 h-20 object-cover rounded shadow cursor-pointer"
                      onClick={() => handlePreview(rec.id, rec.mimeType)}
                    />
                  )}
                </div>
              )}
              {rec.mimeType.startsWith("audio") && (
                <div className="mt-2">
                  {!!previews[rec.id] ? (
                    <audio src={previews[rec.id]} controls className="w-full max-w-md rounded shadow" />
                  ) : (
                    <button
                      onClick={() => handlePreview(rec.id, rec.mimeType)}
                      className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 transition-colors"
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
  );
}
