"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("Route error:", error.digest ?? error.message);
  }, [error]);

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 p-10 text-center">
      <AlertTriangle className="h-10 w-10 text-destructive" />
      <h2 className="text-lg font-semibold">This page hit a snag</h2>
      <p className="max-w-sm text-sm text-muted-foreground">
        Please try again. If the problem persists, head back to your chats.
      </p>
      <div className="flex gap-2">
        <Button onClick={reset}>Try again</Button>
        <Button variant="outline" onClick={() => (window.location.href = "/chat")}>
          Go to chats
        </Button>
      </div>
    </div>
  );
}
