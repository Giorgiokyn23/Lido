"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/client";
import { METRICS } from "@/lib/types";

type Recent = {
  id: string;
  beach_id: string;
  commento: string | null;
  avg: number;
  nome?: string;
  localita?: string;
};

// Prova sociale leggera: quante recensioni ha la community e le ultime.
// Client-side (non pesa sul rendering) e si nasconde da sola se non c'è nulla.
// Con `beachIds` la limita a un sottoinsieme di bagni (es. una città).
export function CommunityStrip({ beachIds }: { beachIds?: string[] } = {}) {
  const t = useTranslations("home");
  const supabase = useMemo(() => createClient(), []);
  const [count, setCount] = useState<number | null>(null);
  const [rows, setRows] = useState<Recent[]>([]);
  const idsKey = beachIds ? beachIds.join(",") : "*";

  useEffect(() => {
    let alive = true;
    (async () => {
      // filtro opzionale per città: nessun bagno → niente da mostrare
      if (beachIds && beachIds.length === 0) {
        if (alive) setCount(0);
        return;
      }

      let countQ = supabase
        .from("reviews")
        .select("*", { count: "exact", head: true })
        .in("stato", ["pubblicata", "ridotta"]);
      if (beachIds) countQ = countQ.in("beach_id", beachIds);
      const { count: c } = await countQ;

      const cols = "id,beach_id,commento,created_at," + METRICS.map((m) => m.key).join(",");
      let revQ = supabase
        .from("reviews")
        .select(cols)
        .in("stato", ["pubblicata", "ridotta"])
        .not("commento", "is", null)
        .order("created_at", { ascending: false })
        .limit(12);
      if (beachIds) revQ = revQ.in("beach_id", beachIds);
      const { data: rev } = await revQ;

      const list = (rev ?? []) as unknown as Record<string, number | string | null>[];
      const ids = list.map((r) => String(r.beach_id));
      let beaches: { id: string; nome: string; localita: string }[] = [];
      if (ids.length) {
        const { data: bs } = await supabase
          .from("beaches")
          .select("id,nome,localita")
          .in("id", ids);
        beaches = (bs ?? []) as { id: string; nome: string; localita: string }[];
      }
      const bmap = new Map(beaches.map((b) => [b.id, b]));

      const mapped: Recent[] = list.map((r) => {
        const vals = METRICS.map((m) => r[m.key]).filter(
          (v): v is number => typeof v === "number"
        );
        const avg = vals.length ? vals.reduce((a, v) => a + v, 0) / vals.length : 0;
        const b = bmap.get(String(r.beach_id));
        return {
          id: String(r.id),
          beach_id: String(r.beach_id),
          commento: (r.commento as string | null) ?? null,
          avg,
          nome: b?.nome,
          localita: b?.localita,
        };
      });

      if (!alive) return;
      setCount(c ?? 0);
      setRows(mapped);
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase, idsKey]);

  if (!count) return null; // vuoto o in caricamento → nessun peso in pagina

  return (
    <div className="rounded-2xl border border-sea-100 bg-white p-3 shadow-sm">
      <p className="px-1 text-xs font-semibold text-sea-700">
        ⭐ {t("communityCount", { n: count.toLocaleString() })}
      </p>
      {rows.length > 0 && (
        <div className="mt-2 flex snap-x snap-mandatory gap-2 overflow-x-auto pb-1 [scrollbar-width:thin]">
          {rows.map((r) => (
            <Link
              key={r.id}
              href={`/lido/${r.beach_id}`}
              className="w-[15rem] shrink-0 snap-start rounded-xl border border-sea-100 bg-sea-50/50 p-3 transition hover:border-sea-300"
            >
              <div className="flex items-center gap-2">
                <span className="rounded-lg bg-sea-500 px-2 py-0.5 text-xs font-bold text-white tabular-nums">
                  {r.avg.toFixed(1)}
                </span>
                <span className="truncate text-xs font-semibold text-sea-800">
                  {r.nome ?? "—"}
                  {r.localita ? <span className="font-normal text-sea-400"> · {r.localita}</span> : null}
                </span>
              </div>
              {r.commento && (
                <p className="mt-1 line-clamp-2 text-xs leading-snug text-sea-600">{r.commento}</p>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
