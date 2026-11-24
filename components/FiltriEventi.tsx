"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { indirizzoFoto } from "@/lib/foto";

export type EventoCalendario = {
  id: string;
  beach_id: string;
  stabilimento: string;
  localita: string;
  regione: string | null;
  titolo: string;
  descrizione: string | null;
  data_inizio: string;
  data_fine: string | null;
  tipo: string | null;
  foto_percorso: string | null;
};

/**
 * L'elenco degli eventi con i filtri Dove / Quando / Che tipo.
 *
 * I FILTRI STANNO NEL BROWSER, E NON NELL'INDIRIZZO. Gli aggregatori veri —
 * Blu Livorno fra questi — ricaricano la pagina a ogni spunta, con un
 * pulsante «Search» da premere alla fine. Funziona, ma è il modello di un
 * sito che interroga un archivio enorme. Il nostro calendario sta in qualche
 * centinaio di righe: mandarle tutte una volta sola e filtrare qui significa
 * che ogni spunta è istantanea, che non c'è nessun pulsante «cerca» da
 * premere, e soprattutto che la pagina resta in cache per tutti invece di
 * essere ricalcolata a ogni combinazione di filtri. Quest'ultima non è
 * un'inezia: la pagina dinamica è uno dei quattro motivi per cui l'account
 * Vercel era andato in blocco per consumo di processore.
 *
 * QUANDO NON È UN CALENDARIO A GIORNI. Blu Livorno elenca le date una per
 * una, perché copre una biennale di pochi giorni. Su una stagione intera
 * sarebbero duecento caselle. Qui si sceglie fra intervalli che corrispondono
 * a come una persona decide davvero di uscire: questo fine settimana, nei
 * prossimi sette giorni, questo mese.
 */
export function FiltriEventi({
  eventi,
  locale,
  etichette,
}: {
  eventi: EventoCalendario[];
  locale: string;
  /** Nomi leggibili dei tipi di evento, tradotti a monte dal server. */
  etichette: Record<string, string>;
}) {
  const t = useTranslations("eventi");
  const fmt = locale === "en" ? "en-GB" : "it-IT";

  const [dove, setDove] = useState<string>("");
  const [quando, setQuando] = useState<"tutti" | "weekend" | "settimana" | "mese">("tutti");
  const [tipo, setTipo] = useState<string>("");

  const oggi = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  // I confini temporali si calcolano una volta sola, non a ogni evento.
  const confini = useMemo(() => {
    const giorno = oggi.getDay(); // 0 domenica … 6 sabato
    // «Questo fine settimana» = il prossimo sabato e la domenica dopo. Se oggi
    // è già sabato o domenica, è questo: chi guarda di sabato mattina cerca
    // oggi, non fra sei giorni.
    const aSabato = giorno === 0 ? -1 : 6 - giorno;
    const sabato = new Date(oggi);
    sabato.setDate(oggi.getDate() + aSabato);
    const domenica = new Date(sabato);
    domenica.setDate(sabato.getDate() + 1);

    const fraSette = new Date(oggi);
    fraSette.setDate(oggi.getDate() + 7);

    const fineMese = new Date(oggi.getFullYear(), oggi.getMonth() + 1, 0);

    return {
      weekend: [sabato < oggi ? oggi : sabato, domenica] as const,
      settimana: [oggi, fraSette] as const,
      mese: [oggi, fineMese] as const,
    };
  }, [oggi]);

  // Un evento rientra in un intervallo se si SOVRAPPONE, non se comincia
  // dentro: una sagra che dura da giovedì a domenica deve comparire anche
  // cercando «questo fine settimana».
  function nellIntervallo(e: EventoCalendario, da: Date, a: Date): boolean {
    const inizio = new Date(e.data_inizio);
    const fine = new Date(e.data_fine ?? e.data_inizio);
    return fine >= da && inizio <= a;
  }

  const filtrati = useMemo(() => {
    return eventi.filter((e) => {
      if (dove && e.localita !== dove) return false;
      if (tipo && e.tipo !== tipo) return false;
      if (quando !== "tutti") {
        const [da, a] = confini[quando];
        if (!nellIntervallo(e, da, a)) return false;
      }
      return true;
    });
  }, [eventi, dove, tipo, quando, confini]);

  // I conteggi si fanno su tutto, così una voce di filtro che darebbe zero
  // risultati non viene nemmeno offerta: meglio non poter cliccare che
  // cliccare e trovare il vuoto.
  const luoghi = useMemo(() => {
    const m = new Map<string, number>();
    for (const e of eventi) m.set(e.localita, (m.get(e.localita) ?? 0) + 1);
    return [...m.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  }, [eventi]);

  const tipi = useMemo(() => {
    const m = new Map<string, number>();
    for (const e of eventi) if (e.tipo) m.set(e.tipo, (m.get(e.tipo) ?? 0) + 1);
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [eventi]);

  // Raggruppamento per mese: su una stagione lunga, una lista piatta di
  // trecento schede non si legge. Il mese è la scansione con cui le persone
  // pensano alle vacanze.
  const perMese = useMemo(() => {
    const gruppi = new Map<string, EventoCalendario[]>();
    for (const e of filtrati) {
      const d = new Date(e.data_inizio);
      const chiave = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      if (!gruppi.has(chiave)) gruppi.set(chiave, []);
      gruppi.get(chiave)!.push(e);
    }
    return [...gruppi.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [filtrati]);

  const data = (e: EventoCalendario) => {
    const f = (g: string, conAnno = false) =>
      new Date(g).toLocaleDateString(fmt, {
        day: "numeric",
        month: "short",
        ...(conAnno ? { year: "numeric" } : {}),
      });
    if (!e.data_fine || e.data_fine === e.data_inizio) {
      return new Date(e.data_inizio).toLocaleDateString(fmt, {
        weekday: "long",
        day: "numeric",
        month: "long",
      });
    }
    return `${f(e.data_inizio)} – ${f(e.data_fine)}`;
  };

  const fraQuanto = (e: EventoCalendario) => {
    const g = Math.round((new Date(e.data_inizio).getTime() - oggi.getTime()) / 86_400_000);
    if (g <= 0) return t("oggi");
    if (g === 1) return t("domani");
    if (g <= 7) return t("fraGiorni", { giorni: g });
    return null;
  };

  const nomeMese = (chiave: string) => {
    const [a, m] = chiave.split("-");
    return new Date(Number(a), Number(m) - 1, 1).toLocaleDateString(fmt, {
      month: "long",
      year: "numeric",
    });
  };

  const pillola = (attiva: boolean) =>
    `rounded-full border px-3 py-1.5 text-sm transition ${
      attiva
        ? "border-sea-500 bg-sea-500 text-white"
        : "border-sea-200 bg-white text-sea-600 hover:bg-sea-50"
    }`;

  const Gruppo = ({ titolo, children }: { titolo: string; children: React.ReactNode }) => (
    <div>
      <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-sea-400">
        {titolo}
      </div>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );

  const qualcheFiltro = Boolean(dove || tipo || quando !== "tutti");

  return (
    <>
      <div className="space-y-3 rounded-2xl border border-sea-100 bg-white p-4 shadow-sm">
        <Gruppo titolo={t("quando")}>
          {(["tutti", "weekend", "settimana", "mese"] as const).map((q) => (
            <button key={q} onClick={() => setQuando(q)} className={pillola(quando === q)}>
              {t(`quando_${q}`)}
            </button>
          ))}
        </Gruppo>

        {luoghi.length > 1 ? (
          <Gruppo titolo={t("dove")}>
            <button onClick={() => setDove("")} className={pillola(!dove)}>
              {t("ovunque")}
            </button>
            {luoghi.map(([l, n]) => (
              <button key={l} onClick={() => setDove(l)} className={pillola(dove === l)}>
                {l} <span className="opacity-60">{n}</span>
              </button>
            ))}
          </Gruppo>
        ) : null}

        {tipi.length > 1 ? (
          <Gruppo titolo={t("cheTipo")}>
            <button onClick={() => setTipo("")} className={pillola(!tipo)}>
              {t("tuttiITipi")}
            </button>
            {tipi.map(([v, n]) => (
              <button key={v} onClick={() => setTipo(v)} className={pillola(tipo === v)}>
                {etichette[v] ?? v} <span className="opacity-60">{n}</span>
              </button>
            ))}
          </Gruppo>
        ) : null}

        {qualcheFiltro ? (
          <div className="flex items-center justify-between border-t border-sea-100 pt-3">
            <span className="text-xs text-sea-500">
              {t("risultati", { n: filtrati.length })}
            </span>
            <button
              onClick={() => {
                setDove("");
                setTipo("");
                setQuando("tutti");
              }}
              className="text-xs text-sea-500 underline underline-offset-2"
            >
              {t("azzeraFiltri")}
            </button>
          </div>
        ) : null}
      </div>

      {filtrati.length === 0 ? (
        <p className="rounded-2xl border border-sea-100 bg-white p-6 text-sm text-sea-500 shadow-sm">
          {qualcheFiltro ? t("vuotoConFiltri") : t("vuoto")}
        </p>
      ) : (
        <div className="space-y-8">
          {perMese.map(([chiave, voci]) => (
            <section key={chiave}>
              <h2 className="mb-3 text-sm font-semibold text-sea-500 first-letter:uppercase">
                {nomeMese(chiave)}
              </h2>

              <div className="grid gap-4 sm:grid-cols-2">
                {voci.map((e) => {
                  const manca = fraQuanto(e);
                  return (
                    <article
                      key={e.id}
                      className="overflow-hidden rounded-2xl border border-sea-100 bg-white shadow-sm transition hover:shadow-md"
                    >
                      {e.foto_percorso ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={indirizzoFoto(e.foto_percorso)}
                          alt=""
                          loading="lazy"
                          className="h-40 w-full object-cover"
                        />
                      ) : (
                        // Senza foto, una fascia di colore invece di un buco:
                        // una scheda vuota in mezzo ad altre illustrate sembra
                        // rotta, non sobria.
                        <div className="flex h-40 items-center justify-center bg-gradient-to-br from-sea-100 to-sea-50">
                          <span className="text-4xl font-bold text-sea-300">
                            {e.stabilimento
                              .replace(/[^\p{L}\s]/gu, "")
                              .split(/\s+/)
                              .filter(Boolean)
                              .slice(0, 2)
                              .map((p) => p[0]!.toUpperCase())
                              .join("")}
                          </span>
                        </div>
                      )}

                      <div className="p-4">
                        {e.tipo || manca ? (
                          <div className="mb-2 flex flex-wrap items-center gap-2">
                            {e.tipo ? (
                              <span className="rounded-full border border-sea-200 bg-sea-50 px-2 py-0.5 text-[11px] font-medium text-sea-700">
                                {etichette[e.tipo] ?? e.tipo}
                              </span>
                            ) : null}
                            {manca ? (
                              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-800">
                                {manca}
                              </span>
                            ) : null}
                          </div>
                        ) : null}

                        <h3 className="font-semibold leading-snug text-sea-900">
                          {e.titolo}
                        </h3>
                        <p className="mt-0.5 text-xs text-sea-500 first-letter:uppercase">{data(e)}</p>

                        <Link
                          href={`/lido/${e.beach_id}`}
                          className="mt-1 block truncate text-xs text-sea-600 hover:underline"
                        >
                          {e.stabilimento} · {e.localita}
                        </Link>

                        {e.descrizione ? (
                          <p className="mt-2 line-clamp-3 whitespace-pre-line text-sm leading-relaxed text-sea-700">
                            {e.descrizione}
                          </p>
                        ) : null}
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}
    </>
  );
}
