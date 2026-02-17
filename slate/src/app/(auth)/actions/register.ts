"use server";

import bcrypt from "bcryptjs";
import dbConnect from "@/lib/mongodb";
import User from "@/app/models/User";
import { redirect } from "next/navigation";

interface RegisterResponse {
  errorMessage: string;
}
export async function POST(
  prevResponse: RegisterResponse | undefined,
  formData: FormData,
): Promise<RegisterResponse | undefined> {
  try {
    const username = formData.get("username") as string;
    const password = formData.get("password") as string;

    await dbConnect();

    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return { errorMessage: "Please try another username" };
    }

    // TODO: add salt env var
    const hashedPassword = await bcrypt.hash(
      password,
      process.env.SALT || "placeholder salt",
    );

    await User.create({
      username,
      password: hashedPassword,
    });

    redirect("/login");
  } catch {
    return { errorMessage: "Uknown error occurred, please try again" };
  }
}
