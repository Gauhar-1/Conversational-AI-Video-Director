/**
 * @file src/app/api/auth/logout/route.ts
 * @description API Route to clear authentication and refresh tokens from HTTP cookies.
 */

import { NextResponse } from "next/server";

export async function POST() {
  const response = NextResponse.json({ success: true, message: "Logged out" });
  response.cookies.set("sb-access-token", "", { path: "/", maxAge: 0 });
  response.cookies.set("sb-refresh-token", "", { path: "/", maxAge: 0 });
  response.cookies.set("director_dev_session", "", { path: "/", maxAge: 0 });
  return response;
}
