"use client";

import type { ReactNode } from "react";
import { useMemo } from "react";
import { cn } from "@/lib/utils/cn";

export interface Column<T> {
  header: string;
  render: (row: T) => ReactNode;
  className?: string;
  width?: string;
  /** Right-align numeric columns for tabular reading. */
  align?: "left" | "right" | "center";
  /** Hide on small screens. */
  hideOnSmall?: boolean;
}

interface Props<T> {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  empty?: ReactNode;
  onRowClick?: (row: T) => void;
  loading?: boolean;
  className?: string;
  /** Enable bulk-select checkbox column. */
  selectable?: boolean;
  selectedIds?: Set<string>;
  onSelectionChange?: (ids: Set<string>) => void;
  /** Rendered when at least one row is selected. */
  bulkActions?: ReactNode;
  /** Rendered above the table (filters etc.). */
  toolbar?: ReactNode;
  /** Rendered below the table. */
  footer?: ReactNode;
}

export function DataTable<T>({
  columns,
  rows,
  rowKey,
  empty,
  onRowClick,
  loading,
  className,
  selectable,
  selectedIds,
  onSelectionChange,
  bulkActions,
  toolbar,
  footer,
}: Props<T>) {
  const allSelected = useMemo(() => {
    if (!selectable || !selectedIds) return false;
    if (rows.length === 0) return false;
    return rows.every((r) => selectedIds.has(rowKey(r)));
  }, [selectable, selectedIds, rows, rowKey]);

  const someSelected = (selectedIds?.size ?? 0) > 0;

  function toggleAll() {
    if (!onSelectionChange) return;
    if (allSelected) {
      onSelectionChange(new Set());
    } else {
      onSelectionChange(new Set(rows.map(rowKey)));
    }
  }

  function toggleOne(id: string) {
    if (!onSelectionChange || !selectedIds) return;
    const next = new Set(selectedIds);
    next.has(id) ? next.delete(id) : next.add(id);
    onSelectionChange(next);
  }

  return (
    <div className={cn("rounded-2xl border border-gray-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)] overflow-hidden", className)}>
      {(toolbar || (someSelected && bulkActions)) && (
        <div className="flex items-center justify-between gap-3 px-4 py-2.5 border-b border-gray-100 bg-gray-50/60">
          <div className="flex items-center gap-2 text-[11px] text-gray-500">
            {someSelected ? (
              <span className="font-600 text-gray-900">{selectedIds?.size} selected</span>
            ) : toolbar}
          </div>
          {someSelected && <div className="flex items-center gap-1.5">{bulkActions}</div>}
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm border-separate border-spacing-0">
          <thead>
            <tr>
              {selectable && (
                <th className="w-8 px-4 py-2.5 text-left">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    ref={(el) => { if (el) el.indeterminate = someSelected && !allSelected; }}
                    onChange={toggleAll}
                    className="rounded border-gray-300 text-emerald-500 focus:ring-emerald-400"
                  />
                </th>
              )}
              {columns.map((c, i) => (
                <th
                  key={i}
                  className={cn(
                    "text-[9px] font-700 uppercase tracking-[0.1em] text-gray-400 px-4 py-2.5 bg-gray-50/40 border-b border-gray-100",
                    c.align === "right" ? "text-right" : c.align === "center" ? "text-center" : "text-left",
                    c.hideOnSmall && "hidden md:table-cell",
                    c.className,
                  )}
                  style={c.width ? { width: c.width } : undefined}
                >
                  {c.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={columns.length + (selectable ? 1 : 0)} className="px-4 py-14 text-center text-xs text-gray-400">
                  <span className="inline-block w-3 h-3 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin mr-2 align-middle" />
                  Loading…
                </td>
              </tr>
            )}
            {!loading && rows.length === 0 && (
              <tr>
                <td colSpan={columns.length + (selectable ? 1 : 0)} className="px-4 py-14 text-center text-xs text-gray-400">
                  {empty ?? "No records."}
                </td>
              </tr>
            )}
            {!loading &&
              rows.map((row) => {
                const id = rowKey(row);
                const sel = selectedIds?.has(id) ?? false;
                return (
                  <tr
                    key={id}
                    onClick={onRowClick ? () => onRowClick(row) : undefined}
                    className={cn(
                      "group transition-colors border-b border-gray-50 last:border-0",
                      sel ? "bg-emerald-50/50" : "hover:bg-gray-50/70",
                      onRowClick && "cursor-pointer",
                    )}
                  >
                    {selectable && (
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={sel}
                          onChange={() => toggleOne(id)}
                          className="rounded border-gray-300 text-emerald-500 focus:ring-emerald-400"
                        />
                      </td>
                    )}
                    {columns.map((c, i) => (
                      <td
                        key={i}
                        className={cn(
                          "px-4 py-3 text-gray-700",
                          c.align === "right" ? "text-right tabular-nums" : c.align === "center" ? "text-center" : "text-left",
                          c.hideOnSmall && "hidden md:table-cell",
                          c.className,
                        )}
                      >
                        {c.render(row)}
                      </td>
                    ))}
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>
      {footer && <div className="border-t border-gray-100 px-4 py-2.5 text-[11px] text-gray-500">{footer}</div>}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────
// OwnerLink — clickable user-ID link for table cells
// ────────────────────────────────────────────────────────────────────

export function OwnerLink({ userId }: { userId: string | null }) {
  if (!userId) return <span className="text-gray-400">—</span>;
  return (
    <a
      href={`/admin/users/${userId}`}
      className="text-[11px] font-600 text-emerald-600 hover:text-emerald-700 hover:underline font-mono"
      onClick={(e) => e.stopPropagation()}
    >
      {userId.slice(0, 8)}…
    </a>
  );
}
