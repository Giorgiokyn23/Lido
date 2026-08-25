"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { METRICS, CONTINENTS, CONTINENT_OF, FLAG_OF, type BeachScore } from "@/lib/types";
import { BeachCardClient } from "@/components/BeachCardClient";

const PAGE_SIZE = 24;

type Suggestion = { id: string; nome: string; localita: string; regione: string; paese: string | null };

export function SearchExperience({ locale }: { locale: string }) {
  const t = useTranslations("home");
  const tm = useTranslations("metrics");
  const tc = useTranslations("countries");
  const tcont = useTranslations("continents");
  const supabase = useMemo(() => createClient(), []);

  const [q, setQ] = useState("");
  const [committedQ, setCommittedQ] = useState("");
  const [paese, setPaese] = useState("");
  const [openContinent, setOpenContinent] = useState<string | null>(null);
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [page, setPage] = useState(1);

  const [rows, setRows] = useState<BeachScore[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [showFilters, setShowFilters] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [openSug, setOpenSug] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  const activeFilters = Object.values(filters).filter(Boolean).length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  // ---- ricerca risultati (client, nessuna navigazione => niente salto pagina)
  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      setErr(null);
      const from = (page - 1) * PAGE_SIZE;
      let query = supabase
        .from("beach_scores")
        .select("*", { count: "exact" })
        .order("avg_overall", { ascending: false, nullsFirst: false })
        .order("reviews_count", { ascending: false })
        .range(from, from + PAGE_SIZE - 1);
      if (committedQ) {
        query = query.or(
          `nome.ilike.%${committedQ}%,localita.ilike.%${committedQ}%,regione.ilike.%${committedQ}%`
        );
      }
      if (paese) query = query.eq("paese", paese);
      for (const m of METRICS) {
        const v = filters[m.key];
        if (v) query = query.gte(`avg_${m.key}`, parseFloat(v));
      }
      const { data, error, count } = await query;
      if (!alive) return;
      if (error) setErr(error.message);
      setRows((data ?? []) as BeachScore[]);
      setTotal(count ?? 0);
      setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, [supabase, committedQ, paese, filters, page]);

  // ---- autocomplete (debounced) dal DB, senza API esterne
  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) {
      setSuggestions([]);
      return;
    }
    const h = setTimeout(async () => {
      const { data } = await supabase
        .from("beach_scores")
        .select("id,nome,localita,regione,paese")
        .or(`nome.ilike.%${term}%,localita.ilike.%${term}%`)
        .order("reviews_count", { ascending: false })
        .limit(6);
      setSuggestions((data ?? []) as Suggestion[]);
      setOpenSug(true);
    }, 180);
    return () => clearTimeout(h);
  }, [q, supabase]);

  // chiudi il dropdown cliccando fuori
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpenSug(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const doSearch = (term: string) => {
    setCommittedQ(term.trim());
    setPage(1);
    setOpenSug(false);
  };
  const setCountry = (code: string) => {
    setPaese(code);
    setPage(1);
  };
  const resetGeo = () => {
    setPaese("");
    setOpenContinent(null);
    setPage(1);
  };
  const toggleContinent = (key: string) => {
    setOpenContinent((cur) => (cur === key ? null : key));
  };
  const setFilter = (key: string, val: string) => {
    setFilters((f) => ({ ...f, [key]: val }));
    setPage(1);
  };
  const resetFilters = () => {
    setFilters({});
    setPage(1);
  };

  const chip = (active: boolean) =>
    `rounded-full px-3 py-1.5 text-sm font-medium transition ${
      active ? "bg-sea-600 text-white" : "bg-sea-50 text-sea-700 hover:bg-sea-100"
    }`;

  return (
    <div className="space-y-6">
      {/* geografia: continenti → bandiere */}
      <div className="space-y-3">
        <div className="flex flex-wrap gap-2">
          <button onClick={resetGeo} className={chip(!paese && !openContinent)}>
            🌍 {tc("all")}
          </button>
          {CONTINENTS.map((cont) => {
            const isOpen = openContinent === cont.key;
            const hasActive = paese !== "" && CONTINENT_OF[paese] === cont.key;
            return (
              <button
                key={cont.key}
                onClick={() => toggleContinent(cont.key)}
                aria-expanded={isOpen}
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition ${
                  hasActive
                    ? "bg-sea-600 text-white"
                    : isOpen
                    ? "bg-sea-100 text-sea-800 ring-1 ring-sea-300"
                    : "bg-sea-50 text-sea-700 hover:bg-sea-100"
                }`}
              >
                <span>{cont.emoji}</span>
                <span>{tcont(cont.key)}</span>
                <span className="text-xs opacity-60">{cont.codes.length}</span>
                <svg
                  viewBox="0 0 20 20"
                  className={`h-3.5 w-3.5 transition-transform ${isOpen ? "rotate-180" : ""}`}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                >
                  <path d="M5 8l5 5 5-5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            );
          })}
        </div>

        {openContinent && (
          <div className="flex flex-wrap gap-2 rounded-2xl border border-sea-100 bg-sea-50/50 p-3">
            {CONTINENTS.find((c) => c.key === openContinent)!.codes.map((code) => (
              <button
                key={code}
                onClick={() => setCountry(paese === code ? "" : code)}
                className={chip(paese === code)}
              >
                {FLAG_OF[code]} {tc(code)}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ricerca + filtri */}
      <div className="rounded-2xl border border-sea-100 bg-white p-5 shadow-sm">
        <div className="flex gap-2">
          <div ref={boxRef} className="relative flex-1">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                doSearch(q);
              }}
            >
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onFocus={() => suggestions.length && setOpenSug(true)}
                placeholder={t("searchPlaceholder")}
                className="w-full rounded-xl border border-sea-200 px-4 py-2.5 text-sea-900 placeholder:text-sea-300 focus:border-sea-400 focus:outline-none focus:ring-2 focus:ring-sea-200"
              />
            </form>
            {openSug && suggestions.length > 0 && (
              <ul className="absolute z-30 mt-1 w-full overflow-hidden rounded-xl border border-sea-100 bg-white shadow-lg">
                {suggestions.map((s) => (
                  <li key={s.id}>
                    <button
                      onClick={() => {
                        setQ(s.nome);
                        doSearch(s.nome);
                      }}
                      className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm hover:bg-sea-50"
                    >
                      <span className="truncate font-medium text-sea-800">{s.nome}</span>
                      <span className="truncate text-xs text-sea-400">{s.localita} · {s.regione}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <button
            onClick={() => doSearch(q)}
            className="shrink-0 rounded-xl bg-sea-500 px-5 py-2.5 font-medium text-white transition hover:bg-sea-600"
          >
            {t("searchButton")}
          </button>
          <button
            onClick={() => setShowFilters((v) => !v)}
            className="shrink-0 rounded-xl border border-sea-200 px-4 py-2.5 text-sm font-medium text-sea-700 hover:bg-sea-50"
          >
            {showFilters ? t("hideFilters") : t("filters")}
            {activeFilters > 0 && (
              <span className="ml-1.5 rounded-full bg-sea-500 px-1.5 py-0.5 text-[10px] text-white">
                {activeFilters}
              </span>
            )}
          </button>
        </div>

        {showFilters && (
          <div className="mt-4 border-t border-sea-100 pt-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-sea-400">
              {t("filtersHeading")}
            </p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {METRICS.map((m) => (
                <label key={m.key} className="flex flex-col gap-1">
                  <span className="text-xs text-sea-700">{tm(m.key)}</span>
                  <select
                    value={filters[m.key] ?? ""}
                    onChange={(e) => setFilter(m.key, e.target.value)}
                    className="rounded-lg border border-sea-200 px-2 py-1.5 text-sm focus:border-sea-400 focus:outline-none"
                  >
                    <option value="">{t("optAll")}</option>
                    <option value="3">≥ 3.0</option>
                    <option value="4">≥ 4.0</option>
                    <option value="4.5">≥ 4.5</option>
                  </select>
                </label>
              ))}
            </div>
            {activeFilters > 0 && (
              <button onClick={resetFilters} className="mt-3 text-sm text-sea-500 hover:underline">
                {t("reset")}
              </button>
            )}
          </div>
        )}
      </div>

      {/* risultati */}
      {err ? (
        <p className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{t("error")} {err}</p>
      ) : (
        <section>
          <p className="mb-3 text-sm text-sea-500">
            {loading
              ? t("loading")
              : t("found", { count: total.toLocaleString(locale), page, pages: totalPages })}
          </p>

          {!loading && rows.length === 0 ? (
            <p className="rounded-xl bg-white p-8 text-center text-sea-500 shadow-sm">{t("empty")}</p>
          ) : (
            <div
              className={`grid grid-cols-1 gap-4 transition-opacity sm:grid-cols-2 lg:grid-cols-3 ${
                loading ? "opacity-50" : "opacity-100"
              }`}
            >
              {rows.map((b) => (
                <BeachCardClient key={b.id} beach={b} />
              ))}
            </div>
          )}

          {totalPages > 1 && (
            <nav className="mt-8 flex items-center justify-center gap-3">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="rounded-lg border border-sea-200 bg-white px-4 py-2 text-sm font-medium text-sea-700 hover:bg-sea-50 disabled:opacity-40"
              >
                {t("prev")}
              </button>
              <span className="text-sm text-sea-500">{page} / {totalPages}</span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="rounded-lg border border-sea-200 bg-white px-4 py-2 text-sm font-medium text-sea-700 hover:bg-sea-50 disabled:opacity-40"
              >
                {t("next")}
              </button>
            </nav>
          )}
        </section>
      )}
    </div>
  );
}
