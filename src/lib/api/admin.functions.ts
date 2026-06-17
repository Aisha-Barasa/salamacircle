import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Admin-only server functions. Each enforces auth via middleware and a
 * role check against `has_role()` / `is_admin()`.
 */

export const getMyRoles = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { userId: context.userId, roles: (data ?? []).map((r) => r.role as string) };
  });

export const claimFirstAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase.rpc("claim_first_admin");
    if (error) throw new Error(error.message);
    return { claimed: Boolean(data) };
  });

async function assertAdmin(supabase: import("@supabase/supabase-js").SupabaseClient, userId: string) {
  const { data } = await supabase.rpc("is_admin", { _user_id: userId });
  if (!data) throw new Error("forbidden");
}

export const listMentors = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("mentor_pool")
      .select("*")
      .order("display_name");
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const upsertMentor = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: {
    id?: string;
    display_name: string;
    constituency: string;
    skills: string[];
    languages: string[];
    contact?: string;
    capacity: number;
    is_active: boolean;
    notes?: string;
  }) =>
    z
      .object({
        id: z.string().uuid().optional(),
        display_name: z.string().min(2).max(120),
        constituency: z.string().min(2).max(120),
        skills: z.array(z.string().max(60)).max(20),
        languages: z.array(z.string().max(40)).max(10),
        contact: z.string().max(200).optional(),
        capacity: z.number().int().min(0).max(50),
        is_active: z.boolean(),
        notes: z.string().max(1000).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    if (data.id) {
      const { error } = await supabaseAdmin
        .from("mentor_pool")
        .update(data as never)
        .eq("id", data.id);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await supabaseAdmin.from("mentor_pool").insert(data as never);
      if (error) throw new Error(error.message);
    }
    await supabaseAdmin.from("audit_log").insert({
      actor_id: context.userId,
      action: data.id ? "mentor_update" : "mentor_create",
      target: data.display_name,
      details: { constituency: data.constituency },
    });
    return { ok: true };
  });

export const deleteMentor = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("mentor_pool").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    await supabaseAdmin.from("audit_log").insert({
      actor_id: context.userId,
      action: "mentor_delete",
      target: data.id,
    });
    return { ok: true };
  });

export const listAuditLog = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("audit_log")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

/**
 * Critical-case escalation queue. Returns all cases with urgency='critical',
 * including the reporter-selected authority (police ward / chief location).
 * Coordinators and admins forward these to the chosen authority off-platform,
 * then call `markEscalationForwarded` to record the handoff in the audit log.
 */
export const listEscalations = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const [{ data: isAdmin }, { data: isCoord }] = await Promise.all([
      context.supabase.rpc("is_admin", { _user_id: context.userId }),
      context.supabase.rpc("has_role", { _user_id: context.userId, _role: "coordinator" }),
    ]);
    if (!isAdmin && !isCoord) throw new Error("forbidden");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("cases")
      .select("id,case_code,category,constituency,ward,description,contact_method,contact_value,escalation_target,escalation_authority,escalation_status,escalated_at,forwarded_at,forwarded_reference,created_at")
      .eq("urgency", "critical")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const markEscalationForwarded = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { case_id: string; reference?: string }) =>
    z.object({ case_id: z.string().uuid(), reference: z.string().max(200).optional() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc("mark_escalation_forwarded", {
      p_case_id: data.case_id,
      p_reference: data.reference,
    });
    if (error) throw new Error(error.message);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("audit_log").insert({
      actor_id: context.userId,
      action: "escalation_forwarded",
      case_id: data.case_id,
      details: { reference: data.reference ?? null },
    });
    return { ok: true };
  });
