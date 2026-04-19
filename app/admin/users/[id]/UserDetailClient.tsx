"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { AdminShell } from "@/components/admin/AdminShell";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/select";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import {
  getUserDetail,
  setUserRole,
  setUserSuspended,
  setUserPlan,
} from "@/lib/admin/queries";
import { toast } from "@/components/ui/toast";
import { formatRelative } from "@/lib/utils/format";
import type { Tables } from "@/lib/supabase/types";

export default function UserDetailClient() {
  // Read the real id from the URL. Static export builds a single "_"
  // placeholder for /admin/users/[id]/ and Netlify rewrites every
  // concrete id to it — the build-time param would always be "_", so
  // parse the current pathname instead.
  const pathname = usePathname();
  const id = pathname?.split("/").filter(Boolean).pop() ?? "";
  const [data, setData] = useState<{
    profile: Tables<"profiles"> | null;
    subscriptions: Tables<"subscriptions">[];
    strategies: { id: string; name: string; status: string; created_at: string; updated_at: string }[];
    exports: { id: string; filename: string; created_at: string }[];
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [confirm, setConfirm] = useState<null | { title: string; body: React.ReactNode; run: () => Promise<void>; destructive?: boolean }>(null);

  async function reload() {
    setLoading(true);
    try { setData(await getUserDetail(id)); }
    finally { setLoading(false); }
  }
  useEffect(() => { void reload(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [id]);

  if (loading || !data || !data.profile) {
    return (
      <AdminShell title="User" breadcrumbs={[{ label: "Admin", href: "/admin" }, { label: "Users", href: "/admin/users" }, { label: "Loading…" }]}>
        <div className="text-sm text-gray-400 py-12 text-center">Loading…</div>
      </AdminShell>
    );
  }

  const { profile, subscriptions, strategies, exports } = data;

  return (
    <AdminShell
      title={profile.full_name || profile.email}
      subtitle={profile.email}
      breadcrumbs={[{ label: "Admin", href: "/admin" }, { label: "Users", href: "/admin/users" }, { label: profile.full_name || profile.email }]}
      actions={<Button variant="secondary" size="sm" onClick={reload}>Refresh</Button>}
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card>
          <CardContent>
            <h3 className="text-sm font-700 text-gray-900">Profile</h3>
            <div className="mt-3 space-y-2 text-sm">
              <Row label="Email" value={profile.email} />
              <Row label="Name" value={profile.full_name ?? "—"} />
              <Row label="User ID" value={<code className="text-[10px] text-gray-400">{profile.id}</code>} />
              <Row label="Joined" value={formatRelative(profile.created_at)} />
              <Row label="Status" value={profile.suspended ? <Badge tone="red">suspended</Badge> : <Badge tone="emerald">active</Badge>} />
              <Row label="Plan" value={
                <NativeSelect
                  value={profile.plan}
                  onChange={(e) => {
                    const v = e.target.value as "free" | "pro" | "creator";
                    setConfirm({
                      title: `Plan → ${v}?`,
                      body: "Plan change is immediate and audited.",
                      destructive: v === "free",
                      run: async () => { await setUserPlan(profile.id, v); toast.success(`Plan → ${v}`); await reload(); },
                    });
                  }}
                >
                  <option value="free">Free</option>
                  <option value="pro">Pro</option>
                  <option value="creator">Creator</option>
                </NativeSelect>
              } />
              <Row label="Role" value={
                <NativeSelect
                  value={profile.role}
                  onChange={(e) => {
                    const v = e.target.value as "user" | "staff" | "admin";
                    setConfirm({
                      title: `Role → ${v}?`,
                      body: v === "user"
                        ? "This user will lose all staff/admin access."
                        : v === "admin"
                        ? "Admin has full platform control — including access to this page."
                        : "Staff can read admin pages but not change system settings.",
                      destructive: v === "user" && profile.role !== "user",
                      run: async () => { await setUserRole(profile.id, v); toast.success(`Role → ${v}`); await reload(); },
                    });
                  }}
                >
                  <option value="user">user</option>
                  <option value="staff">staff</option>
                  <option value="admin">admin</option>
                </NativeSelect>
              } />
            </div>
            <div className="mt-4 flex gap-2">
              <Button
                size="sm"
                variant={profile.suspended ? "primary" : "destructive"}
                onClick={() => {
                  const suspending = !profile.suspended;
                  setConfirm({
                    title: suspending ? "Suspend account?" : "Reactivate account?",
                    body: suspending ? "User will be unable to sign in until reactivated." : "User can sign in again.",
                    destructive: suspending,
                    run: async () => { await setUserSuspended(profile.id, suspending); toast.success(suspending ? "Suspended" : "Reactivated"); await reload(); },
                  });
                }}
              >
                {profile.suspended ? "Reactivate" : "Suspend"}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardContent>
            <h3 className="text-sm font-700 text-gray-900">Subscriptions</h3>
            {subscriptions.length === 0 ? (
              <div className="text-xs text-gray-400 py-4">No subscriptions on record.</div>
            ) : (
              <ul className="mt-3 divide-y divide-gray-100">
                {subscriptions.map((s) => (
                  <li key={s.id} className="py-2 flex items-center justify-between">
                    <div>
                      <div className="text-sm text-gray-900 font-600">{s.plan}</div>
                      <div className="text-[10px] text-gray-400">{s.stripe_subscription_id ?? "no Stripe id"}</div>
                    </div>
                    <Badge tone={s.status === "active" ? "emerald" : s.status === "past_due" ? "red" : "slate"}>{s.status}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
        <Card>
          <CardContent>
            <h3 className="text-sm font-700 text-gray-900">Strategies ({strategies.length})</h3>
            {strategies.length === 0 ? (
              <div className="text-xs text-gray-400 py-4">None.</div>
            ) : (
              <ul className="mt-3 divide-y divide-gray-100">
                {strategies.slice(0, 10).map((st) => (
                  <li key={st.id} className="py-2 flex items-center justify-between">
                    <div className="min-w-0">
                      <a href={`/admin/strategies/${st.id}`} className="text-sm text-gray-900 font-600 truncate block hover:text-emerald-600">{st.name}</a>
                      <div className="text-[10px] text-gray-400">updated {formatRelative(st.updated_at)}</div>
                    </div>
                    <Badge tone={st.status === "published" ? "purple" : st.status === "exported" ? "emerald" : "slate"}>{st.status}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <h3 className="text-sm font-700 text-gray-900">Recent exports ({exports.length})</h3>
            {exports.length === 0 ? (
              <div className="text-xs text-gray-400 py-4">None.</div>
            ) : (
              <ul className="mt-3 divide-y divide-gray-100">
                {exports.map((e) => (
                  <li key={e.id} className="py-2 flex items-center justify-between">
                    <div className="text-sm text-gray-900 truncate">{e.filename}</div>
                    <div className="text-[10px] text-gray-400">{formatRelative(e.created_at)}</div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <ConfirmDialog
        open={!!confirm}
        onOpenChange={(v) => !v && setConfirm(null)}
        title={confirm?.title ?? ""}
        body={confirm?.body ?? ""}
        destructive={confirm?.destructive}
        onConfirm={async () => { if (confirm) await confirm.run(); setConfirm(null); }}
      />
    </AdminShell>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-[10px] font-600 uppercase tracking-wider text-gray-400 shrink-0">{label}</span>
      <span className="text-right min-w-0 truncate">{value}</span>
    </div>
  );
}
