import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/reset-password")({
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);

  const isRecovery = useMemo(() => {
    if (typeof window === "undefined") return false;
    const url = `${window.location.search}${window.location.hash}`;
    return url.includes("type=recovery") || url.includes("access_token=");
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(() => setReady(true)).catch(() => setReady(true));
  }, []);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (password.length < 6) return toast.error("Password must be at least 6 characters");
    if (password !== confirm) return toast.error("Passwords do not match");

    setBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast.success("Password updated. Please log in.");
      await supabase.auth.signOut();
      navigate({ to: "/auth", search: { mode: "login" }, replace: true });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Password reset failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid min-h-screen place-items-center bg-slate-100 px-6 py-10 text-slate-900">
      <form onSubmit={submit} className="w-full max-w-md rounded-3xl border border-slate-300 bg-slate-200 p-8 shadow-2xl">
        <img src="/tender-pro-icon-192.png" alt="Tender Pro logo" className="mx-auto mb-4 h-16 w-16 rounded-2xl" />
        <h1 className="text-center text-3xl font-black tracking-tight">RESET PASSWORD</h1>
        <p className="mt-1 text-center text-sm text-slate-600">Create a new Tender Pro password.</p>

        {ready && !isRecovery && (
          <p className="mt-5 rounded-2xl border border-amber-300 bg-amber-100 p-3 text-sm text-amber-900">
            Open this page from the password reset email so your secure reset session can be verified.
          </p>
        )}

        <div className="mt-6 space-y-3">
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="new password"
            className="w-full rounded-full border border-slate-300 bg-slate-100 px-5 py-3 text-sm outline-none focus:border-teal-500"
            required
          />
          <input
            type="password"
            value={confirm}
            onChange={(event) => setConfirm(event.target.value)}
            placeholder="confirm password"
            className="w-full rounded-full border border-slate-300 bg-slate-100 px-5 py-3 text-sm outline-none focus:border-teal-500"
            required
          />
          <button disabled={busy} className="w-full rounded-full bg-teal-500 py-3 font-semibold text-slate-950 shadow-lg shadow-teal-500/25 disabled:opacity-60">
            {busy ? "UPDATING…" : "UPDATE PASSWORD"}
          </button>
        </div>

        <p className="mt-5 text-center text-sm">
          <Link to="/auth" search={{ mode: "login" }} className="font-semibold text-teal-700 hover:underline">Back to login</Link>
        </p>
      </form>
    </div>
  );
}