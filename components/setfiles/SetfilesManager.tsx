"use client";

// ──────────────────────────────────────────────────────────────────
// SetfilesManager
// ──────────────────────────────────────────────────────────────────
// Shared setfile list + upload surface, reused by:
//   • /marketplace/listings  — creators attach setfiles to their listing
//   • /setfiles              — personal / standalone library
//
// Props pick the scope and any default attachment (listing_id / strategy_id).
// ──────────────────────────────────────────────────────────────────

import { useCallback, useEffect, useRef, useState } from "react";
import { FileCode2, Upload, Download, Trash2, Globe, Lock, Pencil, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { toast } from "@/components/ui/toast";
import { cn } from "@/lib/utils/cn";
import {
  listMySetfiles,
  uploadSetfile,
  updateSetfile,
  deleteSetfile,
  setfilePublicUrl,
  MAX_SETFILE_BYTES,
  ACCEPTED_SETFILE_EXT,
  type SetfileRow,
} from "@/lib/setfiles/client";

export interface SetfilesManagerProps {
  /** Attach new uploads to this listing. Changes the default scope. */
  listingId?: string;
  /** Attach new uploads to this personal strategy. */
  strategyId?: string;
  /** Restrict the list to personal (standalone) setfiles only. */
  onlyPersonal?: boolean;
  /** Hide the public-share toggle (e.g. inside listing editor: always attached). */
  hidePublicToggle?: boolean;
  /** Optional label tweaks. */
  title?: string;
  description?: string;
  /** Callback on mutation — lets parent refresh badges / counts. */
  onChange?: () => void;
}

const TIMEFRAMES = ["", "M1", "M5", "M15", "M30", "H1", "H4", "D1", "W1"];

export function SetfilesManager(props: SetfilesManagerProps) {
  const [rows, setRows] = useState<SetfileRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const list = await listMySetfiles({
        listingId: props.listingId,
        strategyId: props.strategyId,
        onlyPersonal: props.onlyPersonal,
      });
      setRows(list);
    } catch (err) {
      toast.error("Failed to load setfiles: " + (err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [props.listingId, props.strategyId, props.onlyPersonal]);

  useEffect(() => { void load(); }, [load]);

  async function pickFile(file: File) {
    if (file.size > MAX_SETFILE_BYTES) {
      toast.error(`Too large (${Math.round(file.size / 1024)} KB). Max ${Math.round(MAX_SETFILE_BYTES / 1024)} KB.`);
      return;
    }
    setUploading(true);
    try {
      await uploadSetfile({
        file,
        name: file.name.replace(/\.[^.]+$/, ""),
        listingId: props.listingId ?? null,
        strategyId: props.strategyId ?? null,
        isPublic: props.listingId ? true : false,
      });
      toast.success("Setfile uploaded.");
      void load();
      props.onChange?.();
    } catch (err) {
      toast.error("Upload failed: " + (err as Error).message);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!window.confirm(`Delete "${name}"? This cannot be undone.`)) return;
    try {
      await deleteSetfile(id);
      toast.success("Deleted.");
      void load();
      props.onChange?.();
    } catch (err) {
      toast.error("Failed: " + (err as Error).message);
    }
  }

  const headerTitle = props.title ?? "Setfiles";
  const headerSub = props.description ?? (
    props.listingId
      ? "Attach .set files buyers will receive alongside the .mq5 download."
      : "Your personal setfile library. Shared files appear in the community."
  );

  return (
    <Card>
      <CardContent>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-sm font-700 text-gray-900">{headerTitle}</h3>
            <p className="text-xs text-gray-500 mt-1">{headerSub}</p>
          </div>
          <div className="flex items-center gap-2">
            <input
              ref={fileRef}
              type="file"
              accept={ACCEPTED_SETFILE_EXT.join(",")}
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void pickFile(f);
              }}
            />
            <Button size="sm" onClick={() => fileRef.current?.click()} disabled={uploading}>
              {uploading ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />}
              {uploading ? "Uploading…" : "Upload setfile"}
            </Button>
          </div>
        </div>

        <div className="mt-4">
          {loading ? (
            <div className="py-10 text-center text-xs text-gray-400">Loading…</div>
          ) : rows.length === 0 ? (
            <EmptyState
              icon={<FileCode2 size={18} />}
              title="No setfiles yet"
              description={props.listingId
                ? "Drop a .set file to include it with this listing's downloads."
                : "Upload your first .set file to save it here. Max 512 KB each."}
            />
          ) : (
            <ul className="divide-y divide-gray-100">
              {rows.map((r) => (
                <SetfileRowView
                  key={r.id}
                  row={r}
                  editing={editingId === r.id}
                  onEdit={() => setEditingId(r.id)}
                  onCancelEdit={() => setEditingId(null)}
                  onSaved={() => { setEditingId(null); void load(); props.onChange?.(); }}
                  onDelete={() => handleDelete(r.id, r.name)}
                  hidePublicToggle={props.hidePublicToggle}
                />
              ))}
            </ul>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ── Row ───────────────────────────────────────────────────────────

function SetfileRowView({
  row,
  editing,
  onEdit,
  onCancelEdit,
  onSaved,
  onDelete,
  hidePublicToggle,
}: {
  row: SetfileRow;
  editing: boolean;
  onEdit: () => void;
  onCancelEdit: () => void;
  onSaved: () => void;
  onDelete: () => void;
  hidePublicToggle?: boolean;
}) {
  const [name, setName] = useState(row.name);
  const [description, setDescription] = useState(row.description ?? "");
  const [symbol, setSymbol] = useState(row.symbol ?? "");
  const [timeframe, setTimeframe] = useState(row.timeframe ?? "");
  const [broker, setBroker] = useState(row.broker ?? "");
  const [isPublic, setIsPublic] = useState(row.is_public);
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    try {
      await updateSetfile(row.id, {
        name: name.trim() || row.name,
        description: description.trim() || null,
        symbol: symbol.trim() || null,
        timeframe: timeframe || null,
        broker: broker.trim() || null,
        is_public: isPublic,
      });
      toast.success("Saved.");
      onSaved();
    } catch (err) {
      toast.error("Failed: " + (err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <li className="py-3.5">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center shrink-0">
          <FileCode2 size={16} className="text-emerald-600" />
        </div>
        <div className="flex-1 min-w-0">
          {editing ? (
            <div className="space-y-2">
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" />
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} maxLength={240} placeholder="Optional notes (broker, risk config, session)…" className="min-h-[60px]" />
              <div className="grid grid-cols-3 gap-2">
                <Input value={symbol} onChange={(e) => setSymbol(e.target.value)} placeholder="Symbol (EURUSD)" />
                <select
                  value={timeframe}
                  onChange={(e) => setTimeframe(e.target.value)}
                  className="h-9 rounded-lg border border-gray-200 bg-white px-3 text-sm"
                >
                  {TIMEFRAMES.map((t) => <option key={t || "any"} value={t}>{t || "Any TF"}</option>)}
                </select>
                <Input value={broker} onChange={(e) => setBroker(e.target.value)} placeholder="Broker" />
              </div>
              {!hidePublicToggle && (
                <label className="flex items-center gap-2 text-xs text-gray-600">
                  <input
                    type="checkbox"
                    checked={isPublic}
                    onChange={(e) => setIsPublic(e.target.checked)}
                    className="rounded border-gray-300 text-emerald-500 focus:ring-emerald-400"
                  />
                  Share publicly in the community
                </label>
              )}
              <div className="flex items-center gap-2 pt-1">
                <Button size="sm" onClick={save} disabled={busy}>{busy ? "Saving…" : "Save"}</Button>
                <Button size="sm" variant="ghost" onClick={onCancelEdit} disabled={busy}>Cancel</Button>
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2 flex-wrap">
                <div className="text-sm font-700 text-gray-900 truncate">{row.name}</div>
                {row.is_public ? <Badge tone="emerald"><Globe size={9} className="inline mr-0.5" />Public</Badge> : <Badge tone="slate"><Lock size={9} className="inline mr-0.5" />Private</Badge>}
                {row.scope === "listing" && <Badge tone="purple">Attached</Badge>}
              </div>
              {row.description && <p className="mt-1 text-xs text-gray-500 leading-relaxed line-clamp-2">{row.description}</p>}
              <div className="mt-1.5 flex items-center gap-3 text-[10px] text-gray-400 flex-wrap">
                {row.symbol    && <span>Symbol: {row.symbol}</span>}
                {row.timeframe && <span>TF: {row.timeframe}</span>}
                {row.broker    && <span>Broker: {row.broker}</span>}
                {row.file_bytes != null && <span>{(row.file_bytes / 1024).toFixed(1)} KB</span>}
              </div>
            </>
          )}
        </div>
        {!editing && (
          <div className="flex items-center gap-1 shrink-0">
            <a href={setfilePublicUrl(row)} download className="inline-flex items-center justify-center w-8 h-8 rounded-md text-gray-500 hover:text-emerald-600 hover:bg-emerald-50" title="Download">
              <Download size={14} />
            </a>
            <button onClick={onEdit} className="inline-flex items-center justify-center w-8 h-8 rounded-md text-gray-500 hover:text-gray-900 hover:bg-gray-100" title="Edit">
              <Pencil size={14} />
            </button>
            <button onClick={onDelete} className="inline-flex items-center justify-center w-8 h-8 rounded-md text-red-500 hover:bg-red-50" title="Delete">
              <Trash2 size={14} />
            </button>
          </div>
        )}
      </div>
    </li>
  );
}
