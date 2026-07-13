import { createFileRoute, Link, Outlet, useNavigate, useLocation } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { LayoutGrid, FileText, Calculator, BookOpen, History, Search, Bell, ChevronDown, Shield, LogOut } from "lucide-react";
import { WhatsAppButton } from "@/components/WhatsAppButton";
import logoAsset from "@/assets/tender-pro-logo.png.asset.json";

const logoSrc = logoAsset.url;

export const Route = createFileRoute("/app")({ component: AppShell });

const TOP_NAV: Array<{ to: string; label: string; exact?: boolean }> = [
  { to: "/app", label: "Overview", exact: true },
  { to: "/app/technical", label: "Technical" },
  { to: "/app/financial", label: "Financial" },
  { to: "/app/learn", label: "Bid Learn" },
  { to: "/app/history", label: "History" },
];

const SIDE_ICONS: Array<{ to: string; icon: React.ElementType; label: string; exact?: boolean }> = [
  { to: "/app", icon: LayoutGrid, label: "Overview", exact: true },
  { to: "/app/technical", icon: FileText, label: "Technical" },
  { to: "/app/financial", icon: Calculator, label: "Financial" },
  { to: "/app/learn", icon: BookOpen, label: "Learn" },
  { to: "/app/history", icon: History, label: "History" },
];

function AppShell() {
  const { user, loading, profile, isAdmin, signOut } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth", search: { mode: "login" } });
  }, [user, loading, navigate]);

  // Realtime broadcast notifications
  useEffect(() => {
    if (!user) return;
    const ch = supabase
      .channel(`notif-${user.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications" }, (payload) => {
        const n = payload.new as { title: string; body: string; target_user_id: string | null };
        if (n.target_user_id === null || n.target_user_id === user.id) {
          toast(n.title, { description: n.body, duration: 8000 });
        }
      })
      .subscribe();
    return () => { void supabase.removeChannel(ch); };
  }, [user]);

  const handleSignOut = async () => {
    await queryClient.cancelQueries();
    queryClient.clear();
    await signOut();
    navigate({ to: "/auth", search: { mode: "login" }, replace: true });
  };

  if (loading || !user) return <div className="grid min-h-screen place-items-center text-muted-foreground">Loading…</div>;

  const initials = (profile?.full_name ?? user.email ?? "U").split(" ").map((s) => s[0]).slice(0, 2).join("").toUpperCase();

  return (
    <div className="min-h-screen bg-background">
      {/* Top bar */}
      <header className="sticky top-0 z-30 border-b border-border/70 bg-background/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 md:px-8">
          <Link to="/app" className="flex items-center gap-2 font-black tracking-tight">
            <img src={logoSrc} alt="Tender Pro" className="h-8 w-8 rounded-lg" />
            <span className="hidden sm:inline">Tender Pro</span>
          </Link>

          <nav className="mx-auto hidden items-center gap-1 rounded-full border border-border bg-card px-1.5 py-1 shadow-sm md:flex">
            {TOP_NAV.map((n) => {
              const active = n.exact ? location.pathname === n.to : location.pathname.startsWith(n.to);
              return (
                <Link
                  key={n.to}
                  to={n.to}
                  className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${active ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"}`}
                >
                  {n.label}
                </Link>
              );
            })}
          </nav>

          <div className="ml-auto flex items-center gap-2">
            <button className="grid h-9 w-9 place-items-center rounded-full border border-border bg-card text-muted-foreground hover:text-foreground"><Search className="h-4 w-4" /></button>
            <button className="grid h-9 w-9 place-items-center rounded-full border border-border bg-card text-muted-foreground hover:text-foreground"><Bell className="h-4 w-4" /></button>
            <div className="relative">
              <button onClick={() => setMenuOpen((v) => !v)} className="flex items-center gap-2 rounded-full border border-border bg-card py-1 pl-1 pr-2 hover:bg-accent">
                <span className="teal-gradient grid h-7 w-7 place-items-center rounded-full text-[11px] font-bold">{initials}</span>
                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
              {menuOpen && (
                <div className="absolute right-0 mt-2 w-56 overflow-hidden rounded-xl border border-border bg-card shadow-lg">
                  <div className="border-b border-border p-3 text-xs">
                    <div className="truncate font-semibold">{profile?.full_name ?? user.email}</div>
                    <div className="truncate text-muted-foreground">Plan: {isAdmin ? "ADMIN" : profile?.plan ?? "none"}</div>
                  </div>
                  {isAdmin && (
                    <Link to="/admin" onClick={() => setMenuOpen(false)} className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent">
                      <Shield className="h-4 w-4" /> Admin panel
                    </Link>
                  )}
                  <Link to="/app/subscribe" onClick={() => setMenuOpen(false)} className="block px-3 py-2 text-sm hover:bg-accent">Subscription</Link>
                  <button onClick={handleSignOut} className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-accent">
                    <LogOut className="h-4 w-4" /> Sign out
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
        {/* Mobile pill nav */}
        <div className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-4 pb-3 md:hidden">
          {TOP_NAV.map((n) => {
            const active = n.exact ? location.pathname === n.to : location.pathname.startsWith(n.to);
            return (
              <Link key={n.to} to={n.to} className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium ${active ? "bg-foreground text-background" : "border border-border text-muted-foreground"}`}>
                {n.label}
              </Link>
            );
          })}
        </div>
      </header>

      <div className="mx-auto flex max-w-7xl gap-6 px-4 py-6 md:px-8">
        {/* Left icon rail */}
        <aside className="hidden w-14 shrink-0 md:block">
          <div className="sticky top-24 flex flex-col items-center gap-2 rounded-2xl border border-border bg-card p-2">
            {SIDE_ICONS.map((n) => {
              const active = n.exact ? location.pathname === n.to : location.pathname.startsWith(n.to);
              const Icon = n.icon;
              return (
                <Link key={n.to} to={n.to} title={n.label} className={`grid h-10 w-10 place-items-center rounded-xl transition ${active ? "teal-gradient" : "text-muted-foreground hover:bg-accent"}`}>
                  <Icon className="h-4 w-4" />
                </Link>
              );
            })}
          </div>
        </aside>

        <main className="min-w-0 flex-1">
          <Outlet />
        </main>
      </div>

      <WhatsAppButton />
    </div>
  );
}
