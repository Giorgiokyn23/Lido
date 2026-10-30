import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";

export type CampiProfilo = {
  descrizione: string | null;
  orari: string | null;
  telefono: string | null;
  email_pubblica: string | null;
  sito: string | null;
  link_prenotazione: string | null;
};

/** Quanti campi del profilo sono compilati, su sei. */
export function completezza(p: CampiProfilo | null): { fatti: number; totale: number; pct: number } {
  const campi = [
    p?.descrizione,
    p?.orari,
    p?.telefono,
    p?.email_pubblica,
    p?.sito,
    p?.link_prenotazione,
  ];
  const fatti = campi.filter((c) => c && c.trim().length > 0).length;
  return { fatti, totale: campi.length, pct: Math.round((fatti / campi.length) * 100) };
}

/**
 * Barra di avanzamento e prossima azione consigliata.
 * Un solo invito per schermata, come nei principi UX del Partner Hub:
 * il gestore deve sempre sapere a che punto è e che cosa fare adesso.
 */
export async function ProgressoProfilo({
  beachId,
  profilo,
  recensioni,
  sogliaClassifica,
  verificato,
}: {
  beachId: string;
  profilo: CampiProfilo | null;
  recensioni: number;
  sogliaClassifica: number;
  verificato: boolean;
}) {
  const t = await getTranslations("gestore");
  const { fatti, totale, pct } = completezza(profilo);

  // Una sola azione alla volta, nell'ordine in cui conviene farle.
  let azione: { testo: string; href?: string; cta?: string };
  if (!verificato) {
    azione = { testo: t("azioneInVerifica") };
  } else if (!profilo?.descrizione) {
    azione = { testo: t("azioneDescrizione"), href: `/area-gestore/${beachId}/profilo`, cta: t("azioneVaiProfilo") };
  } else if (!profilo?.orari) {
    azione = { testo: t("azioneOrari"), href: `/area-gestore/${beachId}/profilo`, cta: t("azioneVaiProfilo") };
  } else if (!profilo?.telefono && !profilo?.email_pubblica) {
    azione = { testo: t("azioneContatti"), href: `/area-gestore/${beachId}/profilo`, cta: t("azioneVaiProfilo") };
  } else if (recensioni < sogliaClassifica) {
    azione = { testo: t("azioneInvita", { mancanti: sogliaClassifica - recensioni }) };
  } else {
    azione = { testo: t("azioneTuttoOk") };
  }

  return (
    <section className="rounded-2xl border border-sea-100 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-sm font-semibold text-sea-800">{t("progressoTitolo")}</h2>
        <span className="text-sm font-bold tabular-nums text-sea-700">{pct}%</span>
      </div>

      <div className="mt-2 h-2 overflow-hidden rounded-full bg-sea-100">
        <div className="h-full rounded-full bg-sea-500" style={{ width: `${pct}%` }} />
      </div>
      <p className="mt-1 text-[11px] text-sea-400">{t("progressoCampi", { fatti, totale })}</p>

      <div className="mt-4 rounded-xl border border-sea-100 bg-sea-50/50 p-3">
        <div className="text-[11px] font-medium uppercase tracking-wide text-sea-400">
          {t("prossimaAzione")}
        </div>
        <div className="mt-1 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm font-medium text-sea-900">{azione.testo}</p>
          {azione.href ? (
            <Link
              href={azione.href}
              className="shrink-0 rounded-full bg-sea-500 px-4 py-1.5 text-sm font-medium text-white hover:bg-sea-600"
            >
              {azione.cta}
            </Link>
          ) : null}
        </div>
      </div>
    </section>
  );
}
