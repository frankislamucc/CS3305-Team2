"use server";

import dbConnect from "@/lib/mongodb";
import Canvas from "@/app/models/Canvas";
import { getSession } from "@/lib/auth";
import type { LineData } from "@/app/(workspace)/whiteboard/_types";

export interface SaveCanvasResult {
  success: boolean;
  canvasId?: string;
  errorMessage?: string;
}

export interface LoadCanvasResult {
  success: boolean;
  canvasId?: string;
  lines?: LineData[];
  errorMessage?: string;
}

/**
 * Save (create or update) a canvas for the authenticated user.
 */
export async function saveCanvasAction(
  lines: LineData[],
  canvasId: string | null,
  name?: string,
): Promise<SaveCanvasResult> {
  try {
    const session = await getSession();
    if (!session) {
      return { success: false, errorMessage: "Not authenticated" };
    }

    await dbConnect();

    // Serialize lines — strip any non-JSON-safe values (e.g. CanvasGradient)
    const serializedLines = lines.map((line) => ({
      id: line.id,
      points: line.points,
      stroke: typeof line.stroke === "string" ? line.stroke : "#000000",
      strokeWidth: line.strokeWidth,
      tension: line.tension,
      lineCap: line.lineCap,
      lineJoin: line.lineJoin,
    }));

    if (canvasId) {
      // Update existing canvas
      const canvas = await Canvas.findOneAndUpdate(
        { _id: canvasId, userId: session.userId },
        { lines: serializedLines, ...(name !== undefined && { name }) },
        { new: true },
      );

      if (!canvas) {
        return { success: false, errorMessage: "Canvas not found" };
      }

      return { success: true, canvasId: canvas._id.toString() };
    }

    // Create new canvas
    const canvas = await Canvas.create({
      userId: session.userId,
      name: name || "Untitled",
      lines: serializedLines,
    });

    return { success: true, canvasId: canvas._id.toString() };
  } catch (error) {
    console.error("Save canvas error:", error);
    return { success: false, errorMessage: "Failed to save canvas" };
  }
}

/**
 * Load the most recent canvas for the authenticated user.
 */
export async function loadCanvasAction(): Promise<LoadCanvasResult> {
  try {
    const session = await getSession();
    if (!session) {
      return { success: false, errorMessage: "Not authenticated" };
    }

    await dbConnect();

    const canvas = await Canvas.findOne({ userId: session.userId })
      .sort({ updatedAt: -1 })
      .lean();

    if (!canvas) {
      return { success: true, lines: [], canvasId: undefined };
    }

    return {
      success: true,
      canvasId: canvas._id.toString(),
      lines: canvas.lines as LineData[],
    };
  } catch (error) {
    console.error("Load canvas error:", error);
    return { success: false, errorMessage: "Failed to load canvas" };
  }
}

/**
 * Delete a canvas belonging to the authenticated user.
 */
export async function deleteCanvasAction(
  canvasId: string,
): Promise<{ success: boolean; errorMessage?: string }> {
  try {
    const session = await getSession();
    if (!session) {
      return { success: false, errorMessage: "Not authenticated" };
    }

    await dbConnect();

    const result = await Canvas.findOneAndDelete({
      _id: canvasId,
      userId: session.userId,
    });

    if (!result) {
      return { success: false, errorMessage: "Canvas not found" };
    }

    return { success: true };
  } catch (error) {
    console.error("Delete canvas error:", error);
    return { success: false, errorMessage: "Failed to delete canvas" };
  }
}
