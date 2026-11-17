import { getTranslations } from "next-intl/server";
import { etichetta, type Specializzazione } from "@/lib/specializzazioni";

/**
 * Il riquadro della specializzazione sulla scheda pubblica.
 *
 * Funziona anche con il calendario vuoto, che è il caso più frequente
 * all'inizio: un bagno che dichiara di voler fare musica va mostrato a chi
 * cerca un posto dove suonare proprio quando non ha ancora niente in
 * programma — è lì che una proposta serve.
 *
 * Due etichette diverse, e la differenza è tutto il senso della cosa:
 *   «Aperto a proposte musicali» = una disponibilità dichiarata dal gestore
 *   «Music-friendly»             = eventi musicali pubblicati sul calendario
 * La seconda non si può spuntare in un modulo: la decide il calendario.
 *
 * Nessuna delle due tocca recensioni, punteggio o posizione in classifica.
 */
export async function SpecializzazioneBagno({
  spec,
  confermata,
  eventiInProgramma,
  contatto,
  nomeBagno,
}: {
  spec: Specializzazione | null;
  confermata: boolean;
  eventiInProgramma: number;
  contatto: { email: string | null; whatsapp: string | null };
  nomeBagno: string;
}) {
  const quale = etichetta(spec, confermata);
  if (!quale || !spec) return null;

  const t = await getTranslations("gestore");
  const ambito = spec.ambito;

  // Il pulsante "proponi" non apre un modulo nostro: userebbe una casella che
  // non abbiamo ancora protetto dallo spam e di cui non abbiamo il consenso a
  // fare da tramite. Se il gestore ha già pubblicato un contatto suo, la
  // proposta passa da lì — niente macchina nuova, niente intermediazione.
  const scriviA = contatto.whatsapp
    ? `https://wa.me/${contatto.whatsapp.replace(/\D/g, "")}`
    : contatto.email
      ? `mailto:${contatto.email}?subject=${encodeURIComponent(t(`spec_${ambito}_oggetto`, { nome: nomeBagno }))}`
      : null;

  return (
    <section
      className={`rounded-2xl border p-5 shadow-sm ${
        quale === "confermata"
          ? "border-violet-200 bg-violet-50/50"
          : "border-sea-100 bg-white"
      }`}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span aria-hidden="true" className="text-lg">
          ♪
        </span>
        <span
          className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
            quale === "confermata"
              ? "bg-violet-600 text-white"
              : "border border-sea-300 bg-white text-sea-700"
          }`}
        >
          {quale === "confermata" ? t(`spec_${ambito}_badgeAttiva`) : t(`spec_${ambito}_badgeAperta`)}
        </span>
        {quale === "confermata" && eventiInProgramma > 0 ? (
          <a href="#eventi" className="text-xs text-violet-800 underline underline-offset-2">
            {t("spec_inProgramma", { n: eventiInProgramma })}
          </a>
        ) : null}
      </div>

      {spec.racconto ? (
        <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-sea-700">
          {spec.racconto}
        </p>
      ) : null}

      {spec.frequenza ? (
        <p className="mt-2 text-xs text-sea-500">{t(`spec_freq_${spec.frequenza}`)}</p>
      ) : null}

      {scriviA ? (
        <a
          href={scriviA}
          target={contatto.whatsapp ? "_blank" : undefined}
          rel={contatto.whatsapp ? "noopener noreferrer nofollow" : undefined}
          className="mt-4 inline-block rounded-full bg-sea-500 px-4 py-2 text-sm font-medium text-white hover:bg-sea-600"
        >
          {t(`spec_${ambito}_proponi`)}
        </a>
      ) : null}

      <p className="mt-3 text-[11px] text-sea-400">
        {quale === "confermata" ? t("spec_notaAttiva") : t("spec_notaAperta")}
      </p>
    </section>
  );
}
