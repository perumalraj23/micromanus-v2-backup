"use client";

import { useState } from "react";
import { FileDown, Loader2, Lightbulb, ListChecks, Compass, Link as LinkIcon, Share2, Gauge } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import type { ReportSummary } from "@/lib/types/app";

/**
 * Deterministic Research Score (Wow Factor #4) — computed entirely from real fields already on
 * the report (never randomized or fabricated). Rewards breadth of sources, depth of findings and
 * recommendations, and gives partial credit so a thin report still scores reasonably instead of
 * dropping to zero.
 */
function researchScore(report: ReportSummary) {
  const sourcesScore = Math.min(40, report.sources.length * 8);
  const findingsScore = Math.min(30, report.key_findings.length * 6);
  const recsScore = Math.min(30, report.recommendations.length * 6);
  const score = Math.min(100, sourcesScore + findingsScore + recsScore);

  const confidence = score >= 75 ? "High" : score >= 45 ? "Medium" : "Low";
  const depth =
    report.key_findings.length >= 4 ? "Excellent" : report.key_findings.length >= 2 ? "Good" : "Basic";

  return { score, confidence, depth };
}

export function ReportCard({
  report,
  reportId,
  readOnly,
}: {
  report: ReportSummary;
  reportId?: string | null;
  readOnly?: boolean;
}) {
  const [downloading, setDownloading] = useState(false);
  const [sharing, setSharing] = useState(false);
  const { score, confidence, depth } = researchScore(report);

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
      toast.success("PDF Generated.");
    } catch {
      toast.error("Could not generate the PDF right now.");
    } finally {
      setDownloading(false);
    }
  }

  async function share() {
    if (!reportId) {
      toast.info("The share link will be available once the report finishes saving.");
      return;
    }
    setSharing(true);
    try {
      const res = await fetch(`/api/reports/${reportId}/share`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Could not create a share link right now.");
        return;
      }
      const fullUrl = `${window.location.origin}${data.url}`;
      await navigator.clipboard.writeText(fullUrl);
      toast.success("Share link copied to clipboard.");
    } catch {
      toast.error("Could not create a share link right now.");
    } finally {
      setSharing(false);
    }
  }

  return (
    <Card className="mb-3 border-primary/30 bg-accent/60 p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 text-sm font-semibold">
          <Compass className="h-4 w-4 text-primary" /> Executive Summary
        </p>
        {!readOnly && (
          <div className="flex items-center gap-1.5">
            <Button size="sm" variant="ghost" onClick={share} disabled={sharing}>
              {sharing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Share2 className="h-3.5 w-3.5" />}
              Share
            </Button>
            <Button size="sm" variant="secondary" onClick={downloadPdf} disabled={downloading}>
              {downloading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileDown className="h-3.5 w-3.5" />}
              Export PDF
            </Button>
          </div>
        )}
      </div>

      <div className="mb-4 flex items-center gap-4 rounded-lg border border-border bg-background/60 px-3 py-2">
        <div className="flex items-center gap-1.5">
          <Gauge className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold">Research Score {score}/100</span>
        </div>
        <span className="text-xs text-muted-foreground">
          Sources <span className="font-medium text-foreground">{report.sources.length}</span>
        </span>
        <span className="text-xs text-muted-foreground">
          Confidence <span className="font-medium text-foreground">{confidence}</span>
        </span>
        <span className="text-xs text-muted-foreground">
          Depth <span className="font-medium text-foreground">{depth}</span>
        </span>
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
