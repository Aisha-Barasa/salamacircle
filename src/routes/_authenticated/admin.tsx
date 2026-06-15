import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  listCases,
  getCaseDetail,
  updateCase,
  postAdminMessage,
  getAnalytics,
} from "@/lib/api/cases.functions";
import {
  getMyRoles,
  claimFirstAdmin,
  listMentors,
  upsertMentor,
  deleteMentor,
  listAuditLog,
} from "@/lib/api/admin.functions";
import { useMemo, useState } from "react";
import { categoryLabel, statusLabel, STATUS_FLOW, CATEGORIES } from "@/lib/salama";
import { AlertTriangle, BarChart3, Inbox, Send, Shield, Users, Activity, LogOut, ShieldCheck, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell } from "recharts";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Coordinator dashboard — Salama Circle" },
      { name: "description", content: "Salama Circle coordinator workspace: review anonymous cases, assign mentors, and audit every action." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Admin,
});

type Tab = "cases" | "mentors" | "audit";

function Admin() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const rolesFn = useServerFn(getMyRoles);
  const claimFn = useServerFn(claimFirstAdmin);
  const { data: roleInfo, isLoading: rolesLoading } = useQuery({
    queryKey: ["me", "roles"],
    queryFn: () => rolesFn(),
  });

  const roles = roleInfo?.roles ?? [];
  const isAdmin = roles.includes("admin");
  const isCoordinator = isAdmin || roles.includes("coordinator");

  const [tab, setTab] = useState<Tab>("cases");

  const claim = useMutation({
    mutationFn: () => claimFn(),
    onSuccess: (r) => {
      if (r.claimed) {
        toast.success("You are now the first admin.");
        qc.invalidateQueries({ queryKey: ["me", "roles"] });
      } else {
        toast.error("An admin already exists. Ask them to grant you access.");
      }
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  if (rolesLoading) {
    return <div className="mx-auto max-w-5xl px-4 py-16 text-center text-sm text-muted-foreground">Loading workspace…</div>;
  }

  if (!isCoordinator) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <span className="grid mx-auto h-12 w-12 place-items-center rounded-2xl bg-accent/30 text-accent-foreground">
          <ShieldCheck className="h-5 w-5" />
        </span>
        <h1 className="mt-4 text-xl font-semibold">No coordinator access yet</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Your account is signed in, but does not have a coordinator or admin role.
          If you are setting up Salama Circle for the first time, you can claim admin
          access below. Otherwise, ask an existing admin to grant you a role.
        </p>
        <button
          onClick={() => claim.mutate()}
          disabled={claim.isPending}
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[image:var(--gradient-hero)] px-4 py-2.5 text-sm font-medium text-primary-foreground shadow-[var(--shadow-glow)] disabled:opacity-50"
        >
          Claim first-admin
        </button>
        <button onClick={signOut} className="mt-3 block w-full text-xs text-muted-foreground hover:text-foreground">
          Sign out
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Shield className="h-3.5 w-3.5 text-secondary" /> Coordinator workspace · Internal use
            {isAdmin && <span className="rounded-full bg-[color:var(--primary-soft)] px-2 py-0.5 text-[10px] font-semibold text-primary">ADMIN</span>}
          </div>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">Salama Circle dashboard</h1>
        </div>
        <button onClick={signOut} className="inline-flex items-center gap-2 rounded-lg border border-input px-3 py-2 text-sm hover:bg-muted">
          <LogOut className="h-4 w-4" /> Sign out
        </button>
      </div>

      <div className="mt-6 flex gap-1 rounded-2xl bg-muted p-1 text-sm">
        <TabBtn active={tab === "cases"} onClick={() => setTab("cases")} icon={Inbox} label="Cases" />
        <TabBtn active={tab === "mentors"} onClick={() => setTab("mentors")} icon={Users} label="Mentor pool" />
        {isAdmin && <TabBtn active={tab === "audit"} onClick={() => setTab("audit")} icon={Activity} label="Audit log" />}
      </div>

      <div className="mt-6">
        {tab === "cases" && <CasesTab />}
        {tab === "mentors" && <MentorsTab isAdmin={isAdmin} />}
        {tab === "audit" && isAdmin && <AuditTab />}
      </div>
    </div>
  );
}

function TabBtn({ active, onClick, icon: Icon, label }: { active: boolean; onClick: () => void; icon: React.ElementType; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2 transition-colors ${active ? "bg-card shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
    >
      <Icon className="h-4 w-4" /> {label}
    </button>
  );
}

/* ============================= CASES TAB ============================== */

function CasesTab() {
  const list = useServerFn(listCases);
  const analytics = useServerFn(getAnalytics);
  const { data: cases = [] } = useQuery({ queryKey: ["admin", "cases"], queryFn: () => list() });
  const { data: stats = [] } = useQuery({ queryKey: ["admin", "stats"], queryFn: () => analytics() });
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const urgent = cases.filter((c) => c.urgency === "urgent").length;
  const open = cases.filter((c) => c.status !== "resolved").length;

  return (
    <div>
      <div className="grid gap-4 sm:grid-cols-3">
        <Stat icon={Inbox} label="Total cases" value={cases.length} />
        <Stat icon={AlertTriangle} label="Urgent" value={urgent} tone="warm" />
        <Stat icon={BarChart3} label="Open" value={open} tone="cool" />
      </div>
      <Analytics data={stats} />
      <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,400px)_minmax(0,1fr)]">
        <CaseList cases={cases} selectedId={selectedId} onSelect={setSelectedId} />
        {selectedId ? <CasePanel id={selectedId} /> : (
          <div className="grid place-items-center rounded-3xl border border-dashed border-border bg-card p-12 text-center text-sm text-muted-foreground">
            Select a case to review, assign a mentor or reply through the secure thread.
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ icon: Icon, label, value, tone }: { icon: React.ElementType; label: string; value: number; tone?: "warm" | "cool" }) {
  const accent = tone === "warm" ? "bg-accent/30 text-accent-foreground" : tone === "cool" ? "bg-secondary/15 text-secondary-foreground" : "bg-[color:var(--primary-soft)] text-primary";
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
      <div className="flex items-center justify-between">
        <div className="text-xs uppercase tracking-widest text-muted-foreground">{label}</div>
        <div className={`grid h-9 w-9 place-items-center rounded-xl ${accent}`}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <div className="mt-2 text-3xl font-semibold">{value}</div>
    </div>
  );
}

function Analytics({ data }: { data: Array<{ category: string; constituency: string; urgency: string; status: string }> }) {
  const byConstituency = useMemo(() => {
    const m: Record<string, number> = {};
    data.forEach((d) => { m[d.constituency] = (m[d.constituency] ?? 0) + 1; });
    return Object.entries(m).map(([name, value]) => ({ name, value }));
  }, [data]);
  const byCategory = useMemo(() => {
    const m: Record<string, number> = {};
    data.forEach((d) => { m[d.category] = (m[d.category] ?? 0) + 1; });
    return CATEGORIES.map((c) => ({ name: c.label.split(" ")[0], value: m[c.value] ?? 0 }));
  }, [data]);

  return (
    <div className="mt-6 grid gap-4 lg:grid-cols-2">
      <ChartCard title="Cases by constituency">
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={byConstituency} margin={{ left: -10, right: 10, top: 10 }}>
            <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} angle={-15} dy={8} height={50} />
            <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
            <Tooltip />
            <Bar dataKey="value" radius={[6, 6, 0, 0]}>
              {byConstituency.map((_, i) => (<Cell key={i} fill="oklch(0.52 0.13 230)" />))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>
      <ChartCard title="Cases by category">
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={byCategory} margin={{ left: -10, right: 10, top: 10 }}>
            <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} angle={-15} dy={8} height={50} />
            <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
            <Tooltip />
            <Bar dataKey="value" radius={[6, 6, 0, 0]} fill="oklch(0.72 0.12 165)" />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-3xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
      <h3 className="text-sm font-semibold">{title}</h3>
      <div className="mt-2">{children}</div>
    </div>
  );
}

function CaseList({ cases, selectedId, onSelect }: { cases: Array<{ id: string; case_code: string; category: string; urgency: string; status: string; constituency: string; created_at: string }>; selectedId: string | null; onSelect: (id: string) => void }) {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const filtered = cases.filter((c) => {
    if (status !== "all" && c.status !== status) return false;
    if (q && !c.case_code.toLowerCase().includes(q.toLowerCase()) && !c.constituency.toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="rounded-3xl border border-border bg-card p-4 shadow-[var(--shadow-card)]">
      <div className="flex gap-2">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search code or area…" className="flex-1 rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring" />
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="rounded-lg border border-input bg-background px-2 py-2 text-sm">
          <option value="all">All</option>
          {STATUS_FLOW.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
      </div>
      <div className="mt-3 max-h-[600px] space-y-2 overflow-y-auto pr-1">
        {filtered.map((c) => (
          <button
            key={c.id}
            onClick={() => onSelect(c.id)}
            className={`w-full rounded-2xl border p-3 text-left transition-colors ${selectedId === c.id ? "border-primary bg-[color:var(--primary-soft)]" : "border-border bg-background hover:bg-muted"}`}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="font-mono text-xs font-semibold text-primary">{c.case_code}</span>
              {c.urgency === "urgent" && <span className="rounded-full bg-destructive/15 px-2 py-0.5 text-[10px] font-medium text-destructive">URGENT</span>}
            </div>
            <div className="mt-1 text-sm font-medium">{categoryLabel(c.category)}</div>
            <div className="mt-0.5 text-xs text-muted-foreground">{c.constituency} · {statusLabel(c.status)}</div>
          </button>
        ))}
        {filtered.length === 0 && <p className="py-8 text-center text-sm text-muted-foreground">No cases match.</p>}
      </div>
    </div>
  );
}

function CasePanel({ id }: { id: string }) {
  const qc = useQueryClient();
  const detailFn = useServerFn(getCaseDetail);
  const updateFn = useServerFn(updateCase);
  const messageFn = useServerFn(postAdminMessage);
  const mentorsFn = useServerFn(listMentors);
  const { data } = useQuery({ queryKey: ["admin", "case", id], queryFn: () => detailFn({ data: { id } }) });
  const { data: mentors = [] } = useQuery({ queryKey: ["admin", "mentors"], queryFn: () => mentorsFn() });
  const [reply, setReply] = useState("");

  const update = useMutation({
    mutationFn: (vars: { status?: string; intervention_notes?: string; assigned_to?: string }) => updateFn({ data: { id, ...vars } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin"] });
      toast.success("Updated");
    },
  });

  const replyM = useMutation({
    mutationFn: () => messageFn({ data: { case_id: id, body: reply.trim() } }),
    onSuccess: () => {
      setReply("");
      qc.invalidateQueries({ queryKey: ["admin", "case", id] });
      toast.success("Reply posted to thread");
    },
  });

  if (!data?.case) return <div className="rounded-3xl border border-border bg-card p-8 text-sm text-muted-foreground">Loading…</div>;
  const c = data.case;

  // Match mentors to this case: same constituency first, then by capacity
  const constituencyMatches = mentors
    .filter((m) => m.is_active && m.constituency === c.constituency)
    .sort((a, b) => (a.active_caseload / Math.max(1, a.capacity)) - (b.active_caseload / Math.max(1, b.capacity)));
  const otherActive = mentors.filter((m) => m.is_active && m.constituency !== c.constituency).slice(0, 4);
  const suggested = [...constituencyMatches, ...otherActive].slice(0, 5);

  return (
    <div className="space-y-4">
      <div className="rounded-3xl border border-border bg-card p-6 shadow-[var(--shadow-card)]">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="font-mono text-lg font-semibold text-primary">{c.case_code}</div>
            <div className="text-sm text-muted-foreground">{categoryLabel(c.category)} · {c.constituency}{c.ward ? ` · ${c.ward}` : ""}</div>
          </div>
          <span className="rounded-full bg-secondary/15 px-3 py-1 text-xs font-medium text-secondary-foreground">{statusLabel(c.status)}</span>
        </div>
        <p className="mt-4 whitespace-pre-wrap text-sm">{c.description}</p>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div>
            <label className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Update status</label>
            <select defaultValue={c.status} onChange={(e) => update.mutate({ status: e.target.value })} className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm">
              {STATUS_FLOW.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Assigned to</label>
            <input defaultValue={c.assigned_to ?? ""} onBlur={(e) => update.mutate({ assigned_to: e.target.value })} placeholder="Coordinator / mentor name" className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" />
          </div>
          <div className="sm:col-span-2">
            <label className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Intervention notes (internal)</label>
            <textarea defaultValue={c.intervention_notes ?? ""} onBlur={(e) => update.mutate({ intervention_notes: e.target.value })} rows={3} className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" placeholder="Mentor matched, sessions planned, follow-up dates…" />
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-border bg-card p-6 shadow-[var(--shadow-card)]">
        <h3 className="text-sm font-semibold">Suggested mentors</h3>
        <p className="text-xs text-muted-foreground">Ranked by matching constituency and current caseload.</p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {suggested.map((m) => (
            <div key={m.id} className="rounded-2xl border border-border p-3">
              <div className="flex items-center justify-between gap-2">
                <div className="text-sm font-medium">{m.display_name}</div>
                <span className="text-[10px] text-muted-foreground">{m.active_caseload}/{m.capacity}</span>
              </div>
              <div className="text-xs text-muted-foreground">{m.constituency} · {(m.skills ?? []).slice(0, 3).join(", ")}</div>
              <button
                onClick={() => update.mutate({ assigned_to: m.display_name })}
                className="mt-2 inline-flex w-full items-center justify-center rounded-lg border border-input px-2 py-1.5 text-xs hover:bg-muted"
              >
                Assign
              </button>
            </div>
          ))}
          {suggested.length === 0 && <p className="text-xs text-muted-foreground">No active mentors yet — add some in the Mentor pool tab.</p>}
        </div>
      </div>

      <div className="rounded-3xl border border-border bg-card p-6 shadow-[var(--shadow-card)]">
        <h3 className="text-sm font-semibold">Secure case thread</h3>
        <p className="text-xs text-muted-foreground">Visible to the anonymous reporter on their Case ID lookup page.</p>

        <div className="mt-4 max-h-80 space-y-3 overflow-y-auto pr-1">
          {data.messages.length === 0 && <p className="text-sm text-muted-foreground">No messages yet.</p>}
          {data.messages.map((m) => (
            <div key={m.id} className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${m.author === "admin" ? "ml-auto bg-[color:var(--primary-soft)]" : "mr-auto bg-muted"}`}>
              <div className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{m.author}</div>
              <div className="whitespace-pre-wrap">{m.body}</div>
              <div className="mt-1 text-[10px] text-muted-foreground">{new Date(m.created_at).toLocaleString()}</div>
            </div>
          ))}
        </div>

        <div className="mt-4 flex gap-2">
          <textarea value={reply} onChange={(e) => setReply(e.target.value)} rows={2} placeholder="Reply to reporter…" className="flex-1 rounded-xl border border-input bg-background px-3 py-2 text-sm" />
          <button disabled={!reply.trim() || replyM.isPending} onClick={() => replyM.mutate()} className="inline-flex shrink-0 items-center gap-2 self-end rounded-xl bg-[image:var(--gradient-hero)] px-4 py-2.5 text-sm font-medium text-primary-foreground shadow-[var(--shadow-glow)] disabled:opacity-50">
            <Send className="h-4 w-4" /> Reply
          </button>
        </div>
      </div>
    </div>
  );
}

/* ============================= MENTORS TAB ============================== */

type Mentor = {
  id: string;
  display_name: string;
  constituency: string;
  skills: string[];
  languages: string[];
  contact: string | null;
  active_caseload: number;
  capacity: number;
  is_active: boolean;
  notes: string | null;
};

function MentorsTab({ isAdmin }: { isAdmin: boolean }) {
  const qc = useQueryClient();
  const listFn = useServerFn(listMentors);
  const upsertFn = useServerFn(upsertMentor);
  const deleteFn = useServerFn(deleteMentor);
  const { data: mentors = [] } = useQuery({ queryKey: ["admin", "mentors"], queryFn: () => listFn() });
  const [editing, setEditing] = useState<Partial<Mentor> | null>(null);

  const save = useMutation({
    mutationFn: (m: Partial<Mentor>) => upsertFn({
      data: {
        id: m.id,
        display_name: m.display_name ?? "",
        constituency: m.constituency ?? "",
        skills: m.skills ?? [],
        languages: m.languages ?? [],
        contact: m.contact ?? undefined,
        capacity: m.capacity ?? 5,
        is_active: m.is_active ?? true,
        notes: m.notes ?? undefined,
      },
    }),
    onSuccess: () => {
      toast.success("Mentor saved");
      setEditing(null);
      qc.invalidateQueries({ queryKey: ["admin", "mentors"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteFn({ data: { id } }),
    onSuccess: () => {
      toast.success("Removed");
      qc.invalidateQueries({ queryKey: ["admin", "mentors"] });
    },
  });

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Mentor pool</h2>
          <p className="text-sm text-muted-foreground">{mentors.length} mentors · {mentors.filter((m) => m.is_active).length} active</p>
        </div>
        {isAdmin && (
          <button onClick={() => setEditing({ skills: [], languages: [], capacity: 5, is_active: true })} className="inline-flex items-center gap-2 rounded-xl bg-[image:var(--gradient-hero)] px-4 py-2.5 text-sm font-medium text-primary-foreground shadow-[var(--shadow-glow)]">
            <Plus className="h-4 w-4" /> Add mentor
          </button>
        )}
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {mentors.map((m) => (
          <div key={m.id} className="rounded-3xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
            <div className="flex items-center justify-between">
              <div className="text-base font-semibold">{m.display_name}</div>
              {!m.is_active && <span className="rounded-full bg-muted px-2 py-0.5 text-[10px]">Inactive</span>}
            </div>
            <div className="text-xs text-muted-foreground">{m.constituency}</div>
            <div className="mt-2 flex flex-wrap gap-1">
              {(m.skills ?? []).map((s) => <span key={s} className="rounded-full bg-[color:var(--primary-soft)] px-2 py-0.5 text-[10px] text-primary">{s}</span>)}
            </div>
            <div className="mt-3 text-xs text-muted-foreground">
              Caseload <span className="font-medium text-foreground">{m.active_caseload}/{m.capacity}</span>
              {m.contact && <> · <span>{m.contact}</span></>}
            </div>
            {m.notes && <p className="mt-2 text-xs text-muted-foreground">{m.notes}</p>}
            {isAdmin && (
              <div className="mt-4 flex gap-2">
                <button onClick={() => setEditing(m)} className="flex-1 rounded-lg border border-input px-3 py-1.5 text-xs hover:bg-muted">Edit</button>
                <button onClick={() => { if (confirm(`Remove ${m.display_name}?`)) remove.mutate(m.id); }} className="rounded-lg border border-input p-1.5 text-destructive hover:bg-destructive/10">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </div>
        ))}
        {mentors.length === 0 && <p className="col-span-full text-center text-sm text-muted-foreground">No mentors yet.</p>}
      </div>

      {editing && (
        <MentorEditor
          initial={editing}
          onCancel={() => setEditing(null)}
          onSave={(m) => save.mutate(m)}
          busy={save.isPending}
        />
      )}
    </div>
  );
}

function MentorEditor({ initial, onCancel, onSave, busy }: { initial: Partial<Mentor>; onCancel: () => void; onSave: (m: Partial<Mentor>) => void; busy: boolean }) {
  const [m, setM] = useState<Partial<Mentor>>(initial);
  const skillsStr = (m.skills ?? []).join(", ");
  const langStr = (m.languages ?? []).join(", ");
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-background/80 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-3xl border border-border bg-card p-6 shadow-[var(--shadow-card)]">
        <h3 className="text-lg font-semibold">{initial.id ? "Edit mentor" : "Add mentor"}</h3>
        <div className="mt-4 space-y-3">
          <Field label="Display name"><input value={m.display_name ?? ""} onChange={(e) => setM({ ...m, display_name: e.target.value })} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" /></Field>
          <Field label="Constituency"><input value={m.constituency ?? ""} onChange={(e) => setM({ ...m, constituency: e.target.value })} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" placeholder="Kilifi North" /></Field>
          <Field label="Skills (comma separated)"><input defaultValue={skillsStr} onBlur={(e) => setM({ ...m, skills: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" placeholder="counseling, sports mentorship" /></Field>
          <Field label="Languages (comma separated)"><input defaultValue={langStr} onBlur={(e) => setM({ ...m, languages: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" placeholder="Swahili, English" /></Field>
          <Field label="Contact (private)"><input value={m.contact ?? ""} onChange={(e) => setM({ ...m, contact: e.target.value })} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Capacity"><input type="number" min={0} max={50} value={m.capacity ?? 5} onChange={(e) => setM({ ...m, capacity: Number(e.target.value) })} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" /></Field>
            <Field label="Active">
              <select value={String(m.is_active ?? true)} onChange={(e) => setM({ ...m, is_active: e.target.value === "true" })} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm">
                <option value="true">Active</option>
                <option value="false">Inactive</option>
              </select>
            </Field>
          </div>
          <Field label="Notes (internal)"><textarea value={m.notes ?? ""} onChange={(e) => setM({ ...m, notes: e.target.value })} rows={3} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" /></Field>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onCancel} className="rounded-lg border border-input px-4 py-2 text-sm">Cancel</button>
          <button disabled={busy} onClick={() => onSave(m)} className="rounded-lg bg-[image:var(--gradient-hero)] px-4 py-2 text-sm font-medium text-primary-foreground shadow-[var(--shadow-glow)] disabled:opacity-50">Save</button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs font-medium uppercase tracking-widest text-muted-foreground">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}

/* ============================= AUDIT TAB ============================== */

function AuditTab() {
  const listFn = useServerFn(listAuditLog);
  const { data: entries = [] } = useQuery({ queryKey: ["admin", "audit"], queryFn: () => listFn() });

  return (
    <div>
      <h2 className="text-xl font-semibold">Audit log</h2>
      <p className="text-sm text-muted-foreground">Every coordinator action is recorded for accountability. Showing the last 200 events.</p>

      <div className="mt-4 overflow-hidden rounded-3xl border border-border bg-card shadow-[var(--shadow-card)]">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-xs uppercase tracking-widest text-muted-foreground">
            <tr>
              <th className="px-4 py-3">When</th>
              <th className="px-4 py-3">Action</th>
              <th className="px-4 py-3">Case / target</th>
              <th className="px-4 py-3">Actor</th>
              <th className="px-4 py-3">Details</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((e) => (
              <tr key={e.id} className="border-t border-border">
                <td className="px-4 py-3 text-xs text-muted-foreground">{new Date(e.created_at).toLocaleString()}</td>
                <td className="px-4 py-3"><span className="rounded-full bg-[color:var(--primary-soft)] px-2 py-0.5 text-[11px] font-medium text-primary">{e.action}</span></td>
                <td className="px-4 py-3 font-mono text-xs">{e.target ?? (e.case_id ? e.case_id.slice(0, 8) : "—")}</td>
                <td className="px-4 py-3 text-xs text-muted-foreground">{e.actor_id ? e.actor_id.slice(0, 8) : "system"}</td>
                <td className="px-4 py-3 text-xs text-muted-foreground"><code className="text-[10px]">{JSON.stringify(e.details)}</code></td>
              </tr>
            ))}
            {entries.length === 0 && <tr><td colSpan={5} className="px-4 py-12 text-center text-sm text-muted-foreground">No audit entries yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}