import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/server";

type Voce = {
  handle: string;
  nome: string | null;
  beach_id: string;
  bagno: string;
  localita: string;
  tipo: string;
  quando: string;
};

/**
 * «Dove sono stati i tuoi amici»: il diario.
 *
 * MOSTRA VISITE, MAI RECENSIONI, e questa è la regola che tiene in piedi
 * tutto il lato social di LidoRank. Segui una persona perché è stata in
 * quaranta bagni della costa, non per il voto che ha dato a uno di questi: il
 * voto resta anonimo, e deve restarlo perché è l'anonimato che permette a
 * qualcuno di scrivere che un bagno è caro sapendo che ci tornerà l'estate
 * dopo, nella stessa città dove il gestore lo conosce di vista.
 *
 * NON COMPARE QUANDO È VUOTO. Un riquadro «ecco cosa fanno i tuoi amici» con
 * dentro il nulla è il modo più rapido per far capire a una persona che è
 * sola: su un prodotto appena nato quel riquadro farebbe più danno che bene.
 */
export async function DiarioAmici() {
  const t = await getTranslations("social");

  const supabase = createClient();
  const { data } = await supabase.rpc("diario_amici", { _limite: 30 });
  const voci = (data ?? []) as Voce[];
  if (voci.length === 0) return null;

  const quando = (iso: string) => {
    const ore = Math.floor((Date.now() - new Date(iso).getTime()) / 3_600_000);
    if (ore < 1) return t("adesso");
    if (ore < 24) return t("oreFa", { n: ore });
    const giorni = Math.floor(ore / 24);
    if (giorni < 30) return t("giorniFa", { n: giorni });
    return new Date(iso).toLocaleDateString("it-IT", { month: "long", year: "numeric" });
  };

  const iniziali = (nome: string) =>
    nome
      .replace(/[^\p{L}\s]/gu, "")
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]!.toUpperCase())
      .join("") || "·";

  return (
    <section className="rounded-2xl border border-sea-100 bg-white p-5 shadow-sm">
      <h2 className="text-sm font-semibold text-sea-800">{t("diarioTitolo")}</h2>
      <p className="mt-0.5 text-xs text-sea-500">{t("diarioIntro")}</p>

      <ul className="mt-4 space-y-3">
        {voci.map((v, i) => (
          <li key={`${v.handle}-${v.beach_id}-${i}`} className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sea-100 text-xs font-bold text-sea-700">
              {iniziali(v.nome || v.handle)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm leading-snug text-sea-800">
                <a href={`/u/${v.handle}`} className="font-semibold hover:underline">
                  {v.nome || `@${v.handle}`}
                </a>{" "}
                {v.tipo === "visitato" ? t("eStatoA") : t("vuoleProvare")}{" "}
                <Link href={`/lido/${v.beach_id}`} className="font-medium text-sea-700 hover:underline">
                  {v.bagno}
                </Link>
              </p>
              <p className="text-[11px] text-sea-400">
                {v.localita} · {quando(v.quando)}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
