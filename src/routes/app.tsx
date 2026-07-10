import { createFileRoute, Link, Outlet, useNavigate, useLocation } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { Home, History, FileText, Calculator, BookOpen, LogOut, Menu, X, User } from "lucide-react";
import { WhatsAppButton } from "@/components/WhatsAppButton";
import logoAsset from "@/assets/tender-pro-logo.png.asset.json";

const logoSrc = logoAsset.url;

export const Route = createFileRoute("/app")({
  component: AppShell,
});

const NAV: Array<{ to: string; label: string; icon: React.ElementType; exact?: boolean }> = [
  { to: "/app", label: "Home", icon: Home, exact: true },
  { to: "/app/history", label: "History", icon: History },
  { to: "/app/technical", label: "Technical Proposal", icon: FileText },
  { to: "/app/financial", label: "Financial Proposal", icon: Calculator },
  { to: "/app/learn", label: "Learn About Bid", icon: BookOpen },
];

function AppShell() {
  const { user, loading, profile, signOut } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);

  const handleSignOut = async () => {
    await queryClient.cancelQueries();
    queryClient.clear();
    await signOut();
    navigate({ to: "/auth", search: { mode: "login" }, replace: true });
  };

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth", search: { mode: "login" } });
  }, [user, loading, navigate]);
  // Note: we intentionally DO NOT auto-redirect to /app/subscribe.
  // Users must be able to view and download their free-trial proposal, view
  // history, and browse the app. Individual feature pages themselves show an
  // upgrade prompt when the user has no remaining quota.
  void profile; void location;

  if (loading || !user) {
    return <div className="grid min-h-screen place-items-center text-muted-foreground">Loading…</div>;
  }

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-40 w-64 transform bg-sidebar border-r border-sidebar-border p-4 transition-transform lg:static lg:translate-x-0 ${open ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="mb-6 flex items-center justify-between">
          <Link to="/app" className="flex items-center gap-2 font-bold">
            <img src={logoSrc} alt="Tender Pro logo" className="h-10 w-10 rounded-xl" />
            Tender Pro
          </Link>
          <button className="lg:hidden" onClick={() => setOpen(false)}><X className="h-5 w-5" /></button>
        </div>
        <nav className="space-y-1">
          {NAV.map((n) => {
            const active = n.exact ? location.pathname === n.to : location.pathname.startsWith(n.to);
            const Icon = n.icon;
            return (
              <Link
                key={n.to}
                to={n.to}
                onClick={() => setOpen(false)}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${active ? "teal-gradient text-primary-foreground" : "text-sidebar-foreground hover:bg-sidebar-accent"}`}
              >
                <Icon className="h-4 w-4" /> {n.label}
              </Link>
            );
          })}
        </nav>
        <div className="mt-auto absolute bottom-4 left-4 right-4 space-y-2">
          <div className="glass-card flex items-center gap-2 p-3 text-xs">
            <User className="h-4 w-4 text-primary" />
            <div className="flex-1 truncate">
              <div className="truncate font-medium">{profile?.full_name ?? user.email}</div>
              <div className="truncate text-muted-foreground">Plan: {profile?.plan ?? "none"}</div>
            </div>
          </div>
          <button onClick={handleSignOut} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-sidebar-foreground hover:bg-sidebar-accent">
            <LogOut className="h-4 w-4" /> Sign out
          </button>
        </div>
      </aside>

      {open && <div className="fixed inset-0 z-30 bg-black/50 lg:hidden" onClick={() => setOpen(false)} />}

      <main className="flex-1 min-w-0">
        <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-border bg-background/70 p-4 backdrop-blur-md lg:hidden">
          <button onClick={() => setOpen(true)}><Menu className="h-6 w-6" /></button>
          <img src={logoSrc} alt="Tender Pro logo" className="h-8 w-8 rounded-lg" />
          <span className="font-semibold">Tender Pro</span>
        </header>
        <div className="p-4 md:p-8">
          <Outlet />
        </div>
      </main>
      <WhatsAppButton />
    </div>
  );
}
