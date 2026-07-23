export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);

  const code = searchParams.get("code");

  console.log("CODE:", code);

  const supabase = await createClient();

  const { data, error } =
    await supabase.auth.exchangeCodeForSession(code!);

  console.log("DATA:", data);
  console.log("ERROR:", error);

  if (!error) {
    return NextResponse.redirect(`${origin}/chat`);
  }

  return NextResponse.json({
    message: "FAILED",
    error,
  });
}