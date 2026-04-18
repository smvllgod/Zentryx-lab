"use client";

import { useCallback, useEffect, useImperativeHandle, useMemo, useRef, forwardRef } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  Position,
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
  reconnectEdge,
  type Node,
  type Edge,
  type NodeChange,
  type EdgeChange,
  type Connection,
  type ReactFlowInstance,
  type XYPosition,
} from "@xyflow/react";
import { nanoid } from "nanoid";
import { defaultParams, getNodeDefinition } from "@/lib/strategies/nodes";
import {
  CATEGORY_ORDER,
  type NodeType,
  type StrategyEdge,
  type StrategyGraph,
  type StrategyNode,
} from "@/lib/strategies/types";
import { StrategyNodeView } from "./StrategyNodeView";

const nodeTypes = { strategy: StrategyNodeView };

interface BuilderCanvasProps {
  graph: StrategyGraph;
  selectedId: string | null;
  selectedEdgeId: string | null;
  onChange: (graph: StrategyGraph) => void;
  onSelect: (id: string | null) => void;
  onSelectEdge: (id: string | null) => void;
}

export interface BuilderCanvasHandle {
  fitView: () => void;
  centerOnNode: (nodeId: string) => void;
}

// ──────────────────────────────────────────────────────────────────
// Connection rules
// ──────────────────────────────────────────────────────────────────
// Strategies are directed, downstream graphs. Two constraints:
//   1. Category ordering: target cannot come before source in
//      CATEGORY_ORDER (no "exit → entry" cycles).
//   2. No skipping the risk layer: an entry must flow through a
//      filter / session / news / risk node before reaching an exit,
//      grid, or utility — connecting an EMA cross directly to a
//      break-even node doesn't make sense as a strategy.
// ──────────────────────────────────────────────────────────────────
export function isValidConnectionShape(
  source: StrategyNode,
  target: StrategyNode,
): boolean {
  const ia = CATEGORY_ORDER.indexOf(source.category);
  const ib = CATEGORY_ORDER.indexOf(target.category);
  if (ia === -1 || ib === -1) return true;
  if (ib < ia) return false;
  if (ia === ib) return true; // same category (e.g. stacked filters) is fine

  // Explicitly forbid skipping risk when going from entry to exit/grid/utility.
  if (source.category === "entry" && (target.category === "exit" ||
      target.category === "grid" || target.category === "utility")) {
    return false;
  }
  return true;
}

export const BuilderCanvas = forwardRef<BuilderCanvasHandle, BuilderCanvasProps>(
  function BuilderCanvas(
    { graph, selectedId, selectedEdgeId, onChange, onSelect, onSelectEdge },
    ref,
  ) {
    const wrapperRef = useRef<HTMLDivElement>(null);
    const instanceRef = useRef<ReactFlowInstance | null>(null);
    const prevNodeCountRef = useRef<number>(graph.nodes.length);
    const edgeReconnectSuccessful = useRef(true);

    const flowNodes = useMemo<Node[]>(
      () =>
        graph.nodes.map((n) => ({
          id: n.id,
          type: "strategy",
          position: n.position,
          data: { type: n.type },
          selected: n.id === selectedId,
          draggable: true,
          selectable: true,
          connectable: true,
          width: 224,
          height: 108,
          measured: { width: 224, height: 108 },
          handles: [
            {
              id: null,
              type: "target" as const,
              position: Position.Left,
              x: 0,
              y: 54,
              width: 14,
              height: 14,
            },
            {
              id: null,
              type: "source" as const,
              position: Position.Right,
              x: 224,
              y: 54,
              width: 14,
              height: 14,
            },
          ],
        })),
      [graph.nodes, selectedId],
    );

    const flowEdges = useMemo<Edge[]>(
      () =>
        graph.edges.map((e) => ({
          id: e.id,
          source: e.source,
          target: e.target,
          animated: true,
          selected: e.id === selectedEdgeId,
          style: {
            stroke: e.id === selectedEdgeId ? "#059669" : "#10b981",
            strokeWidth: e.id === selectedEdgeId ? 2.5 : 1.75,
          },
          reconnectable: true as const,
        })),
      [graph.edges, selectedEdgeId],
    );

    useEffect(() => {
      const count = graph.nodes.length;
      if (count !== prevNodeCountRef.current && count > 0 && instanceRef.current) {
        const id = requestAnimationFrame(() => {
          instanceRef.current?.fitView({ padding: 0.4, duration: 300 });
        });
        prevNodeCountRef.current = count;
        return () => cancelAnimationFrame(id);
      }
      prevNodeCountRef.current = count;
    }, [graph.nodes.length]);

    useImperativeHandle(ref, () => ({
      fitView: () => instanceRef.current?.fitView({ padding: 0.4, duration: 400 }),
      centerOnNode: (nodeId: string) => {
        const node = graph.nodes.find((n) => n.id === nodeId);
        if (!node || !instanceRef.current) return;
        instanceRef.current.setCenter(node.position.x + 112, node.position.y + 40, {
          zoom: 1,
          duration: 400,
        });
      },
    }));

    const onNodesChange = useCallback(
      (changes: NodeChange[]) => {
        const updated = applyNodeChanges(changes, flowNodes);
        onChange({
          ...graph,
          nodes: updated.map((n) => {
            const existing = graph.nodes.find((x) => x.id === n.id);
            const def = getNodeDefinition((n.data as { type: NodeType }).type);
            return {
              id: n.id,
              type: (n.data as { type: NodeType }).type,
              category: def?.category ?? "utility",
              label: existing?.label,
              position: n.position,
              params: existing?.params ?? defaultParams((n.data as { type: NodeType }).type),
            };
          }),
        });
        const sel = changes.find((c) => c.type === "select" && c.selected);
        if (sel && "id" in sel) {
          onSelect((sel as { id: string }).id);
          onSelectEdge(null);
        }
        const desel = changes.find((c) => c.type === "select" && !c.selected);
        if (desel && !sel) onSelect(null);
      },
      [flowNodes, graph, onChange, onSelect, onSelectEdge],
    );

    const onEdgesChange = useCallback(
      (changes: EdgeChange[]) => {
        const updated = applyEdgeChanges(changes, flowEdges);
        onChange({
          ...graph,
          edges: updated.map((e) => ({
            id: e.id,
            source: e.source,
            target: e.target,
          }) as StrategyEdge),
        });
        // Track selection via edge changes too
        const sel = changes.find((c) => c.type === "select" && c.selected);
        if (sel && "id" in sel) {
          onSelectEdge((sel as { id: string }).id);
          onSelect(null);
        }
        const desel = changes.find((c) => c.type === "select" && !c.selected);
        if (desel && !sel) onSelectEdge(null);
      },
      [flowEdges, graph, onChange, onSelect, onSelectEdge],
    );

    const isValidConnection = useCallback(
      (conn: Connection | Edge) => {
        if (!conn.source || !conn.target) return false;
        if (conn.source === conn.target) return false;
        const src = graph.nodes.find((n) => n.id === conn.source);
        const tgt = graph.nodes.find((n) => n.id === conn.target);
        if (!src || !tgt) return false;
        return isValidConnectionShape(src, tgt);
      },
      [graph.nodes],
    );

    const onConnect = useCallback(
      (conn: Connection) => {
        if (!isValidConnection(conn)) return;
        const updated = addEdge(
          {
            ...conn,
            id: `e-${nanoid(6)}`,
            animated: true,
            style: { stroke: "#10b981", strokeWidth: 1.75 },
          },
          flowEdges,
        );
        onChange({
          ...graph,
          edges: updated.map((e) => ({
            id: e.id,
            source: e.source,
            target: e.target,
          }) as StrategyEdge),
        });
      },
      [flowEdges, graph, onChange, isValidConnection],
    );

    // Edge reconnect: drag an edge endpoint onto a different handle.
    // If dropped in empty space, the edge is removed.
    const onReconnectStart = useCallback(() => {
      edgeReconnectSuccessful.current = false;
    }, []);

    const onReconnect = useCallback(
      (oldEdge: Edge, newConnection: Connection) => {
        if (!isValidConnection(newConnection)) return;
        edgeReconnectSuccessful.current = true;
        const updated = reconnectEdge(oldEdge, newConnection, flowEdges);
        onChange({
          ...graph,
          edges: updated.map((e) => ({
            id: e.id,
            source: e.source,
            target: e.target,
          }) as StrategyEdge),
        });
      },
      [flowEdges, graph, onChange, isValidConnection],
    );

    const onReconnectEnd = useCallback(
      (_: unknown, edge: Edge) => {
        if (!edgeReconnectSuccessful.current) {
          onChange({
            ...graph,
            edges: graph.edges.filter((e) => e.id !== edge.id),
          });
        }
        edgeReconnectSuccessful.current = true;
      },
      [graph, onChange],
    );

    const onDrop = useCallback(
      (event: React.DragEvent) => {
        event.preventDefault();
        const type = event.dataTransfer.getData("application/zentryx-node") as NodeType;
        if (!type || !instanceRef.current) return;
        const def = getNodeDefinition(type);
        if (!def) return;

        let position: XYPosition;
        try {
          position = instanceRef.current.screenToFlowPosition({
            x: event.clientX,
            y: event.clientY,
          });
          if (!Number.isFinite(position.x) || !Number.isFinite(position.y)) {
            throw new Error("non-finite position");
          }
        } catch {
          const wrapper = wrapperRef.current?.getBoundingClientRect();
          const cx = wrapper ? wrapper.width / 2 : 400;
          const cy = wrapper ? wrapper.height / 2 : 300;
          position = instanceRef.current.screenToFlowPosition({
            x: (wrapper?.left ?? 0) + cx,
            y: (wrapper?.top ?? 0) + cy,
          });
        }

        const newNode: StrategyNode = {
          id: `n-${nanoid(6)}`,
          type,
          category: def.category,
          position,
          params: defaultParams(type),
        };
        const suggestion = suggestEdgeTo(graph, newNode);

        onChange({
          ...graph,
          nodes: [...graph.nodes, newNode],
          edges: suggestion ? [...graph.edges, suggestion] : graph.edges,
        });
        onSelect(newNode.id);
      },
      [graph, onChange, onSelect],
    );

    return (
      <div
        ref={wrapperRef}
        className="h-full w-full"
        onDrop={onDrop}
        onDragOver={(e) => {
          e.preventDefault();
          e.dataTransfer.dropEffect = "copy";
        }}
      >
        <ReactFlow
          nodes={flowNodes}
          edges={flowEdges}
          nodeTypes={nodeTypes}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onReconnect={onReconnect}
          onReconnectStart={onReconnectStart}
          onReconnectEnd={onReconnectEnd}
          isValidConnection={isValidConnection}
          onInit={(i) => {
            instanceRef.current = i;
            if (graph.nodes.length > 0) {
              requestAnimationFrame(() => i.fitView({ padding: 0.4 }));
            }
          }}
          defaultViewport={{ x: 0, y: 0, zoom: 1 }}
          minZoom={0.2}
          maxZoom={2}
          proOptions={{ hideAttribution: true }}
          deleteKeyCode={["Backspace", "Delete"]}
          connectionRadius={30}
          nodesDraggable
          nodesConnectable
          elementsSelectable
          edgesReconnectable
        >
          <Background gap={24} size={1.2} color="#e5e7eb" />
          <Controls
            position="bottom-left"
            showInteractive={false}
            className="!shadow-sm !rounded-lg overflow-hidden"
          />
          <MiniMap
            pannable
            zoomable
            nodeColor="#10b981"
            nodeStrokeColor="#0f5132"
            maskColor="rgba(241,245,249,0.6)"
          />
        </ReactFlow>
      </div>
    );
  },
);

function suggestEdgeTo(
  graph: StrategyGraph,
  newNode: StrategyNode,
): StrategyEdge | null {
  if (graph.nodes.length === 0) return null;
  const targetIdx = CATEGORY_ORDER.indexOf(newNode.category);
  if (targetIdx <= 0) return null;

  for (let i = targetIdx - 1; i >= 0; i--) {
    const category = CATEGORY_ORDER[i];
    const candidates = graph.nodes.filter((n) => n.category === category);
    if (candidates.length === 0) continue;
    const free = candidates.find(
      (c) => !graph.edges.some((e) => e.source === c.id),
    );
    const source = free ?? candidates[candidates.length - 1];
    // Respect the strict rules — if the only upstream candidate would
    // produce an invalid connection (e.g. entry→exit direct), skip.
    if (!isValidConnectionShape(source, newNode)) continue;
    return {
      id: `e-${nanoid(6)}`,
      source: source.id,
      target: newNode.id,
    };
  }
  return null;
}
