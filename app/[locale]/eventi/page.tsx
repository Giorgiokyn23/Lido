import type { Metadata } from "next";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { createPublicClient } from "@/lib/supabase/public";

export const metadata: Metadata = {
  title: "LidoRank — Eventi sul litorale",
  alternates: { canonical: "/eventi" },
};

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

// Iniziali dello stabilimento: fanno le veci dell'immagine che non abbiamo.
function iniziali(nome: string): string {
  return nome
    .replace(/[^\p{L}\s]/gu, "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");
}

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
  const { data } = await supabase.from("calendario_eventi").select("*").limit(300);
  const tutti = (data ?? []) as Riga[];

  const localita = (searchParams.localita ?? "").trim();
  const elenco = localita ? tutti.filter((r) => r.localita === localita) : tutti;

  const perLocalita = new Map<string, number>();
  for (const r of tutti) perLocalita.set(r.localita, (perLocalita.get(r.localita) ?? 0) + 1);
  const luoghi = [...perLocalita.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));

  const oggi = new Date();
  oggi.setHours(0, 0, 0, 0);

  const quando = (r: Riga) => {
    const base = new Date(r.data_inizio).toLocaleDateString(fmt, {
      weekday: "long",
      day: "numeric",
      month: "long",
    });
    if (!r.data_fine || r.data_fine === r.data_inizio) return base;
    const f = new Date(r.data_fine).toLocaleDateString(fmt, { day: "numeric", month: "long" });
    return `${base} – ${f}`;
  };

  const fraQuanto = (iso: string) => {
    const d = Math.round((new Date(iso).getTime() - oggi.getTime()) / 86_400_000);
    if (d <= 0) return t("evOggi");
    if (d === 1) return t("evDomani");
    if (d <= 14) return t("evFraGiorni", { giorni: d });
    return null;
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6 py-6">
      <div>
        <h1 className="text-3xl font-bold text-sea-900">{t("calTitolo")}</h1>
        <p className="mt-1 text-sea-600">{t("calIntro")}</p>
      </div>

      {luoghi.length > 1 ? (
        <div className="flex flex-wrap gap-2">
          <Link
            href="/eventi"
            className={`rounded-full border px-3 py-1 text-sm ${
              localita
                ? "border-sea-200 text-sea-600 hover:bg-sea-50"
                : "border-sea-500 bg-sea-500 text-white"
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
        /* Un flusso di schede, come i commenti: in alto chi parla, sotto che cosa dice. */
        <div className="space-y-3">
          {elenco.map((r) => {
            const manca = fraQuanto(r.data_inizio);
            return (
              <article
                key={r.id}
                className="rounded-2xl border border-sea-100 bg-white p-4 shadow-sm"
              >
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-sea-100 text-sm font-bold text-sea-700">
                    {iniziali(r.stabilimento)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/lido/${r.beach_id}`}
                      className="font-semibold text-sea-900 hover:underline"
                    >
                      {r.stabilimento}
                    </Link>
                    <div className="text-xs text-sea-400">{r.localita}</div>
                  </div>
                  {manca ? (
                    <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800">
                      {manca}
                    </span>
                  ) : null}
                </div>

                <div className="mt-3 border-l-2 border-sea-100 pl-3">
                  <h2 className="font-semibold text-sea-900">{r.titolo}</h2>
                  <p className="mt-0.5 text-xs capitalize text-sea-500">{quando(r)}</p>
                  {r.descrizione ? (
                    <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-sea-700">
                      {r.descrizione}
                    </p>
                  ) : null}
                </div>
              </article>
            );
          })}
        </div>
      )}

      <p className="text-[11px] text-sea-400">{t("calNota")}</p>
    </div>
  );
}
