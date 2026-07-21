import { renderToBuffer } from "@react-pdf/renderer";
import { createClient } from "@/lib/supabase/server";
import { ResearchReportDocument } from "@/lib/pdf/report";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { data: report } = await supabase
    .from("reports")
    .select("title, summary")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!report) return Response.json({ error: "Report not found." }, { status: 404 });

  try {
    const buffer = await renderToBuffer(
      ResearchReportDocument({
        title: report.title,
        report: report.summary as never,
      })
    );

    return new Response(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${slugify(report.title)}.pdf"`,
      },
    });
  } catch {
    return Response.json({ error: "Could not generate the PDF right now. Please try again." }, { status: 500 });
  }
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 60) || "research-report";
}
