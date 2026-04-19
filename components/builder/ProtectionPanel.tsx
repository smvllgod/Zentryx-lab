"use client";

// ──────────────────────────────────────────────────────────────────
// Protection Panel
// ──────────────────────────────────────────────────────────────────
// Lives OUTSIDE the canvas builder: shown at export time (self-use) or
// publish time (marketplace). The user toggles protections on/off and
// fills their params; the resulting `ProtectionConfig` is passed into
// `compileStrategy({ protections })` and enforced in the generated EA.
//
// Protection blocks this panel manages (mirrors lib/blocks/configs/protection.ts):
//   • accountLock  · brokerLock · demoOnly · expiryDate  (runtime gates)
//   • licenseKey   · ipLock                              (remote checks)
//   • watermark    · obfuscation                         (source post-pass)
//
// Tier gating is applied here: Free hides all; Pro sees the runtime gates
// + watermark; Creator sees everything. A disabled block still renders
// (so users know what's possible on upgrade) but its controls are locked.
// ──────────────────────────────────────────────────────────────────

import { useMemo } from "react";
import { Lock, Timer, Building2, ShieldOff, KeyRound, Stamp, EyeOff, Globe2, Crown } from "lucide-react";
import type { ProtectionConfig } from "@/lib/mql5/protections";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { DateTimePicker } from "@/components/ui/calendar";
import { cn } from "@/lib/utils/cn";

type Plan = "free" | "pro" | "creator";

interface ProtectionPanelProps {
  value: ProtectionConfig;
  onChange: (next: ProtectionConfig) => void;
  /** User's plan — controls which blocks are enabled. */
  plan: Plan;
  /** Hide the watermark section — used when the free-tier auto-watermark
   *  already applies (avoids double-watermarking). */
  hideWatermark?: boolean;
  /** Show the obfuscation section. Defaults to false at publish time. */
  showObfuscation?: boolean;
  className?: string;
}

type BlockId =
  | "accountLock"
  | "expiryDate"
  | "brokerLock"
  | "demoOnly"
  | "licenseKey"
  | "ipLock"
  | "watermark"
  | "obfuscation";

interface BlockMeta {
  id: BlockId;
  title: string;
  subtitle: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  minPlan: Plan;
  beta?: boolean;
  planned?: boolean;
}

const BLOCKS: BlockMeta[] = [
  { id: "accountLock", title: "Bind to account",   subtitle: "Restrict to specific MT5 logins.",    icon: Lock,       minPlan: "pro" },
  { id: "expiryDate",  title: "Expiry date",       subtitle: "EA refuses to run after a UTC date.", icon: Timer,      minPlan: "pro" },
  { id: "brokerLock",  title: "Bind to broker",    subtitle: "Only run when ACCOUNT_COMPANY matches.", icon: Building2, minPlan: "pro" },
  { id: "demoOnly",    title: "Demo-only",         subtitle: "Refuse to start on live accounts.",   icon: ShieldOff,  minPlan: "pro" },
  { id: "licenseKey",  title: "License key + server", subtitle: "Validate a key against Zentryx on boot.", icon: KeyRound, minPlan: "creator", beta: true },
  { id: "ipLock",      title: "IP / region lock",  subtitle: "Allow only certain ISO-2 countries.", icon: Globe2,     minPlan: "creator", planned: true },
  { id: "watermark",   title: "Source watermark",  subtitle: "Prepend a buyer / timestamp comment.", icon: Stamp,     minPlan: "pro" },
  { id: "obfuscation", title: "Obfuscation",       subtitle: "Rename helpers, strip comments.",      icon: EyeOff,    minPlan: "creator" },
];

const PLAN_ORDER: Record<Plan, number> = { free: 0, pro: 1, creator: 2 };

function isUnlocked(block: BlockMeta, plan: Plan): boolean {
  return PLAN_ORDER[plan] >= PLAN_ORDER[block.minPlan];
}

function isEnabled(value: ProtectionConfig, id: BlockId): boolean {
  if (id === "demoOnly") return value.demoOnly === true;
  return value[id] !== undefined;
}

export function ProtectionPanel({ value, onChange, plan, hideWatermark, showObfuscation, className }: ProtectionPanelProps) {
  const blocks = useMemo(
    () => BLOCKS.filter((b) => {
      if (b.id === "watermark" && hideWatermark) return false;
      if (b.id === "obfuscation" && !showObfuscation) return false;
      return true;
    }),
    [hideWatermark, showObfuscation],
  );

  function toggle(id: BlockId) {
    const next: ProtectionConfig = { ...value };
    if (isEnabled(value, id)) {
      if (id === "demoOnly") delete next.demoOnly;
      else delete next[id];
    } else {
      applyDefault(next, id);
    }
    onChange(next);
  }

  function patch<K extends keyof ProtectionConfig>(key: K, patchValues: Partial<NonNullable<ProtectionConfig[K]>>) {
    // `demoOnly` is the only boolean-valued key and isn't targeted by `patch`;
    // everything else is an object we can shallow-merge.
    const current = (value[key] ?? {}) as Record<string, unknown>;
    const merged = { ...current, ...(patchValues as Record<string, unknown>) };
    onChange({ ...value, [key]: merged } as ProtectionConfig);
  }

  return (
    <div className={cn("space-y-3", className)}>
      {blocks.map((b) => {
        const unlocked = isUnlocked(b, plan);
        const enabled = unlocked && isEnabled(value, b.id);
        const Icon = b.icon;

        return (
          <div
            key={b.id}
            className={cn(
              "rounded-xl border transition-colors",
              enabled ? "border-emerald-200 bg-emerald-50/30" : "border-gray-200 bg-white",
              !unlocked && "opacity-70",
            )}
          >
            <label className="flex items-start gap-3 p-4 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={enabled}
                disabled={!unlocked || b.planned}
                onChange={() => toggle(b.id)}
                className="mt-0.5 rounded border-gray-300 text-emerald-500 focus:ring-emerald-400 disabled:cursor-not-allowed"
              />
              <div className="w-9 h-9 rounded-lg bg-white border border-gray-100 flex items-center justify-center shrink-0">
                <Icon size={16} className={enabled ? "text-emerald-600" : "text-gray-400"} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="text-sm font-700 text-gray-900">{b.title}</h4>
                  {b.beta && <Badge tone="purple">beta</Badge>}
                  {b.planned && <Badge tone="amber">planned</Badge>}
                  {!unlocked && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-700 uppercase tracking-wider text-amber-700">
                      <Crown size={11} /> {b.minPlan}
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-0.5">{b.subtitle}</p>
              </div>
            </label>

            {enabled && !b.planned && (
              <div className="px-4 pb-4 pl-[68px] space-y-2.5 border-t border-emerald-100/60 pt-3">
                {renderBody({ id: b.id, value, patch })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Per-block body ────────────────────────────────────────────────

function renderBody(args: {
  id: BlockId;
  value: ProtectionConfig;
  patch: <K extends keyof ProtectionConfig>(key: K, patch: Partial<NonNullable<ProtectionConfig[K]>>) => void;
}) {
  const { id, value, patch } = args;

  if (id === "accountLock") {
    const cfg = value.accountLock ?? { accounts: [], onFailureMessage: "" };
    return (
      <div>
        <FieldLabel>Allowed MT5 logins (comma-separated)</FieldLabel>
        <Input
          placeholder="12345678, 87654321"
          defaultValue={cfg.accounts.join(", ")}
          onBlur={(e) => {
            const accounts = parseCsvNumbers(e.target.value);
            patch("accountLock", { accounts });
          }}
        />
        <FieldLabel className="mt-2">Denial message (shown in MT5 Journal)</FieldLabel>
        <Input
          placeholder="Not authorised on this account."
          defaultValue={cfg.onFailureMessage ?? ""}
          onBlur={(e) => patch("accountLock", { onFailureMessage: e.target.value })}
        />
      </div>
    );
  }

  if (id === "expiryDate") {
    const cfg = value.expiryDate ?? { expiresAt: "" };
    return (
      <div>
        <FieldLabel>Expires at (UTC)</FieldLabel>
        <DateTimePicker
          value={cfg.expiresAt}
          onChange={(iso) => patch("expiryDate", { expiresAt: iso })}
          minDate={new Date()}
          placeholder="Pick an expiry"
        />
        <Hint>EA will refuse to start after this timestamp.</Hint>
      </div>
    );
  }

  if (id === "brokerLock") {
    const cfg = value.brokerLock ?? { allowedCompany: "" };
    return (
      <div>
        <FieldLabel>Allowed broker company (contains)</FieldLabel>
        <Input
          placeholder="IC Markets"
          defaultValue={cfg.allowedCompany}
          onBlur={(e) => patch("brokerLock", { allowedCompany: e.target.value })}
        />
        <Hint>Substring match against MT5&apos;s ACCOUNT_COMPANY string.</Hint>
      </div>
    );
  }

  if (id === "demoOnly") {
    return <Hint>No configuration. EA refuses to start on live/contest accounts.</Hint>;
  }

  if (id === "licenseKey") {
    const cfg = value.licenseKey ?? { server: "https://license.zentryx.lab/v1/check", product: "", graceMode: true };
    return (
      <div>
        <FieldLabel>License server URL</FieldLabel>
        <Input
          defaultValue={cfg.server}
          onBlur={(e) => patch("licenseKey", { server: e.target.value })}
        />
        <FieldLabel className="mt-2">Product slug (optional)</FieldLabel>
        <Input
          placeholder="my-strategy-v1"
          defaultValue={cfg.product ?? ""}
          onBlur={(e) => patch("licenseKey", { product: e.target.value })}
        />
        <label className="flex items-center gap-2 text-xs text-gray-600 mt-2">
          <input
            type="checkbox"
            checked={cfg.graceMode}
            onChange={(e) => patch("licenseKey", { graceMode: e.target.checked })}
            className="rounded border-gray-300 text-emerald-500 focus:ring-emerald-400"
          />
          Grace mode (allow trading if the server is unreachable)
        </label>
        <Hint>
          Buyers will paste their key into <code className="text-[10px]">InpLicenseKey</code> when attaching the EA.
          They must also allow the URL in Tools → Options → Expert Advisors.
        </Hint>
      </div>
    );
  }

  if (id === "ipLock") {
    const cfg = value.ipLock ?? { allowedCountries: [], server: "" };
    return (
      <div>
        <FieldLabel>Allowed ISO-2 countries (comma-separated)</FieldLabel>
        <Input
          placeholder="US, GB, FR"
          defaultValue={cfg.allowedCountries.join(", ")}
          onBlur={(e) => patch("ipLock", { allowedCountries: parseCsvStrings(e.target.value).map((s) => s.toUpperCase()) })}
        />
        <Hint>Calls ipapi.co at OnInit. The endpoint must be allowed in MT5 WebRequest options.</Hint>
      </div>
    );
  }

  if (id === "watermark") {
    const cfg = value.watermark ?? { buyerId: "", includeTimestamp: true };
    return (
      <div>
        <FieldLabel>Buyer / recipient identifier</FieldLabel>
        <Input
          placeholder="alice@example.com"
          defaultValue={cfg.buyerId ?? ""}
          onBlur={(e) => patch("watermark", { buyerId: e.target.value })}
        />
        <label className="flex items-center gap-2 text-xs text-gray-600 mt-2">
          <input
            type="checkbox"
            checked={cfg.includeTimestamp}
            onChange={(e) => patch("watermark", { includeTimestamp: e.target.checked })}
            className="rounded border-gray-300 text-emerald-500 focus:ring-emerald-400"
          />
          Include export timestamp
        </label>
      </div>
    );
  }

  if (id === "obfuscation") {
    const cfg = value.obfuscation ?? { level: "aggressive" };
    return (
      <div>
        <FieldLabel>Level</FieldLabel>
        <select
          value={cfg.level}
          onChange={(e) => patch("obfuscation", { level: e.target.value as "minimal" | "aggressive" })}
          className="h-9 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-900"
        >
          <option value="minimal">Minimal — rename helpers</option>
          <option value="aggressive">Aggressive — rename + strip comments</option>
        </select>
      </div>
    );
  }

  return null;
}

function FieldLabel({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("text-[10px] font-700 uppercase tracking-wider text-gray-500 mb-1", className)}>{children}</div>;
}

function Hint({ children }: { children: React.ReactNode }) {
  return <p className="text-[11px] text-gray-500 mt-1.5">{children}</p>;
}

// ── Utility: default values when a block is first enabled ─────────

function applyDefault(cfg: ProtectionConfig, id: BlockId) {
  switch (id) {
    case "accountLock":
      cfg.accountLock = { accounts: [], onFailureMessage: "Not authorised on this account." };
      break;
    case "expiryDate":
      cfg.expiryDate = { expiresAt: defaultExpiryIso() };
      break;
    case "brokerLock":
      cfg.brokerLock = { allowedCompany: "" };
      break;
    case "demoOnly":
      cfg.demoOnly = true;
      break;
    case "licenseKey":
      cfg.licenseKey = { server: "https://license.zentryx.lab/v1/check", product: "", graceMode: true };
      break;
    case "ipLock":
      cfg.ipLock = { allowedCountries: ["US", "GB", "FR"], server: "https://ipapi.co/country/" };
      break;
    case "watermark":
      cfg.watermark = { buyerId: "", includeTimestamp: true };
      break;
    case "obfuscation":
      cfg.obfuscation = { level: "aggressive" };
      break;
  }
}

function defaultExpiryIso(): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + 30);
  d.setUTCMinutes(0, 0, 0);
  return d.toISOString();
}

function parseCsvNumbers(input: string): number[] {
  return input
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => Number.parseInt(s.replace(/[^\d]/g, ""), 10))
    .filter((n) => Number.isFinite(n) && n > 0);
}

function parseCsvStrings(input: string): string[] {
  return input.split(",").map((s) => s.trim()).filter(Boolean);
}
