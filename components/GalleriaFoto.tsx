"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { indirizzoFoto, type FotoPubblica } from "@/lib/foto";

/**
 * La griglia delle foto di uno stabilimento, con ingrandimento e segnalazione.
 *
 * PERCHÉ IL PULSANTE «SEGNALA» STA DENTRO L'INGRANDIMENTO e non sulla
 * miniatura: su una griglia, un pulsante per riquadro è rumore, e soprattutto
 * si clicca per sbaglio. Nell'ingrandimento invece la foto la stai guardando
 * davvero — che è il momento in cui ti accorgi che c'è un problema.
 *
 * SEGNALARE NON NASCONDE NIENTE, e il messaggio lo dice. Se una segnalazione
 * bastasse a far sparire una foto, basterebbe un concorrente infastidito per
 * svuotare la scheda di un rivale. La segnalazione porta la foto in cima alla
 * coda di chi modera: la decisione resta a una persona.
 *
 * L'ingrandimento passa da un portale, per la stessa ragione di PortaAccesso:
 * l'intestazione del sito ha `backdrop-blur`, e un elemento con
 * `backdrop-filter` diventa il riferimento per i figli in `position: fixed`.
 * Dentro quell'elemento nessuna classe CSS centra una finestra.
 */
export function GalleriaFoto({
  foto,
  nomeBagno,
}: {
  foto: FotoPubblica[];
  nomeBagno: string;
}) {
  const t = useTranslations("foto");
  const [montato, setMontato] = useState(false);
  const [aperta, setAperta] = useState<number | null>(null);
  const [segnalate, setSegnalate] = useState<Set<string>>(new Set());
  const [inCorso, setInCorso] = useState(false);

  useEffect(() => setMontato(true), []);

  useEffect(() => {
    if (aperta === null) return;
    const tasti = (e: KeyboardEvent) => {
      if (e.key === "Escape") setAperta(null);
      if (e.key === "ArrowRight") setAperta((i) => (i === null ? null : (i + 1) % foto.length));
      if (e.key === "ArrowLeft")
        setAperta((i) => (i === null ? null : (i - 1 + foto.length) % foto.length));
    };
    document.addEventListener("keydown", tasti);
    const prima = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", tasti);
      document.body.style.overflow = prima;
    };
  }, [aperta, foto.length]);

  if (foto.length === 0) return null;

  async function segnala(id: string) {
    setInCorso(true);
    const supabase = createClient();
    // Chiamata diretta e non azione server: segnalare non richiede un account,
    // e passare da Vercel per scrivere una riga sarebbe processore speso per
    // niente. La funzione nel database è concessa anche agli anonimi.
    await supabase.rpc("segnala_foto", { _id: id });
    setSegnalate((s) => new Set(s).add(id));
    setInCorso(false);
  }

  const corrente = aperta === null ? null : foto[aperta];

  const ingrandimento =
    corrente && montato ? (
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t("ingrandimento")}
        className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-sea-900/90 p-4"
        onClick={(e) => {
          if (e.target === e.currentTarget) setAperta(null);
        }}
      >
        <button
          onClick={() => setAperta(null)}
          aria-label={t("chiudi")}
          className="absolute right-4 top-4 rounded-full bg-white/10 px-3 py-1.5 text-white hover:bg-white/20"
        >
          ✕
        </button>

        {foto.length > 1 ? (
          <>
            <button
              onClick={() => setAperta((i) => (i === null ? null : (i - 1 + foto.length) % foto.length))}
              aria-label={t("precedente")}
              className="absolute left-2 rounded-full bg-white/10 px-3 py-4 text-white hover:bg-white/20 sm:left-6"
            >
              ‹
            </button>
            <button
              onClick={() => setAperta((i) => (i === null ? null : (i + 1) % foto.length))}
              aria-label={t("successiva")}
              className="absolute right-2 rounded-full bg-white/10 px-3 py-4 text-white hover:bg-white/20 sm:right-6"
            >
              ›
            </button>
          </>
        ) : null}

        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={indirizzoFoto(corrente.percorso)}
          alt={corrente.didascalia ?? `${nomeBagno} — ${t("fotoDi")}`}
          className="max-h-[75vh] w-auto max-w-full rounded-xl object-contain"
        />

        <div className="mt-3 w-full max-w-xl text-center">
          {corrente.didascalia ? (
            <p className="text-sm text-white">{corrente.didascalia}</p>
          ) : null}
          <p className="mt-1 text-[11px] text-white/60">
            {t("contatore", { i: (aperta ?? 0) + 1, n: foto.length })}
          </p>

          {segnalate.has(corrente.id) ? (
            <p className="mx-auto mt-3 max-w-sm rounded-lg bg-white/10 px-3 py-2 text-[11px] leading-relaxed text-white/80">
              {t("segnalataGrazie")}
            </p>
          ) : (
            <button
              onClick={() => segnala(corrente.id)}
              disabled={inCorso}
              className="mt-3 text-[11px] text-white/60 underline underline-offset-2 hover:text-white disabled:opacity-50"
            >
              {t("segnala")}
            </button>
          )}
        </div>
      </div>
    ) : null;

  return (
    <>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
        {foto.map((f, i) => (
          <button
            key={f.id}
            onClick={() => setAperta(i)}
            className="group relative aspect-square overflow-hidden rounded-xl bg-sea-50"
            aria-label={f.didascalia ?? t("apriFoto")}
          >
            {/* Niente next/image: ottimizzare queste immagini su Vercel
                significherebbe pagare una trasformazione per ogni miniatura,
                quando il browser le ha già ridotte a 1600px in partenza. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={indirizzoFoto(f.percorso)}
              alt={f.didascalia ?? ""}
              loading="lazy"
              decoding="async"
              width={f.larghezza ?? undefined}
              height={f.altezza ?? undefined}
              className="h-full w-full object-cover transition group-hover:scale-105"
            />
          </button>
        ))}
      </div>

      {montato && ingrandimento ? createPortal(ingrandimento, document.body) : null}
    </>
  );
}
