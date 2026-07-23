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

console.log("ORIGIN:", origin);
console.log("NEXT:", next);
console.log("SESSION:", !!data.session);
console.log("USER:", data.user?.email);
console.log("ERROR:", error);
 console.log("Data:", data);
    console.log("Error:", error);
    console.log("FAILED!");
  }

  return NextResponse.redirect(
    `${origin}/auth/auth-code-error`
  );
}