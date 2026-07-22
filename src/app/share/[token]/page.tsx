import Link from "next/link";
import { notFound } from "next/navigation";
import { Sparkles } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import { ReportCard } from "@/components/chat/report-card";
import type { ReportSummary } from "@/lib/types/app";

// Public, unauthenticated, read-only view of a shared report (Wow Factor #8: Share Research).
// Looked up strictly by the (effectively unguessable) share_token via the service-role client —
// no session or RLS policy is involved, so no report is ever exposed unless its owner explicitly
// generated a share link for it.
export default async function SharedReportPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const admin = createAdminClient();

  const { data: report } = await admin
    .from("reports")
    .select("title, summary, created_at")
    .eq("share_token", token)
    .maybeSingle();

  if (!report) notFound();

  return (
    <div className="flex flex-1 flex-col">
      <header className="flex items-center justify-between px-6 py-5 md:px-10">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Sparkles className="h-4 w-4" />
          </div>
          MicroManus
        </Link>
        <span className="text-xs text-muted-foreground">Shared read-only report</span>
      </header>

      <main className="mx-auto w-full max-w-2xl flex-1 px-6 pb-24 pt-4">
        <h1 className="mb-1 text-2xl font-semibold">{report.title}</h1>
        <p className="mb-6 text-sm text-muted-foreground">
          Generated {new Date(report.created_at).toLocaleDateString()} · Powered by MicroManus
        </p>
        <ReportCard report={report.summary as ReportSummary} readOnly />
      </main>
    </div>
  );
}
