import { randomUUID } from "crypto";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";

// Public, read-only sharing for a research report (Wow Factor #8). The token itself acts as an
// unguessable capability — anyone with the link can view the report, no one else can.

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { data: existing } = await supabase
    .from("reports")
    .select("share_token")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!existing) return Response.json({ error: "Report not found." }, { status: 404 });

  const token = existing.share_token ?? randomUUID();

  if (!existing.share_token) {
    const { error } = await supabase
      .from("reports")
      .update({ share_token: token })
      .eq("id", id)
      .eq("user_id", user.id);
    if (error) {
      logger.error("reports.share_failed", { route: "/api/reports/[id]/share", reportId: id, message: error.message });
      return Response.json({ error: "Could not create a share link right now." }, { status: 500 });
    }
  }

  return Response.json({ url: `/share/${token}` });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { error } = await supabase
    .from("reports")
    .update({ share_token: null })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return Response.json({ error: "Could not revoke the share link." }, { status: 500 });
  return Response.json({ ok: true });
}
