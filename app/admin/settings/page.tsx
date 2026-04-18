"use client";

import { useEffect, useState } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { listSettings, updateSetting } from "@/lib/admin/queries";
import { toast } from "@/components/ui/toast";
import type { Tables, Json } from "@/lib/supabase/types";
import { cn } from "@/lib/utils/cn";

type SettingRow = Tables<"system_settings">;

interface MaintenanceValue { enabled: boolean; message: string; }
interface AnnouncementValue { enabled: boolean; body: string; tone: "info" | "warn" | "success"; }
interface PricingValue { free: number; pro: number; creator: number; }
interface LicensingValue { grace_mode: boolean; server: string; }

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<Record<string, Json>>({});
  const [loading, setLoading] = useState(true);

  async function reload() {
    setLoading(true);
    try {
      const rows = (await listSettings()) as SettingRow[];
      const map: Record<string, Json> = {};
      for (const r of rows) map[r.key] = r.value;
      setSettings(map);
    } finally { setLoading(false); }
  }
  useEffect(() => { void reload(); }, []);

  async function save(key: string, value: Json) {
    try {
      await updateSetting(key, value);
      toast.success(`${key} saved`);
      void reload();
    } catch (err) {
      toast.error("Failed: " + (err as Error).message);
    }
  }

  const maintenance = (settings.maintenance as unknown as MaintenanceValue | undefined) ?? { enabled: false, message: "" };
  const announcement = (settings.announcement as unknown as AnnouncementValue | undefined) ?? { enabled: false, body: "", tone: "info" };
  const pricing = (settings.pricing as unknown as PricingValue | undefined) ?? { free: 0, pro: 29, creator: 79 };
  const licensing = (settings.licensing_defaults as unknown as LicensingValue | undefined) ?? { grace_mode: true, server: "" };

  return (
    <AdminShell
      title="System settings"
      subtitle="Product-wide toggles, pricing, licensing defaults."
      actions={<Button variant="secondary" size="sm" onClick={reload}>Refresh</Button>}
    >
      {loading && <div className="text-xs text-gray-400 text-center py-6">Loading…</div>}

      {!loading && (
        <div className="space-y-4">
          {/* Maintenance */}
          <Card>
            <CardContent>
              <h3 className="text-sm font-700 text-gray-900 mb-3">Maintenance mode</h3>
              <div className="flex items-center gap-4 mb-3">
                <Toggle
                  checked={maintenance.enabled}
                  onChange={(v) => save("maintenance", { ...maintenance, enabled: v } as unknown as Json)}
                />
                <span className="text-sm text-gray-600">
                  {maintenance.enabled ? "Maintenance mode is ACTIVE — app will show a banner." : "Normal operation."}
                </span>
              </div>
              <Label>Message</Label>
              <Input
                value={maintenance.message}
                onChange={(e) => setSettings((s) => ({ ...s, maintenance: { ...maintenance, message: e.target.value } }))}
                placeholder="e.g. Zentryx Lab is undergoing maintenance…"
              />
              <div className="mt-3">
                <Button size="sm" onClick={() => save("maintenance", maintenance as unknown as Json)}>Save message</Button>
              </div>
            </CardContent>
          </Card>

          {/* Announcement banner */}
          <Card>
            <CardContent>
              <h3 className="text-sm font-700 text-gray-900 mb-3">Announcement banner</h3>
              <div className="flex items-center gap-4 mb-3">
                <Toggle
                  checked={announcement.enabled}
                  onChange={(v) => save("announcement", { ...announcement, enabled: v } as unknown as Json)}
                />
                <span className="text-sm text-gray-600">
                  {announcement.enabled ? "Banner is showing to everyone." : "No banner."}
                </span>
              </div>
              <Label>Body (markdown OK)</Label>
              <Input
                value={announcement.body}
                onChange={(e) => setSettings((s) => ({ ...s, announcement: { ...announcement, body: e.target.value } }))}
                placeholder="e.g. New Donchian breakout block is live!"
              />
              <Label className="mt-3">Tone</Label>
              <div className="flex gap-2 mt-1">
                {(["info", "warn", "success"] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setSettings((s) => ({ ...s, announcement: { ...announcement, tone: t } }))}
                    className={cn(
                      "text-xs font-600 rounded-lg px-3 py-1.5 border",
                      announcement.tone === t
                        ? "bg-emerald-50 border-emerald-300 text-emerald-700"
                        : "bg-white border-gray-200 text-gray-500 hover:border-gray-300",
                    )}
                  >
                    {t}
                  </button>
                ))}
              </div>
              <div className="mt-3">
                <Button size="sm" onClick={() => save("announcement", announcement as unknown as Json)}>Save banner</Button>
              </div>
            </CardContent>
          </Card>

          {/* Pricing */}
          <Card>
            <CardContent>
              <h3 className="text-sm font-700 text-gray-900 mb-3">Pricing (display only)</h3>
              <p className="text-xs text-gray-500 mb-3">
                These values are shown on the billing page. Stripe prices must be updated separately.
              </p>
              <div className="grid grid-cols-3 gap-3">
                {(["free", "pro", "creator"] as const).map((tier) => (
                  <div key={tier}>
                    <Label className="capitalize">{tier} (USD / mo)</Label>
                    <Input
                      type="number"
                      value={pricing[tier]}
                      onChange={(e) =>
                        setSettings((s) => ({ ...s, pricing: { ...pricing, [tier]: Number(e.target.value) } }))
                      }
                    />
                  </div>
                ))}
              </div>
              <div className="mt-3">
                <Button size="sm" onClick={() => save("pricing", pricing as unknown as Json)}>Save pricing</Button>
              </div>
            </CardContent>
          </Card>

          {/* Licensing */}
          <Card>
            <CardContent>
              <h3 className="text-sm font-700 text-gray-900 mb-3">Licensing export defaults</h3>
              <Label>License server</Label>
              <Input
                value={licensing.server}
                onChange={(e) => setSettings((s) => ({ ...s, licensing_defaults: { ...licensing, server: e.target.value } }))}
                placeholder="https://license.zentryx.lab/v1/check"
              />
              <div className="mt-3 flex items-center gap-3">
                <Toggle
                  checked={licensing.grace_mode}
                  onChange={(v) => save("licensing_defaults", { ...licensing, grace_mode: v } as unknown as Json)}
                />
                <span className="text-sm text-gray-600">
                  Grace mode — allow trading when license-check fails (recommended ON)
                </span>
              </div>
              <div className="mt-3">
                <Button size="sm" onClick={() => save("licensing_defaults", licensing as unknown as Json)}>Save licensing defaults</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </AdminShell>
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-6 w-10 items-center rounded-full transition-colors",
        checked ? "bg-emerald-500" : "bg-gray-300",
      )}
    >
      <span
        className={cn(
          "inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform",
          checked ? "translate-x-5" : "translate-x-1",
        )}
      />
    </button>
  );
}
