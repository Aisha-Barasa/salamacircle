import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Briefcase, GraduationCap, Heart, Users, Brain, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { CONSTITUENCIES } from "@/lib/salama";

export const Route = createFileRoute("/request-support")({
  head: () => ({
    meta: [
      { title: "Request support — Bomaveda" },
      { name: "description", content: "Request mentorship, counseling, jobs, education or mental-health support from Bomaveda's community network." },
      { property: "og:title", content: "Request support — Bomaveda" },
      { property: "og:description", content: "Free, confidential support for coastal youth and their families." },
    ],
  }),
  component: RequestSupport,
});

const TYPES = [
  { value: "mentorship", label: "Mentorship", icon: Users, body: "Get paired with a community elder, alumni or peer mentor." },
  { value: "counseling", label: "Counseling", icon: Heart, body: "1-on-1 confidential counseling sessions." },
  { value: "jobs", label: "Job opportunities", icon: Briefcase, body: "Apprenticeships, placements and informal work." },
  { value: "education", label: "Education support", icon: GraduationCap, body: "School re-entry, scholarships and tutoring." },
  { value: "mental_health", label: "Mental health", icon: Brain, body: "Therapy, crisis support and ongoing care." },
] as const;

function RequestSupport() {
  const [type, setType] = useState<(typeof TYPES)[number]["value"] | "">("");
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [constituency, setConstituency] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!type || description.trim().length < 10) {
      toast.error("Please choose a type and add a short description.");
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from("support_requests").insert({
      type,
      display_name: name || null,
      contact: contact || null,
      constituency: constituency || null,
      description: description.trim(),
    });
    setSubmitting(false);
    if (error) {
      toast.error("Could not submit. Please try again.");
      return;
    }
    setDone(true);
  }

  if (done) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-20 text-center">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-secondary/20 text-secondary-foreground">
          <Check className="h-6 w-6" />
        </div>
        <h1 className="mt-5 text-3xl font-semibold">We hear you.</h1>
        <p className="mt-2 text-muted-foreground">
          A coordinator will reach out through your preferred contact, usually within 48 hours.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Request support</h1>
      <p className="mt-2 max-w-xl text-sm text-muted-foreground">
        For yourself, a friend or a family member. All requests are handled confidentially and at no cost.
      </p>

      <form onSubmit={submit} className="mt-8 space-y-6 rounded-3xl border border-border bg-card p-6 shadow-[var(--shadow-card)] sm:p-8">
        <div>
          <p className="text-sm font-medium">What kind of support?</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {TYPES.map((t) => (
              <button
                type="button"
                key={t.value}
                onClick={() => setType(t.value)}
                className={`flex items-start gap-3 rounded-2xl border p-4 text-left transition-all ${
                  type === t.value
                    ? "border-primary bg-[color:var(--primary-soft)] ring-2 ring-primary/30"
                    : "border-border hover:border-primary/40 hover:bg-muted"
                }`}
              >
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-secondary/15 text-secondary-foreground">
                  <t.icon className="h-5 w-5" />
                </span>
                <span className="min-w-0">
                  <span className="block font-medium">{t.label}</span>
                  <span className="mt-0.5 block text-sm text-muted-foreground">{t.body}</span>
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Name (optional)">
            <input value={name} onChange={(e) => setName(e.target.value)} className={inp} placeholder="What should we call you?" />
          </Field>
          <Field label="Contact (phone, email or social)">
            <input value={contact} onChange={(e) => setContact(e.target.value)} className={inp} placeholder="So a coordinator can reach you" />
          </Field>
        </div>

        <Field label="Constituency">
          <select value={constituency} onChange={(e) => setConstituency(e.target.value)} className={inp}>
            <option value="">Prefer not to say</option>
            {Object.keys(CONSTITUENCIES).map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </Field>

        <Field label="Tell us what you need">
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={6}
            maxLength={1500}
            className={inp}
            placeholder="A few sentences are enough. We'll take it from there."
          />
        </Field>

        <button
          disabled={submitting}
          className="w-full rounded-xl bg-[image:var(--gradient-hero)] px-6 py-3 text-sm font-medium text-primary-foreground shadow-[var(--shadow-glow)] transition-opacity hover:opacity-95 disabled:opacity-60"
        >
          {submitting ? "Sending…" : "Send request"}
        </button>
      </form>
    </div>
  );
}

const inp = "w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-sm font-medium">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}