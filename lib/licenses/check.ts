// Pure validation logic for a license row against an EA check request.
// No I/O — caller has already fetched the row and is about to insert an
// activation log entry. This keeps the rules in one place and easy to unit-test.

import type {
  CheckLicenseRequest,
  CheckLicenseResponse,
  LicenseResult,
  LicenseRow,
} from "./types";

export interface EvaluateArgs {
  /** The license row looked up by key_hash — null if no match found. */
  license: LicenseRow | null;
  /** The payload the EA sent. */
  request: CheckLicenseRequest;
  /** Current time (ISO). Injected for testability; defaults to now. */
  now?: Date;
  /** Current usage count — used when max_activations is set. */
  distinctAccountsSoFar?: number;
}

export interface EvaluateOutput {
  result: LicenseResult;
  response: CheckLicenseResponse;
}

/** Normalised substring match, case-insensitive. */
function contains(haystack: string | undefined | null, needle: string | null): boolean {
  if (!needle) return true;
  if (!haystack) return false;
  return haystack.toLowerCase().includes(needle.toLowerCase());
}

/**
 * Evaluate a license check. The caller is responsible for:
 *   1. Persisting the returned `result` as a license_activations row.
 *   2. Returning the `response` body to the EA.
 */
export function evaluateLicense(args: EvaluateArgs): EvaluateOutput {
  const { license, request } = args;
  const now = args.now ?? new Date();

  if (!license) {
    return fail("invalid_key", "No license matches that key.");
  }

  if (license.revoked) {
    return fail("revoked", license.revoke_reason ?? "This license has been revoked.", license);
  }

  if (license.expires_at) {
    const expiresAt = new Date(license.expires_at);
    if (Number.isFinite(expiresAt.getTime()) && expiresAt.getTime() <= now.getTime()) {
      return fail("expired", `Expired on ${license.expires_at}.`, license);
    }
  }

  if (license.bound_account != null) {
    const acct = request.account;
    if (acct == null || Number(acct) !== Number(license.bound_account)) {
      return fail(
        "wrong_account",
        `Not licensed for MT5 account ${acct ?? "unknown"}.`,
        license,
      );
    }
  }

  if (license.bound_broker && !contains(request.broker, license.bound_broker)) {
    return fail(
      "wrong_broker",
      `Broker mismatch — licensed for ${license.bound_broker}.`,
      license,
    );
  }

  if (license.bound_server && !contains(request.server, license.bound_server)) {
    return fail(
      "wrong_broker",
      `Server mismatch — licensed for ${license.bound_server}.`,
      license,
    );
  }

  if (license.max_activations != null && args.distinctAccountsSoFar != null) {
    const currentAccount = request.account ?? null;
    // If we're already at the cap AND this account isn't one of the ones
    // we've already seen, refuse. The caller supplies the count of
    // distinct accounts that have successfully validated so far.
    if (args.distinctAccountsSoFar >= license.max_activations && currentAccount != null) {
      return fail(
        "max_activations",
        `License exceeds max activations (${license.max_activations}).`,
        license,
      );
    }
  }

  return {
    result: "valid",
    response: {
      valid: true,
      license_id: license.id,
      expires_at: license.expires_at,
      bound_account: license.bound_account,
    },
  };
}

function fail(
  result: Exclude<LicenseResult, "valid" | "grace">,
  message: string,
  license?: LicenseRow,
): EvaluateOutput {
  return {
    result,
    response: {
      valid: false,
      reason: result,
      message,
      license_id: license?.id,
    },
  };
}
