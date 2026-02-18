import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "default-secret-change-me",
);

const protectedRoutes = ["/whiteboard", "/home"];
const publicRoutes = ["/auth/login"];

export async function proxy(req: NextRequest) {
  const path = req.nextUrl.pathname;
  const isProtectedRoute = protectedRoutes.some((route) =>
    path.startsWith(route),
  );
  const isPublicRoute = publicRoutes.includes(path);

  const token = req.cookies.get("session")?.value;
  let session = null;

  if (token) {
    try {
      const { payload } = await jwtVerify(token, JWT_SECRET);
      session = payload;
    } catch {
      session = null;
    }
  }

  // Redirect to login if trying to access protected route without session
  if (isProtectedRoute && !session) {
    return NextResponse.redirect(new URL("/login", req.nextUrl));
  }

  // Redirect to whiteboard if logged-in user visits login page
  if (isPublicRoute && session) {
    return NextResponse.redirect(new URL("/whiteboard", req.nextUrl));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/login", "/whiteboard/:path*", "/home/:path*"],
};
