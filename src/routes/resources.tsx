import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ExternalLink, MapPin, Phone, AlertCircle } from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/resources")({
  head: () => ({
    meta: [
      { title: "Community resources — Bomaveda" },
      { name: "description", content: "Curated youth opportunities, scholarships, digital skills programs, mental-health services and emergency contacts in Kilifi County." },
      { property: "og:title", content: "Community resources — Bomaveda" },
      { property: "og:description", content: "Free programs and services for coastal Kenyan youth and families." },
    ],
  }),
  component: Resources,
});

const CATS = ["All", "Youth opportunity", "Scholarship", "Digital skills", "Mental health", "Peace education", "Climate", "Emergency"];

function Resources() {
  const [filter, setFilter] = useState("All");
  const { data, isLoading } = useQuery({
    queryKey: ["resources"],
    queryFn: async () => {
      const { data, error } = await supabase.from("resources").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const list = (data ?? []).filter((r) => filter === "All" || r.category === filter);
  const emergencies = (data ?? []).filter((r) => r.category === "Emergency");

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Community resources</h1>
        <p className="max-w-xl text-sm text-muted-foreground">
          A growing directory of programs and services for coastal youth — opportunity, learning and care.
        </p>
      </div>

      {emergencies.length > 0 && (
        <div className="mt-6 flex flex-wrap items-center gap-3 rounded-2xl border border-destructive/30 bg-destructive/5 p-4 text-sm">
          <AlertCircle className="h-5 w-5 shrink-0 text-destructive" />
          <span className="font-medium">In an emergency:</span>
          {emergencies.map((e) => (
            <span key={e.id} className="rounded-full bg-background px-3 py-1 text-xs">
              {e.title} · <span className="font-semibold">{e.contact}</span>
            </span>
          ))}
        </div>
      )}

      <div className="mt-6 flex gap-2 overflow-x-auto pb-2">
        {CATS.map((c) => (
          <button
            key={c}
            onClick={() => setFilter(c)}
            className={`shrink-0 rounded-full border px-4 py-1.5 text-sm transition-colors ${
              filter === c ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-muted-foreground hover:bg-muted"
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      {isLoading ? (
        <p className="mt-12 text-sm text-muted-foreground">Loading resources…</p>
      ) : list.length === 0 ? (
        <p className="mt-12 text-sm text-muted-foreground">Nothing here yet.</p>
      ) : (
        <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {list.map((r) => (
            <article key={r.id} className="flex flex-col rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
              <div className="inline-flex w-fit rounded-full bg-secondary/15 px-2.5 py-0.5 text-xs font-medium text-secondary-foreground">
                {r.category}
              </div>
              <h3 className="mt-3 text-lg font-semibold">{r.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{r.description}</p>
              <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                {r.location && (
                  <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" />{r.location}</span>
                )}
                {r.contact && (
                  <span className="inline-flex items-center gap-1"><Phone className="h-3 w-3" />{r.contact}</span>
                )}
              </div>
              {r.url && (
                <a href={r.url} target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline">
                  Visit <ExternalLink className="h-3.5 w-3.5" />
                </a>
              )}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}