import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function AuthCodeError() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 p-10 text-center">
      <h2 className="text-xl font-semibold">We couldn't sign you in</h2>
      <p className="max-w-sm text-sm text-muted-foreground">
        Your sign-in link may have expired. Please try signing in again.
      </p>
      <Button asChild>
        <Link href="/login">Back to sign in</Link>
      </Button>
    </div>
  );
}
