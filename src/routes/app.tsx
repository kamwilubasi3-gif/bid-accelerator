import { createFileRoute, Link, Outlet, useNavigate, useLocation } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AuthProvider, useAuth, hasActiveSubscription } from "@/lib/auth-context";
import { Home, History, FileText, Calculator, BookOpen, LogOut, Menu, X, User } from "lucide-react";
import { WhatsAppButton } from "@/components/WhatsAppButton";
import { Toaster } from "sonner";

export const Route = createFileRoute("/app")({
  component: () => (
    <AuthProvider>
      <AppShell />
      <Toaster position="top-right" richColors theme="dark" />
    </AuthProvider>
  ),
});

const NAV = [
  { to: "/app", label: "Home", icon: Home, exact: true },
  { to: "/app/history", label: "History", icon: History },
  { to: "/app/technical", label: "Technical Proposal", icon: FileText },
  { to: "/app/financial", label: "Financial Proposal", icon: Calculator },
  { to: "/app/learn", label: "Learn About Bid", icon: BookOpen },
] as const;

function AppShell() {
  const { user, loading, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth", search: { mode: "login" } });
  }, [user, loading, navigate]);

  useEffect(() => {
    if (!loading && user && profile && !hasActiveSubscription(profile) && location.pathname !== "/app/subscribe") {
      // Show subscription page unless already using free trial and going to a limited screen
      if (!profile.free_trial_used) return; // let them try once
      navigate({ to: "/app/subscribe" });
    }
  }, [profile, user, loading, location.pathname, navigate]);

  if (loading || !user) {
    return <div className="grid min-h-screen place-items-center text-muted-foreground">Loading…</div>;
  }

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-40 w-64 transform bg-sidebar border-r border-sidebar-border p-4 transition-transform lg:static lg:translate-x-0 ${open ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="mb-6 flex items-center justify-between">
          <Link to="/app" className="flex items-center gap-2 font-bold">
            <span className="teal-gradient grid h-9 w-9 place-items-center rounded-lg text-sm">TP</span>
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
          <button onClick={() => signOut()} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-sidebar-foreground hover:bg-sidebar-accent">
            <LogOut className="h-4 w-4" /> Sign out
          </button>
        </div>
      </aside>

      {open && <div className="fixed inset-0 z-30 bg-black/50 lg:hidden" onClick={() => setOpen(false)} />}

      <main className="flex-1 min-w-0">
        <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-border bg-background/70 p-4 backdrop-blur-md lg:hidden">
          <button onClick={() => setOpen(true)}><Menu className="h-6 w-6" /></button>
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
