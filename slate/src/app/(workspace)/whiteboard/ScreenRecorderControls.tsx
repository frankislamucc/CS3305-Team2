"use client";

import { useMemo, useState } from "react";
import { ScreenRecorder, type ScreenRecordingResult } from "@/lib/screenRecorder";

export default function ScreenRecorderControls() {
  const recorder = useMemo(() => new ScreenRecorder(), []);
  const [recording, setRecording] = useState(false);
  const [withAudio, setWithAudio] = useState(true);
  const [last, setLast] = useState<ScreenRecordingResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function start() {
    setError(null);
    setLast(null);
    try {
      await recorder.start({ withAudio });
      setRecording(true);
    } catch (e) {
      setError(errMsg(e, "Recording cancelled or not supported."));
      setRecording(false);
    }
  }

  async function stop() {
    setError(null);
    try {
      const result = await recorder.stop("whiteboard");
      setLast(result);
      ScreenRecorder.download(result);
    } catch (e) {
      setError(errMsg(e, "Failed to stop recording."));
    } finally {
      setRecording(false);
    }
  }

  return (
    <div className="fixed top-4 right-4 z-50 rounded-xl border bg-white/90 backdrop-blur p-3 shadow-lg">
      <div className="flex items-center gap-2">
        <button
          onClick={start}
          disabled={recording}
          className="rounded-lg border px-3 py-2 disabled:opacity-50"
        >
          Start
        </button>

        <button
          onClick={stop}
          disabled={!recording}
          className="rounded-lg border px-3 py-2 disabled:opacity-50"
        >
          Stop & download
        </button>

        <label className="flex items-center gap-2 text-sm select-none ml-2">
          <input
            type="checkbox"
            checked={withAudio}
            disabled={recording}
            onChange={(e) => setWithAudio(e.target.checked)}
          />
          Audio
        </label>
      </div>

      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      {last && (
        <p className="mt-2 text-xs opacity-70">
          Saved <span className="font-mono">{last.filename}</span> ({formatBytes(last.sizeBytes)})
        </p>
      )}

    </div>
  );
}

function errMsg(e: unknown, fallback: string): string {
  if (e instanceof Error) return e.message;
  if (typeof e === "string") return e;
  return fallback;
}

function formatBytes(bytes: number): string {
  const units = ["B", "KB", "MB", "GB"];
  let s = bytes;
  let i = 0;
  while (s >= 1024 && i < units.length - 1) {
    s /= 1024;
    i++;
  }
  return `${s.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}
