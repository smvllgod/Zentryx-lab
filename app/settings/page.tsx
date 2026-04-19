// @ts-nocheck — Supabase v2 generic type resolution issue (PostgrestVersion "12")
"use client";

import { useEffect, useRef, useState } from "react";
import { ExternalLink, Upload, User, AtSign, FileText, Eye, EyeOff, Loader2 } from "lucide-react";
import { AppShell } from "@/components/app/shell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/auth/context";
import { toast } from "@/components/ui/toast";
import { updateMyProfile, uploadAvatar, fetchCreatorStats, type CreatorStats } from "@/lib/profiles/client";
import { TrustBadge } from "@/components/profiles/TrustBadge";

export default function SettingsPage() {
  const { user, profile, refreshProfile } = useAuth();
  const [fullName, setFullName] = useState("");
  const [alias, setAlias] = useState("");
  const [bio, setBio] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [stats, setStats] = useState<CreatorStats | null>(null);

  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setFullName(profile?.full_name ?? "");
    setAlias(profile?.alias ?? "");
    setBio(profile?.bio ?? "");
    setIsPublic(profile?.is_public ?? true);
    setAvatarUrl(profile?.avatar_url ?? null);
  }, [profile]);

  useEffect(() => {
    if (!user) return;
    let alive = true;
    void fetchCreatorStats(user.id).then((s) => { if (alive) setStats(s); });
    return () => { alive = false; };
  }, [user]);

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    try {
      await updateMyProfile({
        full_name: fullName.trim() || null,
        alias: alias.trim() || null,
        bio: bio.trim() || null,
        is_public: isPublic,
      });
      await refreshProfile();
      toast.success("Profile updated.");
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function onAvatarPick(file: File | null) {
    if (!file || !user) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Image too large (max 2 MB).");
      return;
    }
    setUploading(true);
    try {
      const url = await uploadAvatar(file);
      setAvatarUrl(url);
      await updateMyProfile({ avatar_url: url });
      await refreshProfile();
      toast.success("Avatar updated.");
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setUploading(false);
    }
  }

  const displayName = alias.trim() || fullName.trim() || (user?.email ? user.email.split("@")[0] : "Creator");

  return (
    <AppShell title="Settings">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardContent>
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-sm font-700 text-gray-900">Creator profile</h2>
                <p className="text-xs text-gray-500 mt-1">Shown on the marketplace, community, and your public page at <code className="text-[10px] bg-gray-100 rounded px-1 py-0.5">/creator/{user?.id?.slice(0, 8)}…</code></p>
              </div>
              {user && (
                <Button asChild variant="secondary" size="sm">
                  <a href={`/creator/${user.id}`} target="_blank" rel="noreferrer noopener">
                    <ExternalLink size={12} /> View public page
                  </a>
                </Button>
              )}
            </div>

            {/* Avatar */}
            <div className="mt-5 flex items-center gap-4">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-100 to-emerald-200 flex items-center justify-center overflow-hidden border border-gray-100 shrink-0">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <User size={28} className="text-emerald-600" />
                )}
              </div>
              <div>
                <div className="text-sm font-700 text-gray-900">{displayName}</div>
                <div className="text-[11px] text-gray-500 mt-0.5">JPG, PNG, or WEBP · max 2 MB</div>
                <div className="mt-2 flex items-center gap-2">
                  <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => onAvatarPick(e.target.files?.[0] ?? null)} />
                  <Button size="sm" variant="secondary" onClick={() => fileRef.current?.click()} disabled={uploading}>
                    {uploading ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />}
                    {uploading ? "Uploading…" : "Upload avatar"}
                  </Button>
                  {avatarUrl && (
                    <Button size="sm" variant="ghost" onClick={async () => {
                      setAvatarUrl(null);
                      try { await updateMyProfile({ avatar_url: null }); await refreshProfile(); toast.success("Avatar removed."); }
                      catch (err) { toast.error((err as Error).message); }
                    }}>Remove</Button>
                  )}
                </div>
              </div>
            </div>

            <form onSubmit={onSave} className="mt-6 space-y-4 max-w-lg">
              <div>
                <Label htmlFor="email">Email</Label>
                <Input id="email" value={user?.email ?? ""} readOnly className="bg-gray-50 text-gray-500" />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="full_name"><User size={11} className="inline-block mr-1 -mt-0.5 text-gray-400" />Full name</Label>
                  <Input id="full_name" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Alice Trader" />
                </div>
                <div>
                  <Label htmlFor="alias"><AtSign size={11} className="inline-block mr-1 -mt-0.5 text-gray-400" />Alias / handle</Label>
                  <Input id="alias" value={alias} onChange={(e) => setAlias(e.target.value)} placeholder="alicetrades" />
                </div>
              </div>

              <div>
                <Label htmlFor="bio"><FileText size={11} className="inline-block mr-1 -mt-0.5 text-gray-400" />Bio</Label>
                <Textarea id="bio" value={bio} onChange={(e) => setBio(e.target.value)} maxLength={500} placeholder="Scalper, prop-firm trader, system builder. XAU + majors." />
                <div className="text-[10px] text-gray-400 mt-1 text-right">{bio.length} / 500</div>
              </div>

              <div className="rounded-xl border border-gray-200 bg-gray-50/40 p-3 flex items-start gap-3">
                <button type="button" onClick={() => setIsPublic((v) => !v)} className="mt-0.5 shrink-0">
                  {isPublic ? <Eye size={16} className="text-emerald-600" /> : <EyeOff size={16} className="text-gray-400" />}
                </button>
                <div className="flex-1 text-xs">
                  <label className="font-700 text-gray-900 cursor-pointer" onClick={() => setIsPublic((v) => !v)}>
                    Public creator profile
                  </label>
                  <p className="text-gray-500 mt-0.5 leading-snug">
                    {isPublic
                      ? "Your profile, listings, and activity are visible to everyone — including on the community leaderboard."
                      : "Your profile is hidden. Listings still show up in the marketplace but link to a generic card with no link to your profile."}
                  </p>
                </div>
              </div>

              <Button type="submit" disabled={saving}>
                {saving ? "Saving…" : "Save changes"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="space-y-4">
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

          {stats && (
            <Card>
              <CardContent>
                <h3 className="text-sm font-700 text-gray-900">Your trust level</h3>
                <div className="mt-3">
                  <TrustBadge level={stats.trust_level} size="md" />
                </div>
                <dl className="mt-4 space-y-1.5 text-[11px]">
                  <Stat label="Trust score" value={stats.trust_score} />
                  <Stat label="Listings published" value={stats.listing_count} />
                  <Stat label="Total sales" value={stats.sales_count} />
                  <Stat label="Reviews received" value={stats.reviews_received} />
                  <Stat label="Avg rating" value={stats.avg_rating > 0 ? stats.avg_rating.toFixed(2) : "—"} />
                  <Stat label="Account age" value={`${stats.account_age_days} day${stats.account_age_days === 1 ? "" : "s"}`} />
                </dl>
                <p className="mt-4 text-[10px] text-gray-400 leading-snug">
                  Trust level climbs with sales, steady listings, positive reviews, and account age. Full formula in the docs.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </AppShell>
  );
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-gray-500">{label}</span>
      <span className="font-600 text-gray-900">{value}</span>
    </div>
  );
}
