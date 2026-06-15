import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * All coordinator/admin server fns require an authenticated user with the
 * `coordinator` or `admin` role. The check happens server-side via
 * `has_role()`; the middleware injects the user's Supabase client.
 */
async function assertCoordinator(supabase: import("@supabase/supabase-js").SupabaseClient, userId: string) {
  const [{ data: isAdmin }, { data: isCoord }] = await Promise.all([
    supabase.rpc("is_admin", { _user_id: userId }),
    supabase.rpc("has_role", { _user_id: userId, _role: "coordinator" }),
  ]);
  if (!isAdmin && !isCoord) throw new Error("forbidden");
  return { isAdmin: Boolean(isAdmin) };
}

export const listCases = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
  await assertCoordinator(context.supabase, context.userId);
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("cases")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
});

export const getCaseDetail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertCoordinator(context.supabase, context.userId);
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
  .middleware([requireSupabaseAuth])
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
  .handler(async ({ data, context }) => {
    await assertCoordinator(context.supabase, context.userId);
    // Use the user's client so the audit-log trigger captures auth.uid()
    const supabase = context.supabase;
    const patch: Partial<{ status: string; intervention_notes: string; assigned_to: string }> = {};
    if (data.status) patch.status = data.status;
    if (data.intervention_notes !== undefined) patch.intervention_notes = data.intervention_notes;
    if (data.assigned_to !== undefined) patch.assigned_to = data.assigned_to;
    const { error } = await supabase.from("cases").update(patch as never).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const postAdminMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { case_id: string; body: string }) =>
    z.object({ case_id: z.string().uuid(), body: z.string().min(1).max(2000) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertCoordinator(context.supabase, context.userId);
    const { error } = await context.supabase
      .from("case_messages")
      .insert({ case_id: data.case_id, author: "admin", body: data.body });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getAnalytics = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
  await assertCoordinator(context.supabase, context.userId);
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin.from("cases").select("category,constituency,urgency,status,created_at");
  if (error) throw new Error(error.message);
  return data ?? [];
});