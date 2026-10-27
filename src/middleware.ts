/**
 * @file src/middleware.ts
 * @description Next.js Edge Middleware for Supabase Session Authentication and Route Protection.
 * Blocks unauthenticated access to /dashboard and /project/*, redirecting to /login.
 */

import { updateSession } from "@/lib/supabase/middleware";
import type { NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Match all application routes:
     * - Protects /dashboard and /project/*
     * - Handles root / redirect
     * Excludes:
     * - _next/static, _next/image
     * - api routes (handled independently with JSON responses)
     * - static image/asset files
     */
    "/((?!_next/static|_next/image|favicon.ico|api/.*|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
