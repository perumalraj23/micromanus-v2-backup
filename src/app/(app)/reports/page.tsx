"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { FileText, MessageSquare } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ReportCard } from "@/components/chat/report-card";
import type { ReportSummary } from "@/lib/types/app";

type ReportRow = {
  id: string;
  chat_id: string;
  title: string;
  summary: ReportSummary;
  created_at: string;
};

export default function ReportsPage() {
  const [reports, setReports] = useState<ReportRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/reports")
      .then((r) => r.json())
      .then((data) => setReports(data.reports ?? []))
      .catch(() => toast.error("Could not load your reports."))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="mx-auto w-full max-w-3xl flex-1 overflow-y-auto p-6 sm:p-10">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Reports</h1>
        <p className="text-sm text-muted-foreground">Every executive summary MicroManus has generated for you.</p>
      </div>

      {loading ? (
        <div className="flex flex-col gap-3">
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      ) : reports.length === 0 ? (
        <Card className="flex flex-col items-center gap-2 p-10 text-center">
          <FileText className="h-8 w-8 text-muted-foreground" />
          <p className="font-medium">No reports generated.</p>
          <p className="max-w-sm text-sm text-muted-foreground">
            Ask MicroManus to <span className="font-medium text-foreground">&ldquo;Generate an executive summary&rdquo;</span> in
            any chat and your report will show up here.
          </p>
        </Card>
      ) : (
        <div className="flex flex-col gap-4">
          {reports.map((r) => (
            <div key={r.id}>
              <div className="mb-1.5 flex items-center justify-between">
                <p className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString()}</p>
                <Link
                  href={`/chat/${r.chat_id}`}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                >
                  <MessageSquare className="h-3 w-3" /> View conversation
                </Link>
              </div>
              <ReportCard report={r.summary} reportId={r.id} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
