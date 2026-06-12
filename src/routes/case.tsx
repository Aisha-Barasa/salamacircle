import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { categoryLabel, statusLabel, STATUS_FLOW } from "@/lib/salama";
import { Send, Search, Shield, Clock } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/case")({
  validateSearch: z.object({ code: z.string().optional() }),
  head: () => ({
    meta: [
      { title: "Check case — Salama Circle" },
      { name: "description", content: "Securely check the status of an anonymous case and exchange messages with coordinators using your Case ID." },
      { property: "og:title", content: "Check case — Salama Circle" },
      { property: "og:description", content: "Anonymous, secure case-thread updates for reporters." },
    ],
  }),
  component: CaseLookup,
});

type CaseRow = { id: string; case_code: string; category: string; status: string; urgency: string; constituency: string; ward: string | null; description: string; created_at: string; updated_at: string; intervention_notes: string | null };
type Msg = { id: string; author: "reporter" | "admin" | "system"; body: string; created_at: string };

function CaseLookup() {
  const { code: initialCode } = Route.useSearch();
  const navigate = useNavigate();
  const [code, setCode] = useState(initialCode ?? "");
  const [data, setData] = useState<{ case: CaseRow; messages: Msg[] } | null>(null);
  const [loading, setLoading] = useState(false);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);

  async function fetchCase(c: string) {
    if (!c) return;
    setLoading(true);
    const { data: res, error } = await supabase.rpc("get_case_by_code", { p_code: c.trim().toUpperCase() });
    setLoading(false);
    if (error || !res) {
      setData(null);
      toast.error("Case ID not found");
      return;
    }
    setData(res as { case: CaseRow; messages: Msg[] });
  }

  useEffect(() => {
    if (initialCode) fetchCase(initialCode);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialCode]);

  async function sendReply() {
    if (!data || reply.trim().length === 0) return;
    setSending(true);
    const { error } = await supabase.rpc("post_reporter_message", { p_code: data.case.case_code, p_body: reply.trim() });
    setSending(false);
    if (error) {
      toast.error("Could not send message");
      return;
    }
    setReply("");
    fetchCase(data.case.case_code);
    toast.success("Message sent");
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Shield className="h-3.5 w-3.5 text-secondary" /> Anonymous case lookup
      </div>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Check your case</h1>
      <p className="mt-2 max-w-xl text-sm text-muted-foreground">
        Paste your Case ID to see status, updates and messages from coordinators. Nothing here is shared publicly.
      </p>

      <div className="mt-6 flex gap-2">
        <input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="SC-2026-00129"
          className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm font-mono tracking-wider outline-none focus:ring-2 focus:ring-ring"
        />
        <button
          onClick={() => {
            navigate({ to: "/case", search: { code } });
            fetchCase(code);
          }}
          className="inline-flex items-center gap-2 rounded-xl bg-[image:var(--gradient-hero)] px-5 py-3 text-sm font-medium text-primary-foreground shadow-[var(--shadow-glow)]"
        >
          <Search className="h-4 w-4" /> Lookup
        </button>
      </div>

      {loading && <p className="mt-10 text-sm text-muted-foreground">Looking up…</p>}

      {data && (
        <div className="mt-8 space-y-6">
          <div className="rounded-3xl border border-border bg-card p-6 shadow-[var(--shadow-card)]">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="text-xs uppercase tracking-widest text-muted-foreground">Case</div>
                <div className="font-mono text-xl font-semibold text-primary">{data.case.case_code}</div>
              </div>
              <StatusPill status={data.case.status} />
            </div>
            <dl className="mt-5 grid gap-4 text-sm sm:grid-cols-2">
              <Pair label="Category" value={categoryLabel(data.case.category)} />
              <Pair label="Location" value={`${data.case.constituency}${data.case.ward ? ` · ${data.case.ward}` : ""}`} />
              <Pair label="Urgency" value={data.case.urgency} />
              <Pair label="Submitted" value={new Date(data.case.created_at).toLocaleDateString()} />
            </dl>
            <div className="mt-5">
              <div className="text-xs uppercase tracking-widest text-muted-foreground">Your description</div>
              <p className="mt-1.5 whitespace-pre-wrap text-sm text-foreground">{data.case.description}</p>
            </div>
            <Progress status={data.case.status} />
          </div>

          <div className="rounded-3xl border border-border bg-card p-6 shadow-[var(--shadow-card)]">
            <h2 className="text-lg font-semibold">Secure thread</h2>
            <p className="text-xs text-muted-foreground">Messages between you (anonymous) and a Salama Circle coordinator.</p>

            <div className="mt-5 space-y-3">
              {data.messages.length === 0 && (
                <p className="rounded-xl bg-muted px-4 py-3 text-sm text-muted-foreground">
                  <Clock className="mr-1 inline h-3.5 w-3.5" /> No messages yet. A coordinator will write here once your case is reviewed.
                </p>
              )}
              {data.messages.map((m) => (
                <div
                  key={m.id}
                  className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm ${
                    m.author === "reporter"
                      ? "ml-auto bg-[color:var(--primary-soft)] text-foreground"
                      : "mr-auto bg-muted text-foreground"
                  }`}
                >
                  <div className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                    {m.author === "reporter" ? "You" : m.author === "admin" ? "Coordinator" : "System"}
                  </div>
                  <div className="whitespace-pre-wrap">{m.body}</div>
                  <div className="mt-1 text-[10px] text-muted-foreground">{new Date(m.created_at).toLocaleString()}</div>
                </div>
              ))}
            </div>

            <div className="mt-5 flex gap-2">
              <textarea
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                rows={2}
                placeholder="Write a message to the coordinator…"
                className="flex-1 rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
              <button
                disabled={sending || !reply.trim()}
                onClick={sendReply}
                className="inline-flex shrink-0 items-center gap-2 self-end rounded-xl bg-[image:var(--gradient-hero)] px-4 py-2.5 text-sm font-medium text-primary-foreground shadow-[var(--shadow-glow)] disabled:opacity-50"
              >
                <Send className="h-4 w-4" /> Send
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Pair({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-widest text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 font-medium capitalize">{value}</dd>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full bg-secondary/15 px-3 py-1 text-xs font-medium text-secondary-foreground">
      <span className="h-1.5 w-1.5 rounded-full bg-secondary" />
      {statusLabel(status)}
    </span>
  );
}

function Progress({ status }: { status: string }) {
  const idx = STATUS_FLOW.findIndex((s) => s.value === status);
  return (
    <div className="mt-6">
      <div className="h-1.5 overflow-hidden rounded-full bg-muted">
        <div className="h-full bg-[image:var(--gradient-hero)] transition-all" style={{ width: `${((idx + 1) / STATUS_FLOW.length) * 100}%` }} />
      </div>
      <div className="mt-2 grid grid-cols-7 gap-1 text-[10px] text-muted-foreground">
        {STATUS_FLOW.map((s, i) => (
          <div key={s.value} className={`text-center ${i <= idx ? "font-medium text-foreground" : ""}`}>
            {s.label.split(" ")[0]}
          </div>
        ))}
      </div>
    </div>
  );
}