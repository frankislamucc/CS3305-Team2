"use client";

import { useCallback, useRef, useState } from "react";
import { saveRecordingAction } from "../actions/recording";

export interface RecordingControlsProps {
  onRecordingStart?: () => void;
  onRecordingStop?: () => void;
  onRecordingSaved?: (recordingId: string) => void;
  onError?: (error: string) => void;
}

export default function RecordingControls({
  onRecordingStart,
  onRecordingStop,
  onRecordingSaved,
  onError,
}: RecordingControlsProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  const startRecording = useCallback(async () => {
    try {
      // Request access to screen + audio
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          cursor: "always",
        },
        audio: true,
      });

      streamRef.current = stream;

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: "video/webm;codecs=vp9,opus",
      });

      chunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        // Combine chunks into a single blob
        const blob = new Blob(chunksRef.current, { type: "video/webm" });
        const buffer = await blob.arrayBuffer();

        // Save recording
        setIsSaving(true);
        try {
          const filename = `recording_${new Date().toISOString().slice(0, 19).replace(/:/g, "-")}.webm`;
          const result = await saveRecordingAction(
            filename,
            Buffer.from(buffer),
            blob.type
          );

          if (result.success && result.recordingId) {
            onRecordingSaved?.(result.recordingId);
          } else {
            onError?.(result.errorMessage || "Failed to save recording");
          }
        } catch (error) {
          onError?.(
            error instanceof Error ? error.message : "Failed to save recording"
          );
        } finally {
          setIsSaving(false);
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
      onRecordingStart?.();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to start recording";
      onError?.(message);
    }
  }, [onRecordingStart, onRecordingSaved, onError]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      onRecordingStop?.();

      // Stop all tracks in the stream
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
    }
  }, [isRecording, onRecordingStop]);

  return (
    <div className="flex items-center gap-2">
      {!isRecording ? (
        <button
          onClick={startRecording}
          disabled={isSaving}
          className="flex items-center gap-2 px-3 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 transition-colors"
          title="Start screen recording"
        >
          <span className="w-2 h-2 bg-white rounded-full"></span>
          Record
        </button>
      ) : (
        <button
          onClick={stopRecording}
          className="flex items-center gap-2 px-3 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors animate-pulse"
          title="Stop recording"
        >
          <span className="w-2 h-2 bg-white rounded-full"></span>
          Stop
        </button>
      )}

      {isSaving && (
        <span className="text-sm text-gray-600">Saving recording...</span>
      )}
    </div>
  );
}
