"use client";

import { useState } from "react";
import { FileDown, Loader2, Lightbulb, ListChecks, Compass, Link as LinkIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import type { ReportSummary } from "@/lib/types/app";

export function ReportCard({ report, reportId }: { report: ReportSummary; reportId?: string | null }) {
  const [downloading, setDownloading] = useState(false);

  async function downloadPdf() {
    if (!reportId) {
      toast.info("The PDF will be available once the report finishes saving. Try again in a moment.");
      return;
    }
    setDownloading(true);
    try {
      const res = await fetch(`/api/reports/${reportId}/pdf`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error ?? "Could not generate the PDF right now.");
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "research-report.pdf";
      a.click();
      URL.revokeObjectURL(url);
      toast.success("PDF downloaded.");
    } catch {
      toast.error("Could not generate the PDF right now.");
    } finally {
      setDownloading(false);
    }
  }

  return (
    <Card className="mb-3 border-primary/30 bg-accent/60 p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 text-sm font-semibold">
          <Compass className="h-4 w-4 text-primary" /> Executive Summary
        </p>
        <Button size="sm" variant="secondary" onClick={downloadPdf} disabled={downloading}>
          {downloading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileDown className="h-3.5 w-3.5" />}
          Export PDF
        </Button>
      </div>

      <p className="mb-4 text-sm leading-relaxed">{report.tldr}</p>

      {report.key_findings.length > 0 && (
        <div className="mb-4">
          <p className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <Lightbulb className="h-3.5 w-3.5" /> Key findings
          </p>
          <ul className="flex flex-col gap-1">
            {report.key_findings.map((f, i) => (
              <li key={i} className="flex gap-2 text-sm">
                <span className="text-primary">•</span>
                <span>{f}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {report.recommendations.length > 0 && (
        <div className="mb-4">
          <p className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <ListChecks className="h-3.5 w-3.5" /> Recommendations
          </p>
          <ul className="flex flex-col gap-1">
            {report.recommendations.map((r, i) => (
              <li key={i} className="flex gap-2 text-sm">
                <span className="text-primary">→</span>
                <span>{r}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {report.sources.length > 0 && (
        <div>
          <p className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <LinkIcon className="h-3.5 w-3.5" /> Sources
          </p>
          <ul className="flex flex-col gap-1">
            {report.sources.map((s, i) => (
              <li key={i} className="truncate text-xs">
                <a href={s.url} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                  {i + 1}. {s.title || s.url}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
}
