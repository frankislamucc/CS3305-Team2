import { getSession } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import Recording from "@/app/models/Recording";
import { NextRequest, NextResponse } from "next/server";

export const config = {
  api: {
    bodyParser: {
      sizeLimit: "100mb",
    },
  },
};

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { success: false, errorMessage: "Not authenticated" },
        { status: 401 }
      );
    }

    await dbConnect();

    const body = await request.json();
    const { filename, base64Data, mimeType } = body;

    if (!filename || !base64Data) {
      return NextResponse.json(
        { success: false, errorMessage: "Missing filename or data" },
        { status: 400 }
      );
    }

    // Convert base64 back to Buffer
    const buffer = Buffer.from(base64Data, "base64");

    const recording = new Recording({
      userId: session.userId,
      filename,
      mimeType: mimeType || "video/webm",
      sizeBytes: buffer.length,
      data: buffer,
    });

    await recording.save();

    return NextResponse.json({
      success: true,
      recordingId: recording._id.toString(),
    });
  } catch (error) {
    console.error("Error uploading recording:", error);
    return NextResponse.json(
      { success: false, errorMessage: "Failed to upload recording" },
      { status: 500 }
    );
  }
}
