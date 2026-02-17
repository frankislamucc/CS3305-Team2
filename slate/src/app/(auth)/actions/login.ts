"use server";

import bcrypt from "bcryptjs";
import dbConnect from "@/lib/mongodb";
import User from "@/app/models/User";
import { createToken } from "@/lib/auth";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

interface LoginResponse {
  errorMessage: string;
}

export async function login(
  prevResponse: LoginResponse | undefined,
  formData: FormData,
): Promise<LoginResponse | undefined> {
  try {
    const username = formData.get("username") as string;
    const password = formData.get("password") as string;

    await dbConnect();

    const user = await User.findOne({ username });
    if (!user) {
      return {
        errorMessage: "Invalid username or password",
      };
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return {
        errorMessage: "Invalid username or password",
      };
    }

    const token = await createToken({
      userId: user._id.toString(),
      username: user.username,
    });

    const cookieStore = await cookies();

    cookieStore.set("session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 15, // 15 mins
      path: "/",
    });

    redirect("/");
  } catch {
    return { errorMessage: "Uknown error occurred, please try again" };
  }
}
