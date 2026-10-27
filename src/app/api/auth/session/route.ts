/**
 * @file src/app/api/auth/session/route.ts
 * @description API Route to retrieve the current session state and user identity.
 */

import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createServerClient();
    const { data: { session } } = await supabase.auth.getSession();

    if (!session || !session.user) {
      return NextResponse.json({ authenticated: false, user: null, session: null });
    }

    return NextResponse.json({
      authenticated: true,
      user: session.user,
      session: {
        access_token: session.access_token,
        expires_at: session.expires_at,
        user: session.user,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ authenticated: false, user: null, error: error.message }, { status: 500 });
  }
}
