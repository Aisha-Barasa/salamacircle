import { Link } from "@tanstack/react-router";

export function Footer() {
  return (
    <footer className="mt-24 border-t border-border/60 bg-[image:var(--gradient-soft)]">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:grid-cols-2 md:grid-cols-4">
        <div className="sm:col-span-2">
          <p className="text-base font-semibold">Bomaveda</p>
          <p className="mt-1 text-sm text-muted-foreground">Belong. Build. Protect.</p>
          <p className="mt-4 max-w-sm text-sm text-muted-foreground">
            A community-led platform helping coastal Kenya support its youth through mentorship,
            counseling and opportunity — long before harm takes root.
          </p>
        </div>
        <div>
          <p className="text-sm font-semibold">Get help</p>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li><Link to="/submit-concern" className="hover:text-foreground">Submit a concern</Link></li>
            <li><Link to="/request-support" className="hover:text-foreground">Request support</Link></li>
            <li><Link to="/case" className="hover:text-foreground">Check case status</Link></li>
          </ul>
        </div>
        <div>
          <p className="text-sm font-semibold">Community</p>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li><Link to="/resources" className="hover:text-foreground">Resources</Link></li>
            <li><Link to="/admin" className="hover:text-foreground">Coordinator dashboard</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-border/60 px-4 py-6 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} Salama Circle · Built with care for Kilifi County
      </div>
    </footer>
  );
}