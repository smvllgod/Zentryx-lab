"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { nanoid } from "nanoid";
import {
  Save,
  Play,
  Code2,
  Download,
  Undo2,
  Redo2,
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
  Maximize2,
  Minimize2,
  Maximize,
  Trash2,
  Sparkles,
  Paintbrush,
  ShieldCheck,
} from "lucide-react";
import { AppShell } from "@/components/app/shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/select";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
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
import { useAuth } from "@/lib/auth/context";
import {
  CATEGORY_ORDER,
  emptyGraph,
  type NodeType,
  type StrategyEdge,
  type StrategyGraph,
  type StrategyNode,
  type Timeframe,
} from "@/lib/strategies/types";
import {
  defaultParams,
  getNodeDefinition,
  type NodeDefinition,
} from "@/lib/strategies/nodes";
import { validateStrategy } from "@/lib/strategies/validators";
import { summarizeStrategy } from "@/lib/strategies/summary";
import { compileStrategy, sanitizeFilename } from "@/lib/mql5/compiler";
import { applyObfuscation, applyWatermark, obfuscateMql5 } from "@/lib/mql5/obfuscator";
import type { ProtectionConfig } from "@/lib/mql5/protections";
import { ProtectionPanel } from "@/components/builder/ProtectionPanel";
import {
  createStrategy,
  getStrategy,
  recordExport,
  recordVersion,
  saveStrategy,
} from "@/lib/strategies/store";
import { useGraphHistory } from "@/lib/strategies/use-graph-history";
import { canExport, canPreviewCode, premiumNodesInUse } from "@/lib/billing/gating";
import { NodeLibrary } from "@/components/builder/NodeLibrary";
import { BuilderCanvas, type BuilderCanvasHandle } from "@/components/builder/BuilderCanvas";
import { Inspector } from "@/components/builder/Inspector";
import { DiagnosticsPanel } from "@/components/builder/DiagnosticsPanel";
import { CodePreview } from "@/components/builder/CodePreview";
import { AiPanel } from "@/components/builder/AiPanel";
import { AppearancePanel } from "@/components/appearance/AppearancePanel";
import type { VisualSchema } from "@/lib/appearance/types";
import { cn } from "@/lib/utils/cn";

const TIMEFRAMES: Timeframe[] = ["M1", "M5", "M15", "M30", "H1", "H4", "D1"];

function suggestEdgeTo(graph: StrategyGraph, newNode: StrategyNode): StrategyEdge | null {
  const targetIdx = CATEGORY_ORDER.indexOf(newNode.category);
  if (targetIdx <= 0) return null;
  for (let i = targetIdx - 1; i >= 0; i--) {
    const category = CATEGORY_ORDER[i];
    const candidates = graph.nodes.filter((n) => n.category === category);
    if (candidates.length === 0) continue;
    const free = candidates.find((c) => !graph.edges.some((e) => e.source === c.id));
    const source = free ?? candidates[candidates.length - 1];
    return { id: `e-${nanoid(6)}`, source: source.id, target: newNode.id };
  }
  return null;
}

export default function BuilderPage() {
  const { profile, user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get("id");

  const { graph, set: setGraph, reset, undo, redo } = useGraphHistory(emptyGraph());
  const [strategyId, setStrategyId] = useState<string | null>(id);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(Boolean(id));
  const [saving, setSaving] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [appearanceOpen, setAppearanceOpen] = useState(false);
  const [protectionOpen, setProtectionOpen] = useState(false);
  const [protections, setProtections] = useState<ProtectionConfig>({});
  const [gateOpen, setGateOpen] = useState(false);
  const [gateList, setGateList] = useState<NodeType[]>([]);

  const [leftOpen, setLeftOpen] = useState(true);
  const [rightOpen, setRightOpen] = useState(true);
  const [diagOpen, setDiagOpen] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const fullscreenTargetRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<BuilderCanvasHandle>(null);

  const plan = profile?.plan ?? "free";
  const preview = canPreviewCode(plan);

  useEffect(() => {
    const onChange = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  async function toggleFullscreen() {
    try {
      if (!document.fullscreenElement) {
        await fullscreenTargetRef.current?.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch (err) {
      toast.error(`Fullscreen blocked: ${(err as Error).message}`);
    }
  }

  useEffect(() => {
    if (!id) return;
    let alive = true;
    (async () => {
      try {
        const row = await getStrategy(id);
        if (!alive) return;
        if (!row) {
          toast.error("Strategy not found.");
          router.replace("/strategies");
          return;
        }
        const g = row.graph as unknown as StrategyGraph;
        const safe: StrategyGraph = {
          ...emptyGraph({ name: row.name }),
          ...g,
          metadata: { ...emptyGraph({ name: row.name }).metadata, ...g.metadata, name: row.name },
        };
        reset(safe);
        setStrategyId(row.id);
      } catch (err) {
        toast.error((err as Error).message);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [id, router, reset]);

  const validation = useMemo(() => validateStrategy(graph), [graph]);
  const summary = useMemo(() => summarizeStrategy(graph), [graph]);
  const compiled = useMemo(() => compileStrategy(graph, { protections }), [graph, protections]);

  // Source delivered to the user at export time. Pipeline:
  //   Free tier → always obfuscate + auto-watermark (legacy path).
  //   Pro/Creator → apply the Protection Panel's obfuscation/watermark
  //   opt-ins if any. Runtime gates (account lock, license key, etc.)
  //   are baked into `compiled.source` by `compileStrategy` directly.
  const deliveredSource = useMemo(() => {
    let source = compiled.source;
    if (!preview.ok) {
      return obfuscateMql5(source, {
        userId: user?.id ?? profile?.email ?? "free-user",
        exportedAt: new Date().toISOString(),
      });
    }
    if (protections.obfuscation) {
      source = applyObfuscation(source, protections.obfuscation);
    }
    if (protections.watermark) {
      source = applyWatermark(source, {
        userId: protections.watermark.buyerId || user?.email || user?.id,
        exportedAt: protections.watermark.includeTimestamp
          ? new Date().toISOString()
          : undefined,
      });
    }
    return source;
  }, [compiled.source, preview.ok, user, profile?.email, protections]);

  const selectedNode: StrategyNode | null =
    graph.nodes.find((n) => n.id === selectedId) ?? null;
  const selectedEdge: StrategyEdge | null =
    graph.edges.find((e) => e.id === selectedEdgeId) ?? null;

  // ── Mutations ─────────────────────────────────────────
  const addNodeFromDef = useCallback(
    (def: NodeDefinition) => {
      const newId = `n-${nanoid(6)}`;
      let pendingEdge: StrategyEdge | null = null;

      setGraph((g) => {
        const column = g.nodes.length === 0
          ? 0
          : new Set(
              g.nodes
                .filter((n) => {
                  const a = CATEGORY_ORDER.indexOf(n.category);
                  const b = CATEGORY_ORDER.indexOf(def.category);
                  return a !== -1 && b !== -1 && a < b;
                })
                .map((n) => n.category),
            ).size;
        const existingInCategory = g.nodes.filter((n) => n.category === def.category).length;
        const newNode: StrategyNode = {
          id: newId,
          type: def.type,
          category: def.category,
          position: {
            x: 80 + column * 280,
            y: 120 + existingInCategory * 140,
          },
          params: defaultParams(def.type),
        };
        pendingEdge = suggestEdgeTo(g, newNode);
        return { ...g, nodes: [...g.nodes, newNode] };
      });
      setSelectedId(newId);
      setSelectedEdgeId(null);

      if (pendingEdge) {
        queueMicrotask(() => {
          setGraph((g) =>
            pendingEdge && !g.edges.some((e) => e.id === pendingEdge!.id)
              ? { ...g, edges: [...g.edges, pendingEdge] }
              : g,
          );
        });
      }

      setTimeout(() => canvasRef.current?.centerOnNode(newId), 60);
    },
    [setGraph],
  );

  const updateSelectedParams = useCallback(
    (params: Record<string, unknown>) => {
      if (!selectedId) return;
      setGraph((g) => ({
        ...g,
        nodes: g.nodes.map((n) => (n.id === selectedId ? { ...n, params } : n)),
      }));
    },
    [selectedId, setGraph],
  );

  const deleteSelectedNode = useCallback(() => {
    if (!selectedId) return;
    setGraph((g) => ({
      ...g,
      nodes: g.nodes.filter((n) => n.id !== selectedId),
      edges: g.edges.filter((e) => e.source !== selectedId && e.target !== selectedId),
    }));
    setSelectedId(null);
  }, [selectedId, setGraph]);

  const deleteSelectedEdge = useCallback(() => {
    if (!selectedEdgeId) return;
    setGraph((g) => ({
      ...g,
      edges: g.edges.filter((e) => e.id !== selectedEdgeId),
    }));
    setSelectedEdgeId(null);
  }, [selectedEdgeId, setGraph]);

  const duplicateSelected = useCallback(() => {
    if (!selectedNode) return;
    const dup: StrategyNode = {
      ...selectedNode,
      id: `n-${nanoid(6)}`,
      position: {
        x: selectedNode.position.x + 40,
        y: selectedNode.position.y + 40,
      },
      params: { ...(selectedNode.params as Record<string, unknown>) },
    };
    setGraph((g) => ({ ...g, nodes: [...g.nodes, dup] }));
    setSelectedId(dup.id);
    setTimeout(() => canvasRef.current?.centerOnNode(dup.id), 50);
  }, [selectedNode, setGraph]);

  const updateMetadata = useCallback(
    (patch: Partial<StrategyGraph["metadata"]>) =>
      setGraph((g) => ({ ...g, metadata: { ...g.metadata, ...patch } })),
    [setGraph],
  );

  // ── Save / version / export ───────────────────────────
  async function handleSave() {
    setSaving(true);
    try {
      let id = strategyId;
      if (!id) {
        const row = await createStrategy(graph.metadata.name);
        id = row.id;
        setStrategyId(id);
      }
      const saved = await saveStrategy(id, { name: graph.metadata.name, graph });
      await recordVersion({
        strategyId: id,
        graph,
        generatedCode: compiled.diagnostics.some((d) => d.level === "error")
          ? null
          : compiled.source,
        summary,
      });
      toast.success("Saved.");
      router.replace(`/builder?id=${saved.id}`);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  function handleValidate() {
    if (validation.ok) toast.success("Strategy passes validation.");
    else
      toast.error(
        `${validation.diagnostics.filter((d) => d.level === "error").length} error(s) — see panel.`,
      );
  }

  async function handleExport() {
    // Premium-node check: on Free, stop and list the offending nodes so
    // the user can remove them or upgrade.
    const offending = premiumNodesInUse(plan, graph);
    if (offending.length > 0) {
      setGateList(offending);
      setGateOpen(true);
      return;
    }
    const gate = canExport(plan);
    if (!gate.ok) {
      toast.error(gate.reason ?? "Export disabled.");
      return;
    }
    if (!validation.ok) {
      toast.error("Fix validation errors before exporting.");
      return;
    }
    if (!strategyId) {
      toast.error("Save the strategy first.");
      return;
    }
    const filename = sanitizeFilename(graph.metadata.name);
    const blob = new Blob([deliveredSource], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${filename}.mq5`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    try {
      await recordExport({
        strategyId,
        filename: `${filename}.mq5`,
        source: deliveredSource,
      });
      toast.success("Exported and recorded.");
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  const gridCols = useMemo(() => {
    const left = leftOpen ? "260px" : "44px";
    const right = rightOpen ? "320px" : "44px";
    return `${left} 1fr ${right}`;
  }, [leftOpen, rightOpen]);

  // Topbar actions (hidden in fullscreen, duplicated in the in-canvas toolbar).
  const topbarActions = (
    <div className="hidden md:flex items-center gap-2">
      <Button asChild variant="ghost" size="sm" title="Start a new strategy from a template">
        <a href="/templates"><Sparkles size={14} /> Templates</a>
      </Button>
      <Button variant="ghost" size="sm" onClick={undo}>
        <Undo2 size={14} /> Undo
      </Button>
      <Button variant="ghost" size="sm" onClick={redo}>
        <Redo2 size={14} /> Redo
      </Button>
      <Button variant="secondary" size="sm" onClick={handleValidate}>
        <Play size={14} /> Validate
      </Button>
      <Button variant="secondary" size="sm" onClick={() => setPreviewOpen(true)}>
        <Code2 size={14} /> Preview code
      </Button>
      <Button variant="secondary" size="sm" onClick={() => setAppearanceOpen(true)}>
        <Paintbrush size={14} /> Appearance
      </Button>
      <Button variant="secondary" size="sm" onClick={() => setProtectionOpen(true)}>
        <ShieldCheck size={14} /> Protection
        {countEnabledProtections(protections) > 0 && (
          <span className="inline-flex items-center rounded-full bg-emerald-500 text-white text-[9px] font-700 w-4 h-4 justify-center ml-0.5">
            {countEnabledProtections(protections)}
          </span>
        )}
      </Button>
      <Button variant="secondary" size="sm" onClick={handleExport}>
        <Download size={14} /> Export .mq5
      </Button>
      <Button size="sm" onClick={handleSave} disabled={saving}>
        <Save size={14} /> {saving ? "Saving…" : "Save"}
      </Button>
    </div>
  );

  return (
    <AppShell bare title={graph.metadata.name} actions={topbarActions}>
      {loading ? (
        <div className="flex-1 flex items-center justify-center text-sm text-gray-400">
          Loading strategy…
        </div>
      ) : (
        <div
          ref={fullscreenTargetRef}
          className={cn(
            "flex-1 grid grid-cols-1 min-h-0 relative bg-white overflow-hidden",
            "md:grid-flow-col",
          )}
          style={{
            ["--builder-cols" as never]: gridCols,
            gridTemplateRows: "minmax(0, 1fr)",
            height: "100%",
          }}
          data-builder-grid
        >
          {/* Left: node library */}
          <div className="hidden md:flex flex-col min-h-0 border-r border-gray-100 bg-white">
            <div className="flex items-center justify-between px-2 py-2 border-b border-gray-100">
              {leftOpen && (
                <span className="text-[10px] font-700 uppercase tracking-wider text-gray-400 px-1">
                  Nodes
                </span>
              )}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setLeftOpen((v) => !v)}
                aria-label={leftOpen ? "Collapse left sidebar" : "Expand left sidebar"}
                className="ml-auto"
              >
                {leftOpen ? <PanelLeftClose size={14} /> : <PanelLeftOpen size={14} />}
              </Button>
            </div>
            {leftOpen ? (
              <div className="flex-1 min-h-0">
                <NodeLibrary onAdd={addNodeFromDef} />
              </div>
            ) : (
              <CollapsedRail side="left" onExpand={() => setLeftOpen(true)} />
            )}
          </div>

          {/* Center */}
          <div className="flex flex-col min-h-0">
            <MetadataBar graph={graph} onChange={updateMetadata} />

            {/* In-canvas toolbar — stays visible even in fullscreen */}
            <div className="flex items-center gap-1 px-3 py-1.5 border-b border-gray-100 bg-white flex-wrap">
              <Button variant="ghost" size="sm" onClick={undo} title="Undo">
                <Undo2 size={13} /> Undo
              </Button>
              <Button variant="ghost" size="sm" onClick={redo} title="Redo">
                <Redo2 size={13} /> Redo
              </Button>
              <span className="mx-1 h-4 w-px bg-gray-200" />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => canvasRef.current?.fitView()}
                title="Fit all nodes"
              >
                <Maximize size={13} /> Fit
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleFullscreen}
                title={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
              >
                {isFullscreen ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
                {isFullscreen ? "Exit fullscreen" : "Fullscreen"}
              </Button>
              <div className="flex-1" />
              {selectedEdge && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={deleteSelectedEdge}
                  title="Delete selected connection"
                >
                  <Trash2 size={13} /> Delete connection
                </Button>
              )}
              <Button variant="secondary" size="sm" onClick={handleValidate}>
                <Play size={13} /> Validate
              </Button>
              <Button variant="secondary" size="sm" onClick={() => setAppearanceOpen(true)}>
                <Paintbrush size={13} /> Appearance
              </Button>
              <Button variant="secondary" size="sm" onClick={() => setProtectionOpen(true)}>
                <ShieldCheck size={13} /> Protection
                {countEnabledProtections(protections) > 0 && (
                  <span className="inline-flex items-center rounded-full bg-emerald-500 text-white text-[9px] font-700 w-4 h-4 justify-center ml-0.5">
                    {countEnabledProtections(protections)}
                  </span>
                )}
              </Button>
              <Button variant="secondary" size="sm" onClick={() => setPreviewOpen(true)}>
                <Code2 size={13} /> Preview code
              </Button>
              <Button variant="secondary" size="sm" onClick={handleExport}>
                <Download size={13} /> Export .mq5
              </Button>
              <Button size="sm" onClick={handleSave} disabled={saving}>
                <Save size={13} /> {saving ? "Saving…" : "Save"}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setDiagOpen((v) => !v)}
              >
                {diagOpen ? "Hide diagnostics" : "Show diagnostics"}
              </Button>
            </div>

            <div className="flex-1 relative min-h-[420px] bg-gray-50/40">
              {graph.nodes.length === 0 ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 z-10 p-4">
                  <div className="pointer-events-none">
                    <EmptyState
                      title="Drop your first node"
                      description="Drag from the left, or double-click any node to add it. Start with an Entry, then add Filters, Risk, and Exits."
                    />
                  </div>
                  <div className="text-xs text-gray-400">or</div>
                  <Button asChild size="sm" variant="secondary">
                    <a href="/templates"><Sparkles size={14} /> Start from a template</a>
                  </Button>
                </div>
              ) : null}
              <BuilderCanvas
                ref={canvasRef}
                graph={graph}
                selectedId={selectedId}
                selectedEdgeId={selectedEdgeId}
                onChange={(g) => setGraph(g)}
                onSelect={setSelectedId}
                onSelectEdge={setSelectedEdgeId}
              />
            </div>

            {diagOpen && (
              <div className="p-3 border-t border-gray-100 bg-white">
                <DiagnosticsPanel
                  diagnostics={validation.diagnostics}
                  summary={summary}
                  onSelectNode={(id) => {
                    setSelectedId(id);
                    canvasRef.current?.centerOnNode(id);
                  }}
                />
              </div>
            )}
          </div>

          {/* Right: inspector */}
          <div className="hidden md:flex flex-col min-h-0 border-l border-gray-100 bg-white">
            <div className="flex items-center justify-between px-2 py-2 border-b border-gray-100">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setRightOpen((v) => !v)}
                aria-label={rightOpen ? "Collapse right sidebar" : "Expand right sidebar"}
              >
                {rightOpen ? <PanelRightClose size={14} /> : <PanelRightOpen size={14} />}
              </Button>
              {rightOpen && (
                <span className="text-[10px] font-700 uppercase tracking-wider text-gray-400 px-1">
                  Inspector
                </span>
              )}
            </div>
            {rightOpen ? (
              <div className="flex-1 min-h-0">
                {selectedEdge ? (
                  <EdgeInspector edge={selectedEdge} graph={graph} onDelete={deleteSelectedEdge} />
                ) : (
                  <Inspector
                    node={selectedNode}
                    onChange={updateSelectedParams}
                    onDelete={deleteSelectedNode}
                    onDuplicate={duplicateSelected}
                  />
                )}
              </div>
            ) : (
              <CollapsedRail side="right" onExpand={() => setRightOpen(true)} />
            )}
          </div>

          {/* Zentryx AI — mounted INSIDE the fullscreen target so its floating
              trigger + slide-out panel stay visible when the user enters
              browser fullscreen. Elements outside document.fullscreenElement
              are hidden by the browser, which is why the panel disappeared
              before. */}
          <AiPanel
            graph={graph}
            onGraphReplace={(g) => setGraph(g)}
            strategyId={strategyId}
            onHighlightNode={(id) => {
              setSelectedId(id);
              canvasRef.current?.centerOnNode(id);
            }}
          />
        </div>
      )}

      {/* Preview dialog — blurred for Free */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-[94vw] sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Generated MQL5 source</DialogTitle>
            <DialogDescription>
              {preview.ok
                ? "Preview only — use Export to download a ready-to-import .mq5 file."
                : "Free tier: download works, but the source preview is blurred to protect creators' code."}
            </DialogDescription>
          </DialogHeader>
          <CodePreview
            source={deliveredSource}
            filename={sanitizeFilename(graph.metadata.name)}
            unlocked={preview.ok}
          />
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="secondary">Close</Button>
            </DialogClose>
            <Button onClick={handleExport}>
              <Download size={14} /> Export .mq5
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Premium node export guard dialog */}
      <Dialog open={gateOpen} onOpenChange={setGateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className="inline-flex w-7 h-7 rounded-lg bg-amber-50 text-amber-600 items-center justify-center">
                <Sparkles size={15} />
              </span>
              This strategy uses Pro-only nodes
            </DialogTitle>
            <DialogDescription>
              Free plan can export everything <em>except</em> nodes reserved for
              paid tiers. Remove the following nodes, or upgrade to Pro to export as-is.
            </DialogDescription>
          </DialogHeader>
          <ul className="mt-2 rounded-lg border border-gray-200 divide-y divide-gray-100 overflow-hidden">
            {gateList.map((t) => {
              const def = getNodeDefinition(t);
              return (
                <li key={t} className="flex items-center justify-between px-3 py-2">
                  <div>
                    <div className="text-sm font-700 text-gray-900">
                      {def?.label ?? t}
                    </div>
                    <code className="text-[10px] text-gray-400">{t}</code>
                  </div>
                  <Badge tone="amber">Pro</Badge>
                </li>
              );
            })}
          </ul>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="secondary">I&apos;ll remove them</Button>
            </DialogClose>
            <Button asChild>
              <a href="/billing">Upgrade to Pro</a>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Appearance dialog — EA visual configuration */}
      <Dialog open={appearanceOpen} onOpenChange={setAppearanceOpen}>
        <DialogContent className="max-w-5xl w-[94vw] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className="inline-flex w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 items-center justify-center">
                <Paintbrush size={14} />
              </span>
              EA Appearance
            </DialogTitle>
            <DialogDescription>
              Controls the on-chart panel of the exported EA. Separate from trading logic and licensing — changes only affect the generated MQL5 chart objects.
            </DialogDescription>
          </DialogHeader>
          <AppearancePanel
            value={graph.metadata.appearance ?? null}
            plan={(profile?.plan ?? "free") as "free" | "pro" | "creator"}
            defaultEaName={graph.metadata.name}
            creatorDisplayName={profile?.full_name ?? undefined}
            onChange={(schema: VisualSchema) => {
              setGraph((g) => ({
                ...g,
                metadata: { ...g.metadata, appearance: schema },
              }));
            }}
          />
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="secondary">Close</Button>
            </DialogClose>
            <Button
              onClick={() => {
                setAppearanceOpen(false);
                handleSave();
              }}
            >
              <Save size={14} /> Save appearance
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={protectionOpen} onOpenChange={setProtectionOpen}>
        <DialogContent className="max-w-2xl w-[94vw] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className="inline-flex w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 items-center justify-center">
                <ShieldCheck size={14} />
              </span>
              Protection & licensing
            </DialogTitle>
            <DialogDescription>
              Runtime checks and distribution controls baked into the exported <code className="text-xs">.mq5</code>.
              Enable what you want to enforce; settings apply at the next export.
            </DialogDescription>
          </DialogHeader>
          <ProtectionPanel
            value={protections}
            onChange={setProtections}
            plan={plan}
            hideWatermark={!preview.ok}
            showObfuscation={preview.ok}
          />
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="secondary">Close</Button>
            </DialogClose>
            <Button
              onClick={() => {
                setProtectionOpen(false);
                void handleExport();
              }}
              disabled={!validation.ok}
            >
              <Download size={14} /> Export with protections
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}

function countEnabledProtections(config: ProtectionConfig): number {
  let n = 0;
  if (config.accountLock?.accounts.length) n++;
  if (config.expiryDate?.expiresAt) n++;
  if (config.brokerLock?.allowedCompany) n++;
  if (config.demoOnly) n++;
  if (config.licenseKey?.server) n++;
  if (config.ipLock?.allowedCountries.length) n++;
  if (config.watermark) n++;
  if (config.obfuscation) n++;
  return n;
}

function CollapsedRail({
  side,
  onExpand,
}: {
  side: "left" | "right";
  onExpand: () => void;
}) {
  return (
    <button
      onClick={onExpand}
      className="flex-1 flex items-center justify-center text-[10px] font-700 uppercase tracking-widest text-gray-400 hover:text-emerald-600 hover:bg-emerald-50/40 transition-colors"
      style={{
        writingMode: "vertical-rl",
        transform: side === "right" ? "rotate(180deg)" : undefined,
      }}
      title="Click to expand"
    >
      {side === "left" ? "Node library" : "Inspector"}
    </button>
  );
}

function EdgeInspector({
  edge,
  graph,
  onDelete,
}: {
  edge: StrategyEdge;
  graph: StrategyGraph;
  onDelete: () => void;
}) {
  const src = graph.nodes.find((n) => n.id === edge.source);
  const tgt = graph.nodes.find((n) => n.id === edge.target);
  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div className="text-[10px] font-700 uppercase tracking-wider text-gray-400">
            Connection
          </div>
          <Button variant="ghost" size="icon" onClick={onDelete} aria-label="Delete">
            <Trash2 size={14} />
          </Button>
        </div>
        <h3 className="mt-1 text-base font-700 text-gray-900">Selected edge</h3>
        <p className="text-xs text-gray-500 mt-1">
          Drag either endpoint onto a different node to reconnect, or press
          Delete / click the trash icon to remove.
        </p>
      </div>
      <div className="p-4 space-y-4 text-sm">
        <div>
          <div className="text-[10px] font-700 uppercase tracking-wider text-gray-400 mb-1">
            From
          </div>
          <div className="rounded-lg border border-gray-200 px-3 py-2">
            <div className="font-600 text-gray-900">
              {getNodeDefinition(src?.type ?? ("utility" as NodeType))?.label ?? src?.type}
            </div>
            <div className="text-[10px] text-gray-400 uppercase">{src?.category}</div>
          </div>
        </div>
        <div>
          <div className="text-[10px] font-700 uppercase tracking-wider text-gray-400 mb-1">
            To
          </div>
          <div className="rounded-lg border border-gray-200 px-3 py-2">
            <div className="font-600 text-gray-900">
              {getNodeDefinition(tgt?.type ?? ("utility" as NodeType))?.label ?? tgt?.type}
            </div>
            <div className="text-[10px] text-gray-400 uppercase">{tgt?.category}</div>
          </div>
        </div>
        <Button variant="destructive" size="sm" onClick={onDelete} className="w-full">
          <Trash2 size={13} /> Delete connection
        </Button>
      </div>
    </div>
  );
}

function MetadataBar({
  graph,
  onChange,
}: {
  graph: StrategyGraph;
  onChange: (patch: Partial<StrategyGraph["metadata"]>) => void;
}) {
  return (
    <div className="border-b border-gray-100 bg-white px-4 py-2.5 grid grid-cols-2 md:grid-cols-5 gap-3">
      <div>
        <Label htmlFor="strat-name">Name</Label>
        <Input
          id="strat-name"
          value={graph.metadata.name}
          onChange={(e) => onChange({ name: e.target.value })}
        />
      </div>
      <div>
        <Label htmlFor="strat-symbol">Symbol</Label>
        <Input
          id="strat-symbol"
          value={graph.metadata.symbol ?? ""}
          onChange={(e) => onChange({ symbol: e.target.value.toUpperCase() })}
          placeholder="EURUSD"
        />
      </div>
      <div>
        <Label htmlFor="strat-tf">Timeframe</Label>
        <NativeSelect
          id="strat-tf"
          value={graph.metadata.timeframe ?? "M15"}
          onChange={(e) => onChange({ timeframe: e.target.value as Timeframe })}
        >
          {TIMEFRAMES.map((tf) => (
            <option key={tf} value={tf}>
              {tf}
            </option>
          ))}
        </NativeSelect>
      </div>
      <div>
        <Label htmlFor="strat-magic">Magic #</Label>
        <Input
          id="strat-magic"
          type="number"
          value={String(graph.metadata.magicNumber ?? "")}
          onChange={(e) => onChange({ magicNumber: Number(e.target.value) || 0 })}
        />
      </div>
      <div>
        <Label htmlFor="strat-comment">Trade comment</Label>
        <Input
          id="strat-comment"
          value={graph.metadata.tradeComment ?? ""}
          onChange={(e) => onChange({ tradeComment: e.target.value })}
          placeholder="Zentryx Lab"
          maxLength={28}
        />
      </div>
    </div>
  );
}
