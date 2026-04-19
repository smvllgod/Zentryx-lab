// Browser-side CSV export. Works for any array-of-records.

import { toast } from "@/components/ui/toast";

export function downloadCsv<T>(
  filename: string,
  rows: T[],
  columns?: { key: keyof T | string; header?: string }[],
) {
  if (!rows.length) {
    toast.error("No rows to export.");
    return;
  }
  const cols: { key: keyof T | string; header?: string }[] =
    columns ?? Object.keys(rows[0] as unknown as Record<string, unknown>).map((k) => ({ key: k }));
  const header = cols.map((c) => csvCell(c.header ?? String(c.key))).join(",");
  const body = rows
    .map((r) =>
      cols
        .map((c) => csvCell((r as unknown as Record<string, unknown>)[c.key as string]))
        .join(","),
    )
    .join("\n");
  const csv = header + "\n" + body;
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".csv") ? filename : filename + ".csv";
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function csvCell(v: unknown): string {
  if (v === null || v === undefined) return "";
  if (typeof v === "object") return csvCell(JSON.stringify(v));
  const s = String(v);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}
