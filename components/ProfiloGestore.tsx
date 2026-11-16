import { getLocale, getTranslations } from "next-intl/server";
import type { Profilo } from "@/lib/profilo";
import { accessibilitaDichiarata, attivoFuoriStagione, gruppiDichiarati } from "@/lib/profilo";

export type ProfiloPubblico = Profilo;

// Attenzione a `!= null` invece del semplice controllo di verità: molti campi
// possono valere 0 o false, e sono informazioni («ingresso gratuito»,
// «non accetta gruppi», «senza bagnino»). Un controllo di verità le
// confonderebbe con il silenzio e le farebbe sparire dalla pagina.
const c = (v: unknown): boolean => v !== null && v !== undefined;

const presentazione = (p: Profilo) =>
  !!(
    p.descrizione ||
    p.orari ||
    p.telefono ||
    p.email_pubblica ||
    p.sito ||
    p.link_prenotazione ||
    p.instagram ||
    p.whatsapp
  );

const prezzi = (p: Profilo) =>
  c(p.prezzo_ombrellone_alta) ||
  c(p.prezzo_ombrellone_bassa) ||
  c(p.prezzo_lettino) ||
  c(p.prezzo_ingresso) ||
  c(p.prezzo_stagionale_da);

const dati = (p: Profilo) =>
  c(p.ombrelloni_totali) ||
  c(p.tipo_fondo) ||
  c(p.spiaggia_libera_adiacente) ||
  c(p.piscina) ||
  c(p.mese_apertura) ||
  c(p.aperto_tutto_anno) ||
  c(p.bar) ||
  c(p.ristorante) ||
  c(p.docce) ||
  c(p.cabine) ||
  c(p.wifi) ||
  c(p.parcheggio) ||
  c(p.noleggio_attrezzature) ||
  c(p.campi_sportivi) ||
  c(p.animazione) ||
  c(p.area_bimbi) ||
  c(p.menu_bambini) ||
  c(p.pagamenti_carte) ||
  c(p.ombra_garantita) ||
  c(p.bagnino) ||
  c(p.defibrillatore) ||
  c(p.eventi_privati) ||
  c(p.raccolta_differenziata) ||
  c(p.plastic_free) ||
  c(p.fontanella_acqua) ||
  (p.lingue != null && p.lingue.length > 0) ||
  (p.tipi_evento != null && p.tipi_evento.length > 0) ||
  (p.tipi_gruppi != null && p.tipi_gruppi.length > 0) ||
  (p.sport != null && p.sport.length > 0) ||
  c(p.tornei_organizzati) ||
  c(p.posti_ristorante) ||
  (p.mesi_attivita != null && p.mesi_attivita.length > 0) ||
  !!p.destagionalizzazione ||
  gruppiDichiarati(p) ||
  accessibilitaDichiarata(p);

/**
 * Informazioni dichiarate dal gestore che ha rivendicato la scheda.
 * Sono dati descrittivi: non influenzano in alcun modo punteggi o classifica.
 */
export async function ProfiloGestore({ profilo }: { profilo: ProfiloPubblico | null }) {
  if (!profilo) return null;
  const p = profilo;
  if (!presentazione(p) && !prezzi(p) && !dati(p)) return null;

  const t = await getTranslations("gestore");
  const locale = await getLocale();
  const lang = locale === "en" ? "en-GB" : "it-IT";

  const euro = (n: number) =>
    new Intl.NumberFormat(lang, {
      style: "currency",
      currency: "EUR",
      minimumFractionDigits: n % 1 === 0 ? 0 : 2,
    }).format(n);

  const dataBreve = (iso: string) =>
    new Date(iso).toLocaleDateString(lang, { month: "long", year: "numeric" });

  // Una pastiglia per fatto. I "no" restano, in grigio, invece di sparire:
  // per chi deve organizzarsi, sapere che la passerella NON c'è vale quanto
  // sapere che c'è. Solo i campi non dichiarati restano fuori — inventare una
  // risposta sarebbe peggio del silenzio.
  const Fatto = ({ testo, ok }: { testo: string; ok: boolean }) => (
    <span
      className={`rounded-full border px-2.5 py-1 text-xs font-medium ${
        ok
          ? "border-emerald-200 bg-emerald-50 text-emerald-800"
          : "border-sea-200 bg-sea-50 text-sea-500"
      }`}
    >
      {ok ? "✓" : "✕"} {testo}
    </span>
  );

  const Info = ({ testo }: { testo: string }) => (
    <span className="rounded-full border border-sea-200 px-2.5 py-1 text-xs text-sea-600">
      {testo}
    </span>
  );

  const Gruppo = ({ titolo, children }: { titolo: string; children: React.ReactNode }) => (
    <div className="mt-4">
      <div className="text-xs font-medium uppercase tracking-wide text-sea-400">{titolo}</div>
      <div className="mt-2 flex flex-wrap gap-2">{children}</div>
    </div>
  );

  const tri = (campo: keyof Profilo) =>
    c(p[campo]) ? <Fatto testo={t(`campo_${campo}`)} ok={p[campo] === true} /> : null;

  const stagione = () => {
    if (p.aperto_tutto_anno === true) return t("apertoTuttoAnno");
    if (p.mese_apertura && p.mese_chiusura)
      return t("stagioneDaA", { da: t(`mese_${p.mese_apertura}`), a: t(`mese_${p.mese_chiusura}`) });
    if (p.mese_apertura) return t("stagioneDa", { da: t(`mese_${p.mese_apertura}`) });
    return null;
  };
  const testoStagione = stagione();

  return (
    <section className="rounded-2xl border border-sea-100 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-lg font-semibold text-sea-900">{t("pubblicoTitolo")}</h2>
        <span className="rounded-full bg-sea-50 px-2.5 py-0.5 text-[11px] font-medium text-sea-700">
          {t("pubblicoBadge")}
        </span>
      </div>

      {p.descrizione ? (
        <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-sea-700">
          {p.descrizione}
        </p>
      ) : null}

      {/* I prezzi in evidenza: è la prima cosa che cerca chi deve decidere
          dove andare, e la sola che nessun aggregatore ha in forma
          confrontabile. Con la data accanto, perché un prezzo senza data è
          un prezzo di cui non ti puoi fidare. */}
      {prezzi(p) ? (
        <div className="mt-5 rounded-xl border border-sea-200 bg-sea-50/60 p-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <div className="text-xs font-medium uppercase tracking-wide text-sea-500">
              {t("prezziTitolo")}
            </div>
            {p.prezzi_aggiornati_il ? (
              <div className="text-[11px] text-sea-400">
                {t("prezziAggiornatiIl", { data: dataBreve(p.prezzi_aggiornati_il) })}
              </div>
            ) : null}
          </div>
          <dl className="mt-2 grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-3">
            {c(p.prezzo_ombrellone_alta) ? (
              <div>
                <dt className="text-[11px] text-sea-500">{t("prezzoAltaBreve")}</dt>
                <dd className="text-lg font-bold tabular-nums text-sea-900">
                  {euro(p.prezzo_ombrellone_alta as number)}
                </dd>
              </div>
            ) : null}
            {c(p.prezzo_ombrellone_bassa) ? (
              <div>
                <dt className="text-[11px] text-sea-500">{t("prezzoBassaBreve")}</dt>
                <dd className="text-lg font-bold tabular-nums text-sea-900">
                  {euro(p.prezzo_ombrellone_bassa as number)}
                </dd>
              </div>
            ) : null}
            {c(p.prezzo_lettino) ? (
              <div>
                <dt className="text-[11px] text-sea-500">{t("campo_prezzo_lettino")}</dt>
                <dd className="text-lg font-bold tabular-nums text-sea-900">
                  {euro(p.prezzo_lettino as number)}
                </dd>
              </div>
            ) : null}
            {c(p.prezzo_ingresso) ? (
              <div>
                <dt className="text-[11px] text-sea-500">{t("campo_prezzo_ingresso")}</dt>
                <dd className="text-lg font-bold tabular-nums text-sea-900">
                  {p.prezzo_ingresso === 0 ? t("gratuito") : euro(p.prezzo_ingresso as number)}
                </dd>
              </div>
            ) : null}
            {c(p.prezzo_stagionale_da) ? (
              <div>
                <dt className="text-[11px] text-sea-500">{t("prezzoStagionaleBreve")}</dt>
                <dd className="text-lg font-bold tabular-nums text-sea-900">
                  {euro(p.prezzo_stagionale_da as number)}
                </dd>
              </div>
            ) : null}
          </dl>
          <p className="mt-2 text-[11px] text-sea-400">{t("prezziDisclaimer")}</p>
        </div>
      ) : null}

      {p.orari || testoStagione ? (
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {p.orari ? (
            <div>
              <div className="text-xs font-medium uppercase tracking-wide text-sea-400">
                {t("orariLabel")}
              </div>
              <p className="mt-0.5 whitespace-pre-line text-sm text-sea-700">{p.orari}</p>
            </div>
          ) : null}
          {testoStagione ? (
            <div>
              <div className="text-xs font-medium uppercase tracking-wide text-sea-400">
                {t("sezStagione")}
              </div>
              <p className="mt-0.5 text-sm text-sea-700">{testoStagione}</p>
            </div>
          ) : null}
        </div>
      ) : null}

      {c(p.ombrelloni_totali) || c(p.tipo_fondo) || c(p.spiaggia_libera_adiacente) || c(p.piscina) ? (
        <Gruppo titolo={t("sezSpiaggia")}>
          {c(p.ombrelloni_totali) ? (
            <Info testo={t("ombrelloniN", { n: p.ombrelloni_totali as number })} />
          ) : null}
          {p.tipo_fondo ? <Info testo={t(`opt_tipo_fondo_${p.tipo_fondo}`)} /> : null}
          {tri("spiaggia_libera_adiacente")}
          {tri("piscina")}
        </Gruppo>
      ) : null}

      {c(p.bar) ||
      c(p.ristorante) ||
      c(p.docce) ||
      c(p.cabine) ||
      c(p.wifi) ||
      c(p.parcheggio) ||
      c(p.noleggio_attrezzature) ||
      c(p.campi_sportivi) ||
      c(p.animazione) ||
      c(p.area_bimbi) ||
      c(p.menu_bambini) ||
      c(p.pagamenti_carte) ||
      c(p.ombra_garantita) ||
      c(p.posti_ristorante) ||
      (p.lingue != null && p.lingue.length > 0) ? (
        <Gruppo titolo={t("sezServizi")}>
          {tri("bar")}
          {tri("ristorante")}
          {tri("docce")}
          {tri("cabine")}
          {tri("wifi")}
          {tri("ombra_garantita")}
          {tri("area_bimbi")}
          {tri("menu_bambini")}
          {tri("noleggio_attrezzature")}
          {tri("campi_sportivi")}
          {tri("animazione")}
          {tri("pagamenti_carte")}
          {p.parcheggio ? (
            <Fatto
              testo={
                t(`opt_parcheggio_${p.parcheggio}`) +
                (c(p.parcheggio_posti) && p.parcheggio !== "no"
                  ? ` (${t("postiN", { n: p.parcheggio_posti as number })})`
                  : "")
              }
              ok={p.parcheggio !== "no"}
            />
          ) : null}
          {c(p.posti_ristorante) ? (
            <Info testo={t("postiRistoranteN", { n: p.posti_ristorante as number })} />
          ) : null}
          {p.lingue && p.lingue.length > 0 ? (
            <Info
              testo={t("lingueParlate", {
                lingue: p.lingue.map((l) => t(`lingua_${l}`)).join(", "),
              })}
            />
          ) : null}
        </Gruppo>
      ) : null}

      {c(p.bagnino) || c(p.defibrillatore) ? (
        <Gruppo titolo={t("sezSicurezza")}>
          {c(p.bagnino) ? (
            <Fatto
              testo={
                t("campo_bagnino") + (p.bagnino && p.bagnino_orario ? ` (${p.bagnino_orario})` : "")
              }
              ok={p.bagnino === true}
            />
          ) : null}
          {tri("defibrillatore")}
        </Gruppo>
      ) : null}

      {gruppiDichiarati(p) ||
      accessibilitaDichiarata(p) ||
      (p.tipi_gruppi != null && p.tipi_gruppi.length > 0) ? (
        <Gruppo titolo={t("praticheTitolo")}>
          {c(p.gruppi_max) ? (
            (p.gruppi_max as number) > 0 ? (
              <Fatto testo={t("gruppiFinoA", { n: p.gruppi_max as number })} ok />
            ) : (
              <Fatto testo={t("gruppiNessuno")} ok={false} />
            )
          ) : null}
          {c(p.gruppi_preavviso_giorni) && (p.gruppi_max ?? 0) > 0 ? (
            <Info testo={t("preavvisoGiorni", { n: p.gruppi_preavviso_giorni as number })} />
          ) : null}
          {p.pranzo_gruppi ? (
            <Fatto
              testo={t(`opt_pranzo_gruppi_${p.pranzo_gruppi}`)}
              ok={p.pranzo_gruppi !== "no"}
            />
          ) : null}
          {p.discesa_pullman ? (
            <Fatto
              testo={t(`opt_discesa_pullman_${p.discesa_pullman}`)}
              ok={p.discesa_pullman !== "no"}
            />
          ) : null}
          {p.tipi_gruppi?.map((g) => <Info key={g} testo={t(`gruppo_${g}`)} />)}
          {tri("accesso_senza_scalini")}
          {tri("passerella_fino_al_mare")}
          {tri("sedia_mare")}
          {tri("bagno_accessibile")}
        </Gruppo>
      ) : null}

      {c(p.eventi_privati) || (p.tipi_evento != null && p.tipi_evento.length > 0) ? (
        <Gruppo titolo={t("sezEventiPrivati")}>
          {c(p.eventi_privati) ? (
            <Fatto testo={t("campo_eventi_privati")} ok={p.eventi_privati === true} />
          ) : null}
          {c(p.eventi_capienza) && p.eventi_privati !== false ? (
            <Info testo={t("capienzaN", { n: p.eventi_capienza as number })} />
          ) : null}
          {p.tipi_evento?.map((e) => <Info key={e} testo={t(`evento_${e}`)} />)}
          {tri("musica_serale")}
        </Gruppo>
      ) : null}

      {(p.sport != null && p.sport.length > 0) || c(p.tornei_organizzati) ? (
        <Gruppo titolo={t("sezSport")}>
          {p.sport?.map((sp) => <Info key={sp} testo={t(`sport_${sp}`)} />)}
          {tri("tornei_organizzati")}
        </Gruppo>
      ) : null}

      {/* Fuori stagione: è il dato che interessa a un Comune, non al
          bagnante. Si mostra lo stesso, perché è anche la risposta alla
          domanda «d'inverno è aperto?» che si fanno in tanti. */}
      {(p.mesi_attivita != null && p.mesi_attivita.length > 0) || p.destagionalizzazione ? (
        <div className="mt-4">
          <div className="text-xs font-medium uppercase tracking-wide text-sea-400">
            {t("sezFuoriStagione")}
          </div>
          {p.mesi_attivita && p.mesi_attivita.length > 0 ? (
            <div className="mt-2 flex flex-wrap gap-2">
              {attivoFuoriStagione(p.mesi_attivita) ? (
                <Fatto testo={t("attivoFuoriStagione")} ok />
              ) : null}
              <Info
                testo={t("attivoNeiMesi", {
                  mesi: p.mesi_attivita.map((m) => t(`mese_${m}`)).join(", "),
                })}
              />
            </div>
          ) : null}
          {p.destagionalizzazione ? (
            <p className="mt-2 whitespace-pre-line text-sm text-sea-700">
              {p.destagionalizzazione}
            </p>
          ) : null}
        </div>
      ) : null}

      {c(p.raccolta_differenziata) || c(p.plastic_free) || c(p.fontanella_acqua) ? (
        <Gruppo titolo={t("sezSostenibilita")}>
          {tri("raccolta_differenziata")}
          {tri("plastic_free")}
          {tri("fontanella_acqua")}
        </Gruppo>
      ) : null}

      <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-sea-100 pt-4 text-sm">
        {p.telefono ? (
          <a href={`tel:${p.telefono}`} className="text-sea-600 hover:underline">
            {p.telefono}
          </a>
        ) : null}
        {p.whatsapp ? (
          <a
            href={`https://wa.me/${p.whatsapp.replace(/\D/g, "")}`}
            target="_blank"
            rel="noopener noreferrer nofollow"
            className="text-sea-600 hover:underline"
          >
            WhatsApp
          </a>
        ) : null}
        {p.email_pubblica ? (
          <a href={`mailto:${p.email_pubblica}`} className="text-sea-600 hover:underline">
            {p.email_pubblica}
          </a>
        ) : null}
        {p.instagram ? (
          <a
            href={`https://instagram.com/${p.instagram}`}
            target="_blank"
            rel="noopener noreferrer nofollow"
            className="text-sea-600 hover:underline"
          >
            @{p.instagram}
          </a>
        ) : null}
        {p.sito ? (
          <a
            href={p.sito}
            target="_blank"
            rel="noopener noreferrer nofollow"
            className="text-sea-600 hover:underline"
          >
            {t("sitoLabel")}
          </a>
        ) : null}
      </div>

      {p.link_prenotazione ? (
        <a
          href={p.link_prenotazione}
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
