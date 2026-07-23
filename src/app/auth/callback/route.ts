import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);

  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/chat";

  console.log("========== AUTH CALLBACK ==========");
  console.log("Origin:", origin);
  console.log("Code exists:", !!code);
  console.log("Next:", next);

  if (code) {
    const supabase = await createClient();

    const { data, error } =
      await supabase.auth.exchangeCodeForSession(code);

    console.log("Data:", data);
    console.log("Error:", error);

    if (!error) {
      console.log("SUCCESS!");
      return NextResponse.redirect(`${origin}${next}`);
    }

    console.log("FAILED!");
  }

  return NextResponse.redirect(
    `${origin}/auth/auth-code-error`
  );
}