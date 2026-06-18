import { createFileRoute, Link } from "@tanstack/react-router";
import { Heart, Lock, Sparkles, Users, GraduationCap, Briefcase, Shield, MessageCircle } from "lucide-react";
import { STATUS_FLOW } from "@/lib/salama";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Bomaveda — Belong. Build. Protect." },
      { name: "description", content: "Community-led youth support across Kilifi County. Anonymous reporting, mentorship, counseling, education and jobs — before harm takes root." },
      { property: "og:title", content: "Bomaveda" },
      { property: "og:description", content: "Building safer communities through mentorship, support and opportunity." },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <div>
      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-[image:var(--gradient-soft)]" />
        <div className="mx-auto max-w-3xl px-4 py-20 text-center md:py-28">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-background/60 px-3 py-1 text-xs text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5 text-secondary" />
              Kilifi County · Community-led
            </div>
            <h1 className="mt-5 text-4xl font-semibold tracking-tight text-foreground sm:text-5xl md:text-6xl">
              Building safer communities through{" "}
              <span className="bg-[image:var(--gradient-hero)] bg-clip-text text-transparent">
                mentorship, support and opportunity.
              </span>
            </h1>
            <p className="mt-5 mx-auto max-w-xl text-base text-muted-foreground sm:text-lg">
              Bomaveda connects coastal youth to mentors, counselors, training and jobs —
              so concerns become care, not alarm. Belong. Build. Protect.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link
                to="/submit-concern"
                className="inline-flex h-12 items-center justify-center rounded-xl bg-[image:var(--gradient-hero)] px-7 text-sm font-medium text-primary-foreground shadow-[var(--shadow-glow)] transition-opacity hover:opacity-95"
              >
                Submit a concern
              </Link>
              <Link
                to="/request-support"
                className="inline-flex h-12 items-center justify-center rounded-xl border border-border bg-background px-7 text-sm font-medium text-foreground transition-colors hover:bg-muted"
              >
                Request support
              </Link>
            </div>
            <div className="mt-6 flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <Lock className="h-3.5 w-3.5" /> Fully anonymous · No login required · End-to-end private
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="mx-auto max-w-6xl px-4 py-16">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">How Bomaveda works</h2>
          <p className="mt-3 text-muted-foreground">
            A safe, anonymous bridge between the people who notice and the people who can help.
          </p>
        </div>
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {[
            { icon: MessageCircle, title: "1. Share a concern", body: "Anyone can anonymously flag a youth at risk — no names, no contact required." },
            { icon: Shield, title: "2. We verify with care", body: "A community liaison reviews discreetly. No police, no surveillance." },
            { icon: Heart, title: "3. Support is delivered", body: "Mentorship, counseling, school support or a job — matched to the situation." },
          ].map((s) => (
            <div key={s.title} className="rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-card)]">
              <div className="grid h-11 w-11 place-items-center rounded-xl bg-[color:var(--primary-soft)] text-primary">
                <s.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 text-lg font-semibold">{s.title}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CASE FLOW */}
      <section className="bg-[image:var(--gradient-soft)] py-16">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">What happens after you submit</h2>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            You receive an anonymous Case ID (e.g. <code className="rounded bg-muted px-1.5 py-0.5">SC-2026-00129</code>).
            Use it anytime to read updates from coordinators — without revealing who you are.
          </p>
          <ol className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {STATUS_FLOW.map((s, i) => (
              <li key={s.value} className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
                <div className="text-xs font-semibold text-secondary">Step {i + 1}</div>
                <div className="mt-1 font-semibold">{s.label}</div>
                <div className="mt-1 text-sm text-muted-foreground">{s.desc}</div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* WHAT WE OFFER */}
      <section className="mx-auto max-w-6xl px-4 py-16">
        <h2 className="text-3xl font-semibold tracking-tight">Support that meets young people where they are</h2>
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: Users, title: "Mentorship", body: "Trusted community elders, alumni and peers." },
            { icon: Heart, title: "Counseling", body: "Free, confidential mental-health support." },
            { icon: GraduationCap, title: "Education", body: "Back-to-school, scholarships and tutoring." },
            { icon: Briefcase, title: "Jobs & skills", body: "Digital skills, apprenticeships and placements." },
          ].map((s) => (
            <div key={s.title} className="rounded-2xl border border-border bg-card p-6">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-secondary/15 text-secondary-foreground">
                <s.icon className="h-5 w-5" />
              </div>
              <div className="mt-4 font-semibold">{s.title}</div>
              <div className="mt-1 text-sm text-muted-foreground">{s.body}</div>
            </div>
          ))}
        </div>
      </section>

      {/* PRIVACY */}
      <section className="mx-auto max-w-6xl px-4 pb-16">
        <div className="grid gap-8 rounded-3xl border border-border bg-[image:var(--gradient-warm)] p-8 md:grid-cols-3 md:p-12">
          <div>
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-background text-primary">
              <Lock className="h-5 w-5" />
            </div>
            <h3 className="mt-4 text-2xl font-semibold">Privacy is the foundation, not a feature.</h3>
          </div>
          <ul className="space-y-3 text-sm text-foreground md:col-span-2">
            <li>· Reports are anonymous by default. No names, no IDs, no IP linking required.</li>
            <li>· Communication happens through a secure Case ID thread — never directly between people.</li>
            <li>· No reported individuals are publicly listed. Ever.</li>
            <li>· Coordinators are bound by community trust and confidentiality protocols.</li>
            <li>· Bomaveda is not a police or surveillance system. It exists to deliver support.</li>
          </ul>
        </div>
      </section>

      {/* PARTNERS */}
      <section className="mx-auto max-w-6xl px-4 pb-24">
        <p className="text-center text-xs uppercase tracking-widest text-muted-foreground">looking to work alongside</p>
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-5">
          {["Kilifi County", "Haki Africa", "KECOSCE", "Coast Education Centre", "Sauti ya Vijana"].map((p) => (
            <div key={p} className="rounded-2xl border border-border bg-card px-4 py-6 text-center text-sm font-medium text-muted-foreground">
              {p}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
