// Shared types for the license system. Safe to import from both browser
// code and Netlify functions — no runtime deps, no "use client", no
// tsconfig path aliases (Netlify esbuild bundles don't resolve them).

type JsonValue =
  | string
  | number
  | boolean
  | null
  | { [key: string]: JsonValue | undefined }
  | JsonValue[];

export type LicenseResult =
  | "valid"
  | "invalid_key"
  | "expired"
  | "revoked"
  | "wrong_account"
  | "wrong_broker"
  | "max_activations"
  | "grace"
  | "rate_limited"
  | "malformed";

export interface LicenseRow {
  id: string;
  user_id: string;
  strategy_id: string | null;
  listing_id: string | null;
  purchase_id: string | null;
  buyer_id: string | null;
  buyer_email: string | null;
  key_hash: string;
  key_prefix: string;
  bound_account: number | null;
  bound_broker: string | null;
  bound_server: string | null;
  expires_at: string | null;
  max_activations: number | null;
  revoked: boolean;
  revoked_at: string | null;
  revoke_reason: string | null;
  label: string | null;
  metadata: JsonValue;
  created_at: string;
  updated_at: string;
}

export interface LicenseActivationRow {
  id: string;
  license_id: string | null;
  key_hash: string;
  account_login: number | null;
  broker: string | null;
  server: string | null;
  terminal_company: string | null;
  client_ip: string | null;
  country: string | null;
  user_agent: string | null;
  result: LicenseResult;
  created_at: string;
}

// What a creator submits when issuing a license.
export interface IssueLicenseInput {
  strategy_id: string;
  listing_id?: string | null;
  purchase_id?: string | null;
  buyer_id?: string | null;
  buyer_email?: string | null;
  bound_account?: number | null;
  bound_broker?: string | null;
  bound_server?: string | null;
  expires_at?: string | null;
  max_activations?: number | null;
  label?: string | null;
  metadata?: Record<string, unknown>;
}

// What the /license-issue function returns. The plaintext `key` is only
// ever sent back on issue — never retrievable afterwards.
export interface IssueLicenseResult {
  license_id: string;
  key: string;
  key_prefix: string;
  expires_at: string | null;
  bound_account: number | null;
  bound_broker: string | null;
  bound_server: string | null;
}

// Request body for /license-check (sent by the EA via WebRequest).
export interface CheckLicenseRequest {
  key: string;
  account?: number;
  broker?: string;
  server?: string;
  terminal?: string;
  product?: string;
}

// Response body for /license-check. `valid` is the primary field the EA
// inspects; `grace` is true when the server explicitly allowed the EA to
// run despite a failed check (set by system_settings.licensing_defaults).
export interface CheckLicenseResponse {
  valid: boolean;
  reason?: LicenseResult;
  license_id?: string;
  expires_at?: string | null;
  bound_account?: number | null;
  grace?: boolean;
  message?: string;
}
