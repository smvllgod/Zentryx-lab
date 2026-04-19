// Server-only license issuance core. Shared by:
//   • netlify/functions/license-issue.ts       (auth'd creator path)
//   • netlify/functions/marketplace-auto-issue (webhook path)
//
// Uses the @supabase/supabase-js `SupabaseClient` directly so the caller
// can inject a service-role client (bypasses RLS). No tsconfig aliases
// so Netlify esbuild bundles resolve cleanly.

import type { SupabaseClient } from "@supabase/supabase-js";
import { generateLicenseKey } from "./core";
import type { IssueLicenseInput, IssueLicenseResult } from "./types";

export interface IssueLicenseCoreArgs {
  /** Service-role Supabase client. Must have write access to `licenses`. */
  admin: SupabaseClient;
  /** auth.users.id of the creator who OWNS the license (gets revoke rights). */
  userId: string;
  /** Optional actor email for the audit log. */
  actorEmail?: string | null;
  /** Issuance parameters. */
  input: IssueLicenseInput;
}

export async function issueLicenseCore(args: IssueLicenseCoreArgs): Promise<IssueLicenseResult> {
  const { admin, userId, actorEmail, input } = args;
  if (!input.strategy_id) throw new Error("strategy_id is required");

  // Retry up to 3 times on unique_violation (key_hash collision).
  for (let attempt = 0; attempt < 3; attempt++) {
    const gen = generateLicenseKey();
    const payload = {
      user_id: userId,
      strategy_id: input.strategy_id,
      listing_id: input.listing_id ?? null,
      purchase_id: input.purchase_id ?? null,
      buyer_id: input.buyer_id ?? null,
      buyer_email: input.buyer_email ?? null,
      key_hash: gen.hash,
      key_prefix: gen.prefix,
      bound_account: input.bound_account ?? null,
      bound_broker: input.bound_broker ?? null,
      bound_server: input.bound_server ?? null,
      expires_at: input.expires_at ?? null,
      max_activations: input.max_activations ?? null,
      label: input.label ?? null,
      metadata: input.metadata ?? {},
    };

    const { data, error } = await admin
      .from("licenses")
      .insert(payload)
      .select("id, expires_at, bound_account, bound_broker, bound_server")
      .single();

    if (error) {
      if ((error as { code?: string }).code === "23505" && attempt < 2) continue;
      throw new Error(`Could not create license: ${error.message}`);
    }

    // Audit log — best-effort.
    try {
      await admin.from("admin_actions").insert({
        actor_id: userId,
        actor_email: actorEmail ?? null,
        action: "license.issue",
        target_type: "license",
        target_id: data.id,
        after: {
          strategy_id: input.strategy_id,
          listing_id: input.listing_id ?? null,
          purchase_id: input.purchase_id ?? null,
          buyer_email: input.buyer_email ?? null,
          bound_account: input.bound_account ?? null,
          expires_at: input.expires_at ?? null,
        },
        note: input.label ?? null,
      });
    } catch {
      // Non-fatal.
    }

    return {
      license_id: data.id,
      key: gen.plaintext,
      key_prefix: gen.prefix,
      expires_at: data.expires_at,
      bound_account: data.bound_account,
      bound_broker: data.bound_broker,
      bound_server: data.bound_server,
    };
  }

  throw new Error("Could not generate a unique license key after retries.");
}
