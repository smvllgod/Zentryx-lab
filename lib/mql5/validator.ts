import type { Diagnostic } from "@/lib/strategies/validators";

// ──────────────────────────────────────────────────────────────────
// Static MQL5 source validator
// ──────────────────────────────────────────────────────────────────
// Post-pass over the assembled .mq5 source. Catches common MQL5
// compile failures before the user ever opens MetaEditor:
//   - unbalanced braces / parens
//   - deprecated functions (TimeHour, TimeDayOfWeek, ...)
//   - known-bad signatures (AccountInfoDouble 2-arg,
//     r.position without ulong cast)
//   - duplicate top-level function definitions (two risk blocks
//     both emitting `double RiskPercentPerTrade()`)
//   - "stopBody-only" identifiers leaking outside ZxOpen
//
// Each check emits a Diagnostic. The compiler keeps them alongside
// graph-level diagnostics so the UI can surface both.
// ──────────────────────────────────────────────────────────────────

const DEPRECATED_TIME_FNS = [
  "TimeHour",
  "TimeMinute",
  "TimeSeconds",
  "TimeDayOfWeek",
  "TimeDayOfYear",
  "TimeDay",
  "TimeMonth",
  "TimeYear",
] as const;

// Identifiers that only exist inside ZxOpen(). If we see them at
// file scope or inside OnTick without an obvious local shadow, it
// means some stopBody code leaked into a positionManagement block.
const ZXOPEN_ONLY_IDENTIFIERS = [
  "isLong",
  "entryPrice",
  "slPriceDistancePips",
] as const;

export function validateMql5Source(source: string): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];
  // Strip string literals and comments so regexes don't false-positive
  // on text embedded in Print() calls, StringFormat, comments, etc.
  const stripped = stripStringsAndComments(source);

  checkBraces(stripped, diagnostics);
  checkParens(stripped, diagnostics);
  checkDeprecatedTimeFns(stripped, diagnostics);
  checkAccountInfoDoubleSignature(stripped, diagnostics);
  checkPositionTicketCast(stripped, diagnostics);
  checkDuplicateTopLevelFunctions(stripped, diagnostics);
  checkZxOpenLeaks(source, stripped, diagnostics);
  checkUndeclaredInputs(stripped, diagnostics);

  return diagnostics;
}

function checkBraces(src: string, out: Diagnostic[]): void {
  let open = 0;
  let close = 0;
  for (const ch of src) {
    if (ch === "{") open++;
    else if (ch === "}") close++;
  }
  if (open !== close) {
    out.push({
      level: "error",
      code: "mql5_unbalanced_braces",
      message: `Unbalanced braces in generated MQL5: ${open} '{' vs ${close} '}'. The EA will not compile.`,
    });
  }
}

function checkParens(src: string, out: Diagnostic[]): void {
  let open = 0;
  let close = 0;
  for (const ch of src) {
    if (ch === "(") open++;
    else if (ch === ")") close++;
  }
  if (open !== close) {
    out.push({
      level: "error",
      code: "mql5_unbalanced_parens",
      message: `Unbalanced parentheses in generated MQL5: ${open} '(' vs ${close} ')'. The EA will not compile.`,
    });
  }
}

function checkDeprecatedTimeFns(src: string, out: Diagnostic[]): void {
  for (const fn of DEPRECATED_TIME_FNS) {
    const re = new RegExp(`\\b${fn}\\s*\\(`, "g");
    const matches = src.match(re);
    if (matches && matches.length > 0) {
      out.push({
        level: "warning",
        code: "mql5_deprecated_fn",
        message: `Generated MQL5 calls ${fn}() (${matches.length}×) — this is deprecated under #property strict. Use TimeToStruct() via the ZxHour/ZxMinute/etc. helpers instead.`,
      });
    }
  }
}

function checkAccountInfoDoubleSignature(src: string, out: Diagnostic[]): void {
  // AccountInfoDouble is single-arg in MQL5. If we see it with two
  // arguments, MetaEditor errors with "no one of the overloads
  // can be applied".
  const re = /AccountInfoDouble\s*\(\s*[A-Z_0-9]+\s*,[^)]+\)/g;
  const hits = src.match(re);
  if (hits && hits.length > 0) {
    out.push({
      level: "error",
      code: "mql5_bad_account_info_double",
      message: `AccountInfoDouble() called with 2 arguments in ${hits.length} place(s) — MQL5 only defines a single-arg version. The EA will not compile.`,
    });
  }
}

function checkPositionTicketCast(src: string, out: Diagnostic[]): void {
  // r.position in MqlTradeRequest is ulong. If we assign
  // PositionGetInteger(POSITION_TICKET) (which returns long) without a
  // cast, MT5 emits a "possible loss of data" warning.
  const re = /\br\.position\s*=\s*PositionGetInteger\s*\(\s*POSITION_TICKET\s*\)/g;
  const hits = src.match(re);
  if (hits && hits.length > 0) {
    out.push({
      level: "warning",
      code: "mql5_missing_ulong_cast",
      message: `r.position is ulong but is being assigned long (PositionGetInteger) without a cast, in ${hits.length} place(s). Add (ulong) to avoid MetaEditor's "possible loss of data" warning.`,
    });
  }
}

function checkDuplicateTopLevelFunctions(src: string, out: Diagnostic[]): void {
  // Match "<return-type> <Name>(...)" at the very start of a line.
  // MQL5 allows most numeric types + void + bool + datetime + string.
  const re =
    /^(?:void|bool|int|long|ulong|uint|short|ushort|double|float|char|uchar|string|datetime|color|ENUM_[A-Z_]+)\s+([A-Za-z_][A-Za-z0-9_]*)\s*\(/gm;
  const counts = new Map<string, number>();
  let m: RegExpExecArray | null;
  while ((m = re.exec(src)) !== null) {
    const name = m[1];
    counts.set(name, (counts.get(name) ?? 0) + 1);
  }
  for (const [name, count] of counts) {
    if (count > 1) {
      out.push({
        level: "error",
        code: "mql5_duplicate_function",
        message: `Function "${name}" is defined ${count}× at file scope. MetaEditor will reject this with "function redefinition". Two blocks in your graph are probably emitting the same helper (e.g. combining two risk blocks).`,
      });
    }
  }
}

function checkZxOpenLeaks(original: string, stripped: string, out: Diagnostic[]): void {
  // Find ZxOpen(...) body and exclude its range from the scan.
  const zxStart = original.search(/void\s+ZxOpen\s*\(/);
  if (zxStart < 0) return;
  // Walk braces to find the matching '}' for ZxOpen's body.
  const openBrace = original.indexOf("{", zxStart);
  if (openBrace < 0) return;
  let depth = 0;
  let end = -1;
  for (let i = openBrace; i < original.length; i++) {
    const ch = original[i];
    if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) {
        end = i;
        break;
      }
    }
  }
  if (end < 0) return;

  const outsideZxOpen = stripped.slice(0, zxStart) + stripped.slice(end + 1);

  for (const ident of ZXOPEN_ONLY_IDENTIFIERS) {
    // Look for the identifier NOT preceded by a type (so we don't catch
    // local declarations like `bool isLong = ...` inside a nested
    // function). Simplest heuristic: word boundary + not part of a
    // declaration. If found outside ZxOpen, flag it.
    const re = new RegExp(`\\b${ident}\\b`, "g");
    if (re.test(outsideZxOpen)) {
      out.push({
        level: "error",
        code: "mql5_zxopen_leak",
        message: `Identifier "${ident}" is only declared inside ZxOpen() but is referenced outside it. Some stopBody code has leaked into a positionManagement block — the EA will not compile.`,
      });
    }
  }
}

function checkUndeclaredInputs(src: string, out: Diagnostic[]): void {
  // Collect every identifier declared as `input <type> <name>`. MQL5's
  // `input` declarations live at file scope and are the only things any
  // `InpXxx` reference should resolve to. If a helper/positionMgmt/entry
  // condition references an `InpXxx` that was never declared, MetaEditor
  // errors with "undeclared identifier" — see the telemetry bug that
  // triggered this check.
  const declRe =
    /\binput\s+(?:const\s+)?(?:bool|char|uchar|short|ushort|int|uint|long|ulong|float|double|datetime|color|string|ENUM_[A-Z_]+)\s+([A-Za-z_][A-Za-z0-9_]*)\b/g;
  const declared = new Set<string>();
  let dm: RegExpExecArray | null;
  while ((dm = declRe.exec(src)) !== null) declared.add(dm[1]);

  // Any identifier starting with `Inp` (our universal input prefix) that
  // isn't in `declared` is suspect. Skip declarations themselves and the
  // `input string InpFoo = ...` line so we don't double-count.
  const refRe = /\b(Inp[A-Za-z0-9_]+)\b/g;
  const missing = new Map<string, number>();
  let rm: RegExpExecArray | null;
  while ((rm = refRe.exec(src)) !== null) {
    const name = rm[1];
    if (declared.has(name)) continue;
    missing.set(name, (missing.get(name) ?? 0) + 1);
  }
  if (missing.size > 0) {
    const details = [...missing.entries()]
      .map(([n, c]) => `${n}(${c}×)`)
      .sort()
      .join(", ");
    out.push({
      level: "error",
      code: "mql5_undeclared_input",
      message: `Generated MQL5 references input identifier(s) that were never declared: ${details}. A helper/translator emitted code using an Inp* variable but no one emitted the matching \`input\` line. The EA will not compile.`,
    });
  }
}

// ──────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────

/** Replace all string literals and // / block comments with spaces of
 * the same length, preserving line/column positions. */
function stripStringsAndComments(src: string): string {
  const chars = src.split("");
  let i = 0;
  while (i < chars.length) {
    const c = chars[i];
    const next = chars[i + 1];
    // Line comment
    if (c === "/" && next === "/") {
      while (i < chars.length && chars[i] !== "\n") {
        chars[i] = " ";
        i++;
      }
      continue;
    }
    // Block comment
    if (c === "/" && next === "*") {
      chars[i] = " ";
      chars[i + 1] = " ";
      i += 2;
      while (i < chars.length) {
        if (chars[i] === "*" && chars[i + 1] === "/") {
          chars[i] = " ";
          chars[i + 1] = " ";
          i += 2;
          break;
        }
        if (chars[i] !== "\n") chars[i] = " ";
        i++;
      }
      continue;
    }
    // String literal
    if (c === '"') {
      chars[i] = " ";
      i++;
      while (i < chars.length) {
        if (chars[i] === "\\" && chars[i + 1] !== undefined) {
          chars[i] = " ";
          chars[i + 1] = " ";
          i += 2;
          continue;
        }
        if (chars[i] === '"') {
          chars[i] = " ";
          i++;
          break;
        }
        if (chars[i] !== "\n") chars[i] = " ";
        i++;
      }
      continue;
    }
    // Char literal — MQL5 allows `'X'` or `'\n'`, `'\\'`, `'"'`, etc.
    // Without this, a char like `'"'` fools the string-literal branch
    // and the rest of the file gets eaten.
    if (c === "'") {
      chars[i] = " ";
      i++;
      while (i < chars.length) {
        if (chars[i] === "\\" && chars[i + 1] !== undefined) {
          chars[i] = " ";
          chars[i + 1] = " ";
          i += 2;
          continue;
        }
        if (chars[i] === "'") {
          chars[i] = " ";
          i++;
          break;
        }
        if (chars[i] !== "\n") chars[i] = " ";
        i++;
      }
      continue;
    }
    i++;
  }
  return chars.join("");
}
