"use server";

import dbConnect from "@/lib/mongodb";
import Canvas from "@/app/models/Canvas";
import SharedCanvas from "@/app/models/SharedCanvas";
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
  name?: string;
  lines?: LineData[];
  errorMessage?: string;
}

export interface CanvasSummary {
  id: string;
  name: string;
  updatedAt: string;
}

export interface ListCanvasesResult {
  success: boolean;
  canvases?: CanvasSummary[];
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
      name: (canvas as any).name ?? "Untitled",
      lines: canvas.lines as LineData[],
    };
  } catch (error) {
    console.error("Load canvas error:", error);
    return { success: false, errorMessage: "Failed to load canvas" };
  }
}

/**
 * List all canvases for the authenticated user (summary only, no lines).
 */
export async function listCanvasesAction(): Promise<ListCanvasesResult> {
  try {
    const session = await getSession();
    if (!session) {
      return { success: false, errorMessage: "Not authenticated" };
    }

    await dbConnect();

    const canvases = await Canvas.find({ userId: session.userId, isSharedCopy: { $ne: true } })
      .select("_id name updatedAt")
      .sort({ updatedAt: -1 })
      .lean();

    return {
      success: true,
      canvases: canvases.map((c: any) => ({
        id: c._id.toString(),
        name: c.name ?? "Untitled",
        updatedAt: c.updatedAt?.toISOString() ?? new Date().toISOString(),
      })),
    };
  } catch (error) {
    console.error("List canvases error:", error);
    return { success: false, errorMessage: "Failed to list canvases" };
  }
}

/**
 * Load a specific canvas by ID for the authenticated user.
 */
export async function loadCanvasByIdAction(
  canvasId: string,
): Promise<LoadCanvasResult> {
  try {
    const session = await getSession();
    if (!session) {
      return { success: false, errorMessage: "Not authenticated" };
    }

    await dbConnect();

    const canvas = await Canvas.findOne({
      _id: canvasId,
      userId: session.userId,
    }).lean();

    if (!canvas) {
      return { success: false, errorMessage: "Canvas not found" };
    }

    return {
      success: true,
      canvasId: canvas._id.toString(),
      name: (canvas as any).name ?? "Untitled",
      lines: canvas.lines as LineData[],
    };
  } catch (error) {
    console.error("Load canvas by ID error:", error);
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

    // Cascade: remove all SharedCanvas records that reference this canvas
    await SharedCanvas.deleteMany({ canvasId });

    return { success: true };
  } catch (error) {
    console.error("Delete canvas error:", error);
    return { success: false, errorMessage: "Failed to delete canvas" };
  }
}

/**
 * Rename a canvas belonging to the authenticated user.
 */
export async function renameCanvasAction(
  canvasId: string,
  name: string,
): Promise<{ success: boolean; errorMessage?: string }> {
  try {
    const session = await getSession();
    if (!session) {
      return { success: false, errorMessage: "Not authenticated" };
    }

    const trimmed = name.trim();
    if (!trimmed || trimmed.length > 100) {
      return { success: false, errorMessage: "Name must be 1-100 characters" };
    }

    await dbConnect();

    const canvas = await Canvas.findOneAndUpdate(
      { _id: canvasId, userId: session.userId },
      { name: trimmed },
      { new: true },
    );

    if (!canvas) {
      return { success: false, errorMessage: "Canvas not found" };
    }

    return { success: true };
  } catch (error) {
    console.error("Rename canvas error:", error);
    return { success: false, errorMessage: "Failed to rename canvas" };
  }
}
