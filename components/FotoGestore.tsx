"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import {
  DIDASCALIA_MASSIMA,
  FORMATI_ACCETTATI,
  MASSIMO_GESTORE,
  indirizzoFoto,
  percorsoCasuale,
  preparaFoto,
  spiegaErroreFoto,
  type FotoPreparata,
} from "@/lib/foto";

type Riga = {
  id: string;
  percorso: string;
  didascalia: string | null;
  stato: string;
};

/**
 * Le foto dello stabilimento, nell'area del gestore: caricamento e galleria
 * in un unico riquadro.
 *
 * STA TUTTO QUI E NON SULLA SCHEDA PUBBLICA perché è qui che si sa chi sta
 * caricando — una rivendicazione approvata. La policy della 0091 lo impone
 * comunque, quindi togliere il pulsante dalla pagina pubblica non è la
 * protezione: è solo coerenza fra quello che si vede e quello che si può.
 *
 * L'ORDINE DELLE OPERAZIONI. Prima il file nell'archivio, poi la riga nel
 * database. Al contrario, una connessione che cade a metà lascerebbe sulla
 * scheda una foto che non esiste, cioè un rettangolo rotto; così il caso
 * peggiore è un file che nessuno nomina — invisibile.
 *
 * NIENTE RICARICAMENTO DI PAGINA dopo il caricamento: l'elenco lo teniamo
 * qui. Nell'area del gestore si carica una foto dopo l'altra, e ricaricare
 * ogni volta sarebbe insopportabile.
 */
export function FotoGestore({ beachId }: { beachId: string }) {
  const t = useTranslations("fotoGestore");
  const input = useRef<HTMLInputElement>(null);

  const [righe, setRighe] = useState<Riga[] | null>(null);
  const [pronta, setPronta] = useState<FotoPreparata | null>(null);
  const [didascalia, setDidascalia] = useState("");
  const [errore, setErrore] = useState<string | null>(null);
  const [attesa, setAttesa] = useState(false);
  const [chiedo, setChiedo] = useState<string | null>(null);

  const carica = useCallback(async () => {
    const supabase = createClient();
    // Anche le nascoste: un gestore che non trova più una sua foto sulla
    // scheda deve poter capire che è stata nascosta, invece di ricaricarla
    // all'infinito chiedendosi perché sparisce.
    const { data } = await supabase
      .from("foto")
      .select("id,percorso,didascalia,stato")
      .eq("beach_id", beachId)
      .eq("fonte", "gestore")
      .neq("stato", "rimossa")
      .order("creato_il", { ascending: false });
    setRighe((data ?? []) as Riga[]);
  }, [beachId]);

  useEffect(() => {
    carica();
  }, [carica]);

  useEffect(() => {
    return () => {
      if (pronta) URL.revokeObjectURL(pronta.anteprima);
    };
  }, [pronta]);

  const quante = (righe ?? []).length;
  const pieno = quante >= MASSIMO_GESTORE;

  async function scegli(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setErrore(null);
    setAttesa(true);
    try {
      const p = await preparaFoto(file);
      if (pronta) URL.revokeObjectURL(pronta.anteprima);
      setPronta(p);
    } catch (err) {
      setErrore(spiegaErroreFoto(err instanceof Error ? err.message : "", "preparazione"));
    } finally {
      setAttesa(false);
      // Azzerare il campo permette di riscegliere lo stesso file dopo un errore.
      if (input.current) input.current.value = "";
    }
  }

  async function pubblica() {
    if (!pronta) return;
    setAttesa(true);
    setErrore(null);

    const supabase = createClient();
    const percorso = percorsoCasuale();

    const { error: errUpload } = await supabase.storage
      .from("foto")
      .upload(percorso, pronta.file, { contentType: "image/webp", upsert: false });
    if (errUpload) {
      setAttesa(false);
      setErrore(spiegaErroreFoto(errUpload.message || "", "archivio"));
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { error: errRiga } = await supabase.from("foto").insert({
      beach_id: beachId,
      user_id: user?.id,
      percorso,
      fonte: "gestore",
      larghezza: pronta.larghezza,
      altezza: pronta.altezza,
      didascalia: didascalia.trim().slice(0, DIDASCALIA_MASSIMA) || null,
    });

    if (errRiga) {
      // La riga non c'è: il file caricato è orfano e invisibile. Proviamo a
      // toglierlo; se non riesce, pazienza — è un problema nostro, non del
      // gestore, e dirglielo non gli servirebbe a niente.
      await supabase.storage.from("foto").remove([percorso]);
      setAttesa(false);
      setErrore(spiegaErroreFoto(errRiga.message || ""));
      return;
    }

    URL.revokeObjectURL(pronta.anteprima);
    setPronta(null);
    setDidascalia("");
    setAttesa(false);
    carica();
  }

  async function cancella(r: Riga) {
    setAttesa(true);
    setErrore(null);
    const supabase = createClient();

    // PRIMA IL FILE, POI LA RIGA — ed è l'opposto di quello che avevo scritto.
    //
    // Il ragionamento sbagliato era: cancello la riga per prima, così se poi
    // qualcosa va storto resta al massimo un file che nessuno nomina, invece
    // di un'immagine rotta sulla scheda. Il guaio è che il permesso di
    // cancellare un file dall'archivio si basa proprio sull'esistenza di
    // quella riga: è lì che è scritto di chi è la foto, visto che il percorso
    // è casuale apposta per non dirlo. Tolta la riga, nessuno risulta più il
    // proprietario e l'archivio rifiuta la cancellazione in silenzio.
    //
    // Il risultato era che «cancella» faceva sparire la foto dalla pagina
    // lasciandola scaricabile da chiunque avesse l'indirizzo. Cioè una
    // cancellazione che non cancellava: il tipo di bugia peggiore da avere
    // in un prodotto che promette «le foto restano tue».
    const { error: errFile } = await supabase.storage.from("foto").remove([r.percorso]);
    if (errFile) {
      setAttesa(false);
      setErrore(t("erroreCancella"));
      return;
    }

    const { error } = await supabase.from("foto").delete().eq("id", r.id);
    if (error) {
      // Il file non c'è più ma la riga sì: sulla scheda resta un riquadro
      // vuoto. È il caso meno grave dei due, e si risolve riprovando.
      setAttesa(false);
      setErrore(t("erroreCancella"));
      carica();
      return;
    }

    setAttesa(false);
    setChiedo(null);
    carica();
  }

  return (
    <section className="rounded-2xl border border-sea-100 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-sm font-semibold text-sea-800">{t("titolo")}</h2>
        <span className="text-xs text-sea-400">
          {t("contatore", { n: quante, max: MASSIMO_GESTORE })}
        </span>
      </div>
      <p className="mt-0.5 text-xs text-sea-500">{t("intro")}</p>

      {/* La galleria di quello che c'è già */}
      {righe === null ? (
        <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="aspect-square animate-pulse rounded-xl bg-sea-50" />
          ))}
        </div>
      ) : righe.length > 0 ? (
        <ul className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-4">
          {righe.map((r) => (
            <li
              key={r.id}
              className={`group relative aspect-square overflow-hidden rounded-xl bg-sea-50 ${
                r.stato !== "pubblicata" ? "ring-2 ring-amber-300" : ""
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={indirizzoFoto(r.percorso)}
                alt={r.didascalia ?? ""}
                loading="lazy"
                className="h-full w-full object-cover"
              />

              {r.stato !== "pubblicata" ? (
                <span className="absolute inset-x-0 bottom-0 bg-amber-500/90 px-1 py-0.5 text-center text-[10px] font-semibold text-white">
                  {t("nascosta")}
                </span>
              ) : chiedo === r.id ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-sea-900/80 p-1">
                  <button
                    onClick={() => cancella(r)}
                    disabled={attesa}
                    className="w-full rounded bg-red-600 px-1 py-1 text-[10px] font-semibold text-white disabled:opacity-50"
                  >
                    {t("confermaCancella")}
                  </button>
                  <button
                    onClick={() => setChiedo(null)}
                    className="w-full rounded bg-white/20 px-1 py-1 text-[10px] text-white"
                  >
                    {t("annulla")}
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setChiedo(r.id)}
                  aria-label={t("cancella")}
                  className="absolute right-1 top-1 rounded-full bg-sea-900/70 px-2 py-1 text-[11px] leading-none text-white transition hover:bg-red-600"
                >
                  ✕
                </button>
              )}
            </li>
          ))}
        </ul>
      ) : null}

      {/* Il caricamento */}
      <div className="mt-4 border-t border-sea-100 pt-4">
        {pronta ? (
          <div>
            {/* L'anteprima è il file che partirà davvero, già ridotto. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={pronta.anteprima}
              alt=""
              className="mx-auto max-h-56 w-auto rounded-xl"
            />
            <p className="mt-2 text-center text-[11px] text-sea-400">
              {t("ridotta", { l: pronta.larghezza, a: pronta.altezza })}
            </p>

            <label htmlFor="fg_didascalia" className="mt-3 block text-xs font-medium text-sea-700">
              {t("didascalia")}
            </label>
            <input
              id="fg_didascalia"
              value={didascalia}
              onChange={(e) => setDidascalia(e.target.value)}
              maxLength={DIDASCALIA_MASSIMA}
              placeholder={t("didascaliaEsempio")}
              className="mt-1 w-full rounded-xl border border-sea-200 px-4 py-2.5 text-sm text-sea-900 focus:border-sea-400 focus:outline-none focus:ring-2 focus:ring-sea-200"
            />

            {errore ? (
              <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{errore}</p>
            ) : null}

            <div className="mt-3 flex gap-2">
              <button
                onClick={pubblica}
                disabled={attesa}
                className="flex-1 rounded-xl bg-sea-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-sea-600 disabled:opacity-60"
              >
                {attesa ? t("invio") : t("pubblica")}
              </button>
              <button
                onClick={() => {
                  URL.revokeObjectURL(pronta.anteprima);
                  setPronta(null);
                  setErrore(null);
                }}
                disabled={attesa}
                className="rounded-xl border border-sea-200 px-4 py-2.5 text-sm text-sea-600 transition hover:bg-sea-50"
              >
                {t("annulla")}
              </button>
            </div>
          </div>
        ) : pieno ? (
          <p className="text-xs text-sea-400">{t("pieno", { max: MASSIMO_GESTORE })}</p>
        ) : (
          <>
            <input
              ref={input}
              type="file"
              accept={FORMATI_ACCETTATI.join(",")}
              onChange={scegli}
              className="hidden"
              id={`fg_input_${beachId}`}
            />
            <label
              htmlFor={`fg_input_${beachId}`}
              className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-sea-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-sea-600"
            >
              {attesa ? t("preparo") : t("aggiungi")}
            </label>
            {errore ? (
              <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{errore}</p>
            ) : null}
            <p className="mt-2 text-[11px] leading-relaxed text-sea-400">{t("regole")}</p>
          </>
        )}
      </div>
    </section>
  );
}
