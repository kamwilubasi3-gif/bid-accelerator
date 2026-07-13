import { createFileRoute, Link, Outlet, useLocation, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { Shield, Users, Bell, CreditCard, ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/admin")({ component: AdminShell });

const TABS = [
  { to: "/admin", label: "Users", icon: Users, exact: true },
  { to: "/admin/subscriptions", label: "Subscriptions", icon: CreditCard },
  { to: "/admin/notifications", label: "Broadcast", icon: Bell },
];

function AdminShell() {
  const { user, isAdmin, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (loading) return;
    if (!user) navigate({ to: "/auth", search: { mode: "login" } });
    else if (!isAdmin) navigate({ to: "/app" });
  }, [user, isAdmin, loading, navigate]);

  if (loading || !user || !isAdmin) return <div className="grid min-h-screen place-items-center text-muted-foreground">Loading…</div>;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4 md:px-8">
          <Link to="/app" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Back to app
          </Link>
          <div className="mx-auto flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1 text-xs font-semibold">
            <Shield className="h-3.5 w-3.5 text-primary" /> ADMIN PANEL
          </div>
          <div className="w-24" />
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 py-6 md:px-8">
        <nav className="mb-6 flex flex-wrap gap-2">
          {TABS.map((t) => {
            const active = t.exact ? location.pathname === t.to : location.pathname.startsWith(t.to);
            const Icon = t.icon;
            return (
              <Link key={t.to} to={t.to} className={`flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition ${active ? "border-primary bg-foreground text-background" : "border-border bg-card text-muted-foreground hover:text-foreground"}`}>
                <Icon className="h-4 w-4" /> {t.label}
              </Link>
            );
          })}
        </nav>
        <Outlet />
      </div>
    </div>
  );
}
