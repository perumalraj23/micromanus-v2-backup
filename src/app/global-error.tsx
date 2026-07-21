"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log to the server console; never surface stack traces to the user.
    console.error("Unhandled application error:", error.digest ?? error.message);
  }, [error]);

  return (
    <html>
      <body>
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background p-6 text-center text-foreground">
          <AlertTriangle className="h-10 w-10 text-destructive" />
          <h1 className="text-xl font-semibold">Something went wrong</h1>
          <p className="max-w-sm text-sm text-muted-foreground">
            We hit an unexpected snag. Please try again — if this keeps happening, refresh the page.
          </p>
          <Button onClick={reset}>Try again</Button>
        </div>
      </body>
    </html>
  );
}
