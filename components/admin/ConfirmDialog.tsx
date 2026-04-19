"use client";

import { useState } from "react";
import { AlertTriangle } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: string;
  body: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  /** Return a promise so we can show a "confirming…" state. */
  onConfirm: () => Promise<void> | void;
}

/**
 * Uniform destructive-action confirmation. Every mutation that could
 * lose data or demote a user should gate through this.
 */
export function ConfirmDialog({
  open, onOpenChange, title, body,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  destructive = true,
  onConfirm,
}: Props) {
  const [busy, setBusy] = useState(false);
  async function handle() {
    try {
      setBusy(true);
      await onConfirm();
      onOpenChange(false);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {destructive && (
              <span className="inline-flex w-7 h-7 rounded-lg bg-red-50 text-red-600 items-center justify-center">
                <AlertTriangle size={14} />
              </span>
            )}
            {title}
          </DialogTitle>
          <DialogDescription>{body}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="secondary" disabled={busy} onClick={() => onOpenChange(false)}>{cancelLabel}</Button>
          <Button
            variant={destructive ? "destructive" : "primary"}
            disabled={busy}
            onClick={handle}
          >
            {busy ? "Working…" : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
