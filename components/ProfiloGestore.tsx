import { getTranslations } from "next-intl/server";

export type ProfiloPubblico = {
  descrizione: string | null;
  orari: string | null;
  telefono: string | null;
  email_pubblica: string | null;
  sito: string | null;
  link_prenotazione: string | null;
};

const vuoto = (p: ProfiloPubblico) =>
  !p.descrizione && !p.orari && !p.telefono && !p.email_pubblica && !p.sito && !p.link_prenotazione;

/**
 * Informazioni dichiarate dal gestore che ha rivendicato la scheda.
 * Sono dati descrittivi: non influenzano in alcun modo punteggi o classifica.
 */
export async function ProfiloGestore({ profilo }: { profilo: ProfiloPubblico | null }) {
  if (!profilo || vuoto(profilo)) return null;
  const t = await getTranslations("gestore");

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
