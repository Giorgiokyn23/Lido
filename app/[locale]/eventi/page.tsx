import type { Metadata } from "next";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { createPublicClient } from "@/lib/supabase/public";

export const metadata: Metadata = {
  title: "LidoRank — Eventi sul litorale",
  alternates: { canonical: "/eventi" },
};

// Si aggiorna ogni mezz'ora: un calendario non ha bisogno di essere al secondo,
// e le azioni del gestore lo invalidano comunque subito.
export const revalidate = 1800;

type Riga = {
  id: string;
  beach_id: string;
  stabilimento: string;
  localita: string;
  titolo: string;
  descrizione: string | null;
  data_inizio: string;
  data_fine: string | null;
};

export default async function EventiPage({
  params: { locale },
  searchParams,
}: {
  params: { locale: string };
  searchParams: { localita?: string };
}) {
  setRequestLocale(locale);
  const t = await getTranslations("gestore");
  const fmt = locale === "en" ? "en-GB" : "it-IT";

  const supabase = createPublicClient();
  // La vista è già ordinata per data e filtra gli eventi conclusi.
  const { data } = await supabase.from("calendario_eventi").select("*").limit(300);
  const tutti = (data ?? []) as Riga[];

  const localita = (searchParams.localita ?? "").trim();
  const elenco = localita ? tutti.filter((r) => r.localita === localita) : tutti;

  // Località disponibili, con quanti eventi ciascuna.
  const perLocalita = new Map<string, number>();
  for (const r of tutti) perLocalita.set(r.localita, (perLocalita.get(r.localita) ?? 0) + 1);
  const luoghi = [...perLocalita.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));

  // Raggruppo per giorno per dare al calendario una forma leggibile.
  const perGiorno = new Map<string, Riga[]>();
  for (const r of elenco) {
    if (!perGiorno.has(r.data_inizio)) perGiorno.set(r.data_inizio, []);
    perGiorno.get(r.data_inizio)!.push(r);
  }

  const giornoLungo = (iso: string) =>
    new Date(iso).toLocaleDateString(fmt, { weekday: "long", day: "numeric", month: "long" });

  const durata = (r: Riga) =>
    r.data_fine && r.data_fine !== r.data_inizio
      ? ` – ${new Date(r.data_fine).toLocaleDateString(fmt, { day: "numeric", month: "long" })}`
      : "";

  return (
    <div className="mx-auto max-w-3xl space-y-6 py-6">
      <div>
        <h1 className="text-3xl font-bold text-sea-900">{t("calTitolo")}</h1>
        <p className="mt-1 text-sea-600">{t("calIntro")}</p>
      </div>

      {luoghi.length > 1 ? (
        <div className="flex flex-wrap gap-2">
          <Link
            href="/eventi"
            className={`rounded-full border px-3 py-1 text-sm ${
              localita ? "border-sea-200 text-sea-600 hover:bg-sea-50" : "border-sea-500 bg-sea-500 text-white"
            }`}
          >
            {t("calTutte")}
          </Link>
          {luoghi.map(([l, n]) => (
            <Link
              key={l}
              href={`/eventi?localita=${encodeURIComponent(l)}`}
              className={`rounded-full border px-3 py-1 text-sm ${
                localita === l
                  ? "border-sea-500 bg-sea-500 text-white"
                  : "border-sea-200 text-sea-600 hover:bg-sea-50"
              }`}
            >
              {l} <span className="opacity-60">{n}</span>
            </Link>
          ))}
        </div>
      ) : null}

      {elenco.length === 0 ? (
        <p className="rounded-2xl border border-sea-100 bg-white p-6 text-sm text-sea-500 shadow-sm">
          {t("calVuoto")}
        </p>
      ) : (
        <div className="space-y-5">
          {[...perGiorno.entries()].map(([giorno, righe]) => (
            <section key={giorno}>
              <h2 className="text-sm font-semibold capitalize text-sea-700">{giornoLungo(giorno)}</h2>
              <ul className="mt-2 space-y-2">
                {righe.map((r) => (
                  <li
                    key={r.id}
                    className="rounded-2xl border border-sea-100 bg-white p-4 shadow-sm"
                  >
                    <div className="font-semibold text-sea-900">{r.titolo}</div>
                    <div className="text-sm text-sea-500">
                      <Link href={`/lido/${r.beach_id}`} className="hover:underline">
                        {r.stabilimento}
                      </Link>{" "}
                      · {r.localita}
                      {durata(r)}
                    </div>
                    {r.descrizione ? (
                      <p className="mt-2 text-sm text-sea-600">{r.descrizione}</p>
                    ) : null}
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}

      <p className="text-[11px] text-sea-400">{t("calNota")}</p>
    </div>
  );
}
