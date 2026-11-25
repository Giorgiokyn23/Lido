"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";

type Persona = { handle: string; nome: string | null; visitati: number };
type Richiesta = Persona & { creato_il: string };

/**
 * Amici, richieste ricevute, e la ricerca per aggiungerne.
 *
 * PERCHÉ SI CERCA SOLO PER SOPRANNOME ESATTO, dall'inizio e da almeno tre
 * lettere. Un elenco di persone che si sfoglia scrivendo «mar» sarebbe una
 * rubrica — e una rubrica di gente di cui sappiamo dove va al mare, e quando,
 * non deve esistere. Per trovare qualcuno bisogna già sapere come si chiama
 * qui, cioè glielo deve aver detto lui. È lo stesso principio per cui le
 * amicizie sono reciproche e non si può seguire chi non ti ha accettato.
 *
 * Tutto passa dalle funzioni del database: il controllo di chi può vedere
 * cosa sta lì, non in questa pagina. Qui si disegna soltanto.
 */
export function Amici({ haSoprannome }: { haSoprannome: boolean }) {
  const t = useTranslations("social");
  const router = useRouter();

  const [amici, setAmici] = useState<Persona[] | null>(null);
  const [richieste, setRichieste] = useState<Richiesta[]>([]);
  const [cerca, setCerca] = useState("");
  const [trovati, setTrovati] = useState<Persona[] | null>(null);
  const [attesa, setAttesa] = useState(false);
  const [messaggio, setMessaggio] = useState<string | null>(null);

  const ricarica = useCallback(async () => {
    const supabase = createClient();
    const [{ data: a }, { data: r }] = await Promise.all([
      supabase.rpc("miei_amici"),
      supabase.rpc("richieste_amicizia"),
    ]);
    setAmici((a ?? []) as Persona[]);
    setRichieste((r ?? []) as Richiesta[]);
  }, []);

  useEffect(() => {
    ricarica();
  }, [ricarica]);

  async function cercaOra(e: React.FormEvent) {
    e.preventDefault();
    const q = cerca.trim().toLowerCase();
    if (q.length < 3) return;
    setAttesa(true);
    const supabase = createClient();
    const { data } = await supabase.rpc("cerca_profilo", { _q: q });
    setTrovati((data ?? []) as Persona[]);
    setAttesa(false);
  }

  async function chiedi(handle: string) {
    setAttesa(true);
    setMessaggio(null);
    const supabase = createClient();
    const { data, error } = await supabase.rpc("richiedi_amicizia", { _handle: handle });
    setAttesa(false);
    if (error) {
      setMessaggio(t("errGenerico"));
      return;
    }
    setMessaggio(data === "accettata" ? t("oraSieteAmici", { handle }) : t("richiestaInviata", { handle }));
    setTrovati(null);
    setCerca("");
    ricarica();
  }

  async function rispondi(handle: string, accetta: boolean) {
    setAttesa(true);
    const supabase = createClient();
    await supabase.rpc("rispondi_amicizia", { _handle: handle, _accetta: accetta });
    setAttesa(false);
    ricarica();
    router.refresh();
  }

  async function togli(handle: string) {
    setAttesa(true);
    const supabase = createClient();
    await supabase.rpc("togli_amicizia", { _handle: handle });
    setAttesa(false);
    ricarica();
    router.refresh();
  }

  if (!haSoprannome) {
    return (
      <section className="rounded-2xl border border-sea-100 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-sea-800">{t("amiciTitolo")}</h2>
        <p className="mt-2 text-sm text-sea-500">{t("serveSoprannome")}</p>
      </section>
    );
  }

  const riga = (p: Persona, azione: React.ReactNode) => (
    <li
      key={p.handle}
      className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-sea-100 px-3 py-2"
    >
      <div className="min-w-0">
        <a href={`/u/${p.handle}`} className="font-medium text-sea-900 hover:underline">
          {p.nome || `@${p.handle}`}
        </a>
        <div className="truncate text-xs text-sea-500">
          @{p.handle} · {t("bagniVisitati", { n: p.visitati })}
        </div>
      </div>
      <div className="shrink-0">{azione}</div>
    </li>
  );

  const bottone = "rounded-lg px-3 py-1.5 text-xs font-medium transition disabled:opacity-50";

  return (
    <section className="rounded-2xl border border-sea-100 bg-white p-5 shadow-sm">
      <h2 className="text-sm font-semibold text-sea-800">{t("amiciTitolo")}</h2>
      <p className="mt-0.5 text-xs text-sea-500">{t("amiciIntro")}</p>

      {/* Le richieste ricevute vanno in cima: è l'unica cosa che chiede
          una decisione, e in fondo non la vedrebbe nessuno. */}
      {richieste.length > 0 ? (
        <div className="mt-4">
          <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-sea-400">
            {t("richieste", { n: richieste.length })}
          </div>
          <ul className="space-y-2">
            {richieste.map((p) =>
              riga(
                p,
                <div className="flex gap-2">
                  <button
                    onClick={() => rispondi(p.handle, true)}
                    disabled={attesa}
                    className={`${bottone} bg-sea-500 text-white hover:bg-sea-600`}
                  >
                    {t("accetta")}
                  </button>
                  <button
                    onClick={() => rispondi(p.handle, false)}
                    disabled={attesa}
                    className={`${bottone} border border-sea-200 text-sea-600 hover:bg-sea-50`}
                  >
                    {t("rifiuta")}
                  </button>
                </div>
              )
            )}
          </ul>
        </div>
      ) : null}

      {/* Gli amici */}
      <div className="mt-4">
        {amici === null ? (
          <div className="h-12 animate-pulse rounded-xl bg-sea-50" />
        ) : amici.length === 0 ? (
          <p className="text-sm text-sea-400">{t("ancoraNessunAmico")}</p>
        ) : (
          <ul className="space-y-2">
            {amici.map((p) =>
              riga(
                p,
                <button
                  onClick={() => togli(p.handle)}
                  disabled={attesa}
                  className={`${bottone} text-sea-400 hover:text-red-700`}
                >
                  {t("togli")}
                </button>
              )
            )}
          </ul>
        )}
      </div>

      {/* Aggiungere qualcuno */}
      <form onSubmit={cercaOra} className="mt-4 flex flex-wrap gap-2 border-t border-sea-100 pt-4">
        <div className="flex min-w-[12rem] flex-1 items-center rounded-xl border border-sea-200 px-3 focus-within:border-sea-400">
          <span className="text-sea-400">@</span>
          <input
            value={cerca}
            onChange={(e) =>
              setCerca(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "").slice(0, 20))
            }
            placeholder={t("cercaPlaceholder")}
            className="w-full bg-transparent py-2.5 font-mono text-sm text-sea-900 focus:outline-none"
          />
        </div>
        <button
          type="submit"
          disabled={attesa || cerca.trim().length < 3}
          className="rounded-xl border border-sea-300 px-4 py-2.5 text-sm font-medium text-sea-700 transition hover:bg-sea-50 disabled:opacity-50"
        >
          {t("cerca")}
        </button>
      </form>
      <p className="mt-1 text-[11px] text-sea-400">{t("cercaNota")}</p>

      {messaggio ? (
        <p className="mt-2 rounded-lg bg-sea-50 px-3 py-2 text-sm text-sea-700">{messaggio}</p>
      ) : null}

      {trovati !== null ? (
        trovati.length === 0 ? (
          <p className="mt-2 text-sm text-sea-400">{t("nessunoTrovato")}</p>
        ) : (
          <ul className="mt-2 space-y-2">
            {trovati.map((p) =>
              riga(
                p,
                <button
                  onClick={() => chiedi(p.handle)}
                  disabled={attesa}
                  className={`${bottone} bg-sea-500 text-white hover:bg-sea-600`}
                >
                  {t("chiediAmicizia")}
                </button>
              )
            )}
          </ul>
        )
      ) : null}
    </section>
  );
}
