import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { User } from "firebase/auth";
import { getFirebase } from "./firebase";
import { supabase } from "@/integrations/supabase/client";

export type Profile = {
  id: string;
  firebase_uid: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  address: string | null;
  has_company: boolean | null;
  company_name: string | null;
  company_reg_number: string | null;
  tpin: string | null;
  company_contacts: string | null;
  company_address: string | null;
  plan: string;
  plan_expires_at: string | null;
  free_trial_used: boolean | null;
};

type Ctx = {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<Ctx>({
  user: null,
  profile: null,
  loading: true,
  refreshProfile: async () => {},
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = async (uid: string) => {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("firebase_uid", uid)
      .maybeSingle();
    setProfile((data as Profile) ?? null);
  };

  useEffect(() => {
    let unsub = () => {};
    (async () => {
      const { auth } = await getFirebase();
      const { onAuthStateChanged } = await import("firebase/auth");
      unsub = onAuthStateChanged(auth, async (u) => {
        setUser(u);
        if (u) await loadProfile(u.uid);
        else setProfile(null);
        setLoading(false);
      });
    })().catch(() => setLoading(false));
    return () => unsub();
  }, []);

  const refreshProfile = async () => {
    if (user) await loadProfile(user.uid);
  };

  const signOut = async () => {
    const { auth } = await getFirebase();
    const { signOut: fbSignOut } = await import("firebase/auth");
    await fbSignOut(auth);
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, refreshProfile, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);

export function hasActiveSubscription(profile: Profile | null): boolean {
  if (!profile) return false;
  if (profile.plan === "none") return false;
  if (!profile.plan_expires_at) return false;
  return new Date(profile.plan_expires_at) > new Date();
}

export const PLANS = {
  basic: { name: "Basic", price: 220, proposals: 3, summaries: 3, model: "google/gemini-2.5-flash-lite" },
  pro: { name: "Pro", price: 500, proposals: 8, summaries: 10, model: "google/gemini-2.5-flash" },
  premium: { name: "Premium", price: 1500, proposals: 20, summaries: 999, model: "openai/gpt-5.5", tips: true },
} as const;

export type PlanId = keyof typeof PLANS;

export function planLimits(plan: string) {
  if (plan === "trial") return { proposals: 1, summaries: 1, model: "google/gemini-2.5-flash-lite", tips: false };
  return (PLANS as Record<string, { proposals: number; summaries: number; model: string; tips?: boolean }>)[plan] ?? { proposals: 0, summaries: 0, model: "", tips: false };
}
