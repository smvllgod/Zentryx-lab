"use client";

import { useEffect, useState } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { DataTable } from "@/components/admin/DataTable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/select";
import { ActionMenu } from "@/components/admin/ActionMenu";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { Ban, UserCheck, Shield, Crown, Download, ExternalLink } from "lucide-react";
import { listUsers, setUserSuspended, setUserPlan, setUserRole, bulkSetUserSuspended, bulkSetUserPlan, type AdminUserRow } from "@/lib/admin/queries";
import { toast } from "@/components/ui/toast";
import { formatRelative } from "@/lib/utils/format";
import { downloadCsv } from "@/lib/admin/csv";

export default function AdminUsersPage() {
  const [query, setQuery] = useState("");
  const [plan, setPlan] = useState("");
  const [rows, setRows] = useState<AdminUserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const [confirm, setConfirm] = useState<null | {
    title: string;
    body: React.ReactNode;
    run: () => Promise<void>;
    destructive?: boolean;
  }>(null);

  async function reload() {
    setLoading(true);
    try {
      const r = await listUsers({ query, plan: plan || undefined, limit: 200 });
      setRows(r);
      setSelected(new Set());
    } catch (err) {
      toast.error("Failed: " + (err as Error).message);
    } finally { setLoading(false); }
  }

  useEffect(() => { void reload(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [plan]);

  function ask(cfg: typeof confirm) { setConfirm(cfg); }

  return (
    <AdminShell
      title="Users"
      subtitle={`${rows.length} shown${selected.size ? ` · ${selected.size} selected` : ""}`}
      breadcrumbs={[{ label: "Admin", href: "/admin" }, { label: "Users" }]}
      actions={
        <div className="flex items-center gap-2">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && reload()}
            placeholder="Search email or name…"
            className="h-8 w-56 rounded-lg border border-gray-200 bg-white px-3 text-xs text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-emerald-300 focus:ring-1 focus:ring-emerald-300"
          />
          <NativeSelect value={plan} onChange={(e) => setPlan(e.target.value)}>
            <option value="">All plans</option>
            <option value="free">Free</option>
            <option value="pro">Pro</option>
            <option value="creator">Creator</option>
          </NativeSelect>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => downloadCsv("users.csv", rows, [
              { key: "id", header: "Id" },
              { key: "email", header: "Email" },
              { key: "full_name", header: "Name" },
              { key: "plan", header: "Plan" },
              { key: "role", header: "Role" },
              { key: "suspended", header: "Suspended" },
              { key: "created_at", header: "Created" },
            ])}
          >
            <Download size={12} /> CSV
          </Button>
          <Button size="sm" variant="secondary" onClick={reload}>Refresh</Button>
        </div>
      }
    >
      <DataTable
        rows={rows}
        rowKey={(u) => u.id}
        loading={loading}
        selectable
        selectedIds={selected}
        onSelectionChange={setSelected}
        empty="No users match the filter."
        toolbar={<span>{rows.length} users shown</span>}
        bulkActions={
          <>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => ask({
                title: `Suspend ${selected.size} users?`,
                body: "They won't be able to sign in or use their strategies until reactivated.",
                destructive: true,
                run: async () => {
                  try { await bulkSetUserSuspended(Array.from(selected), true); toast.success("Suspended"); await reload(); }
                  catch (e) { toast.error("Failed: " + (e as Error).message); }
                },
              })}
            >
              <Ban size={12} /> Suspend
            </Button>
            <NativeSelect
              onChange={(e) => {
                const v = e.target.value as "" | "free" | "pro" | "creator";
                if (!v) return;
                ask({
                  title: `Change plan → ${v} for ${selected.size} users?`,
                  body: "Plan change takes effect immediately.",
                  destructive: false,
                  run: async () => {
                    try { await bulkSetUserPlan(Array.from(selected), v); toast.success(`Plan → ${v}`); await reload(); }
                    catch (err) { toast.error("Failed: " + (err as Error).message); }
                  },
                });
                e.currentTarget.value = "";
              }}
            >
              <option value="">Change plan…</option>
              <option value="free">Free</option>
              <option value="pro">Pro</option>
              <option value="creator">Creator</option>
            </NativeSelect>
            <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>Clear</Button>
          </>
        }
        columns={[
          {
            header: "User",
            render: (u) => (
              <div className="min-w-0">
                <a href={`/admin/users/${u.id}`} className="text-sm font-600 text-gray-900 hover:text-emerald-600 truncate block">
                  {u.full_name || u.email}
                </a>
                <div className="text-[10px] text-gray-400 truncate">{u.email}</div>
              </div>
            ),
          },
          { header: "Plan", width: "110px", render: (u) => (
            <Badge tone={u.plan === "creator" ? "purple" : u.plan === "pro" ? "emerald" : "default"}>{u.plan}</Badge>
          ) },
          { header: "Role", width: "90px", render: (u) => (
            <Badge tone={u.role === "admin" ? "red" : u.role === "staff" ? "amber" : "slate"}>{u.role}</Badge>
          ) },
          { header: "Status", width: "100px", render: (u) => u.suspended
            ? <Badge tone="red">suspended</Badge>
            : <Badge tone="emerald">active</Badge> },
          { header: "Joined", width: "130px", hideOnSmall: true, render: (u) => <span className="text-xs text-gray-500">{formatRelative(u.created_at)}</span> },
          { header: "", width: "60px", align: "right", render: (u) => (
            <ActionMenu
              groups={[
                { title: "Navigate", items: [
                  { label: "Open user", href: `/admin/users/${u.id}`, icon: <ExternalLink size={12} /> },
                ] },
                { title: "Plan", items: [
                  { label: "Set plan: Free",    onClick: () => ask({ title: "Downgrade to Free?", body: <>User will lose access to Pro/Creator features.</>, destructive: true, run: async () => { await setUserPlan(u.id, "free"); toast.success("Plan → free"); reload(); } }) },
                  { label: "Set plan: Pro",     onClick: () => ask({ title: "Upgrade to Pro?", body: <>Pro plan will be granted immediately.</>, destructive: false, run: async () => { await setUserPlan(u.id, "pro"); toast.success("Plan → pro"); reload(); } }) },
                  { label: "Set plan: Creator", onClick: () => ask({ title: "Upgrade to Creator?", body: <>Creator plan + marketplace privileges.</>, destructive: false, run: async () => { await setUserPlan(u.id, "creator"); toast.success("Plan → creator"); reload(); } }) },
                ] },
                { title: "Role", items: [
                  { label: "Set role: User",  icon: <UserCheck size={12} />, onClick: () => ask({ title: "Demote to user?", body: "This user will lose all staff/admin access.", destructive: true, run: async () => { await setUserRole(u.id, "user"); toast.success("Role → user"); reload(); } }) },
                  { label: "Set role: Staff", icon: <Shield size={12} />, onClick: () => ask({ title: "Promote to staff?", body: "Staff can read admin pages but not change system settings.", destructive: false, run: async () => { await setUserRole(u.id, "staff"); toast.success("Role → staff"); reload(); } }) },
                  { label: "Set role: Admin", icon: <Crown size={12} />, onClick: () => ask({ title: "Promote to admin?", body: "Admin has full control of the platform.", destructive: false, run: async () => { await setUserRole(u.id, "admin"); toast.success("Role → admin"); reload(); } }) },
                ] },
                { title: "Account", items: [
                  u.suspended
                    ? { label: "Reactivate", icon: <UserCheck size={12} />, onClick: () => ask({ title: "Reactivate account?", body: "User can sign in again.", destructive: false, run: async () => { await setUserSuspended(u.id, false); toast.success("Reactivated"); reload(); } }) }
                    : { label: "Suspend",    icon: <Ban size={12} />,       destructive: true, onClick: () => ask({ title: "Suspend account?", body: "User will be unable to sign in until reactivated.", destructive: true, run: async () => { await setUserSuspended(u.id, true); toast.success("Suspended"); reload(); } }) },
                ] },
              ]}
            />
          ) },
        ]}
      />

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
