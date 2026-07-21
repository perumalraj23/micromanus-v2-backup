import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 p-10 text-center">
      <h2 className="text-2xl font-semibold">Page not found</h2>
      <p className="max-w-sm text-sm text-muted-foreground">
        The page you're looking for doesn't exist or may have moved.
      </p>
      <Button asChild>
        <Link href="/">Back to home</Link>
      </Button>
    </div>
  );
}
