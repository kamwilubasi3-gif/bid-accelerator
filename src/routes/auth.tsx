import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { getFirebase } from "@/lib/firebase";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import authImg from "@/assets/auth-signing.jpg";

const searchSchema = z.object({ mode: z.enum(["login", "signup", "forgot"]).catch("login") });

export const Route = createFileRoute("/auth")({
  validateSearch: searchSchema,
  component: AuthPage,
});

function AuthPage() {
  const { mode } = Route.useSearch();
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && user) navigate({ to: "/app" });
  }, [user, loading, navigate]);

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="flex items-center justify-center bg-white p-8 lg:p-16">
        <div className="w-full max-w-md">
          <div className="mb-8 text-center">
            <h1 className="text-4xl font-black tracking-tight text-slate-900">
              {mode === "signup" ? "SIGN UP" : mode === "forgot" ? "RESET" : "LOGIN"}
            </h1>
            <p className="mt-1 text-sm text-slate-500">Tender Pro · Win more contracts</p>
          </div>
          {mode === "signup" && <SignUpForm />}
          {mode === "login" && <LoginForm />}
          {mode === "forgot" && <ForgotForm />}
        </div>
      </div>
      <div className="relative hidden lg:block">
        <img src={authImg} alt="" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-l from-transparent via-transparent to-white/20" />
        <div className="absolute bottom-10 right-10 max-w-xs text-right text-white drop-shadow-lg">
          <p className="text-3xl font-black tracking-tight">TENDER PRO</p>
          <p className="text-sm opacity-90">Draft. Sign. Win.</p>
        </div>
      </div>
    </div>
  );
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`w-full rounded-full border border-slate-200 bg-slate-100 px-5 py-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-teal-500 focus:bg-white ${props.className ?? ""}`}
    />
  );
}

function PrimaryBtn({ children, ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button {...rest} className="w-full rounded-full bg-teal-500 py-3 font-semibold text-white shadow-lg shadow-teal-500/30 transition hover:bg-teal-600 disabled:opacity-60" style={{ background: "linear-gradient(135deg, oklch(0.78 0.14 200), oklch(0.65 0.13 220))" }}>
      {children}
    </button>
  );
}

async function upsertProfile(uid: string, email: string, extras: Record<string, unknown> = {}) {
  await supabase.from("profiles").upsert(
    { firebase_uid: uid, email, ...extras },
    { onConflict: "firebase_uid" },
  );
}

function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const doLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const { auth } = await getFirebase();
      const { signInWithEmailAndPassword } = await import("firebase/auth");
      await signInWithEmailAndPassword(auth, email, password);
      toast.success("Welcome back");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Login failed");
    } finally { setBusy(false); }
  };

  const doGoogle = async () => {
    setBusy(true);
    try {
      const { auth } = await getFirebase();
      const { GoogleAuthProvider, signInWithPopup } = await import("firebase/auth");
      const cred = await signInWithPopup(auth, new GoogleAuthProvider());
      await upsertProfile(cred.user.uid, cred.user.email ?? "", { full_name: cred.user.displayName });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Google sign-in failed");
    } finally { setBusy(false); }
  };

  return (
    <form onSubmit={doLogin} className="space-y-3">
      <Input type="email" placeholder="e-mail" value={email} onChange={(e) => setEmail(e.target.value)} required />
      <Input type="password" placeholder="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
      <div className="flex justify-end text-xs">
        <Link to="/auth" search={{ mode: "forgot" }} className="text-teal-600 hover:underline">Forgot password?</Link>
      </div>
      <PrimaryBtn disabled={busy}>{busy ? "..." : "LOG IN"}</PrimaryBtn>
      <button type="button" onClick={doGoogle} className="flex w-full items-center justify-center gap-2 rounded-full border border-slate-200 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50">
        <svg viewBox="0 0 24 24" className="h-5 w-5"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.19 3.32v2.77h3.54c2.08-1.92 3.29-4.74 3.29-8.1z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.54-2.77c-.98.66-2.23 1.05-3.74 1.05-2.88 0-5.32-1.94-6.19-4.56H2.17v2.85A11 11 0 0012 23z"/><path fill="#FBBC05" d="M5.81 14.06a6.62 6.62 0 010-4.12V7.09H2.17a11 11 0 000 9.82l3.64-2.85z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.07.56 4.21 1.65l3.15-3.15C17.45 2.11 14.97 1 12 1 7.7 1 3.99 3.47 2.17 7.09l3.64 2.85C6.68 7.32 9.12 5.38 12 5.38z"/></svg>
        Continue with Google
      </button>
      <p className="text-center text-sm text-slate-600">
        No account? <Link to="/auth" search={{ mode: "signup" }} className="font-semibold text-teal-600">Sign up</Link>
      </p>
    </form>
  );
}

function ForgotForm() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const { auth } = await getFirebase();
      const { sendPasswordResetEmail } = await import("firebase/auth");
      await sendPasswordResetEmail(auth, email);
      toast.success("Password reset email sent — check your inbox");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to send email");
    } finally { setBusy(false); }
  };
  return (
    <form onSubmit={send} className="space-y-3">
      <Input type="email" placeholder="e-mail" value={email} onChange={(e) => setEmail(e.target.value)} required />
      <PrimaryBtn disabled={busy}>{busy ? "..." : "SEND RESET EMAIL"}</PrimaryBtn>
      <p className="text-center text-sm">
        <Link to="/auth" search={{ mode: "login" }} className="text-teal-600">Back to login</Link>
      </p>
    </form>
  );
}

function SignUpForm() {
  const [step, setStep] = useState<1 | 2>(1);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [password, setPassword] = useState("");
  const [hasCompany, setHasCompany] = useState<"yes" | "no" | "">("");
  const [companyName, setCompanyName] = useState("");
  const [companyReg, setCompanyReg] = useState("");
  const [tpin, setTpin] = useState("");
  const [companyContacts, setCompanyContacts] = useState("");
  const [companyAddress, setCompanyAddress] = useState("");
  const [accepted, setAccepted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [regDoc, setRegDoc] = useState<File | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accepted) return toast.error("Please accept the terms & conditions");
    setBusy(true);
    try {
      const { auth } = await getFirebase();
      const { createUserWithEmailAndPassword, updateProfile } = await import("firebase/auth");
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(cred.user, { displayName: fullName });

      let regDocUrl: string | null = null;
      if (regDoc && hasCompany === "yes") {
        const path = `${cred.user.uid}/registration-${Date.now()}-${regDoc.name}`;
        const { error } = await supabase.storage.from("documents").upload(path, regDoc);
        if (!error) {
          const { data } = await supabase.storage.from("documents").createSignedUrl(path, 60 * 60 * 24 * 365);
          regDocUrl = data?.signedUrl ?? null;
        }
      }
      await upsertProfile(cred.user.uid, email, {
        full_name: fullName, phone, address,
        has_company: hasCompany === "yes",
        company_name: companyName || null,
        company_reg_number: companyReg || null,
        tpin: tpin || null,
        company_contacts: companyContacts || null,
        company_address: companyAddress || null,
        company_reg_doc_url: regDocUrl,
      });
      toast.success("Successfully signed up! Check your email.");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Sign up failed");
    } finally { setBusy(false); }
  };

  const canStep2 = fullName && email && phone && password.length >= 6;

  return (
    <form onSubmit={submit} className="space-y-3">
      {step === 1 && (
        <>
          <Input placeholder="Full name" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
          <Input type="email" placeholder="e-mail" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <Input placeholder="phone" value={phone} onChange={(e) => setPhone(e.target.value)} required />
          <Input placeholder="address" value={address} onChange={(e) => setAddress(e.target.value)} />
          <Input type="password" placeholder="password (min 6)" value={password} onChange={(e) => setPassword(e.target.value)} required />
          <button type="button" disabled={!canStep2} onClick={() => setStep(2)} className="w-full rounded-full py-3 font-semibold text-white disabled:opacity-50" style={{ background: "linear-gradient(135deg, oklch(0.78 0.14 200), oklch(0.65 0.13 220))" }}>
            Continue
          </button>
          <p className="text-center text-sm">
            Have an account? <Link to="/auth" search={{ mode: "login" }} className="font-semibold text-teal-600">Login</Link>
          </p>
        </>
      )}
      {step === 2 && (
        <>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700">Do you have a company?</label>
            <div className="flex gap-3">
              {(["yes", "no"] as const).map((v) => (
                <button key={v} type="button" onClick={() => setHasCompany(v)} className={`flex-1 rounded-full py-2 text-sm font-semibold ${hasCompany === v ? "bg-teal-500 text-white" : "border border-slate-200 text-slate-700"}`}>
                  {v.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
          {hasCompany === "yes" && (
            <>
              <Input placeholder="Company name" value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
              <Input placeholder="Company registration number" value={companyReg} onChange={(e) => setCompanyReg(e.target.value)} />
              <Input placeholder="TPIN" value={tpin} onChange={(e) => setTpin(e.target.value)} />
              <Input placeholder="Company contacts" value={companyContacts} onChange={(e) => setCompanyContacts(e.target.value)} />
              <Input placeholder="Company address" value={companyAddress} onChange={(e) => setCompanyAddress(e.target.value)} />
              <label className="block cursor-pointer rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 p-4 text-center text-sm text-slate-600 hover:bg-slate-100">
                {regDoc ? regDoc.name : "Click to attach company registration document"}
                <input type="file" className="hidden" onChange={(e) => setRegDoc(e.target.files?.[0] ?? null)} />
              </label>
            </>
          )}
          <label className="flex items-start gap-2 text-sm text-slate-700">
            <input type="checkbox" checked={accepted} onChange={(e) => setAccepted(e.target.checked)} className="mt-1" />
            <span>I have read and understood the <Link to="/terms" className="font-semibold text-teal-600 underline">Terms & Conditions</Link></span>
          </label>
          <div className="flex gap-2">
            <button type="button" onClick={() => setStep(1)} className="flex-1 rounded-full border border-slate-200 py-3 font-semibold text-slate-700">Back</button>
            <PrimaryBtn disabled={busy || !accepted || !hasCompany}>{busy ? "..." : "SIGN UP"}</PrimaryBtn>
          </div>
        </>
      )}
    </form>
  );
}
