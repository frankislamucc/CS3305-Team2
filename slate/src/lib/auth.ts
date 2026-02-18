import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { UserData } from "../../models/User";
import dbConnect from "./mongodb";
import User from "../../models/User";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "default-secret-change-me",
);

const COOKIE_NAME = "session";

export interface SessionPayload {
  userId: string;
  username: string;
}

export async function createToken(payload: SessionPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(JWT_SECRET);
}

export async function verifyToken(
  token: string,
): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyToken(token);
}

export async function getAuthenticatedUser(): Promise<UserData | null> {
  try {
    const session = await getSession();
    await dbConnect();
    const user = User.findOne();
  } catch {
    return null;
  }
}
