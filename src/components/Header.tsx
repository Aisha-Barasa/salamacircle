import { Link } from "@tanstack/react-router";
import { Shield, LogIn } from "lucide-react";

const nav = [
  { to: "/", label: "Home" },
  { to: "/submit-concern", label: "Submit a concern" },
  { to: "/request-support", label: "Request support" },
  { to: "/resources", label: "Resources" },
  { to: "/case", label: "Check case" },
];

export function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4">
        <Link to="/" className="flex items-center gap-2 font-semibold tracking-tight">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[image:var(--gradient-hero)] text-primary-foreground shadow-[var(--shadow-glow)]">
            <Shield className="h-4 w-4" />
          </span>
          <span className="text-base sm:text-lg">Salama Circle</span>
        </Link>
        <nav className="hidden items-center gap-1 md:flex">
          {nav.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              className="rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              activeProps={{ className: "bg-muted text-foreground" }}
              activeOptions={{ exact: n.to === "/" }}
            >
              {n.label}
            </Link>
          ))}
          <Link
            to="/auth"
            className="ml-2 inline-flex items-center gap-1.5 rounded-lg border border-input px-3 py-2 text-xs text-muted-foreground hover:text-foreground"
            title="Coordinator workspace"
          >
            <LogIn className="h-3.5 w-3.5" /> Coordinator
          </Link>
        </nav>
        <Link
          to="/submit-concern"
          className="hidden rounded-lg bg-[image:var(--gradient-hero)] px-4 py-2 text-sm font-medium text-primary-foreground shadow-[var(--shadow-glow)] transition-opacity hover:opacity-95 sm:inline-flex"
        >
          Submit a concern
        </Link>
      </div>
      <nav className="flex items-center gap-1 overflow-x-auto border-t border-border/60 px-4 py-2 md:hidden">
        {nav.map((n) => (
          <Link
            key={n.to}
            to={n.to}
            className="shrink-0 rounded-lg px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
            activeProps={{ className: "bg-muted text-foreground" }}
            activeOptions={{ exact: n.to === "/" }}
          >
            {n.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}