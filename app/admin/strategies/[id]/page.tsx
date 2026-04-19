"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { AdminShell } from "@/components/admin/AdminShell";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Copy } from "lucide-react";
import { toast } from "@/components/ui/toast";
import { getStrategyDetail } from "@/lib/admin/queries";
import { formatRelative } from "@/lib/utils/format";
import type { Tables } from "@/lib/supabase/types";
import type { StrategyGraph } from "@/lib/strategies/types";
import { compileStrategy } from "@/lib/mql5/compiler";
import { summarizeStrategy } from "@/lib/strategies/summary";
import { getNodeDefinition } from "@/lib/strategies/nodes";
import { OwnerLink } from "@/components/admin/DataTable";

type Strategy = Tables<"strategies"> & {
  profiles?: { email: string; full_name: string | null; plan: string } | null;
};

export default function AdminStrategyDetail() {
  const { id } = useParams() as { id: string };
  const [data, setData] = useState<Awaited<ReturnType<typeof getStrategyDetail>> | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"overview" | "graph" | "code" | "versions" | "exports">("overview");

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const d = await getStrategyDetail(id);
        if (alive) setData(d);
      } catch (err) {
        toast.error("Failed to load strategy: " + (err as Error).message);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [id]);

  if (loading || !data) {
    return (
      <AdminShell title="Strategy" breadcrumbs={[{ label: "Admin", href: "/admin" }, { label: "Strategies", href: "/admin/strategies" }, { label: "Loading…" }]}>
        <div className="text-sm text-gray-400 py-12 text-center">Loading…</div>
      </AdminShell>
    );
  }
  if (!data.strategy) {
    return (
      <AdminShell title="Strategy" breadcrumbs={[{ label: "Admin", href: "/admin" }, { label: "Strategies", href: "/admin/strategies" }, { label: "Not found" }]}>
        <div className="text-sm text-gray-400 py-12 text-center">Strategy not found.</div>
      </AdminShell>
    );
  }

  const s = data.strategy as Strategy;
  const graph = s.graph as unknown as StrategyGraph;
  const summary = summarizeStrategy(graph);
  const compiled = compileStrategy(graph);
  const nodesByCategory = groupBy(graph.nodes, (n) => n.category);

  const TABS = [
    { id: "overview", label: "Overview" },
    { id: "graph",    label: `Graph · ${graph.nodes.length} nodes` },
    { id: "code",     label: `Generated .mq5` },
    { id: "versions", label: `Versions · ${data.versions.length}` },
    { id: "exports",  label: `Exports · ${data.exports.length}` },
  ] as const;

  return (
    <AdminShell
      title={s.name}
      subtitle={`Strategy · ${s.platform}`}
      breadcrumbs={[
        { label: "Admin", href: "/admin" },
        { label: "Strategies", href: "/admin/strategies" },
        { label: s.name },
      ]}
      actions={
        <Button size="sm" variant="secondary" asChild>
          <a href={`/builder?id=${s.id}`} target="_blank" rel="noreferrer">Open in builder ↗</a>
        </Button>
      }
    >
      {/* Top info strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <InfoTile label="Status" value={<Badge tone={s.status === "published" ? "purple" : s.status === "exported" ? "emerald" : "slate"}>{s.status}</Badge>} />
        <InfoTile label="Owner" value={<OwnerLink userId={s.user_id} />} hint={s.profiles?.email ?? undefined} />
        <InfoTile label="Symbol" value={<span className="text-sm text-gray-900 font-600">{graph.metadata.symbol ?? "—"}</span>} hint={`TF: ${graph.metadata.timeframe ?? "—"}`} />
        <InfoTile label="Updated" value={<span className="text-sm text-gray-900 font-600">{formatRelative(s.updated_at)}</span>} hint={`Created ${formatRelative(s.created_at)}`} />
      </div>

      {/* Tabs */}
      <div className="mb-4 flex items-center gap-1 overflow-x-auto -mx-1">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id as typeof tab)}
            className={
              "text-[12px] font-600 px-3 h-8 rounded-lg transition-colors whitespace-nowrap " +
              (tab === t.id
                ? "bg-gray-900 text-white shadow-[0_1px_2px_rgba(15,23,42,0.1)]"
                : "text-gray-600 hover:text-gray-900 hover:bg-white border border-transparent hover:border-gray-200")
            }
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card className="lg:col-span-2">
            <CardContent>
              <h3 className="text-sm font-700 text-gray-900">Summary</h3>
              <p className="mt-2 text-xs text-gray-600 whitespace-pre-wrap leading-relaxed">{summary || "—"}</p>
              {s.description && (
                <>
                  <h4 className="mt-5 text-[11px] font-700 uppercase tracking-wider text-gray-400">Description</h4>
                  <p className="mt-1 text-xs text-gray-600 whitespace-pre-wrap leading-relaxed">{s.description}</p>
                </>
              )}
              {compiled.diagnostics.length > 0 && (
                <>
                  <h4 className="mt-5 text-[11px] font-700 uppercase tracking-wider text-gray-400">Diagnostics</h4>
                  <ul className="mt-1 space-y-1">
                    {compiled.diagnostics.map((d, i) => (
                      <li key={i} className="flex items-start gap-2 text-[11px]">
                        <Badge tone={d.level === "error" ? "red" : d.level === "warning" ? "amber" : "blue"} className="shrink-0 mt-0.5 text-[8px] px-1.5 py-0">
                          {d.level}
                        </Badge>
                        <span className="text-gray-600">{d.message}</span>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardContent>
              <h3 className="text-sm font-700 text-gray-900">Metadata</h3>
              <dl className="mt-3 space-y-2 text-xs">
                <MetaRow label="Strategy ID"><code className="text-[10px] text-gray-500">{s.id}</code></MetaRow>
                <MetaRow label="Magic"><code className="text-[10px] text-gray-500">{String(graph.metadata.magicNumber ?? "—")}</code></MetaRow>
                <MetaRow label="Tags">
                  <div className="flex flex-wrap gap-1 justify-end">
                    {s.tags.length === 0 && <span className="text-gray-400">—</span>}
                    {s.tags.map((t) => (
                      <span key={t} className="text-[9px] font-600 uppercase tracking-wider text-gray-500 bg-gray-100 rounded-full px-2 py-0.5">{t}</span>
                    ))}
                  </div>
                </MetaRow>
                <MetaRow label="Edges"><span className="text-gray-700">{graph.edges.length}</span></MetaRow>
                <MetaRow label="Appearance"><span className="text-gray-700">{graph.metadata.appearance ? graph.metadata.appearance.themeId : "—"}</span></MetaRow>
              </dl>
            </CardContent>
          </Card>
        </div>
      )}

      {tab === "graph" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {Object.entries(nodesByCategory).map(([cat, nodes]) => (
            <Card key={cat}>
              <CardContent>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-700 text-gray-900 capitalize">{cat}</h3>
                  <span className="text-[10px] text-gray-400">{nodes.length}</span>
                </div>
                <ul className="space-y-1.5">
                  {nodes.map((n) => {
                    const def = getNodeDefinition(n.type);
                    return (
                      <li key={n.id} className="flex items-start justify-between gap-2 rounded-lg border border-gray-100 px-2.5 py-2">
                        <div className="min-w-0">
                          <div className="text-xs font-600 text-gray-900 truncate">{def?.label ?? n.type}</div>
                          <code className="text-[9px] text-gray-400">{n.type}</code>
                        </div>
                        <code className="text-[9px] text-gray-400 shrink-0">{n.id.slice(0, 6)}</code>
                      </li>
                    );
                  })}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {tab === "code" && (
        <Card>
          <CardContent>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-700 text-gray-900">Generated MQL5</h3>
              <Button
                size="sm"
                variant="secondary"
                onClick={async () => {
                  await navigator.clipboard.writeText(compiled.source);
                  toast.success("Copied MQL5 to clipboard");
                }}
              >
                <Copy size={12} /> Copy
              </Button>
            </div>
            <pre className="text-[11px] font-mono bg-gray-950 text-emerald-200 p-4 rounded-xl overflow-auto max-h-[65vh]">
              {compiled.source}
            </pre>
          </CardContent>
        </Card>
      )}

      {tab === "versions" && (
        <Card>
          <CardContent>
            <h3 className="text-sm font-700 text-gray-900 mb-2">Versions ({data.versions.length})</h3>
            {data.versions.length === 0 ? (
              <div className="text-xs text-gray-400 py-4">No versioned snapshots yet.</div>
            ) : (
              <ul className="divide-y divide-gray-100">
                {data.versions.map((v) => (
                  <li key={v.id} className="flex items-center justify-between py-2.5">
                    <div className="min-w-0">
                      <div className="text-sm font-600 text-gray-900">v{v.version}</div>
                      {v.summary && <div className="text-[11px] text-gray-500 truncate max-w-[600px]">{v.summary}</div>}
                    </div>
                    <div className="text-[10px] text-gray-400">{formatRelative(v.created_at)}</div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      )}

      {tab === "exports" && (
        <Card>
          <CardContent>
            <h3 className="text-sm font-700 text-gray-900 mb-2">Exports ({data.exports.length})</h3>
            {data.exports.length === 0 ? (
              <div className="text-xs text-gray-400 py-4">No exports yet.</div>
            ) : (
              <ul className="divide-y divide-gray-100">
                {data.exports.map((e) => (
                  <li key={e.id} className="flex items-center justify-between py-2.5">
                    <code className="text-xs text-gray-700">{e.filename}</code>
                    <div className="flex items-center gap-3">
                      <OwnerLink userId={e.user_id} />
                      <span className="text-[10px] text-gray-400">{formatRelative(e.created_at)}</span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      )}
    </AdminShell>
  );
}

function InfoTile({ label, value, hint }: { label: string; value: React.ReactNode; hint?: string }) {
  return (
    <div className="rounded-xl border border-gray-200/80 bg-white px-4 py-3">
      <div className="text-[9px] font-700 uppercase tracking-[0.12em] text-gray-400">{label}</div>
      <div className="mt-1">{value}</div>
      {hint && <div className="text-[10px] text-gray-400 mt-0.5 truncate">{hint}</div>}
    </div>
  );
}

function MetaRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-[10px] font-600 uppercase tracking-wider text-gray-400 shrink-0">{label}</dt>
      <dd className="text-right min-w-0 truncate">{children}</dd>
    </div>
  );
}

function groupBy<T>(items: T[], key: (t: T) => string): Record<string, T[]> {
  const out: Record<string, T[]> = {};
  for (const it of items) (out[key(it)] ??= []).push(it);
  return out;
}
