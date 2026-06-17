import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { CATEGORIES, CONSTITUENCIES, URGENCY, POLICE_STATIONS, type CategoryValue, type UrgencyValue } from "@/lib/salama";
import { supabase } from "@/integrations/supabase/client";
import { AlertTriangle, Check, ChevronRight, Copy, Lock, ShieldCheck, Siren } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/submit-concern")({
  head: () => ({
    meta: [
      { title: "Submit a concern — Bomaveda" },
      { name: "description", content: "Anonymously flag a youth wellbeing concern in Kilifi County. No names, no login. A trained coordinator will follow up." },
      { property: "og:title", content: "Submit a concern — Bomaveda" },
      { property: "og:description", content: "Anonymous, secure reporting for community-led youth support." },
    ],
  }),
  component: SubmitConcern,
});

type Step = 1 | 2 | 3 | 4 | 5 | 6 | 7;

function SubmitConcern() {
  const [step, setStep] = useState<Step>(1);
  const [category, setCategory] = useState<CategoryValue | "">("");
  const [constituency, setConstituency] = useState("");
  const [ward, setWard] = useState("");
  const [description, setDescription] = useState("");
  const [urgency, setUrgency] = useState<UrgencyValue>("moderate");
  const [escalationTarget, setEscalationTarget] = useState<"chief" | "police" | "">("");
  const [escalationAuthority, setEscalationAuthority] = useState("");
  const [contactMethod, setContactMethod] = useState("");
  const [contactValue, setContactValue] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [caseCode, setCaseCode] = useState<string | null>(null);

  const wards = useMemo(() => (constituency ? CONSTITUENCIES[constituency] ?? [] : []), [constituency]);

  async function submit() {
    if (!category || !constituency || description.trim().length < 10) {
      toast.error("Please complete category, location and description (10+ chars).");
      return;
    }
    if (urgency === "critical" && (!escalationTarget || !escalationAuthority)) {
      toast.error("Critical cases require an escalation authority.");
      return;
    }
    setSubmitting(true);
    const { data, error } = await supabase.rpc("submit_anonymous_case", {
      p_category: category,
      p_constituency: constituency,
      p_ward: ward || undefined,
      p_description: description.trim(),
      p_urgency: urgency,
      p_contact_method: contactMethod || undefined,
      p_contact_value: contactValue || undefined,
      p_escalation_target: urgency === "critical" ? escalationTarget : undefined,
      p_escalation_authority: urgency === "critical" ? escalationAuthority : undefined,
    });
    setSubmitting(false);
    if (error || !data) {
      toast.error("Could not submit. Please try again.");
      return;
    }
    setCaseCode(data);
    setStep(7);
  }

  if (step === 7 && caseCode) {
    return <Confirmation code={caseCode} />;
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <Header step={step} />

      <div className="mt-8 rounded-3xl border border-border bg-card p-6 shadow-[var(--shadow-card)] sm:p-8">
        {step === 1 && (
          <StepShell title="What's the concern about?" subtitle="Choose the closest match. You can add detail in a moment.">
            <div className="grid gap-3 sm:grid-cols-2">
              {CATEGORIES.map((c) => (
                <button
                  key={c.value}
                  onClick={() => setCategory(c.value)}
                  className={`rounded-2xl border p-4 text-left transition-all ${
                    category === c.value
                      ? "border-primary bg-[color:var(--primary-soft)] ring-2 ring-primary/30"
                      : "border-border hover:border-primary/40 hover:bg-muted"
                  }`}
                >
                  <div className="font-medium">{c.label}</div>
                  <div className="mt-1 text-sm text-muted-foreground">{c.desc}</div>
                </button>
              ))}
            </div>
            <Nav onNext={() => category && setStep(2)} disabled={!category} />
          </StepShell>
        )}

        {step === 2 && (
          <StepShell title="Where is this happening?" subtitle="Kilifi County only. Choose constituency, then ward.">
            <label className="text-sm font-medium">Constituency</label>
            <select
              value={constituency}
              onChange={(e) => {
                setConstituency(e.target.value);
                setWard("");
              }}
              className="mt-1 w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">Select constituency…</option>
              {Object.keys(CONSTITUENCIES).map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>

            <label className="mt-5 block text-sm font-medium">Ward</label>
            <select
              value={ward}
              onChange={(e) => setWard(e.target.value)}
              disabled={!constituency}
              className="mt-1 w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
            >
              <option value="">{constituency ? "Select ward…" : "Choose a constituency first"}</option>
              {wards.map((w) => (
                <option key={w} value={w}>{w}</option>
              ))}
            </select>
            <Nav onBack={() => setStep(1)} onNext={() => setStep(3)} disabled={!constituency} />
          </StepShell>
        )}

        {step === 3 && (
          <StepShell title="Tell us what you've noticed" subtitle="Skip names. Describe behaviour, context and what makes you concerned.">
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={8}
              maxLength={2000}
              placeholder="e.g. A young person in our village has stopped going to school in the past two months and is spending time with new contacts online…"
              className="w-full rounded-2xl border border-input bg-background px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
            <div className="mt-1 text-right text-xs text-muted-foreground">{description.length}/2000</div>
            <Nav onBack={() => setStep(2)} onNext={() => setStep(4)} disabled={description.trim().length < 10} />
          </StepShell>
        )}

        {step === 4 && (
          <StepShell title="How urgent does this feel?" subtitle="This helps coordinators prioritise. There is no wrong answer.">
            <div className="grid gap-3 sm:grid-cols-2">
              {URGENCY.map((u) => (
                <button
                  key={u.value}
                  onClick={() => setUrgency(u.value)}
                  className={`rounded-2xl border p-4 text-left transition-all ${
                    urgency === u.value
                      ? u.value === "critical"
                        ? "border-destructive bg-destructive/10 ring-2 ring-destructive/30"
                        : "border-primary bg-[color:var(--primary-soft)] ring-2 ring-primary/30"
                      : u.value === "critical"
                        ? "border-destructive/40 hover:bg-destructive/5"
                        : "border-border hover:border-primary/40 hover:bg-muted"
                  }`}
                >
                  <div className={`flex items-center gap-2 font-medium ${u.value === "critical" ? "text-destructive" : ""}`}>
                    {u.value === "critical" && <Siren className="h-4 w-4" />} {u.label}
                  </div>
                  <div className="mt-1 text-sm text-muted-foreground">{u.desc}</div>
                </button>
              ))}
            </div>
            {urgency === "critical" && (
              <div className="mt-4 flex items-start gap-2 rounded-2xl border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <div>
                  If a life is in immediate danger, call <strong>999</strong> right now. Submitting here also forwards your report to your chosen local authority through Bomaveda, securely and anonymously.
                </div>
              </div>
            )}
            <Nav onBack={() => setStep(3)} onNext={() => setStep(urgency === "critical" ? 5 : 6)} />
          </StepShell>
        )}

        {step === 5 && (
          <StepShell
            title="Where should this be escalated?"
            subtitle="Bomaveda will forward this critical case to the authority you choose. Your identity stays anonymous."
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <button
                onClick={() => { setEscalationTarget("chief"); setEscalationAuthority(""); }}
                className={`rounded-2xl border p-4 text-left transition-all ${escalationTarget === "chief" ? "border-primary bg-[color:var(--primary-soft)] ring-2 ring-primary/30" : "border-border hover:border-primary/40 hover:bg-muted"}`}
              >
                <div className="font-medium">Local Chief</div>
                <div className="mt-1 text-sm text-muted-foreground">Sub-location or ward chief in {constituency || "your area"}.</div>
              </button>
              <button
                onClick={() => { setEscalationTarget("police"); setEscalationAuthority(""); }}
                className={`rounded-2xl border p-4 text-left transition-all ${escalationTarget === "police" ? "border-primary bg-[color:var(--primary-soft)] ring-2 ring-primary/30" : "border-border hover:border-primary/40 hover:bg-muted"}`}
              >
                <div className="font-medium">Police</div>
                <div className="mt-1 text-sm text-muted-foreground">Forward securely to a Kilifi County police station.</div>
              </button>
            </div>

            {escalationTarget === "chief" && (
              <div className="mt-5">
                <label className="text-sm font-medium">Choose the chief's ward / location</label>
                <select
                  value={escalationAuthority}
                  onChange={(e) => setEscalationAuthority(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="">Select ward…</option>
                  {wards.map((w) => (
                    <option key={w} value={`${w} Location Chief`}>{w}</option>
                  ))}
                </select>
                {wards.length === 0 && (
                  <p className="mt-2 text-xs text-muted-foreground">Pick a constituency on Step 2 to see chief locations.</p>
                )}
              </div>
            )}

            {escalationTarget === "police" && (
              <div className="mt-5">
                <label className="text-sm font-medium">Choose the police station / ward</label>
                <select
                  value={escalationAuthority}
                  onChange={(e) => setEscalationAuthority(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="">Select police station…</option>
                  {POLICE_STATIONS.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
            )}

            <Nav onBack={() => setStep(4)} onNext={() => setStep(6)} disabled={!escalationTarget || !escalationAuthority} />
          </StepShell>
        )}

        {step === 6 && (
          <StepShell
            title="Optional secure follow-up"
            subtitle="Only if you'd like a coordinator to reach you confidentially. You can skip this and check updates anytime with your Case ID."
          >
            <div className="grid gap-3 sm:grid-cols-[180px_1fr]">
              <select
                value={contactMethod}
                onChange={(e) => setContactMethod(e.target.value)}
                className="rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">No follow-up</option>
                <option value="phone">Phone (encrypted)</option>
                <option value="email">Email</option>
                <option value="other">Other</option>
              </select>
              <input
                value={contactValue}
                onChange={(e) => setContactValue(e.target.value)}
                placeholder={contactMethod ? "Contact detail" : "—"}
                disabled={!contactMethod}
                className="rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
              />
            </div>
            <p className="mt-3 inline-flex items-center gap-2 rounded-xl bg-muted px-3 py-2 text-xs text-muted-foreground">
              <Lock className="h-3.5 w-3.5" /> Contact details are never shown to other reporters and are stored separately.
            </p>

            <div className="mt-6 flex flex-col-reverse items-stretch justify-between gap-3 sm:flex-row sm:items-center">
              <button onClick={() => setStep(urgency === "critical" ? 5 : 4)} className="rounded-xl border border-border bg-background px-5 py-2.5 text-sm font-medium hover:bg-muted">
                Back
              </button>
              <button
                onClick={submit}
                disabled={submitting}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[image:var(--gradient-hero)] px-6 py-2.5 text-sm font-medium text-primary-foreground shadow-[var(--shadow-glow)] transition-opacity hover:opacity-95 disabled:opacity-60"
              >
                {submitting ? "Submitting…" : "Submit concern"} <ShieldCheck className="h-4 w-4" />
              </button>
            </div>
          </StepShell>
        )}
      </div>
    </div>
  );
}

function Header({ step }: { step: Step }) {
  const total = 6;
  return (
    <div>
      <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Submit a concern</h1>
      <p className="mt-2 max-w-xl text-sm text-muted-foreground">
        Anonymous and secure. This is not an emergency line — if a life is in immediate danger, please call <strong>999</strong>.
      </p>
      <div className="mt-6 flex items-center gap-2 text-xs text-muted-foreground">
        Step {Math.min(step, total)} of {total}
        <div className="ml-2 h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
          <div className="h-full rounded-full bg-[image:var(--gradient-hero)] transition-all" style={{ width: `${(Math.min(step, total) / total) * 100}%` }} />
        </div>
      </div>
    </div>
  );
}

function StepShell({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="text-xl font-semibold">{title}</h2>
      {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
      <div className="mt-6">{children}</div>
    </div>
  );
}

function Nav({ onBack, onNext, disabled }: { onBack?: () => void; onNext: () => void; disabled?: boolean }) {
  return (
    <div className="mt-6 flex flex-col-reverse items-stretch justify-between gap-3 sm:flex-row sm:items-center">
      {onBack ? (
        <button onClick={onBack} className="rounded-xl border border-border bg-background px-5 py-2.5 text-sm font-medium hover:bg-muted">
          Back
        </button>
      ) : (
        <span />
      )}
      <button
        onClick={onNext}
        disabled={disabled}
        className="inline-flex items-center justify-center gap-2 rounded-xl bg-[image:var(--gradient-hero)] px-6 py-2.5 text-sm font-medium text-primary-foreground shadow-[var(--shadow-glow)] transition-opacity hover:opacity-95 disabled:opacity-60"
      >
        Continue <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}

function Confirmation({ code }: { code: string }) {
  return (
    <div className="mx-auto max-w-2xl px-4 py-16">
      <div className="rounded-3xl border border-border bg-card p-8 text-center shadow-[var(--shadow-card)]">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-secondary/20 text-secondary-foreground">
          <Check className="h-6 w-6" />
        </div>
        <h1 className="mt-5 text-2xl font-semibold">Thank you. Your concern has been received.</h1>
        <p className="mt-2 text-muted-foreground">
          A coordinator will review it discreetly. Save this Case ID — it's the only way to check updates anonymously.
        </p>

        <div className="mt-6 inline-flex items-center gap-3 rounded-2xl border-2 border-dashed border-primary/40 bg-[color:var(--primary-soft)] px-6 py-4">
          <code className="text-2xl font-semibold tracking-wider text-primary">{code}</code>
          <button
            onClick={() => {
              navigator.clipboard.writeText(code);
              toast.success("Case ID copied");
            }}
            className="rounded-lg p-2 text-primary hover:bg-primary/10"
            aria-label="Copy case ID"
          >
            <Copy className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link to="/case" search={{ code }} className="rounded-xl bg-[image:var(--gradient-hero)] px-5 py-2.5 text-sm font-medium text-primary-foreground shadow-[var(--shadow-glow)]">
            Open my case thread
          </Link>
          <Link to="/" className="rounded-xl border border-border bg-background px-5 py-2.5 text-sm font-medium hover:bg-muted">
            Back to home
          </Link>
        </div>
      </div>
    </div>
  );
}