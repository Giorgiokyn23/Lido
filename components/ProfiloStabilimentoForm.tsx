"use client";

import { useEffect, useRef } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { salvaProfiloStabilimento, type SubmitState } from "@/app/actions";
import {
  type Profilo,
  LINGUE,
  PARCHEGGI,
  PRANZI,
  PULLMAN,
  TIPI_FONDO,
  TIPI_EVENTO,
  TIPI_GRUPPI,
  SPORT,
  MESI as MESI_ANNO,
  mancantiMinimo,
  completezza,
} from "@/lib/profilo";

export type ProfiloValori = Profilo;

const MESI = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

function SubmitButton() {
  const { pending } = useFormStatus();
  const t = useTranslations("gestore");
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-xl bg-sea-500 px-5 py-3 font-semibold text-white transition hover:bg-sea-600 disabled:opacity-60 sm:w-auto"
    >
      {pending ? t("salvataggio") : t("salva")}
    </button>
  );
}

const initial: SubmitState = { ok: false };

export function ProfiloStabilimentoForm({
  beachId,
  valori,
}: {
  beachId: string;
  valori: Profilo | null;
}) {
  const [state, formAction] = useFormState(salvaProfiloStabilimento, initial);
  const t = useTranslations("gestore");

  const campo =
    "mt-1 w-full rounded-lg border border-sea-200 px-3 py-2 text-sm text-sea-900 focus:border-sea-400 focus:outline-none";
  const etichetta = "text-xs font-medium text-sea-700";

  const mancano = mancantiMinimo(valori);
  const { fatti, totale, pct } = completezza(valori);

  // Dopo il salvataggio la barra in cima e l'elenco di ciò che manca sono
  // cambiati: li riportiamo sotto gli occhi invece di lasciare il gestore a
  // fondo pagina a chiedersi se è andata bene.
  const cima = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (state.ok) cima.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [state.ok]);

  // Un accordion con i <details> nativi: nessun JavaScript, apre e chiude
  // anche se lo script non parte, e il browser lo rende usabile da tastiera
  // senza che debba scriverlo io. Con cinquanta campi in fila la pagina
  // sarebbe un muro; così il gestore vede sette titoli e sceglie da dove
  // cominciare.
  const Sezione = ({
    titolo,
    intro,
    aperta,
    children,
  }: {
    titolo: string;
    intro?: string;
    aperta?: boolean;
    children: React.ReactNode;
  }) => (
    <details
      open={aperta}
      className="group rounded-2xl border border-sea-100 bg-white shadow-sm [&[open]>summary]:border-b"
    >
      <summary className="cursor-pointer list-none border-sea-100 px-5 py-4 font-semibold text-sea-900">
        <span className="mr-2 inline-block text-sea-400 transition group-open:rotate-90">▸</span>
        {titolo}
      </summary>
      <div className="space-y-4 px-5 py-4">
        {intro ? <p className="text-xs text-sea-500">{intro}</p> : null}
        {children}
      </div>
    </details>
  );

  const Griglia = ({ children }: { children: React.ReactNode }) => (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">{children}</div>
  );

  // Tre stati, non una spunta. Una casella sa dire solo "sì" e "niente", e
  // "niente" verrebbe letto come "no": sull'accessibilità un no sbagliato
  // toglie clienti al gestore, un sì sbagliato fa viaggiare a vuoto chi ha
  // bisogno della passerella. Deve poter dire "non lo so".
  const Tri = ({ nome, nota }: { nome: keyof Profilo; nota?: string }) => {
    const v = valori?.[nome] as boolean | null | undefined;
    return (
      <div>
        <label htmlFor={nome} className={etichetta}>
          {t(`campo_${nome}`)}
        </label>
        <select
          id={nome}
          name={nome}
          defaultValue={v === true ? "1" : v === false ? "0" : ""}
          className={campo}
        >
          <option value="">{t("nonIndicato")}</option>
          <option value="1">{t("opzSi")}</option>
          <option value="0">{t("opzNo")}</option>
        </select>
        {nota ? <p className="mt-1 text-[11px] text-sea-400">{nota}</p> : null}
      </div>
    );
  };

  const Numero = ({
    nome,
    min = 0,
    max,
    passo,
    segnaposto,
    nota,
  }: {
    nome: keyof Profilo;
    min?: number;
    max: number;
    passo?: string;
    segnaposto?: string;
    nota?: string;
  }) => (
    <div>
      <label htmlFor={nome} className={etichetta}>
        {t(`campo_${nome}`)}
      </label>
      <input
        id={nome}
        name={nome}
        type="number"
        min={min}
        max={max}
        step={passo ?? "1"}
        inputMode="decimal"
        defaultValue={(valori?.[nome] as number | null) ?? ""}
        placeholder={segnaposto}
        className={campo}
      />
      {nota ? <p className="mt-1 text-[11px] text-sea-400">{nota}</p> : null}
    </div>
  );

  const Scelta = ({
    nome,
    valoriAmmessi,
  }: {
    nome: keyof Profilo;
    valoriAmmessi: readonly string[];
  }) => (
    <div>
      <label htmlFor={nome} className={etichetta}>
        {t(`campo_${nome}`)}
      </label>
      <select
        id={nome}
        name={nome}
        defaultValue={(valori?.[nome] as string | null) ?? ""}
        className={campo}
      >
        <option value="">{t("nonIndicato")}</option>
        {valoriAmmessi.map((v) => (
          <option key={v} value={v}>
            {t(`opt_${nome}_${v}`)}
          </option>
        ))}
      </select>
    </div>
  );

  // Caselle multiple con lo stesso `name`: il browser le manda tutte e
  // formData.getAll() le raccoglie. Nessun JavaScript, nessuno stato.
  const Caselle = ({
    nome,
    valoriAmmessi,
    prefisso,
  }: {
    nome: keyof Profilo;
    valoriAmmessi: readonly string[];
    prefisso: string;
  }) => {
    const scelti = (valori?.[nome] as string[] | null) ?? [];
    return (
      <fieldset className="sm:col-span-2">
        <legend className={etichetta}>{t(`campo_${nome}`)}</legend>
        <div className="mt-2 grid grid-cols-1 gap-x-5 gap-y-2 sm:grid-cols-2">
          {valoriAmmessi.map((v) => (
            <label key={v} className="flex items-center gap-2 text-sm text-sea-800">
              <input
                type="checkbox"
                name={nome}
                value={v}
                defaultChecked={scelti.includes(v)}
                className="h-4 w-4 rounded border-sea-300"
              />
              {t(`${prefisso}_${v}`)}
            </label>
          ))}
        </div>
      </fieldset>
    );
  };

  const Testo = ({
    nome,
    max,
    tipo,
    segnaposto,
    righe,
  }: {
    nome: keyof Profilo;
    max: number;
    tipo?: string;
    segnaposto?: string;
    righe?: number;
  }) => (
    <div className={righe ? "sm:col-span-2" : undefined}>
      <label htmlFor={nome} className={etichetta}>
        {t(`campo_${nome}`)}
      </label>
      {righe ? (
        <textarea
          id={nome}
          name={nome}
          rows={righe}
          maxLength={max}
          defaultValue={(valori?.[nome] as string | null) ?? ""}
          placeholder={segnaposto}
          className={campo}
        />
      ) : (
        <input
          id={nome}
          name={nome}
          type={tipo ?? "text"}
          maxLength={max}
          defaultValue={(valori?.[nome] as string | null) ?? ""}
          placeholder={segnaposto}
          className={campo}
        />
      )}
    </div>
  );

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="beach_id" value={beachId} />

      {/* Avanzamento e, soprattutto, che cosa manca per pubblicare eventi.
          Un pulsante spento senza spiegazioni è il modo migliore per far
          scappare un gestore. */}
      <div ref={cima} className="scroll-mt-4 rounded-2xl border border-sea-100 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <span className="text-sm font-semibold text-sea-800">{t("progressoTitolo")}</span>
          <span className="text-sm font-bold tabular-nums text-sea-700">{pct}%</span>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-sea-100">
          <div className="h-full rounded-full bg-sea-500" style={{ width: `${pct}%` }} />
        </div>
        <p className="mt-1 text-[11px] text-sea-400">{t("progressoCampi", { fatti, totale })}</p>

        {mancano.length > 0 ? (
          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3">
            <p className="text-xs font-semibold text-amber-900">
              {t("minimoTitolo", { n: mancano.length })}
            </p>
            <p className="mt-1 text-[11px] text-amber-800">{t("minimoSpiega")}</p>
            <ul className="mt-2 flex flex-wrap gap-1.5">
              {mancano.map((m) => (
                <li
                  key={m}
                  className="rounded-full border border-amber-300 bg-white px-2 py-0.5 text-[11px] font-medium text-amber-900"
                >
                  {t(`minimo_${m}`)}
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
            {t("minimoFatto")}
          </p>
        )}
      </div>

      {/* ------------------------------------------------- presentazione */}
      <Sezione titolo={t("sezPresentazione")} aperta>
        <Griglia>
          <Testo nome="descrizione" max={2000} righe={5} segnaposto={t("descrizionePlaceholder")} />
          <Testo nome="orari" max={500} righe={2} segnaposto={t("orariPlaceholder")} />
          <Testo nome="telefono" max={40} tipo="tel" />
          <Testo nome="email_pubblica" max={200} tipo="email" />
          <Testo nome="whatsapp" max={40} tipo="tel" segnaposto="+39 333 1234567" />
          <Testo nome="instagram" max={100} segnaposto="@bagnomarechiaro" />
          <Testo nome="sito" max={300} segnaposto="https://..." />
          <Testo nome="link_prenotazione" max={300} segnaposto="https://..." />
        </Griglia>
        <p className="rounded-lg bg-sea-50 px-3 py-2 text-[11px] text-sea-600">{t("profiloNota")}</p>
      </Sezione>

      {/* ----------------------------------------------------- la spiaggia */}
      <Sezione titolo={t("sezSpiaggia")} intro={t("sezSpiaggiaIntro")} aperta>
        <Griglia>
          <Numero nome="ombrelloni_totali" max={5000} segnaposto="120" nota={t("ombrelloniNota")} />
          <Scelta nome="tipo_fondo" valoriAmmessi={TIPI_FONDO} />
          <Tri nome="spiaggia_libera_adiacente" />
          <Tri nome="piscina" />
        </Griglia>
      </Sezione>

      {/* --------------------------------------------------------- prezzi */}
      <Sezione titolo={t("sezPrezzi")} intro={t("sezPrezziIntro")} aperta>
        <Griglia>
          <Numero
            nome="prezzo_ombrellone_alta"
            max={2000}
            passo="0.50"
            segnaposto="25"
            nota={t("prezzoAltaNota")}
          />
          <Numero nome="prezzo_ombrellone_bassa" max={2000} passo="0.50" segnaposto="15" />
          <Numero nome="prezzo_lettino" max={500} passo="0.50" segnaposto="8" />
          <Numero nome="prezzo_ingresso" max={500} passo="0.50" nota={t("prezzoIngressoNota")} />
          <Numero nome="prezzo_stagionale_da" max={50000} passo="1" segnaposto="900" />
        </Griglia>
        {valori?.prezzi_aggiornati_il ? (
          <p className="text-[11px] text-sea-400">
            {t("prezziAggiornatiIl", { data: valori.prezzi_aggiornati_il })}
          </p>
        ) : null}
        <p className="rounded-lg bg-sea-50 px-3 py-2 text-[11px] text-sea-600">{t("prezziNota")}</p>
      </Sezione>

      {/* -------------------------------------------------------- stagione */}
      <Sezione titolo={t("sezStagione")}>
        <Griglia>
          <div>
            <label htmlFor="mese_apertura" className={etichetta}>
              {t("campo_mese_apertura")}
            </label>
            <select
              id="mese_apertura"
              name="mese_apertura"
              defaultValue={valori?.mese_apertura ?? ""}
              className={campo}
            >
              <option value="">{t("nonIndicato")}</option>
              {MESI.map((m) => (
                <option key={m} value={m}>
                  {t(`mese_${m}`)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="mese_chiusura" className={etichetta}>
              {t("campo_mese_chiusura")}
            </label>
            <select
              id="mese_chiusura"
              name="mese_chiusura"
              defaultValue={valori?.mese_chiusura ?? ""}
              className={campo}
            >
              <option value="">{t("nonIndicato")}</option>
              {MESI.map((m) => (
                <option key={m} value={m}>
                  {t(`mese_${m}`)}
                </option>
              ))}
            </select>
          </div>
          <Tri nome="aperto_tutto_anno" />
        </Griglia>
      </Sezione>

      {/* -------------------------------------------------------- servizi */}
      <Sezione titolo={t("sezServizi")}>
        <Griglia>
          <Tri nome="bar" />
          <Tri nome="ristorante" />
          <Tri nome="docce" />
          <Tri nome="cabine" />
          <Tri nome="wifi" />
          <Tri nome="ombra_garantita" />
          <Scelta nome="parcheggio" valoriAmmessi={PARCHEGGI} />
          <Numero nome="parcheggio_posti" max={5000} segnaposto="40" />
          <Tri nome="noleggio_attrezzature" nota={t("noleggioNota")} />
          <Tri nome="campi_sportivi" />
          <Tri nome="animazione" />
          <Tri nome="area_bimbi" />
          <Tri nome="menu_bambini" />
          <Tri nome="pagamenti_carte" />
        </Griglia>

        <fieldset className="border-t border-sea-100 pt-4">
          <legend className={etichetta}>{t("lingueLabel")}</legend>
          <p className="text-[11px] text-sea-400">{t("lingueNota")}</p>
          <div className="mt-2 flex flex-wrap gap-x-5 gap-y-2">
            {LINGUE.map((l) => (
              <label key={l} className="flex items-center gap-2 text-sm text-sea-800">
                <input
                  type="checkbox"
                  name="lingue"
                  value={l}
                  defaultChecked={valori?.lingue?.includes(l) ?? false}
                  className="h-4 w-4 rounded border-sea-300"
                />
                {t(`lingua_${l}`)}
              </label>
            ))}
          </div>
        </fieldset>
      </Sezione>

      {/* ------------------------------------------------------ sicurezza */}
      <Sezione titolo={t("sezSicurezza")} intro={t("sezSicurezzaIntro")}>
        <Griglia>
          <Tri nome="bagnino" />
          <Testo nome="bagnino_orario" max={120} segnaposto={t("bagninoOrarioPlaceholder")} />
          <Tri nome="defibrillatore" nota={t("defibrillatoreNota")} />
        </Griglia>
      </Sezione>

      {/* --------------------------------------------------------- gruppi */}
      <Sezione titolo={t("gruppiTitolo")} intro={t("gruppiIntro")}>
        <Griglia>
          <Numero nome="gruppi_max" max={2000} segnaposto="50" nota={t("gruppiMaxNota")} />
          <Numero nome="gruppi_preavviso_giorni" max={60} segnaposto="3" />
          <Scelta nome="pranzo_gruppi" valoriAmmessi={PRANZI} />
          <Scelta nome="discesa_pullman" valoriAmmessi={PULLMAN} />
        </Griglia>
      </Sezione>

      {/* -------------------------------------------------- accessibilità */}
      <Sezione titolo={t("accessTitolo")} intro={t("accessIntro")}>
        <Griglia>
          <Tri nome="accesso_senza_scalini" />
          <Tri nome="passerella_fino_al_mare" />
          <Tri nome="sedia_mare" />
          <Tri nome="bagno_accessibile" />
        </Griglia>
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-[11px] text-amber-800">
          {t("accessNota")}
        </p>
      </Sezione>

      {/* -------------------------------------------------- eventi privati */}
      <Sezione titolo={t("sezEventiPrivati")} intro={t("sezEventiPrivatiIntro")}>
        <Griglia>
          <Tri nome="eventi_privati" />
          <Numero nome="eventi_capienza" max={5000} segnaposto="120" />
          <Tri nome="musica_serale" />
        </Griglia>
      </Sezione>

      {/* --------------------------------------------- eventi e comitive */}
      <Sezione titolo={t("sezEventiGruppi")} intro={t("sezEventiGruppiIntro")}>
        <Griglia>
          <Numero nome="posti_ristorante" max={2000} segnaposto="80" nota={t("postiRistoranteNota")} />
          <Numero nome="eventi_capienza" max={5000} segnaposto="120" />
          <Caselle nome="tipi_evento" valoriAmmessi={TIPI_EVENTO} prefisso="evento" />
          <Caselle nome="tipi_gruppi" valoriAmmessi={TIPI_GRUPPI} prefisso="gruppo" />
        </Griglia>
      </Sezione>

      {/* ---------------------------------------------------------- sport */}
      <Sezione titolo={t("sezSport")} intro={t("sezSportIntro")}>
        <Griglia>
          <Caselle nome="sport" valoriAmmessi={SPORT} prefisso="sport" />
          <Tri nome="tornei_organizzati" nota={t("torneiNota")} />
        </Griglia>
      </Sezione>

      {/* ------------------------------------------ destagionalizzazione */}
      <Sezione titolo={t("sezFuoriStagione")} intro={t("sezFuoriStagioneIntro")}>
        <fieldset>
          <legend className={etichetta}>{t("campo_mesi_attivita")}</legend>
          <p className="text-[11px] text-sea-400">{t("mesiAttivitaNota")}</p>
          <div className="mt-2 grid grid-cols-2 gap-x-5 gap-y-2 sm:grid-cols-4">
            {MESI_ANNO.map((m) => (
              <label key={m} className="flex items-center gap-2 text-sm text-sea-800">
                <input
                  type="checkbox"
                  name="mesi_attivita"
                  value={m}
                  defaultChecked={valori?.mesi_attivita?.includes(m) ?? false}
                  className="h-4 w-4 rounded border-sea-300"
                />
                {t(`mese_${m}`)}
              </label>
            ))}
          </div>
        </fieldset>
        <Testo
          nome="destagionalizzazione"
          max={1000}
          righe={4}
          segnaposto={t("destagionalizzazionePlaceholder")}
        />
      </Sezione>

      {/* -------------------------------------------------- sostenibilità */}
      <Sezione titolo={t("sezSostenibilita")}>
        <Griglia>
          <Tri nome="raccolta_differenziata" />
          <Tri nome="plastic_free" />
          <Tri nome="fontanella_acqua" />
        </Griglia>
      </Sezione>

      {state.error ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
      ) : null}

      {/* Salvato: si dice che cos'è successo e dove si va adesso, nello
          stesso punto in cui il gestore ha appena premuto. Prima restava
          fermo qui e doveva risalire in cima a cercare da solo l'uscita. */}
      {state.ok ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
          <p className="text-sm font-medium text-emerald-900">{t("salvato")}</p>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            {state.prossimo === "eventi" ? (
              <Link
                href={`/area-gestore/${beachId}/eventi`}
                className="rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
              >
                {t("prossimoEventi")}
              </Link>
            ) : (
              <Link
                href={`/area-gestore/${beachId}`}
                className="rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
              >
                {t("prossimoPannello")}
              </Link>
            )}
            <Link
              href={`/lido/${beachId}`}
              className="text-sm text-emerald-800 underline underline-offset-2"
            >
              {t("openSheet")}
            </Link>
          </div>
        </div>
      ) : null}

      {/* Un salvataggio solo per tutto il modulo: se ogni sezione avesse il
          suo pulsante, chi ne compila tre e preme una volta perderebbe le
          altre due senza capire perché. */}
      <div className="sticky bottom-3 rounded-2xl border border-sea-100 bg-white/95 p-4 shadow-lg backdrop-blur">
        <SubmitButton />
        <p className="mt-2 text-[11px] text-sea-400">{t("salvaNota")}</p>
      </div>
    </form>
  );
}
