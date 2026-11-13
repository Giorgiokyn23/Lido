"use client";

import { useFormState, useFormStatus } from "react-dom";
import { useTranslations } from "next-intl";
import { salvaProfiloStabilimento, type SubmitState } from "@/app/actions";

export type ProfiloValori = {
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

const LINGUE = ["en", "fr", "de", "es", "ru", "nl"] as const;

function SubmitButton() {
  const { pending } = useFormStatus();
  const t = useTranslations("gestore");
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-xl bg-sea-500 px-5 py-2.5 font-semibold text-white transition hover:bg-sea-600 disabled:opacity-60"
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
  valori: ProfiloValori | null;
}) {
  const [state, formAction] = useFormState(salvaProfiloStabilimento, initial);
  const t = useTranslations("gestore");

  const campo = "mt-1 w-full rounded-lg border border-sea-200 px-3 py-2 text-sm";
  const etichetta = "text-xs font-medium text-sea-700";

  // Tre stati, non una casella da spuntare. Una spunta sa dire solo "sì" e
  // "niente", e "niente" verrebbe letto come no: sull'accessibilità un no
  // sbagliato fa perdere clienti al gestore, e un sì sbagliato fa viaggiare
  // per niente una persona in carrozzina. Deve poter dire "non lo so".
  const TriStato = ({
    nome,
    testo,
    valore,
  }: {
    nome: string;
    testo: string;
    valore: boolean | null | undefined;
  }) => (
    <div>
      <label htmlFor={nome} className={etichetta}>
        {testo}
      </label>
      <select
        id={nome}
        name={nome}
        defaultValue={valore === true ? "1" : valore === false ? "0" : ""}
        className={campo}
      >
        <option value="">{t("nonIndicato")}</option>
        <option value="1">{t("opzSi")}</option>
        <option value="0">{t("opzNo")}</option>
      </select>
    </div>
  );

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="beach_id" value={beachId} />

      {/* ---------------------------------------------------- descrizione */}
      <div className="space-y-4 rounded-2xl border border-sea-100 bg-white p-5 shadow-sm">
        <div>
          <label htmlFor="descrizione" className={etichetta}>
            {t("descrizioneLabel")}
          </label>
          <textarea
            id="descrizione"
            name="descrizione"
            rows={4}
            maxLength={2000}
            defaultValue={valori?.descrizione ?? ""}
            placeholder={t("descrizionePlaceholder")}
            className={campo}
          />
        </div>

        <div>
          <label htmlFor="orari" className={etichetta}>
            {t("orariLabel")}
          </label>
          <textarea
            id="orari"
            name="orari"
            rows={2}
            maxLength={500}
            defaultValue={valori?.orari ?? ""}
            placeholder={t("orariPlaceholder")}
            className={campo}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="telefono" className={etichetta}>
              {t("telefonoLabel")}
            </label>
            <input
              id="telefono"
              name="telefono"
              type="tel"
              maxLength={40}
              defaultValue={valori?.telefono ?? ""}
              className={campo}
            />
          </div>
          <div>
            <label htmlFor="email_pubblica" className={etichetta}>
              {t("emailPubblicaLabel")}
            </label>
            <input
              id="email_pubblica"
              name="email_pubblica"
              type="email"
              maxLength={200}
              defaultValue={valori?.email_pubblica ?? ""}
              className={campo}
            />
          </div>
          <div>
            <label htmlFor="sito" className={etichetta}>
              {t("sitoLabel")}
            </label>
            <input
              id="sito"
              name="sito"
              maxLength={300}
              defaultValue={valori?.sito ?? ""}
              placeholder="https://..."
              className={campo}
            />
          </div>
          <div>
            <label htmlFor="link_prenotazione" className={etichetta}>
              {t("prenotazioneLabel")}
            </label>
            <input
              id="link_prenotazione"
              name="link_prenotazione"
              maxLength={300}
              defaultValue={valori?.link_prenotazione ?? ""}
              placeholder="https://..."
              className={campo}
            />
          </div>
        </div>

        <p className="rounded-lg bg-sea-50 px-3 py-2 text-[11px] text-sea-600">{t("profiloNota")}</p>
      </div>

      {/* --------------------------------------------------------- gruppi */}
      <div className="space-y-4 rounded-2xl border border-sea-100 bg-white p-5 shadow-sm">
        <div>
          <h2 className="font-semibold text-sea-900">{t("gruppiTitolo")}</h2>
          <p className="mt-1 text-xs text-sea-500">{t("gruppiIntro")}</p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="gruppi_max" className={etichetta}>
              {t("gruppiMaxLabel")}
            </label>
            <input
              id="gruppi_max"
              name="gruppi_max"
              type="number"
              min={0}
              max={2000}
              step={1}
              inputMode="numeric"
              defaultValue={valori?.gruppi_max ?? ""}
              placeholder={t("gruppiMaxPlaceholder")}
              className={campo}
            />
            <p className="mt-1 text-[11px] text-sea-400">{t("gruppiMaxNota")}</p>
          </div>

          <div>
            <label htmlFor="gruppi_preavviso_giorni" className={etichetta}>
              {t("preavvisoLabel")}
            </label>
            <input
              id="gruppi_preavviso_giorni"
              name="gruppi_preavviso_giorni"
              type="number"
              min={0}
              max={60}
              step={1}
              inputMode="numeric"
              defaultValue={valori?.gruppi_preavviso_giorni ?? ""}
              className={campo}
            />
          </div>

          <div>
            <label htmlFor="pranzo_gruppi" className={etichetta}>
              {t("pranzoLabel")}
            </label>
            <select
              id="pranzo_gruppi"
              name="pranzo_gruppi"
              defaultValue={valori?.pranzo_gruppi ?? ""}
              className={campo}
            >
              <option value="">{t("nonIndicato")}</option>
              <option value="sempre">{t("pranzoSempre")}</option>
              <option value="su_prenotazione">{t("pranzoPrenotazione")}</option>
              <option value="no">{t("pranzoNo")}</option>
            </select>
          </div>

          <div>
            <label htmlFor="discesa_pullman" className={etichetta}>
              {t("pullmanLabel")}
            </label>
            <select
              id="discesa_pullman"
              name="discesa_pullman"
              defaultValue={valori?.discesa_pullman ?? ""}
              className={campo}
            >
              <option value="">{t("nonIndicato")}</option>
              <option value="al_cancello">{t("pullmanCancello")}</option>
              <option value="nei_paraggi">{t("pullmanParaggi")}</option>
              <option value="no">{t("pullmanNo")}</option>
            </select>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------- accessibilità */}
      <div className="space-y-4 rounded-2xl border border-sea-100 bg-white p-5 shadow-sm">
        <div>
          <h2 className="font-semibold text-sea-900">{t("accessTitolo")}</h2>
          <p className="mt-1 text-xs text-sea-500">{t("accessIntro")}</p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <TriStato
            nome="accesso_senza_scalini"
            testo={t("senzaScaliniLabel")}
            valore={valori?.accesso_senza_scalini}
          />
          <TriStato
            nome="passerella_fino_al_mare"
            testo={t("passerellaLabel")}
            valore={valori?.passerella_fino_al_mare}
          />
          <TriStato nome="sedia_mare" testo={t("sediaMareLabel")} valore={valori?.sedia_mare} />
          <TriStato
            nome="bagno_accessibile"
            testo={t("bagnoAccessibileLabel")}
            valore={valori?.bagno_accessibile}
          />
        </div>

        <p className="rounded-lg bg-amber-50 px-3 py-2 text-[11px] text-amber-800">
          {t("accessNota")}
        </p>
      </div>

      {/* ------------------------------------------------------- servizio */}
      <div className="space-y-4 rounded-2xl border border-sea-100 bg-white p-5 shadow-sm">
        <h2 className="font-semibold text-sea-900">{t("servizioTitolo")}</h2>

        <fieldset>
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

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <TriStato
            nome="pagamenti_carte"
            testo={t("carteLabel")}
            valore={valori?.pagamenti_carte}
          />
          <TriStato nome="ombra_garantita" testo={t("ombraLabel")} valore={valori?.ombra_garantita} />
        </div>
      </div>

      {state.error ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
      ) : null}
      {state.ok ? (
        <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{t("salvato")}</p>
      ) : null}

      <SubmitButton />
    </form>
  );
}
