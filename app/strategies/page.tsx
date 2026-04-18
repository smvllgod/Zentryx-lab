"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2, Workflow, Pencil } from "lucide-react";
import { AppShell } from "@/components/app/shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { toast } from "@/components/ui/toast";
import {
  createStrategy,
  deleteStrategy,
  listStrategies,
  type StrategyRow,
} from "@/lib/strategies/store";
import { canSaveStrategy } from "@/lib/billing/gating";
import { useAuth } from "@/lib/auth/context";
import { formatRelative } from "@/lib/utils/format";

export default function StrategiesPage() {
  const { profile } = useAuth();
  const [rows, setRows] = useState<StrategyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState("");

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const data = await listStrategies();
        if (alive) setRows(data);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const plan = profile?.plan ?? "free";
    const gate = canSaveStrategy(plan, rows.length);
    if (!gate.ok) {
      toast.error(gate.reason ?? "Plan limit reached.");
      return;
    }
    try {
      const row = await createStrategy(name || "Untitled Strategy");
      toast.success("Strategy created.");
      setRows((r) => [row, ...r]);
      setCreateOpen(false);
      setName("");
      window.location.href = `/builder?id=${row.id}`;
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm("Delete this strategy? This cannot be undone.")) return;
    try {
      await deleteStrategy(id);
      setRows((r) => r.filter((x) => x.id !== id));
      toast.success("Deleted.");
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  return (
    <AppShell
      title="My Strategies"
      actions={
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          <Plus size={14} /> New strategy
        </Button>
      }
    >
      {loading ? (
        <div className="text-sm text-gray-400">Loading…</div>
      ) : rows.length === 0 ? (
        <EmptyState
          icon={<Workflow size={20} />}
          title="No strategies yet"
          description="Build your first MT5 EA — drag nodes into the canvas, validate, then export the .mq5 file."
          action={
            <Button onClick={() => setCreateOpen(true)}>
              <Plus size={14} /> Create your first strategy
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {rows.map((row) => (
            <Card key={row.id} className="hover:shadow-md transition-shadow">
              <CardContent>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <a href={`/builder?id=${row.id}`} className="text-sm font-700 text-gray-900 hover:text-emerald-600 line-clamp-1">
                      {row.name}
                    </a>
                    <div className="text-xs text-gray-400 mt-1">
                      {row.platform.toUpperCase()} · updated {formatRelative(row.updated_at)}
                    </div>
                  </div>
                  <Badge
                    tone={
                      row.status === "published"
                        ? "purple"
                        : row.status === "exported"
                          ? "emerald"
                          : row.status === "validated"
                            ? "blue"
                            : "default"
                    }
                  >
                    {row.status}
                  </Badge>
                </div>
                {row.description && (
                  <p className="mt-3 text-xs text-gray-500 line-clamp-2">{row.description}</p>
                )}
                <div className="mt-4 flex items-center gap-2">
                  <Button asChild size="sm" variant="secondary" className="flex-1">
                    <a href={`/builder?id=${row.id}`}><Pencil size={12} /> Open builder</a>
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => handleDelete(row.id)} aria-label="Delete">
                    <Trash2 size={14} />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create a new strategy</DialogTitle>
            <DialogDescription>You can rename it any time from the builder.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreate}>
            <Label htmlFor="strat-name">Strategy name</Label>
            <Input
              id="strat-name"
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. EUR/USD Trend Hunter"
            />
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="secondary">Cancel</Button>
              </DialogClose>
              <Button type="submit">Create</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
