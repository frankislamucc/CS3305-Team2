"use server";

import bcrypt from "bcryptjs";
import dbConnect from "@/lib/mongodb";
import User from "@/app/models/User";
import { redirect } from "next/navigation";
import { AuthError } from "@/app/(workspace)/whiteboard/_types";
import schema from "@/lib/validation/auth";
import z from "zod";
import { createToken } from "@/lib/auth";
import { cookies } from "next/headers";

export async function registerAction(
  prevResponse: AuthError | undefined,
  formData: FormData,
): Promise<AuthError | undefined> {
  try {
    const username = formData.get("username") as string;
    const password = formData.get("password") as string;

    const validationResult = schema.safeParse({
      username: username,
      password: password,
    });

    if (!validationResult.success) {
      const errors = z.flattenError(validationResult.error);
      const errorMessages = [
        ...Object.values(errors.fieldErrors).flat(),
        ...errors.formErrors,
      ];

      return {
        errorMessages: errorMessages,
      };
    }

    await dbConnect();

    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return { errorMessages: ["Please try another username"] };
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = await User.create({
      username,
      password: hashedPassword,
    });

    const token = await createToken({
      userId: user._id.toString(),
      username: user.username,
    });

    const cookieStore = await cookies();

    cookieStore.set("session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 604800, // 7 days
      path: "/",
    });
  } catch (error: unknown) {
    console.log(error);
    return { errorMessages: ["Unknown error occurred, please try again"] };
  }
  redirect("/");
}
