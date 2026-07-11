import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { User } from "@supabase/supabase-js";
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
  company_reg_doc_url?: string | null;
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

  const loadProfile = async (authUser: User) => {
    const metadata = authUser.user_metadata as Partial<Profile> & { name?: string };
    const defaults = {
      firebase_uid: authUser.id,
      email: authUser.email ?? "",
      full_name: metadata.full_name ?? metadata.name ?? null,
      phone: metadata.phone ?? null,
      address: metadata.address ?? null,
      has_company: metadata.has_company ?? false,
      company_name: metadata.company_name ?? null,
      company_reg_number: metadata.company_reg_number ?? null,
      tpin: metadata.tpin ?? null,
      company_contacts: metadata.company_contacts ?? null,
      company_address: metadata.company_address ?? null,
      company_reg_doc_url: metadata.company_reg_doc_url ?? null,
    };

    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("firebase_uid", authUser.id)
      .maybeSingle();

    if (error) {
      console.error("Failed to load profile", error);
      setProfile(null);
      return;
    }

    if (data) {
      setProfile(data as Profile);
      return;
    }

    const { data: created, error: createError } = await supabase
      .from("profiles")
      .upsert(defaults, { onConflict: "firebase_uid" })
      .select("*")
      .maybeSingle();

    if (createError) {
      console.error("Failed to create profile", createError);
    }
    setProfile((created as Profile) ?? null);
  };

  useEffect(() => {
    let active = true;

    const syncUser = async (authUser: User | null) => {
      if (!active) return;
      setUser(authUser);
      if (authUser) await loadProfile(authUser);
      else setProfile(null);
      if (active) setLoading(false);
    };

    supabase.auth.getUser().then(({ data }) => syncUser(data.user)).catch(() => setLoading(false));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      void syncUser(session?.user ?? null);
    });

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  const refreshProfile = async () => {
    if (user) await loadProfile(user);
  };

  const signOut = async () => {
    await supabase.auth.signOut();
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
  basic: {
    name: "Basic",
    price: 220,
    proposals: 3,
    summaries: 3,
    model: "google/gemini-2.5-flash-lite",
    features: [
      "3 proposals / contracts per day",
      "3 bid summaries per day",
      "Technical & financial proposals",
      "Partnership proposal support",
      "PDF & Word download",
    ],
  },
  pro: {
    name: "Pro",
    price: 500,
    proposals: 6,
    summaries: 10,
    model: "google/gemini-2.5-flash",
    features: [
      "6 proposals / contracts per day",
      "10 bid summaries per day",
      "Technical, financial & partnership",
      "Proposal Strength Checker",
      "Header/template builder",
      "PDF & Word download",
    ],
  },
  premium: {
    name: "Premium",
    price: 1500,
    proposals: 14,
    summaries: 999,
    model: "openai/gpt-5.5",
    tips: true,
    features: [
      "14 proposals / contracts per day",
      "Unlimited bid summaries",
      "Winning insider tips",
      "Proposal Strength Checker + budget analysis",
      "Premium templates & custom header builder",
      "Priority AI (highest quality)",
      "PDF & Word download",
    ],
  },
} as const;

export type PlanId = keyof typeof PLANS;

export function planLimits(plan: string) {
  if (plan === "trial") return { proposals: 1, summaries: 1, model: "google/gemini-2.5-flash-lite", tips: false };
  return (PLANS as Record<string, { proposals: number; summaries: number; model: string; tips?: boolean }>)[plan] ?? { proposals: 0, summaries: 0, model: "", tips: false };
}

