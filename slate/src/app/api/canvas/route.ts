import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import Canvas from "@/app/models/Canvas";

// GET /api/canvas?id=<canvasId>  — load a specific canvas
// GET /api/canvas                — list all canvases for the user
export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json(
      { success: false, message: "Not authenticated" },
      { status: 401 },
    );
  }

  await dbConnect();

  const canvasId = req.nextUrl.searchParams.get("id");

  if (canvasId) {
    const canvas = await Canvas.findOne({
      _id: canvasId,
      userId: session.userId,
    });

    if (!canvas) {
      return NextResponse.json(
        { success: false, message: "Canvas not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({ success: true, canvas });
  }

  // List all canvases (metadata only, no heavy line data)
  const canvases = await Canvas.find({ userId: session.userId })
    .select("name createdAt updatedAt")
    .sort({ updatedAt: -1 });

  return NextResponse.json({ success: true, canvases });
}

// POST /api/canvas — create or update a canvas
// Body: { id?: string, name?: string, lines: LineData[] }
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json(
      { success: false, message: "Not authenticated" },
      { status: 401 },
    );
  }

  await dbConnect();

  const body = await req.json();
  const { id, name, lines } = body;

  if (!Array.isArray(lines)) {
    return NextResponse.json(
      { success: false, message: "lines must be an array" },
      { status: 400 },
    );
  }

  // Update existing canvas
  if (id) {
    const canvas = await Canvas.findOneAndUpdate(
      { _id: id, userId: session.userId },
      { lines, ...(name !== undefined && { name }) },
      { new: true },
    );

    if (!canvas) {
      return NextResponse.json(
        { success: false, message: "Canvas not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({ success: true, canvas });
  }

  // Create new canvas
  const canvas = await Canvas.create({
    userId: session.userId,
    name: name || "Untitled",
    lines,
  });

  return NextResponse.json({ success: true, canvas }, { status: 201 });
}

// DELETE /api/canvas?id=<canvasId>
export async function DELETE(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json(
      { success: false, message: "Not authenticated" },
      { status: 401 },
    );
  }

  await dbConnect();

  const canvasId = req.nextUrl.searchParams.get("id");

  if (!canvasId) {
    return NextResponse.json(
      { success: false, message: "Canvas id is required" },
      { status: 400 },
    );
  }

  const result = await Canvas.findOneAndDelete({
    _id: canvasId,
    userId: session.userId,
  });

  if (!result) {
    return NextResponse.json(
      { success: false, message: "Canvas not found" },
      { status: 404 },
    );
  }

  return NextResponse.json({ success: true, message: "Canvas deleted" });
}
