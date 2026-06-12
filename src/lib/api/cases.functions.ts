import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/**
 * NOTE: Admin auth gating is intentionally skipped in this build per the
 * product brief. Before going to production, wrap these with requireSupabaseAuth
 * + a `has_role(..., 'admin')` check, since they expose all anonymous cases.
 */

export const listCases = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("cases")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
});

export const getCaseDetail = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const [{ data: c, error: e1 }, { data: msgs, error: e2 }] = await Promise.all([
      supabaseAdmin.from("cases").select("*").eq("id", data.id).maybeSingle(),
      supabaseAdmin.from("case_messages").select("*").eq("case_id", data.id).order("created_at"),
    ]);
    if (e1) throw new Error(e1.message);
    if (e2) throw new Error(e2.message);
    return { case: c, messages: msgs ?? [] };
  });

export const updateCase = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string; status?: string; intervention_notes?: string; assigned_to?: string }) =>
    z
      .object({
        id: z.string().uuid(),
        status: z.string().optional(),
        intervention_notes: z.string().max(2000).optional(),
        assigned_to: z.string().max(200).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const patch: Record<string, unknown> = {};
    if (data.status) patch.status = data.status;
    if (data.intervention_notes !== undefined) patch.intervention_notes = data.intervention_notes;
    if (data.assigned_to !== undefined) patch.assigned_to = data.assigned_to;
    const { error } = await supabaseAdmin.from("cases").update(patch).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const postAdminMessage = createServerFn({ method: "POST" })
  .inputValidator((d: { case_id: string; body: string }) =>
    z.object({ case_id: z.string().uuid(), body: z.string().min(1).max(2000) }).parse(d),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("case_messages")
      .insert({ case_id: data.case_id, author: "admin", body: data.body });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getAnalytics = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin.from("cases").select("category,constituency,urgency,status,created_at");
  if (error) throw new Error(error.message);
  return data ?? [];
});