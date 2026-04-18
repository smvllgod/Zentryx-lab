// @ts-nocheck — Supabase v2 generic type resolution issue (PostgrestVersion "12")
"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/app/shell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/auth/context";
import { getSupabase } from "@/lib/supabase/client";
import { toast } from "@/components/ui/toast";

export default function SettingsPage() {
  const { user, profile, refreshProfile } = useAuth();
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setName(profile?.full_name ?? "");
  }, [profile]);

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    try {
      const { error } = await getSupabase()
        .from("profiles")
        .update({ full_name: name })
        .eq("id", user.id);
      if (error) throw error;
      await refreshProfile();
      toast.success("Profile updated.");
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppShell title="Settings">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardContent>
            <h2 className="text-sm font-700 text-gray-900">Profile</h2>
            <p className="text-xs text-gray-500 mt-1">Visible on your marketplace listings.</p>
            <form onSubmit={onSave} className="mt-5 space-y-4 max-w-md">
              <div>
                <Label htmlFor="email">Email</Label>
                <Input id="email" value={user?.email ?? ""} readOnly className="bg-gray-50 text-gray-500" />
              </div>
              <div>
                <Label htmlFor="name">Full name</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <Button type="submit" disabled={saving}>
                {saving ? "Saving…" : "Save changes"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <h3 className="text-sm font-700 text-gray-900">Account</h3>
            <div className="mt-3 space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-gray-500">Plan</span>
                <Badge tone={profile?.plan === "pro" ? "emerald" : profile?.plan === "creator" ? "purple" : "default"}>
                  {(profile?.plan ?? "free").toUpperCase()}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-500">User ID</span>
                <code className="text-xs text-gray-700">{user?.id?.slice(0, 8)}…</code>
              </div>
            </div>
            <Button asChild variant="secondary" className="mt-5 w-full">
              <a href="/billing">Manage billing</a>
            </Button>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
