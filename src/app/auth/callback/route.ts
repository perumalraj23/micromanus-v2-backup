import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import { recordFailure } from "@/lib/metrics";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/chat";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
    logger.warn("auth.callback_failed", { route: "/auth/callback" });
    recordFailure("auth");
  }

  return NextResponse.redirect(`${origin}/auth/auth-code-error`);
}
