"use server";

import dbConnect from "@/lib/mongodb";
import Canvas from "@/app/models/Canvas";
import SharedCanvas from "@/app/models/SharedCanvas";
import User from "@/app/models/User";
import { getSession } from "@/lib/auth";
import { notifyUser } from "@/lib/socket";
import type { LineData, CircleData, TextData, ArrowData } from "@/app/(workspace)/whiteboard/_types";

/* ─── Result types ─── */

export interface ShareResult {
  success: boolean;
  errorMessage?: string;
}

export interface SharedCanvasSummary {
  id: string;
  canvasId: string;
  canvasName: string;
  fromUsername: string;
  sharedAt: string;
  seen: boolean;
}

export interface ListSharedResult {
  success: boolean;
  canvases?: SharedCanvasSummary[];
  errorMessage?: string;
}

export interface LoadSharedCanvasResult {
  success: boolean;
  canvasId?: string;
  /** The recipient's personal copy ID (if they've saved edits before) */
  copyCanvasId?: string;
  name?: string;
  fromUsername?: string;
  lines?: LineData[];
  circles?: CircleData[];
  texts?: TextData[];
  arrows?: ArrowData[];
  errorMessage?: string;
}

/* ─── Share a canvas to another user ─── */

export async function shareCanvasAction(
  canvasId: string,
  recipientUsername: string,
): Promise<ShareResult> {
  try {
    const session = await getSession();
    if (!session) {
      return { success: false, errorMessage: "Not authenticated" };
    }

    const trimmed = recipientUsername.trim().toLowerCase();
    if (!trimmed) {
      return { success: false, errorMessage: "Please enter a username" };
    }

    if (trimmed === session.username.toLowerCase()) {
      return { success: false, errorMessage: "You cannot share with yourself" };
    }

    await dbConnect();

    // Verify the canvas belongs to the sender
    const canvas = await Canvas.findOne({
      _id: canvasId,
      userId: session.userId,
    }).lean();

    if (!canvas) {
      return { success: false, errorMessage: "Canvas not found" };
    }

    // Find the recipient user (case-insensitive)
    const recipient = await User.findOne({
      username: { $regex: new RegExp(`^${trimmed}$`, "i") },
    }).lean();

    if (!recipient) {
      return { success: false, errorMessage: "User not found" };
    }

    const recipientId = recipient._id.toString();

    // Prevent duplicate shares of the same canvas to the same user
    const existing = await SharedCanvas.findOne({
      canvasId: canvas._id,
      toUserId: recipientId,
    });

    if (existing) {
      // Update with latest data instead of creating a duplicate
      existing.canvasName = (canvas as any).name ?? "Untitled";
      existing.seen = false;
      await existing.save();
    } else {
      await SharedCanvas.create({
        canvasId: canvas._id,
        fromUserId: session.userId,
        fromUsername: session.username,
        toUserId: recipientId,
        toUsername: recipient.username,
        canvasName: (canvas as any).name ?? "Untitled",
      });
    }

    // Push real-time notification via WebSocket
    notifyUser(recipientId, {
      sharedCanvasId: canvas._id.toString(),
      canvasName: (canvas as any).name ?? "Untitled",
      fromUsername: session.username,
    });

    return { success: true };
  } catch (error) {
    console.error("Share canvas error:", error);
    return { success: false, errorMessage: "Failed to share canvas" };
  }
}

/* ─── List canvases shared WITH the current user ─── */

export async function listSharedCanvasesAction(): Promise<ListSharedResult> {
  try {
    const session = await getSession();
    if (!session) {
      return { success: false, errorMessage: "Not authenticated" };
    }

    await dbConnect();

    const shared = await SharedCanvas.find({ toUserId: session.userId })
      .sort({ createdAt: -1 })
      .lean();

    return {
      success: true,
      canvases: shared.map((s: any) => ({
        id: s._id.toString(),
        canvasId: s.canvasId.toString(),
        canvasName: s.canvasName,
        fromUsername: s.fromUsername,
        sharedAt: s.createdAt?.toISOString() ?? new Date().toISOString(),
        seen: s.seen ?? false,
      })),
    };
  } catch (error) {
    console.error("List shared canvases error:", error);
    return { success: false, errorMessage: "Failed to list shared canvases" };
  }
}

/* ─── Load a specific shared canvas (read-only copy) ─── */

export async function loadSharedCanvasAction(
  sharedId: string,
): Promise<LoadSharedCanvasResult> {
  try {
    const session = await getSession();
    if (!session) {
      return { success: false, errorMessage: "Not authenticated" };
    }

    await dbConnect();

    // Find the share record addressed to this user
    const share = await SharedCanvas.findOne({
      _id: sharedId,
      toUserId: session.userId,
    });

    if (!share) {
      return { success: false, errorMessage: "Shared canvas not found" };
    }

    // Mark as seen
    if (!share.seen) {
      share.seen = true;
      await share.save();
    }

    // If the recipient already has a personal copy, load that instead
    if (share.copyCanvasId) {
      const copy = await Canvas.findById(share.copyCanvasId).lean();
      if (copy) {
        return {
          success: true,
          canvasId: share.canvasId.toString(),
          copyCanvasId: share.copyCanvasId.toString(),
          name: (copy as any).name ?? (share.canvasName ?? "Untitled"),
          fromUsername: share.fromUsername,
          lines: copy.lines as LineData[],
          circles: ((copy as any).circles ?? []) as CircleData[],
          texts: ((copy as any).texts ?? []) as TextData[],
          arrows: ((copy as any).arrows ?? []) as ArrowData[],
        };
      }
    }

    // No copy yet — load the original sender's canvas
    const canvas = await Canvas.findById(share.canvasId).lean();

    if (!canvas) {
      return { success: false, errorMessage: "Original canvas no longer exists" };
    }

    return {
      success: true,
      canvasId: canvas._id.toString(),
      name: (canvas as any).name ?? "Untitled",
      fromUsername: share.fromUsername,
      lines: canvas.lines as LineData[],
      circles: ((canvas as any).circles ?? []) as CircleData[],
      texts: ((canvas as any).texts ?? []) as TextData[],
      arrows: ((canvas as any).arrows ?? []) as ArrowData[],
    };
  } catch (error) {
    console.error("Load shared canvas error:", error);
    return { success: false, errorMessage: "Failed to load shared canvas" };
  }
}

/* ─── Save the recipient's edits to their personal copy ─── */

export async function saveSharedCanvasAction(
  sharedId: string,
  lines: LineData[],
  circles?: CircleData[],
  texts?: TextData[],
  arrows?: ArrowData[],
): Promise<{ success: boolean; copyCanvasId?: string; errorMessage?: string }> {
  try {
    const session = await getSession();
    if (!session) {
      return { success: false, errorMessage: "Not authenticated" };
    }

    await dbConnect();

    const share = await SharedCanvas.findOne({
      _id: sharedId,
      toUserId: session.userId,
    });

    if (!share) {
      return { success: false, errorMessage: "Shared canvas not found" };
    }

    // Serialize lines
    const serializedLines = lines.map((line) => ({
      id: line.id,
      points: line.points,
      stroke: typeof line.stroke === "string" ? line.stroke : "#000000",
      strokeWidth: line.strokeWidth,
      tension: line.tension,
      lineCap: line.lineCap,
      lineJoin: line.lineJoin,
    }));

    const serializedCircles = (circles ?? []).map((c) => ({
      id: c.id, x: c.x, y: c.y, radius: c.radius,
      fill: c.fill, stroke: c.stroke, strokeWidth: c.strokeWidth,
    }));
    const serializedTexts = (texts ?? []).map((t) => ({
      id: t.id, x: t.x, y: t.y, text: t.text,
      fill: t.fill, fontSize: t.fontSize, fontFamily: t.fontFamily,
    }));
    const serializedArrows = (arrows ?? []).map((a) => ({
      id: a.id, x: a.x, y: a.y, points: a.points,
      pointerLength: a.pointerLength, pointerWidth: a.pointerWidth,
      fill: a.fill, stroke: a.stroke, strokeWidth: a.strokeWidth,
    }));

    // Re-fetch atomically to avoid race conditions from rapid saves
    const freshShare = await SharedCanvas.findById(sharedId).lean();
    const existingCopyId = (freshShare as any)?.copyCanvasId;

    if (existingCopyId) {
      // Update existing copy
      await Canvas.findByIdAndUpdate(existingCopyId, {
        lines: serializedLines,
        circles: serializedCircles,
        texts: serializedTexts,
        arrows: serializedArrows,
      });
      return { success: true, copyCanvasId: existingCopyId.toString() };
    }

    // Create a new personal copy for the recipient
    const copy = await Canvas.create({
      userId: session.userId,
      name: share.canvasName,
      lines: serializedLines,
      circles: serializedCircles,
      texts: serializedTexts,
      arrows: serializedArrows,
      isSharedCopy: true,
    });

    // Atomically set copyCanvasId only if still null (prevents duplicates)
    const updated = await SharedCanvas.findOneAndUpdate(
      { _id: sharedId, copyCanvasId: null },
      { copyCanvasId: copy._id },
      { new: true },
    );

    if (!updated) {
      // Another save already created the copy — delete ours and use theirs
      await Canvas.findByIdAndDelete(copy._id);
      const latest = await SharedCanvas.findById(sharedId).lean();
      const latestCopyId = (latest as any)?.copyCanvasId;
      if (latestCopyId) {
        await Canvas.findByIdAndUpdate(latestCopyId, {
          lines: serializedLines,
          circles: serializedCircles,
          texts: serializedTexts,
          arrows: serializedArrows,
        });
        return { success: true, copyCanvasId: latestCopyId.toString() };
      }
    }

    return { success: true, copyCanvasId: copy._id.toString() };
  } catch (error) {
    console.error("Save shared canvas error:", error);
    return { success: false, errorMessage: "Failed to save shared canvas" };
  }
}

/* ─── Remove a shared canvas from the recipient's account ─── */

export async function removeSharedCanvasAction(
  sharedId: string,
): Promise<{ success: boolean; errorMessage?: string }> {
  try {
    const session = await getSession();
    if (!session) {
      return { success: false, errorMessage: "Not authenticated" };
    }

    await dbConnect();

    // Find the share record addressed to this user
    const share = await SharedCanvas.findOne({
      _id: sharedId,
      toUserId: session.userId,
    });

    if (!share) {
      return { success: false, errorMessage: "Shared canvas not found" };
    }

    // If the recipient had a personal copy, delete it too
    if (share.copyCanvasId) {
      await Canvas.findByIdAndDelete(share.copyCanvasId);
    }

    // Remove the share record
    await SharedCanvas.findByIdAndDelete(sharedId);

    return { success: true };
  } catch (error) {
    console.error("Remove shared canvas error:", error);
    return { success: false, errorMessage: "Failed to remove shared canvas" };
  }
}

/* ─── Mark a shared canvas as seen ─── */

export async function markSharedSeenAction(
  sharedId: string,
): Promise<{ success: boolean }> {
  try {
    const session = await getSession();
    if (!session) return { success: false };

    await dbConnect();

    await SharedCanvas.findOneAndUpdate(
      { _id: sharedId, toUserId: session.userId },
      { seen: true },
    );

    return { success: true };
  } catch {
    return { success: false };
  }
}
