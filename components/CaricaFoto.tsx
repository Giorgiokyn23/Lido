"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { PortaAccesso } from "@/components/PortaAccesso";
import {
  DIDASCALIA_MASSIMA,
  FORMATI_ACCETTATI,
  MASSIMO_PER_BAGNO,
  percorsoCasuale,
  preparaFoto,
  spiegaErroreFoto,
  type FotoPreparata,
} from "@/lib/foto";

/**
 * Caricamento di una foto su uno stabilimento.
 *
 * L'ORDINE DELLE OPERAZIONI CONTA, e non è quello che verrebbe naturale.
 * Prima si carica il file nell'archivio, poi si scrive la riga nel database.
 * Al contrario — riga prima, file dopo — una connessione che cade a metà
 * lascerebbe sulla scheda una foto che non esiste, cioè un rettangolo rotto.
 * Così invece il caso peggiore è un file nell'archivio che nessuno nomina:
 * invisibile, e recuperabile con una pulizia periodica.
 *
 * SI VEDE SUBITO. Appena il database conferma, la foto compare. Non c'è una
 * coda di approvazione, ed è una scelta: con una persona sola a moderare, una
 * coda preventiva significa che per giorni non si pubblica niente, e la parte
 * social muore prima di cominciare. La protezione è la stessa che il sito usa
 * già per le recensioni — pubblicazione immediata, segnalazione a un clic,
 * rimozione rapida e registrata.
 */
export function CaricaFoto({ beachId }: { beachId: string }) {
  const t = useTranslations("foto");
  const input = useRef<HTMLInputElement>(null);
  const [pronta, setPronta] = useState<FotoPreparata | null>(null);
  const [didascalia, setDidascalia] = useState("");
  const [errore, setErrore] = useState<string | null>(null);
  const [attesa, setAttesa] = useState(false);
  const [porta, setPorta] = useState(false);
  const [fatto, setFatto] = useState(false);

  // CHI SEI E QUANTE NE HAI GIÀ CARICATE SI CHIEDE QUI, DAL BROWSER, e non
  // arriva come proprietà dal server. La scheda del bagno è in cache per
  // ventiquattr'ore: qualunque dato personale calcolato lassù verrebbe
  // congelato nella pagina e poi servito a tutti gli altri. È lo stesso
  // motivo per cui la home ha smesso di essere dinamica dopo il blocco
  // dell'account per consumo di processore.
  const [autenticato, setAutenticato] = useState<boolean | null>(null);
  const [quante, setQuante] = useState(0);

  useEffect(() => {
    let vivo = true;
    (async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!vivo) return;
      if (!user) {
        setAutenticato(false);
        return;
      }
      // Conta anche le nascoste: una foto nascosta dalla moderazione occupa
      // il posto, altrimenti si ricaricherebbe la stessa all'infinito.
      const { count } = await supabase
        .from("foto")
        .select("id", { count: "exact", head: true })
        .eq("beach_id", beachId)
        .eq("user_id", user.id)
        .neq("stato", "rimossa");
      if (!vivo) return;
      setQuante(count ?? 0);
      setAutenticato(true);
    })();
    return () => {
      vivo = false;
    };
  }, [beachId]);

  // L'anteprima è un indirizzo creato in memoria: se non lo si revoca, il
  // browser tiene l'immagine viva fino alla chiusura della pagina.
  useEffect(() => {
    return () => {
      if (pronta) URL.revokeObjectURL(pronta.anteprima);
    };
  }, [pronta]);

  const pieno = quante >= MASSIMO_PER_BAGNO;

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
      setErrore(spiegaErroreFoto(err instanceof Error ? err.message : ""));
    } finally {
      setAttesa(false);
      // Azzerare il campo permette di riscegliere lo stesso file dopo un errore.
      if (input.current) input.current.value = "";
    }
  }

  async function carica() {
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
      setErrore(spiegaErroreFoto(errUpload.message || ""));
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { error: errRiga } = await supabase.from("foto").insert({
      beach_id: beachId,
      user_id: user?.id,
      percorso,
      larghezza: pronta.larghezza,
      altezza: pronta.altezza,
      didascalia: didascalia.trim().slice(0, DIDASCALIA_MASSIMA) || null,
    });

    if (errRiga) {
      // La riga non c'è: il file caricato è orfano e invisibile. Proviamo a
      // togliercelo, e se non riesce pazienza — meglio un file inutile che un
      // messaggio di errore su qualcosa che all'utente non serve sapere.
      await supabase.storage.from("foto").remove([percorso]);
      setAttesa(false);
      setErrore(spiegaErroreFoto(errRiga.message || ""));
      return;
    }

    URL.revokeObjectURL(pronta.anteprima);
    setPronta(null);
    setDidascalia("");
    setFatto(true);
    // Ricarica la pagina: la griglia è resa dal server e non saprebbe della
    // foto nuova. È una riga sola contro un intero stato condiviso da mantenere.
    setTimeout(() => window.location.reload(), 600);
  }

  if (fatto) {
    return (
      <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
        {t("caricata")}
      </p>
    );
  }

  // Finché non si sa chi è, non si mostra né l'uno né l'altro: un pulsante
  // che cambia significato mezzo secondo dopo è peggio di un pulsante che
  // arriva mezzo secondo dopo.
  if (autenticato === null) {
    return <div className="h-10 w-40 animate-pulse rounded-xl bg-sea-50" />;
  }

  if (!autenticato) {
    return (
      <>
        <button
          onClick={() => setPorta(true)}
          className="rounded-xl border border-sea-200 bg-white px-4 py-2.5 text-sm font-semibold text-sea-700 transition hover:bg-sea-50"
        >
          {t("aggiungi")}
        </button>
        <p className="mt-2 text-xs text-sea-400">{t("serveProfilo")}</p>
        <PortaAccesso
          aperto={porta}
          onChiudi={() => setPorta(false)}
          titolo={t("portaTitolo")}
          sottotitolo={t("portaSottotitolo")}
        />
      </>
    );
  }

  if (pieno) {
    return (
      <p className="text-xs text-sea-400">{t("limiteRaggiunto", { n: MASSIMO_PER_BAGNO })}</p>
    );
  }

  return (
    <div>
      {pronta ? (
        <div className="rounded-2xl border border-sea-100 bg-white p-4">
          {/* L'anteprima è il file che partirà davvero, già ridotto: quello che
              si vede qui è esattamente quello che vedranno gli altri. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={pronta.anteprima}
            alt=""
            className="mx-auto max-h-64 w-auto rounded-xl"
          />
          <p className="mt-2 text-center text-[11px] text-sea-400">
            {t("ridotta", { l: pronta.larghezza, a: pronta.altezza })}
          </p>

          <label htmlFor="foto_didascalia" className="mt-3 block text-xs font-medium text-sea-700">
            {t("didascalia")}
          </label>
          <input
            id="foto_didascalia"
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
              onClick={carica}
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

          <p className="mt-3 text-[11px] leading-relaxed text-sea-400">{t("regole")}</p>
        </div>
      ) : (
        <>
          <input
            ref={input}
            type="file"
            accept={FORMATI_ACCETTATI.join(",")}
            onChange={scegli}
            className="hidden"
            id={`foto_input_${beachId}`}
          />
          <label
            htmlFor={`foto_input_${beachId}`}
            className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-sea-200 bg-white px-4 py-2.5 text-sm font-semibold text-sea-700 transition hover:bg-sea-50"
          >
            {attesa ? t("preparo") : t("aggiungi")}
          </label>
          {errore ? (
            <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{errore}</p>
          ) : null}
          <p className="mt-2 text-xs text-sea-400">
            {t("restano", { n: MASSIMO_PER_BAGNO - quante })} · {t("nienteGps")}
          </p>
        </>
      )}
    </div>
  );
}
