"use client";

// ──────────────────────────────────────────────────────────────────
// ConfirmProvider — themed replacement for native window.confirm /
// window.prompt / window.alert. Mounted once at app/layout.tsx root.
//
//   const { confirm, prompt, alert } = useConfirm();
//
//   // confirm
//   if (!await confirm({
//     title: 'Delete "My EA"?',
//     body: "This cannot be undone.",
//     destructive: true,
//     confirmLabel: "Delete",
//   })) return;
//
//   // prompt (returns string | null — null = cancelled)
//   const reason = await prompt({
//     title: "Why are you revoking this license?",
//     placeholder: "Chargeback / fraud / lost key…",
//     defaultValue: "Revoked by issuer.",
//   });
//   if (reason === null) return;
//
//   // alert (single OK — no cancel)
//   await alert({ title: "Cannot proceed", body: "Fix validation first." });
//
// API is imperative and returns a Promise, so call-sites read top-down.
// Uses the existing Dialog primitive for visuals; no portal collisions.
// ──────────────────────────────────────────────────────────────────

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, Info } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "./dialog";
import { Button } from "./button";
import { Input } from "./input";

export interface ConfirmOptions {
  title: string;
  body?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Red destructive styling on the confirm button. */
  destructive?: boolean;
  /** Show a warning icon in the header. Auto-enabled when destructive. */
  icon?: "warning" | "info" | "none";
}

export interface PromptOptions extends ConfirmOptions {
  placeholder?: string;
  defaultValue?: string;
  /** When true, confirm button stays disabled until the input is non-empty. */
  required?: boolean;
  /** Input type — "text" (default), "email", "number", etc. */
  inputType?: React.HTMLInputTypeAttribute;
  /** Use a multi-line textarea instead of a single-line input. */
  multiline?: boolean;
}

export interface AlertOptions {
  title: string;
  body?: React.ReactNode;
  confirmLabel?: string;
  icon?: "warning" | "info" | "none";
}

interface ConfirmState {
  kind: "confirm";
  opts: ConfirmOptions;
  resolve: (value: boolean) => void;
}

interface PromptState {
  kind: "prompt";
  opts: PromptOptions;
  resolve: (value: string | null) => void;
}

interface AlertState {
  kind: "alert";
  opts: AlertOptions;
  resolve: () => void;
}

type State = ConfirmState | PromptState | AlertState | null;

interface ConfirmContextValue {
  confirm: (opts: ConfirmOptions) => Promise<boolean>;
  prompt: (opts: PromptOptions) => Promise<string | null>;
  alert: (opts: AlertOptions) => Promise<void>;
}

const ConfirmContext = createContext<ConfirmContextValue | null>(null);

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<State>(null);
  const [promptValue, setPromptValue] = useState("");

  const confirm = useCallback(
    (opts: ConfirmOptions) =>
      new Promise<boolean>((resolve) => setState({ kind: "confirm", opts, resolve })),
    [],
  );
  const prompt = useCallback(
    (opts: PromptOptions) =>
      new Promise<string | null>((resolve) => {
        setPromptValue(opts.defaultValue ?? "");
        setState({ kind: "prompt", opts, resolve });
      }),
    [],
  );
  const alert = useCallback(
    (opts: AlertOptions) => new Promise<void>((resolve) => setState({ kind: "alert", opts, resolve })),
    [],
  );

  const api = useMemo<ConfirmContextValue>(() => ({ confirm, prompt, alert }), [confirm, prompt, alert]);

  function close(result: unknown) {
    if (!state) return;
    if (state.kind === "confirm") state.resolve(result as boolean);
    else if (state.kind === "prompt") state.resolve(result as string | null);
    else state.resolve();
    setState(null);
  }

  // Focus the primary action when the dialog opens.
  const okRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);
  useEffect(() => {
    if (!state) return;
    const t = setTimeout(() => {
      if (state.kind === "prompt") inputRef.current?.focus();
      else okRef.current?.focus();
    }, 40);
    return () => clearTimeout(t);
  }, [state]);

  return (
    <ConfirmContext.Provider value={api}>
      {children}

      <Dialog
        open={state !== null}
        onOpenChange={(v) => { if (!v) close(state?.kind === "prompt" ? null : false); }}
      >
        <DialogContent className="max-w-[94vw] sm:max-w-md">
          {state && (
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2.5">
                <Glyph icon={resolveIcon(state)} destructive={isDestructive(state)} />
                <span className="min-w-0">{state.opts.title}</span>
              </DialogTitle>
              {state.opts.body && (
                <DialogDescription>
                  {state.opts.body}
                </DialogDescription>
              )}
            </DialogHeader>
          )}

          {state?.kind === "prompt" && (
            <div className="pt-1">
              {state.opts.multiline ? (
                <textarea
                  ref={inputRef as React.RefObject<HTMLTextAreaElement>}
                  value={promptValue}
                  onChange={(e) => setPromptValue(e.target.value)}
                  placeholder={state.opts.placeholder}
                  className="min-h-[90px] w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/15"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                      e.preventDefault();
                      if (!state.opts.required || promptValue.trim()) close(promptValue);
                    }
                  }}
                />
              ) : (
                <Input
                  ref={inputRef as React.RefObject<HTMLInputElement>}
                  type={state.opts.inputType ?? "text"}
                  value={promptValue}
                  onChange={(e) => setPromptValue(e.target.value)}
                  placeholder={state.opts.placeholder}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      if (!state.opts.required || promptValue.trim()) close(promptValue);
                    }
                  }}
                />
              )}
            </div>
          )}

          <DialogFooter className="!pt-2">
            {state?.kind !== "alert" && (
              <Button
                type="button"
                variant="ghost"
                onClick={() => close(state?.kind === "prompt" ? null : false)}
              >
                {state?.opts.cancelLabel ?? "Cancel"}
              </Button>
            )}
            <Button
              ref={okRef}
              type="button"
              variant={state && isDestructive(state) ? "destructive" : "primary"}
              disabled={state?.kind === "prompt" && state.opts.required === true && !promptValue.trim()}
              onClick={() => {
                if (!state) return;
                if (state.kind === "prompt") close(promptValue);
                else if (state.kind === "confirm") close(true);
                else close(undefined);
              }}
            >
              {state?.opts.confirmLabel ?? (state?.kind === "alert" ? "OK" : "Confirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ConfirmContext.Provider>
  );
}

export function useConfirm(): ConfirmContextValue {
  const ctx = useContext(ConfirmContext);
  if (!ctx) {
    // Provider not mounted — fall back to native dialogs so we never
    // break an action. This should only ever happen in tests.
    return {
      async confirm(opts) { return typeof window !== "undefined" ? window.confirm(opts.title) : false; },
      async prompt(opts)  { return typeof window !== "undefined" ? window.prompt(opts.title, opts.defaultValue ?? "") : null; },
      async alert(opts)   { if (typeof window !== "undefined") window.alert(opts.title); },
    };
  }
  return ctx;
}

// ── Internals ────────────────────────────────────────────────────

function Glyph({ icon, destructive }: { icon: "warning" | "info" | "none"; destructive: boolean }) {
  if (icon === "none") return null;
  if (icon === "warning" || destructive) {
    return (
      <span className="inline-flex w-7 h-7 rounded-lg bg-red-50 text-red-600 items-center justify-center shrink-0">
        <AlertTriangle size={14} />
      </span>
    );
  }
  return (
    <span className="inline-flex w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 items-center justify-center shrink-0">
      <Info size={14} />
    </span>
  );
}

function resolveIcon(state: NonNullable<State>): "warning" | "info" | "none" {
  if (state.kind === "alert") return state.opts.icon ?? "info";
  return state.opts.icon ?? (isDestructive(state) ? "warning" : "info");
}

function isDestructive(state: NonNullable<State>): boolean {
  if (state.kind === "alert") return false;
  return state.opts.destructive === true;
}
