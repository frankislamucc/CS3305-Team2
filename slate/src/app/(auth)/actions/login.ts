"use server";

import bcrypt from "bcryptjs";
import dbConnect from "@/lib/mongodb";
import User from "@/app/models/User";
import { createToken } from "@/lib/auth";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AuthError } from "@/app/(workspace)/whiteboard/_types";
import schema from "@/lib/validation/auth";
import z from "zod";

export async function loginAction(
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

    const user = await User.findOne({ username });
    if (!user) {
      return {
        errorMessages: ["Invalid username or password"],
      };
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return {
        errorMessages: ["Invalid username or password"],
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
  } catch (error: unknown) {
    console.log(error);
    return { errorMessages: ["Uknown error occurred, please try again"] };
  }
  // succesfull redirect throws an error
  // so keep out of try catch
  redirect("/");
}
