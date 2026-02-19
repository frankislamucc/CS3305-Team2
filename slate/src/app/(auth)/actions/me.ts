"use server";

import { getSession } from "@/lib/auth";

export async function getMeAction(): Promise<{
  authenticated: boolean;
  username?: string;
}> {
  const session = await getSession();
  if (!session) {
    return { authenticated: false };
  }
  return { authenticated: true, username: session.username };
}
