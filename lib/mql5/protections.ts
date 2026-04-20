// ──────────────────────────────────────────────────────────────────
// MQL5 protection codegen
// ──────────────────────────────────────────────────────────────────
// Takes the user's Protection Panel selections and emits the MQL5 code
// that enforces them at runtime. Unlike regular translators, these are
// NOT tied to canvas nodes — they're configured at export/publish time
// and merged into the compiled source alongside the canvas contributions.
//
// Six blocks produce codegen here:
//   • accountLock   — OnInit check against ACCOUNT_LOGIN
//   • expiryDate    — OnInit + OnTick gate against TimeCurrent()
//   • brokerLock    — OnInit check against ACCOUNT_COMPANY
//   • demoOnly      — OnInit refusal if ACCOUNT_TRADE_MODE != DEMO
//   • licenseKey    — OnInit WebRequest + 24h cached re-check via OnTick gate
//   • ipLock        — OnInit WebRequest to ipapi.co (or overridable endpoint)
//
// Two blocks are handled as POST-PASSES (not here — see obfuscator.ts):
//   • watermark     — prepends a comment header with buyer id / timestamp
//   • obfuscation   — renames owned identifiers, strips comments
// ──────────────────────────────────────────────────────────────────

import type { SectionContribution } from "./types";

// ── Public config shape — the Protection Panel fills this ─────────
export interface ProtectionConfig {
  accountLock?: {
    /** MT5 account logins. Parsed from the CSV input on the panel. */
    accounts: number[];
    onFailureMessage?: string;
  };
  expiryDate?: {
    /** ISO datetime (UTC). */
    expiresAt: string;
  };
  brokerLock?: {
    /** Substring to match in ACCOUNT_COMPANY (case-insensitive at runtime). */
    allowedCompany: string;
  };
  demoOnly?: boolean;
  licenseKey?: {
    /** License server URL — default: https://license.zentryx.lab/v1/check */
    server: string;
    /** Optional product slug passed to the server for multi-product accounts. */
    product?: string;
    /** When the server is unreachable, allow the EA to keep running. */
    graceMode: boolean;
  };
  watermark?: {
    /** Buyer identifier shown in the header comment. */
    buyerId?: string;
    includeTimestamp: boolean;
  };
  obfuscation?: {
    level: "minimal" | "aggressive";
  };
  ipLock?: {
    /** Uppercase ISO-2 country codes. */
    allowedCountries: string[];
    /** Endpoint that returns the ISO-2 country string, default ipapi.co. */
    server?: string;
  };
}

// ── Entry point ───────────────────────────────────────────────────
/**
 * Build MQL5 contributions for every enabled protection block.
 * Called by the compiler after canvas translators have run.
 *
 * Returns an array — caller merges into the `collected` list that feeds
 * the template assembler. Watermark + obfuscation are not covered here;
 * they're applied as a source-level post-pass.
 */
export function translateProtections(config: ProtectionConfig | undefined): SectionContribution[] {
  if (!config) return [];
  const out: SectionContribution[] = [];
  if (config.accountLock && config.accountLock.accounts.length > 0) {
    out.push(buildAccountLock(config.accountLock));
  }
  if (config.expiryDate?.expiresAt) {
    out.push(buildExpiryDate(config.expiryDate));
  }
  if (config.brokerLock?.allowedCompany) {
    out.push(buildBrokerLock(config.brokerLock));
  }
  if (config.demoOnly) {
    out.push(buildDemoOnly());
  }
  if (config.licenseKey?.server) {
    out.push(buildLicenseKey(config.licenseKey));
  }
  if (config.ipLock && config.ipLock.allowedCountries.length > 0) {
    out.push(buildIpLock(config.ipLock));
  }
  return out;
}

// ── Block builders ────────────────────────────────────────────────

function buildAccountLock(opts: NonNullable<ProtectionConfig["accountLock"]>): SectionContribution {
  const accountsInit = `{ ${opts.accounts.map((n) => `${Math.trunc(Number(n))}`).join(", ")} }`;
  const msg = escapeStr(opts.onFailureMessage ?? "Not authorised on this account.");
  const body = `   // Protection: account lock
   long zx_allowed_accounts[] = ${accountsInit};
   long zx_current_login = (long)AccountInfoInteger(ACCOUNT_LOGIN);
   bool zx_account_ok = false;
   for(int zx_i = 0; zx_i < ArraySize(zx_allowed_accounts); zx_i++) {
      if(zx_allowed_accounts[zx_i] == zx_current_login) { zx_account_ok = true; break; }
   }
   if(!zx_account_ok) {
      Print("${msg} (login=", zx_current_login, ")");
      return INIT_FAILED;
   }`;
  return { onInitCode: [body], summaryFragments: [`Account lock: ${opts.accounts.length} login(s)`] };
}

function buildExpiryDate(opts: NonNullable<ProtectionConfig["expiryDate"]>): SectionContribution {
  // Convert ISO → MQL5 "YYYY.MM.DD HH:MM" that StringToTime accepts.
  const mqlTs = isoToMqlDatetime(opts.expiresAt);
  const body = `   // Protection: expiry date
   datetime zx_expires_at = StringToTime("${mqlTs}");
   if(TimeCurrent() >= zx_expires_at) {
      Print("EA expired on ", TimeToString(zx_expires_at, TIME_DATE|TIME_MINUTES), " — refusing to start.");
      return INIT_FAILED;
   }`;
  const gate = {
    expr: `(TimeCurrent() < StringToTime("${mqlTs}"))`,
    reason: "EA has expired",
  };
  return {
    onInitCode: [body],
    gates: [gate],
    summaryFragments: [`Expires at ${opts.expiresAt}`],
  };
}

function buildBrokerLock(opts: NonNullable<ProtectionConfig["brokerLock"]>): SectionContribution {
  const needle = escapeStr(opts.allowedCompany);
  const body = `   // Protection: broker lock
   {
      string zx_company = AccountInfoString(ACCOUNT_COMPANY);
      if(StringFind(zx_company, "${needle}", 0) == -1) {
         Print("Broker mismatch — expected substring \\"${needle}\\", got: ", zx_company);
         return INIT_FAILED;
      }
   }`;
  return {
    onInitCode: [body],
    summaryFragments: [`Broker lock: ${opts.allowedCompany}`],
  };
}

function buildDemoOnly(): SectionContribution {
  const body = `   // Protection: demo-only
   {
      ENUM_ACCOUNT_TRADE_MODE zx_mode = (ENUM_ACCOUNT_TRADE_MODE)AccountInfoInteger(ACCOUNT_TRADE_MODE);
      if(zx_mode != ACCOUNT_TRADE_MODE_DEMO) {
         Print("Demo-only EA — live or contest mode detected. Refusing to start.");
         return INIT_FAILED;
      }
   }`;
  return { onInitCode: [body], summaryFragments: ["Demo-only"] };
}

function buildLicenseKey(opts: NonNullable<ProtectionConfig["licenseKey"]>): SectionContribution {
  const url = escapeStr(opts.server);
  const product = escapeStr(opts.product ?? "");
  const grace = opts.graceMode ? "true" : "false";
  return {
    inputs: [
      {
        name: "InpLicenseKey",
        type: "string",
        defaultExpr: `""`,
        label: "License Key — Required",
        section: "license",
        orderHint: -10, // pin to top of LICENSE section
      },
    ],
    globals: [
      `// License runtime state — managed by ZxLicenseCheck().
datetime g_license_last_ok     = 0;
bool     g_license_grace_mode  = ${grace};
string   g_license_url         = "${url}";
string   g_license_product     = "${product}";`,
    ],
    helpers: [
      `bool ZxLicenseCheck()
{
   // Remote call: POST JSON to the Zentryx license endpoint.
   // MT5 requires the URL to be whitelisted in
   //   Tools → Options → Expert Advisors → "Allow WebRequest for listed URL".
   string payload = StringFormat(
      "{\\"key\\":\\"%s\\",\\"account\\":%I64d,\\"broker\\":\\"%s\\",\\"server\\":\\"%s\\",\\"terminal\\":\\"%s\\",\\"product\\":\\"%s\\"}",
      InpLicenseKey,
      (long)AccountInfoInteger(ACCOUNT_LOGIN),
      AccountInfoString(ACCOUNT_COMPANY),
      AccountInfoString(ACCOUNT_SERVER),
      TerminalInfoString(TERMINAL_NAME),
      g_license_product
   );

   char   post[];
   char   result[];
   string result_headers;
   string headers = "Content-Type: application/json\\r\\n";
   StringToCharArray(payload, post, 0, StringLen(payload));
   ResetLastError();
   int status = WebRequest("POST", g_license_url, headers, 5000, post, result, result_headers);

   if(status == -1) {
      int err = GetLastError();
      PrintFormat("License WebRequest failed (errno=%d). If first run, allow the URL in MT5 options.", err);
      if(g_license_grace_mode) { PrintFormat("Grace mode on — allowing EA to continue."); return true; }
      return false;
   }
   if(status >= 200 && status < 300) {
      string body = CharArrayToString(result, 0, WHOLE_ARRAY, CP_UTF8);
      // Very small JSON parse — we only need the "valid" field.
      if(StringFind(body, "\\"valid\\":true") != -1) {
         g_license_last_ok = TimeCurrent();
         return true;
      }
      PrintFormat("License denied by server: %s", body);
      return false;
   }
   PrintFormat("License server returned HTTP %d.", status);
   if(g_license_grace_mode) { PrintFormat("Grace mode on — allowing EA to continue."); return true; }
   return false;
}

bool ZxLicensePeriodicCheck()
{
   // Re-validate at most once per 24h. Called as an OnTick gate so the
   // EA effectively rechecks on the first tick after the cache expires.
   if(g_license_last_ok > 0 && (TimeCurrent() - g_license_last_ok) < 86400) return true;
   return ZxLicenseCheck();
}`,
    ],
    onInitCode: [
      `   // Protection: license key — mandatory before any trading
   if(StringLen(InpLicenseKey) == 0) {
      Print("License key is required. Please set InpLicenseKey in the EA inputs.");
      return INIT_FAILED;
   }
   if(!ZxLicenseCheck()) return INIT_FAILED;`,
    ],
    gates: [
      { expr: `ZxLicensePeriodicCheck()`, reason: "license re-validation failed" },
    ],
    summaryFragments: ["License key + server validation"],
  };
}

function buildIpLock(opts: NonNullable<ProtectionConfig["ipLock"]>): SectionContribution {
  const server = escapeStr(opts.server ?? "https://ipapi.co/country/");
  const countries = opts.allowedCountries.map((c) => c.trim().toUpperCase()).filter(Boolean);
  const initList = `{ ${countries.map((c) => `"${escapeStr(c)}"`).join(", ")} }`;
  const body = `   // Protection: IP / region lock
   {
      string zx_allowed_countries[] = ${initList};
      char zx_ip_result[];
      string zx_ip_headers;
      char zx_empty[];
      ResetLastError();
      int zx_http = WebRequest("GET", "${server}", "", 5000, zx_empty, zx_ip_result, zx_ip_headers);
      if(zx_http == 200) {
         string zx_country = CharArrayToString(zx_ip_result, 0, WHOLE_ARRAY, CP_UTF8);
         StringReplace(zx_country, "\\n", "");
         StringReplace(zx_country, "\\r", "");
         StringToUpper(zx_country);
         bool zx_country_ok = false;
         for(int zx_j = 0; zx_j < ArraySize(zx_allowed_countries); zx_j++) {
            if(StringCompare(zx_allowed_countries[zx_j], zx_country, false) == 0) { zx_country_ok = true; break; }
         }
         if(!zx_country_ok) {
            Print("Region not allowed: ", zx_country);
            return INIT_FAILED;
         }
      } else {
         PrintFormat("IP check failed (HTTP=%d). Allow ${server} in MT5 WebRequest options.", zx_http);
         return INIT_FAILED;
      }
   }`;
  return {
    onInitCode: [body],
    summaryFragments: [`Region lock: ${countries.join(", ")}`],
  };
}

// ── Utilities ─────────────────────────────────────────────────────

function escapeStr(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

/**
 * Convert ISO 8601 → MQL5 datetime literal "YYYY.MM.DD HH:MM".
 * MQL5's StringToTime is strict about the dot format.
 */
function isoToMqlDatetime(iso: string): string {
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return "2099.01.01 00:00";
  const p = (n: number) => String(n).padStart(2, "0");
  const y = d.getUTCFullYear();
  const mo = p(d.getUTCMonth() + 1);
  const da = p(d.getUTCDate());
  const hh = p(d.getUTCHours());
  const mm = p(d.getUTCMinutes());
  return `${y}.${mo}.${da} ${hh}:${mm}`;
}
