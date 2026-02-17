"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

interface LogoutResponse {
  errorMessage: string;
}

export async function Logout(
  prevResponse: LogoutResponse | undefined,
  formData: FormData,
): Promise<LogoutResponse | undefined> {
  try {
    const cookieStore = await cookies();
    cookieStore.delete("session");
    redirect("/");
  } catch {
    return { errorMessage: "Uknown error occurred, please try again" };
  }
}
