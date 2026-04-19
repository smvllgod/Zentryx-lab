"use client";

// ──────────────────────────────────────────────────────────────────
// /licenses  — creator + buyer surface
// ──────────────────────────────────────────────────────────────────
// Two tabs:
//   • "Issued" — licenses the user has issued (visible to creators).
//   • "Purchased" — licenses issued TO the user as a buyer.
//
// Creators can issue manually (select a strategy, set binding + expiry),
// revoke, and see per-license usage. The plaintext key appears once in
// a post-issue dialog; after closing the dialog it's gone forever.
// ──────────────────────────────────────────────────────────────────

import { useCallback, useEffect, useMemo, useState } from "react";
import { KeyRound, ShieldCheck, Copy, Trash2, RefreshCw, Plus } from "lucide-react";
import { AppShell } from "@/components/app/shell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { DateTimePicker } from "@/components/ui/calendar";
import { toast } from "@/components/ui/toast";
import { useAuth } from "@/lib/auth/context";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase/client";
import {
  issueLicense,
  listMyIssuedLicenses,
  listMyPurchasedLicenses,
  revokeLicense,
  unrevokeLicense,
} from "@/lib/licenses/client";
import type { IssueLicenseResult, LicenseRow } from "@/lib/licenses/types";
import { cn } from "@/lib/utils/cn";

type Tab = "issued" | "purchased";

interface StrategyOption {
  id: string;
  name: string;
}

export default function LicensesPage() {
  const { profile } = useAuth();
  const plan = (profile?.plan ?? "free") as "free" | "pro" | "creator";
  const isCreator = plan === "creator" || (profile as { role?: string } | null)?.role === "admin";

  const [tab, setTab] = useState<Tab>(isCreator ? "issued" : "purchased");
  const [issued, setIssued] = useState<LicenseRow[]>([]);
  const [purchased, setPurchased] = useState<LicenseRow[]>([]);
  const [strategies, setStrategies] = useState<StrategyOption[]>([]);
  const [loading, setLoading] = useState(true);

  const [newOpen, setNewOpen] = useState(false);
  const [revealed, setRevealed] = useState<IssueLicenseResult | null>(null);

  const reload = useCallback(async () => {
    if (!isSupabaseConfigured()) return;
    setLoading(true);
    try {
      const [iss, pur] = await Promise.all([
        listMyIssuedLicenses({ limit: 200 }),
        listMyPurchasedLicenses(),
      ]);
      setIssued(iss);
      setPurchased(pur);
    } catch (err) {
      toast.error("Failed to load: " + (err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void reload(); }, [reload]);

  useEffect(() => {
    (async () => {
      if (!isSupabaseConfigured()) return;
      const s = getSupabase();
      const { data } = await s
        .from("strategies")
        .select("id,name")
        .order("updated_at", { ascending: false })
        .limit(100);
      setStrategies(((data ?? []) as unknown as StrategyOption[]).map((d) => ({ id: d.id, name: d.name })));
    })();
  }, []);

  const activeRows = tab === "issued" ? issued : purchased;

  return (
    <AppShell
      title="Licenses"
      actions={
        <div className="flex items-center gap-2">
          <Button size="sm" variant="ghost" onClick={reload}>
            <RefreshCw size={14} /> Refresh
          </Button>
          {isCreator && (
            <Button size="sm" onClick={() => setNewOpen(true)}>
              <Plus size={14} /> Issue license
            </Button>
          )}
        </div>
      }
    >
      {/* Tabs */}
      <div className="flex items-center gap-1 mb-5 border-b border-gray-100">
        <TabButton active={tab === "issued"} onClick={() => setTab("issued")}>
          Issued by me <span className="ml-1.5 text-[10px] text-gray-400">({issued.length})</span>
        </TabButton>
        <TabButton active={tab === "purchased"} onClick={() => setTab("purchased")}>
          Issued to me <span className="ml-1.5 text-[10px] text-gray-400">({purchased.length})</span>
        </TabButton>
      </div>

      <Card>
        <CardContent>
          {loading ? (
            <div className="py-12 text-center text-sm text-gray-400">Loading…</div>
          ) : activeRows.length === 0 ? (
            <EmptyState
              icon={<KeyRound size={20} />}
              title={tab === "issued" ? "No licenses issued yet" : "You haven't received any licenses"}
              description={tab === "issued"
                ? "Issue a license to distribute a protected EA to a specific MT5 account."
                : "When a creator issues a license to you, it'll appear here with the key and binding details."}
            />
          ) : (
            <LicenseList
              rows={activeRows}
              canRevoke={tab === "issued"}
              onReload={reload}
            />
          )}
        </CardContent>
      </Card>

      <IssueDialog
        open={newOpen}
        onOpenChange={setNewOpen}
        strategies={strategies}
        onIssued={(r) => {
          setRevealed(r);
          setNewOpen(false);
          void reload();
        }}
      />

      <RevealDialog revealed={revealed} onClose={() => setRevealed(null)} />
    </AppShell>
  );
}

// ── List ──────────────────────────────────────────────────────────

function LicenseList({ rows, canRevoke, onReload }: { rows: LicenseRow[]; canRevoke: boolean; onReload: () => void }) {
  return (
    <ul className="divide-y divide-gray-100">
      {rows.map((r) => (
        <LicenseRowView key={r.id} row={r} canRevoke={canRevoke} onReload={onReload} />
      ))}
    </ul>
  );
}

function LicenseRowView({ row, canRevoke, onReload }: { row: LicenseRow; canRevoke: boolean; onReload: () => void }) {
  async function handleRevoke() {
    const reason = window.prompt("Reason for revoking (shown to the EA):", "Key revoked by issuer.");
    if (reason === null) return;
    try {
      await revokeLicense(row.id, reason);
      toast.success("License revoked");
      onReload();
    } catch (err) {
      toast.error("Revoke failed: " + (err as Error).message);
    }
  }

  async function handleUnrevoke() {
    try {
      await unrevokeLicense(row.id);
      toast.success("License re-activated");
      onReload();
    } catch (err) {
      toast.error("Failed: " + (err as Error).message);
    }
  }

  const status = row.revoked
    ? { tone: "red" as const, label: "Revoked" }
    : row.expires_at && new Date(row.expires_at).getTime() < Date.now()
      ? { tone: "amber" as const, label: "Expired" }
      : { tone: "emerald" as const, label: "Active" };

  return (
    <li className="py-4 flex items-start gap-4">
      <div className="w-9 h-9 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center shrink-0">
        <ShieldCheck size={16} className="text-emerald-600" />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <code className="text-sm font-700 text-gray-900 font-mono">{row.key_prefix}-••••-••••-••••</code>
          <Badge tone={status.tone}>{status.label}</Badge>
        </div>
        <div className="text-xs text-gray-500 mt-1 space-x-3 flex flex-wrap gap-y-0.5">
          {row.label && <span><strong className="text-gray-700">{row.label}</strong></span>}
          {row.buyer_email && <span>Buyer: {row.buyer_email}</span>}
          {row.bound_account != null && <span>Account: {row.bound_account}</span>}
          {row.bound_broker && <span>Broker: {row.bound_broker}</span>}
          {row.expires_at && <span>Expires: {new Date(row.expires_at).toISOString().slice(0, 10)}</span>}
          {row.max_activations != null && <span>Max: {row.max_activations}</span>}
        </div>
        {row.revoke_reason && <div className="text-[11px] text-red-600 mt-1">Revoke reason: {row.revoke_reason}</div>}
      </div>

      {canRevoke && (
        <div className="flex items-center gap-1.5 shrink-0">
          {row.revoked ? (
            <Button size="sm" variant="secondary" onClick={handleUnrevoke}>Re-activate</Button>
          ) : (
            <Button size="sm" variant="ghost" onClick={handleRevoke}>
              <Trash2 size={14} /> Revoke
            </Button>
          )}
        </div>
      )}
    </li>
  );
}

// ── Issue dialog ──────────────────────────────────────────────────

function IssueDialog({
  open,
  onOpenChange,
  strategies,
  onIssued,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  strategies: StrategyOption[];
  onIssued: (r: IssueLicenseResult) => void;
}) {
  const [strategyId, setStrategyId] = useState("");
  const [buyerEmail, setBuyerEmail] = useState("");
  const [label, setLabel] = useState("");
  const [boundAccount, setBoundAccount] = useState("");
  const [boundBroker, setBoundBroker] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [maxActivations, setMaxActivations] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open && strategies[0]) setStrategyId(strategies[0].id);
  }, [open, strategies]);

  async function submit() {
    if (!strategyId) { toast.error("Pick a strategy"); return; }
    setBusy(true);
    try {
      const r = await issueLicense({
        strategy_id: strategyId,
        buyer_email: buyerEmail || undefined,
        label: label || undefined,
        bound_account: boundAccount ? Number(boundAccount) : undefined,
        bound_broker: boundBroker || undefined,
        expires_at: expiresAt || undefined,
        max_activations: maxActivations ? Number(maxActivations) : undefined,
      });
      toast.success("License issued");
      onIssued(r);
    } catch (err) {
      toast.error("Failed: " + (err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Issue a license</DialogTitle>
          <DialogDescription>
            The plaintext key will be shown once after creation. Copy it before closing — we don&apos;t store it.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <label className="text-[10px] font-700 uppercase tracking-wider text-gray-500">Strategy</label>
            <select
              value={strategyId}
              onChange={(e) => setStrategyId(e.target.value)}
              className="mt-1 h-9 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm"
            >
              <option value="">Choose a strategy…</option>
              {strategies.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Buyer email (optional)">
              <Input value={buyerEmail} onChange={(e) => setBuyerEmail(e.target.value)} placeholder="alice@example.com" />
            </Field>
            <Field label="Label (internal)">
              <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Manual — alice@..." />
            </Field>
            <Field label="MT5 account (optional)">
              <Input value={boundAccount} onChange={(e) => setBoundAccount(e.target.value)} placeholder="12345678" inputMode="numeric" />
            </Field>
            <Field label="Broker substring">
              <Input value={boundBroker} onChange={(e) => setBoundBroker(e.target.value)} placeholder="IC Markets" />
            </Field>
            <Field label="Expires at (UTC)">
              <DateTimePicker
                value={expiresAt}
                onChange={setExpiresAt}
                minDate={new Date()}
                placeholder="Never expires"
              />
            </Field>
            <Field label="Max activations">
              <Input value={maxActivations} onChange={(e) => setMaxActivations(e.target.value)} placeholder="Unlimited" inputMode="numeric" />
            </Field>
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={busy}>Cancel</Button>
          <Button onClick={submit} disabled={busy}>{busy ? "Issuing…" : "Issue license"}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Reveal dialog — plaintext key displayed once ──────────────────

function RevealDialog({ revealed, onClose }: { revealed: IssueLicenseResult | null; onClose: () => void }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    if (!revealed) return;
    await navigator.clipboard.writeText(revealed.key);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  return (
    <Dialog open={revealed !== null} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>License key ready</DialogTitle>
          <DialogDescription>
            Copy this now — once you close this dialog, the plaintext is gone. The buyer pastes it into
            <code className="mx-1 px-1 bg-gray-100 rounded text-xs">InpLicenseKey</code> in the EA inputs.
          </DialogDescription>
        </DialogHeader>
        <div className="flex items-center gap-2">
          <code className="flex-1 font-mono text-sm text-gray-900 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 tracking-wider break-all">
            {revealed?.key ?? ""}
          </code>
          <Button size="sm" onClick={copy}>
            <Copy size={14} /> {copied ? "Copied" : "Copy"}
          </Button>
        </div>
        {revealed && (
          <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1 text-xs text-gray-500">
            {revealed.bound_account != null && (<><dt>Bound account</dt><dd className="text-gray-900 font-mono">{revealed.bound_account}</dd></>)}
            {revealed.bound_broker && (<><dt>Bound broker</dt><dd className="text-gray-900">{revealed.bound_broker}</dd></>)}
            {revealed.expires_at && (<><dt>Expires at</dt><dd className="text-gray-900">{new Date(revealed.expires_at).toISOString().slice(0, 16)}</dd></>)}
          </dl>
        )}
        <div className="flex items-center justify-end pt-2">
          <Button variant="ghost" onClick={onClose}>Done</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Small helpers ─────────────────────────────────────────────────

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-[10px] font-700 uppercase tracking-wider text-gray-500">{label}</label>
      <div className="mt-1">{children}</div>
    </div>
  );
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "h-9 px-3 text-sm border-b-2 -mb-px transition-colors",
        active ? "border-emerald-500 text-gray-900 font-600" : "border-transparent text-gray-500 hover:text-gray-800",
      )}
    >
      {children}
    </button>
  );
}
