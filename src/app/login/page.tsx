"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4">
      <path
        fill="#4285F4"
        d="M23.52 12.27c0-.85-.08-1.66-.22-2.45H12v4.63h6.47c-.28 1.5-1.13 2.77-2.4 3.62v3.01h3.88c2.27-2.09 3.57-5.17 3.57-8.81z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.96-1.07 7.95-2.92l-3.88-3.01c-1.08.72-2.46 1.15-4.07 1.15-3.13 0-5.78-2.11-6.73-4.96H1.27v3.11C3.25 21.3 7.31 24 12 24z"
      />
      <path
        fill="#FBBC05"
        d="M5.27 14.26A7.2 7.2 0 0 1 4.9 12c0-.78.14-1.54.37-2.26V6.63H1.27A11.98 11.98 0 0 0 0 12c0 1.93.46 3.76 1.27 5.37l4-3.11z"
      />
      <path
        fill="#EA4335"
        d="M12 4.77c1.77 0 3.35.61 4.6 1.8l3.44-3.44C17.95 1.19 15.23 0 12 0 7.31 0 3.25 2.7 1.27 6.63l4 3.11C6.22 6.88 8.87 4.77 12 4.77z"
      />
    </svg>
  );
}

function GitHubIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
      <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.57.1.79-.25.79-.55 0-.27-.01-1.16-.02-2.1-3.2.7-3.88-1.36-3.88-1.36-.52-1.33-1.28-1.68-1.28-1.68-1.04-.71.08-.7.08-.7 1.16.08 1.76 1.19 1.76 1.19 1.03 1.76 2.7 1.25 3.36.96.1-.75.4-1.25.73-1.54-2.55-.29-5.24-1.28-5.24-5.68 0-1.26.45-2.28 1.19-3.09-.12-.29-.52-1.46.11-3.04 0 0 .97-.31 3.18 1.18.92-.26 1.91-.38 2.89-.39.98.01 1.97.13 2.89.39 2.2-1.49 3.17-1.18 3.17-1.18.63 1.58.24 2.75.12 3.04.74.81 1.18 1.83 1.18 3.09 0 4.41-2.69 5.38-5.25 5.67.41.36.78 1.06.78 2.14 0 1.55-.01 2.79-.01 3.17 0 .31.21.66.8.55A10.51 10.51 0 0 0 23.5 12c0-6.35-5.15-11.5-11.5-11.5Z" />
    </svg>
  );
}

export default function LoginPage() {
  const [loading, setLoading] = useState<"google" | "github" | null>(null);
  const supabase = createClient();

  async function signIn(provider: "google" | "github") {
    setLoading(provider);
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}/auth/callback?next=/chat` },
    });
    if (error) {
      toast.error("We couldn't start sign-in. Please try again.");
      setLoading(null);
    }
  }

  return (
    <div className="flex flex-1 items-center justify-center p-6">
      <Card className="w-full max-w-sm">
        <CardHeader className="items-center text-center">
          <div className="mb-2 flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Sparkles className="h-5 w-5" />
          </div>
          <CardTitle className="text-xl">Welcome to MicroManus</CardTitle>
          <CardDescription>Sign in to start your deep research session.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <Button
            variant="outline"
            className="h-11 justify-center"
            disabled={loading !== null}
            onClick={() => signIn("google")}
          >
            {loading === "google" ? <Loader2 className="h-4 w-4 animate-spin" /> : <GoogleIcon />}
            Continue with Google
          </Button>
          <Button
            variant="outline"
            className="h-11 justify-center"
            disabled={loading !== null}
            onClick={() => signIn("github")}
          >
            {loading === "github" ? <Loader2 className="h-4 w-4 animate-spin" /> : <GitHubIcon />}
            Continue with GitHub
          </Button>
          <p className="mt-2 text-center text-xs text-muted-foreground">
            By continuing you agree this is a demo sandbox environment. No real payments beyond Stripe test mode.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
