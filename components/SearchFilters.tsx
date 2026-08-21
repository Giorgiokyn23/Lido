"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { METRICS } from "@/lib/types";

// Barra di ricerca località + filtri verticali (voto minimo per metrica).
// Scrive i filtri nella query string; la Homepage (server) li rilegge e rifiltra.
export function SearchFilters() {
  const router = useRouter();
  const params = useSearchParams();
  const [q, setQ] = useState(params.get("q") ?? "");

  const setParam = (key: string, value: string) => {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    router.push(`/?${next.toString()}`);
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setParam("q", q.trim());
  };

  const reset = () => {
    setQ("");
    router.push("/");
  };

  return (
    <div className="rounded-2xl border border-sea-100 bg-white p-5 shadow-sm">
      <form onSubmit={submit} className="flex gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Cerca per località, lido o regione…  (es. Riccione)"
          className="w-full rounded-xl border border-sea-200 px-4 py-2.5 text-sea-900 placeholder:text-sea-300 focus:border-sea-400 focus:outline-none focus:ring-2 focus:ring-sea-200"
        />
        <button
          type="submit"
          className="shrink-0 rounded-xl bg-sea-500 px-5 py-2.5 font-medium text-white transition hover:bg-sea-600"
        >
          Cerca
        </button>
      </form>

      <div className="mt-4">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-sea-400">
          Filtri verticali — voto minimo
        </p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {METRICS.map((m) => {
            const current = params.get(m.key) ?? "";
            return (
              <label key={m.key} className="flex flex-col gap-1">
                <span className="text-xs text-sea-700">{m.label}</span>
                <select
                  value={current}
                  onChange={(e) => setParam(m.key, e.target.value)}
                  className="rounded-lg border border-sea-200 px-2 py-1.5 text-sm focus:border-sea-400 focus:outline-none"
                >
                  <option value="">Tutti</option>
                  <option value="3">≥ 3.0</option>
                  <option value="4">≥ 4.0</option>
                  <option value="4.5">≥ 4.5</option>
                </select>
              </label>
            );
          })}
        </div>
        <button
          onClick={reset}
          className="mt-3 text-sm text-sea-500 underline-offset-2 hover:underline"
        >
          Azzera filtri
        </button>
      </div>
    </div>
  );
}
