"use server";

import { getSession } from "@/lib/auth";
import { dbConnect } from "@/lib/mongodb";
import Recording from "@/app/models/Recording";

export interface RecordingSummary {
  id: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
}

export interface FetchRecordingsResult {
  success: boolean;
  recordings?: RecordingSummary[];
  errorMessage?: string;
}

export interface RecordingData {
  success: boolean;
  data?: Buffer;
  mimeType?: string;
  filename?: string;
  errorMessage?: string;
}

/**
 * Fetch all recordings for the authenticated user (summary only, no data blobs)
 */
export async function fetchRecordingsAction(): Promise<FetchRecordingsResult> {
  try {
    const session = await getSession();
    if (!session) {
      return { success: false, errorMessage: "Not authenticated" };
    }

    await dbConnect();

    const recordings = await Recording.find({ userId: session.userId })
      .select("_id filename mimeType sizeBytes createdAt")
      .sort({ createdAt: -1 })
      .lean();

    return {
      success: true,
      recordings: recordings.map((rec: any) => ({
        id: rec._id.toString(),
        filename: rec.filename,
        mimeType: rec.mimeType,
        sizeBytes: rec.sizeBytes,
        createdAt: rec.createdAt?.toISOString() ?? new Date().toISOString(),
      })),
    };
  } catch (error) {
    console.error("Error fetching recordings:", error);
    return { success: false, errorMessage: "Failed to fetch recordings" };
  }
}

/**
 * Get full recording data (blob) for playback or download
 */
export async function getRecordingDataAction(
  recordingId: string
): Promise<RecordingData> {
  try {
    const session = await getSession();
    if (!session) {
      return { success: false, errorMessage: "Not authenticated" };
    }

    await dbConnect();

    const recording = await Recording.findOne({
      _id: recordingId,
      userId: session.userId,
    }).lean();

    if (!recording) {
      return { success: false, errorMessage: "Recording not found" };
    }

    return {
      success: true,
      data: recording.data,
      mimeType: recording.mimeType,
      filename: recording.filename,
    };
  } catch (error) {
    console.error("Error fetching recording data:", error);
    return { success: false, errorMessage: "Failed to fetch recording data" };
  }
}

/**
 * Save a recording blob
 */
export async function saveRecordingAction(
  filename: string,
  data: Buffer,
  mimeType: string = "video/webm"
): Promise<{ success: boolean; errorMessage?: string; recordingId?: string }> {
  try {
    const session = await getSession();
    if (!session) {
      return { success: false, errorMessage: "Not authenticated" };
    }

    await dbConnect();

    const recording = new Recording({
      userId: session.userId,
      filename,
      mimeType,
      sizeBytes: data.length,
      data,
    });

    await recording.save();

    return {
      success: true,
      recordingId: recording._id.toString(),
    };
  } catch (error) {
    console.error("Error saving recording:", error);
    return { success: false, errorMessage: "Failed to save recording" };
  }
}

/**
 * Delete a recording
 */
export async function deleteRecordingAction(
  recordingId: string
): Promise<{ success: boolean; errorMessage?: string }> {
  try {
    const session = await getSession();
    if (!session) {
      return { success: false, errorMessage: "Not authenticated" };
    }

    await dbConnect();

    const result = await Recording.deleteOne({
      _id: recordingId,
      userId: session.userId,
    });

    if (result.deletedCount === 0) {
      return { success: false, errorMessage: "Recording not found" };
    }

    return { success: true };
  } catch (error) {
    console.error("Error deleting recording:", error);
    return { success: false, errorMessage: "Failed to delete recording" };
  }
}

