"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

interface LogoutResponse {
  errorMessage: string;
}

export async function logoutAction(): Promise<LogoutResponse | undefined> {
  try {
    const cookieStore = await cookies();
    cookieStore.delete("session");
    redirect("/");
  } catch {
    return { errorMessage: "Uknown error occurred, please try again" };
  }
  redirect("/");
}
