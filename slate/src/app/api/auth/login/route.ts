import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import dbConnect from "@/lib/mongodb";
import User from "@/app/models/User";
import { createToken } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const { username, password } = await req.json();

    if (!username || !password) {
      return NextResponse.json(
        { success: false, message: "Username and password are required" },
        { status: 400 },
      );
    }

    if (typeof username !== "string" || typeof password !== "string") {
      return NextResponse.json(
        { success: false, message: "Invalid input" },
        { status: 400 },
      );
    }

    await dbConnect();

    const user = await User.findOne({ username });
    if (!user) {
      return NextResponse.json(
        { success: false, message: "Invalid username or password" },
        { status: 401 },
      );
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return NextResponse.json(
        { success: false, message: "Invalid username or password" },
        { status: 401 },
      );
    }

    const token = await createToken({
      userId: user._id.toString(),
      username: user.username,
    });

    const response = NextResponse.json(
      {
        success: true,
        message: "Login successful",
        user: { id: user._id, username: user.username },
      },
      { status: 200 },
    );

    response.cookies.set("session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 },
    );
  }
}
