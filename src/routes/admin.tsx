import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listCases, getCaseDetail, updateCase, postAdminMessage, getAnalytics } from "@/lib/api/cases.functions";
import { useMemo, useState } from "react";
import { categoryLabel, statusLabel, STATUS_FLOW, CATEGORIES } from "@/lib/salama";
import { AlertTriangle, BarChart3, Inbox, Send, Shield } from "lucide-react";
import { toast } from "sonner";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell } from "recharts";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Coordinator dashboard — Salama Circle" },
      { name: "description", content: "Salama Circle coordinator dashboard for reviewing anonymous cases, assigning interventions and replying through secure case threads." },
    ],
  }),
  component: Admin,
});

function Admin() {
  const list = useServerFn(listCases);
  const analytics = useServerFn(getAnalytics);
  const { data: cases = [] } = useQuery({ queryKey: ["admin", "cases"], queryFn: () => list() });
  const { data: stats = [] } = useQuery({ queryKey: ["admin", "stats"], queryFn: () => analytics() });
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const urgent = cases.filter((c) => c.urgency === "urgent").length;
  const open = cases.filter((c) => c.status !== "resolved").length;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Shield className="h-3.5 w-3.5 text-secondary" /> Coordinator workspace · Internal use
      </div>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">Salama Circle dashboard</h1>
      <p className="mt-1 text-sm text-muted-foreground">All cases are anonymous. Reach reporters only through their case thread.</p>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <Stat icon={Inbox} label="Total cases" value={cases.length} />
        <Stat icon={AlertTriangle} label="Urgent" value={urgent} tone="warm" />
        <Stat icon={BarChart3} label="Open" value={open} tone="cool" />
      </div>

      <Analytics data={stats} />

      <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,400px)_minmax(0,1fr)]">
        <CaseList cases={cases} selectedId={selectedId} onSelect={setSelectedId} />
        {selectedId ? <CasePanel id={selectedId} /> : (
          <div className="grid place-items-center rounded-3xl border border-dashed border-border bg-card p-12 text-center text-sm text-muted-foreground">
            Select a case to review, update status or reply through the secure thread.
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
              {byConstituency.map((_, i) => (
                <Cell key={i} fill="oklch(0.52 0.13 230)" />
              ))}
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
            className={`w-full rounded-2xl border p-3 text-left transition-colors ${
              selectedId === c.id ? "border-primary bg-[color:var(--primary-soft)]" : "border-border bg-background hover:bg-muted"
            }`}
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
  const { data } = useQuery({ queryKey: ["admin", "case", id], queryFn: () => detailFn({ data: { id } }) });
  const [reply, setReply] = useState("");

  const update = useMutation({
    mutationFn: (vars: { status?: string; intervention_notes?: string; assigned_to?: string }) => updateFn({ data: { id, ...vars } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin"] });
      toast.success("Updated");
    },
  });

  const reply_m = useMutation({
    mutationFn: () => messageFn({ data: { case_id: id, body: reply.trim() } }),
    onSuccess: () => {
      setReply("");
      qc.invalidateQueries({ queryKey: ["admin", "case", id] });
      toast.success("Reply posted to thread");
    },
  });

  if (!data?.case) return <div className="rounded-3xl border border-border bg-card p-8 text-sm text-muted-foreground">Loading…</div>;
  const c = data.case;

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
            <select
              defaultValue={c.status}
              onChange={(e) => update.mutate({ status: e.target.value })}
              className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
            >
              {STATUS_FLOW.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Assigned to</label>
            <input
              defaultValue={c.assigned_to ?? ""}
              onBlur={(e) => update.mutate({ assigned_to: e.target.value })}
              placeholder="Coordinator / mentor name"
              className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Intervention notes (internal)</label>
            <textarea
              defaultValue={c.intervention_notes ?? ""}
              onBlur={(e) => update.mutate({ intervention_notes: e.target.value })}
              rows={3}
              className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
              placeholder="Mentor matched, sessions planned, follow-up dates…"
            />
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-border bg-card p-6 shadow-[var(--shadow-card)]">
        <h3 className="text-sm font-semibold">Secure case thread</h3>
        <p className="text-xs text-muted-foreground">Visible to the anonymous reporter on their Case ID lookup page.</p>

        <div className="mt-4 space-y-3 max-h-80 overflow-y-auto pr-1">
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
          <button
            disabled={!reply.trim() || reply_m.isPending}
            onClick={() => reply_m.mutate()}
            className="inline-flex shrink-0 items-center gap-2 self-end rounded-xl bg-[image:var(--gradient-hero)] px-4 py-2.5 text-sm font-medium text-primary-foreground shadow-[var(--shadow-glow)] disabled:opacity-50"
          >
            <Send className="h-4 w-4" /> Reply
          </button>
        </div>
      </div>
    </div>
  );
}