"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AuthShell } from "@/app/components/AuthShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase/client";
import { toast } from "@/components/ui/toast";
import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton";

export default function SignUpPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const configured = isSupabaseConfigured();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!configured) {
      toast.error("Supabase is not configured.");
      return;
    }
    if (password.length < 8) {
      toast.error("Password must be at least 8 characters.");
      return;
    }
    setLoading(true);
    try {
      const { error } = await getSupabase().auth.signUp({
        email,
        password,
        options: {
          data: { full_name: name },
          emailRedirectTo:
            typeof window !== "undefined" ? `${window.location.origin}/overview` : undefined,
        },
      });
      if (error) throw error;
      toast.success("Account created. Check your email to confirm.");
      router.push("/onboarding");
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell
      title="Create your account"
      description="Start building MT5 Expert Advisors in minutes."
      footer={
        <>
          Already have an account? <a href="/sign-in" className="text-emerald-600 font-600">Sign in</a>
        </>
      }
    >
      <GoogleSignInButton mode="signup" redirectTo="/onboarding" />
      <div className="relative my-5">
        <div className="absolute inset-0 flex items-center" aria-hidden="true">
          <div className="w-full border-t border-gray-200" />
        </div>
        <div className="relative flex justify-center text-[10px] font-600 uppercase tracking-wider">
          <span className="bg-white px-2 text-gray-400">or with email</span>
        </div>
      </div>
      <form onSubmit={onSubmit} className="space-y-4">
        {!configured && (
          <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-700">
            Supabase env vars are missing — sign-up is disabled in this environment.
          </div>
        )}
        <div>
          <Label htmlFor="name">Full name</Label>
          <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Jane Trader" required />
        </div>
        <div>
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
        </div>
        <div>
          <Label htmlFor="password">Password</Label>
          <Input id="password" type="password" autoComplete="new-password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 8 characters" />
        </div>
        <Button type="submit" className="w-full" size="lg" disabled={loading || !configured}>
          {loading ? "Creating account…" : "Create account"}
        </Button>
        <p className="text-[11px] text-gray-400 text-center mt-2">
          By creating an account you agree to our{" "}
          <a href="/terms" className="text-gray-500 underline">Terms</a> and{" "}
          <a href="/privacy" className="text-gray-500 underline">Privacy Policy</a>.
        </p>
      </form>
    </AuthShell>
  );
}
