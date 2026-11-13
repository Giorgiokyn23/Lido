import { getTranslations } from "next-intl/server";

export type ProfiloPubblico = {
  descrizione: string | null;
  orari: string | null;
  telefono: string | null;
  email_pubblica: string | null;
  sito: string | null;
  link_prenotazione: string | null;
  gruppi_max: number | null;
  gruppi_preavviso_giorni: number | null;
  pranzo_gruppi: string | null;
  discesa_pullman: string | null;
  accesso_senza_scalini: boolean | null;
  passerella_fino_al_mare: boolean | null;
  sedia_mare: boolean | null;
  bagno_accessibile: boolean | null;
  lingue: string[] | null;
  pagamenti_carte: boolean | null;
  ombra_garantita: boolean | null;
};

const contatti = (p: ProfiloPubblico) =>
  !!(p.descrizione || p.orari || p.telefono || p.email_pubblica || p.sito || p.link_prenotazione);

// Attenzione a `!= null`: gruppi_max può valere 0, che è un'informazione
// («non accettiamo gruppi»), mentre null significa «non dichiarato». Un
// controllo di verità semplice le confonderebbe e farebbe sparire lo zero.
const praticheDichiarate = (p: ProfiloPubblico) =>
  p.gruppi_max != null ||
  p.pranzo_gruppi != null ||
  p.discesa_pullman != null ||
  p.accesso_senza_scalini != null ||
  p.passerella_fino_al_mare != null ||
  p.sedia_mare != null ||
  p.bagno_accessibile != null ||
  (p.lingue != null && p.lingue.length > 0) ||
  p.pagamenti_carte != null ||
  p.ombra_garantita != null;

/**
 * Informazioni dichiarate dal gestore che ha rivendicato la scheda.
 * Sono dati descrittivi: non influenzano in alcun modo punteggi o classifica.
 */
export async function ProfiloGestore({ profilo }: { profilo: ProfiloPubblico | null }) {
  if (!profilo) return null;
  const haContatti = contatti(profilo);
  const haPratiche = praticheDichiarate(profilo);
  if (!haContatti && !haPratiche) return null;

  const t = await getTranslations("gestore");

  // Una pastiglia per ogni fatto dichiarato. I "no" si mostrano in grigio
  // invece di sparire: per chi deve organizzarsi, sapere che la passerella
  // NON c'è vale quanto sapere che c'è. I campi non dichiarati, quelli sì,
  // restano fuori: inventare una risposta sarebbe peggio del silenzio.
  const Fatto = ({ testo, sì }: { testo: string; sì: boolean }) => (
    <span
      className={`rounded-full border px-2.5 py-1 text-xs font-medium ${
        sì
          ? "border-emerald-200 bg-emerald-50 text-emerald-800"
          : "border-sea-200 bg-sea-50 text-sea-500"
      }`}
    >
      {sì ? "✓" : "✕"} {testo}
    </span>
  );

  const lingue = (profilo.lingue ?? []).map((l) => t(`lingua_${l}`)).join(", ");

  return (
    <section className="rounded-2xl border border-sea-100 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-lg font-semibold text-sea-900">{t("pubblicoTitolo")}</h2>
        <span className="rounded-full bg-sea-50 px-2.5 py-0.5 text-[11px] font-medium text-sea-700">
          {t("pubblicoBadge")}
        </span>
      </div>

      {profilo.descrizione ? (
        <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-sea-700">
          {profilo.descrizione}
        </p>
      ) : null}

      {profilo.orari ? (
        <div className="mt-4">
          <div className="text-xs font-medium uppercase tracking-wide text-sea-400">
            {t("orariLabel")}
          </div>
          <p className="mt-0.5 whitespace-pre-line text-sm text-sea-700">{profilo.orari}</p>
        </div>
      ) : null}

      {haPratiche ? (
        <div className="mt-5 border-t border-sea-100 pt-4">
          <div className="text-xs font-medium uppercase tracking-wide text-sea-400">
            {t("praticheTitolo")}
          </div>

          <div className="mt-2 flex flex-wrap gap-2">
            {profilo.gruppi_max != null ? (
              profilo.gruppi_max > 0 ? (
                <Fatto testo={t("gruppiFinoA", { n: profilo.gruppi_max })} sì />
              ) : (
                <Fatto testo={t("gruppiNessuno")} sì={false} />
              )
            ) : null}

            {profilo.gruppi_preavviso_giorni != null && (profilo.gruppi_max ?? 0) > 0 ? (
              <span className="rounded-full border border-sea-200 px-2.5 py-1 text-xs text-sea-600">
                {t("preavvisoGiorni", { n: profilo.gruppi_preavviso_giorni })}
              </span>
            ) : null}

            {profilo.pranzo_gruppi ? (
              <Fatto
                testo={
                  profilo.pranzo_gruppi === "sempre"
                    ? t("pranzoSempre")
                    : profilo.pranzo_gruppi === "su_prenotazione"
                      ? t("pranzoPrenotazione")
                      : t("pranzoNo")
                }
                sì={profilo.pranzo_gruppi !== "no"}
              />
            ) : null}

            {profilo.discesa_pullman ? (
              <Fatto
                testo={
                  profilo.discesa_pullman === "al_cancello"
                    ? t("pullmanCancello")
                    : profilo.discesa_pullman === "nei_paraggi"
                      ? t("pullmanParaggi")
                      : t("pullmanNo")
                }
                sì={profilo.discesa_pullman !== "no"}
              />
            ) : null}

            {profilo.accesso_senza_scalini != null ? (
              <Fatto testo={t("senzaScaliniLabel")} sì={profilo.accesso_senza_scalini} />
            ) : null}
            {profilo.passerella_fino_al_mare != null ? (
              <Fatto testo={t("passerellaLabel")} sì={profilo.passerella_fino_al_mare} />
            ) : null}
            {profilo.sedia_mare != null ? (
              <Fatto testo={t("sediaMareLabel")} sì={profilo.sedia_mare} />
            ) : null}
            {profilo.bagno_accessibile != null ? (
              <Fatto testo={t("bagnoAccessibileLabel")} sì={profilo.bagno_accessibile} />
            ) : null}

            {lingue ? (
              <span className="rounded-full border border-sea-200 px-2.5 py-1 text-xs text-sea-600">
                {t("lingueParlate", { lingue })}
              </span>
            ) : null}

            {profilo.pagamenti_carte != null ? (
              <Fatto testo={t("carteLabel")} sì={profilo.pagamenti_carte} />
            ) : null}
            {profilo.ombra_garantita != null ? (
              <Fatto testo={t("ombraLabel")} sì={profilo.ombra_garantita} />
            ) : null}
          </div>
        </div>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm">
        {profilo.telefono ? (
          <a href={`tel:${profilo.telefono}`} className="text-sea-600 hover:underline">
            {profilo.telefono}
          </a>
        ) : null}
        {profilo.email_pubblica ? (
          <a href={`mailto:${profilo.email_pubblica}`} className="text-sea-600 hover:underline">
            {profilo.email_pubblica}
          </a>
        ) : null}
        {profilo.sito ? (
          <a
            href={profilo.sito}
            target="_blank"
            rel="noopener noreferrer nofollow"
            className="text-sea-600 hover:underline"
          >
            {t("sitoLabel")}
          </a>
        ) : null}
      </div>

      {profilo.link_prenotazione ? (
        <a
          href={profilo.link_prenotazione}
          target="_blank"
          rel="noopener noreferrer nofollow"
          className="mt-4 inline-block rounded-full bg-sea-500 px-4 py-2 text-sm font-medium text-white hover:bg-sea-600"
        >
          {t("prenotazioneCta")}
        </a>
      ) : null}

      <p className="mt-4 text-[11px] text-sea-400">{t("pubblicoNota")}</p>
    </section>
  );
}
