"use client";

import { useEffect, useState } from "react";
import { Globe, Search, Users } from "lucide-react";
import { AppShell } from "@/components/app/shell";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { SetfilesManager } from "@/components/setfiles/SetfilesManager";
import { listPublicSetfiles, setfilePublicUrl, type SetfileRow } from "@/lib/setfiles/client";

export default function SetfilesPage() {
  const [publicRows, setPublicRows] = useState<SetfileRow[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      const rows = await listPublicSetfiles(60);
      if (alive) setPublicRows(rows);
      if (alive) setLoading(false);
    })();
    return () => { alive = false; };
  }, []);

  const filtered = publicRows.filter((r) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      r.name.toLowerCase().includes(q)
      || (r.description ?? "").toLowerCase().includes(q)
      || (r.symbol ?? "").toLowerCase().includes(q)
      || (r.broker ?? "").toLowerCase().includes(q)
    );
  });

  return (
    <AppShell title="Setfiles">
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_380px] gap-4 items-start">
        {/* Personal library */}
        <SetfilesManager
          onlyPersonal
          title="My setfiles"
          description="Store your .set files in one place — broker-scoped, strategy-scoped, or fully private."
        />

        {/* Community setfiles */}
        <Card>
          <CardContent>
            <div className="flex items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-700 text-gray-900 flex items-center gap-1.5"><Users size={14} className="text-emerald-600" /> Community setfiles</h3>
                <p className="text-xs text-gray-500 mt-1">Publicly shared setfiles from other creators.</p>
              </div>
            </div>
            <div className="mt-3">
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Filter by name, symbol, broker…" />
            </div>

            <div className="mt-3">
              {loading ? (
                <div className="py-8 text-center text-xs text-gray-400">Loading…</div>
              ) : filtered.length === 0 ? (
                <EmptyState
                  icon={<Globe size={18} />}
                  title="Nothing shared yet"
                  description="When creators mark a setfile as public, it'll show up here."
                />
              ) : (
                <ul className="divide-y divide-gray-100">
                  {filtered.map((r) => (
                    <li key={r.id} className="py-2.5">
                      <div className="text-sm font-700 text-gray-900 truncate">{r.name}</div>
                      {r.description && <p className="text-[11px] text-gray-500 line-clamp-2 mt-0.5">{r.description}</p>}
                      <div className="mt-1 flex items-center gap-2 flex-wrap">
                        {r.symbol    && <Badge tone="slate">{r.symbol}</Badge>}
                        {r.timeframe && <Badge tone="slate">{r.timeframe}</Badge>}
                        {r.broker    && <span className="text-[10px] text-gray-400">{r.broker}</span>}
                        <a
                          href={setfilePublicUrl(r)}
                          download
                          className="ml-auto text-[10px] font-700 text-emerald-700 hover:text-emerald-800"
                        >
                          Download →
                        </a>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
