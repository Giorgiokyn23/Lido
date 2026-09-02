import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { ScoreBar } from "@/components/ScoreBar";
import { ReviewForm } from "@/components/ReviewForm";
import { SegnalazioneForm } from "@/components/SegnalazioneForm";
import { FlagButton } from "@/components/FlagButton";
import {
  METRICS,
  FACTS,
  BOOL_FACTS,
  RANK_MIN,
  type BeachScore,
  type Review,
  type BeachRanking,
} from "@/lib/types";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const tmeta = await getTranslations("detailMeta");
  const { data } = await supabase
    .from("beach_scores")
    .select("nome, localita, regione, avg_overall, reviews_count")
    .eq("id", params.id)
    .maybeSingle();
  if (!data) return { title: tmeta("fallbackTitle") };
  const voto = data.avg_overall != null ? `${data.avg_overall}/5 · ` : "";
  return {
    title: tmeta("title", { nome: data.nome, localita: data.localita }),
    description: tmeta("description", {
      voto,
      count: data.reviews_count,
      nome: data.nome,
      localita: data.localita,
      regione: data.regione,
    }),
    alternates: { canonical: `/lido/${params.id}` },
  };
}

const scoreValue = (b: BeachScore, key: string) =>
  (b as unknown as Record<string, number | null>)[`avg_${key}`] ?? null;

function fmtDate(iso: string, locale: string) {
  return new Date(iso).toLocaleDateString(locale, {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default async function BeachPage({ params }: { params: { id: string; locale: string } }) {
  const supabase = createClient();

  const [{ data: beach }, { data: reviewsData }, { data: rankData }, { data: beachRow }] =
    await Promise.all([
      supabase.from("beach_scores").select("*").eq("id", params.id).maybeSingle(),
      supabase
        .from("reviews")
        .select("*")
        .eq("beach_id", params.id)
        .order("created_at", { ascending: false })
        .limit(50),
      supabase.from("beach_rankings").select("*").eq("id", params.id).maybeSingle(),
      supabase
        .from("beaches")
        .select("segnalazioni_aperte, id_concessione, categoria")
        .eq("id", params.id)
        .maybeSingle(),
    ]);

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const tcy = await getTranslations("countries");
  const td = await getTranslations("detail");
  const tm = await getTranslations("metrics");
  const th = await getTranslations("metricHints");
  const tf = await getTranslations("facts");
  const tb = await getTranslations("boolFacts");
  const locale = params.locale === "en" ? "en-GB" : "it-IT";

  if (!beach) notFound();
  const b = beach as BeachScore;
  const reviews = (reviewsData ?? []) as Review[];
  const rank = (rankData ?? null) as BeachRanking | null;
  const segnalazioni = (beachRow?.segnalazioni_aperte as number | undefined) ?? 0;
  const idConcessione = (beachRow?.id_concessione as string | undefined) ?? null;
  const categoria = (beachRow?.categoria as string | undefined) ?? null;

  // aggregati fatti oggettivi (dalle recensioni caricate) — chiavi/valori, tradotti nel render
  const factSummary = FACTS.map((f) => {
    const vals = reviews
      .map((r) => (r as unknown as Record<string, string | null>)[f.key])
      .filter((v): v is string => !!v);
    const top = f.options
      .map((o) => ({ value: o.value, n: vals.filter((v) => v === o.value).length }))
      .filter((x) => x.n > 0)
      .sort((a, z) => z.n - a.n)[0];
    return vals.length && top
      ? { key: f.key, bestValue: top.value, bestN: top.n, total: vals.length }
      : null;
  }).filter(Boolean) as { key: string; bestValue: string; bestN: number; total: number }[];

  const boolSummary = BOOL_FACTS.map((bf) => {
    const vals = reviews
      .map((r) => (r as unknown as Record<string, boolean | null>)[bf.key])
      .filter((v): v is boolean => v === true || v === false);
    if (!vals.length) return null;
    const yes = vals.filter(Boolean).length;
    return { key: bf.key, pct: Math.round((yes / vals.length) * 100), total: vals.length };
  }).filter(Boolean) as { key: string; pct: number; total: number }[];

  return (
    <div className="space-y-8">
      <Link href="/" className="inline-block text-sm text-sea-500 hover:underline">
        {td("backAll")}
      </Link>

      {/* Profilo */}
      <section className="rounded-2xl border border-sea-100 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-sea-900">{b.nome}</h1>
            <p className="text-sea-500">
              {b.localita} · {b.regione}
            </p>
            {(() => {
              const rc = b.reviews_count ?? 0;
              const showComune = !!rank && !!b.localita && b.localita !== b.regione && rc >= RANK_MIN.comune;
              const showRegione = !!rank && rc >= RANK_MIN.regione;
              const showNazionale = !!rank && rc >= RANK_MIN.nazionale;
              const anyRank = showComune || showRegione || showNazionale;
              if (anyRank) {
                return (
                  <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold">
                    {showComune && (
                      <span className="rounded-full bg-amber-100 px-3 py-1 text-amber-800">
                        {td("inPlace", { rank: rank!.rank_comune, place: b.localita })}
                      </span>
                    )}
                    {showRegione && (
                      <span className="rounded-full bg-sea-100 px-3 py-1 text-sea-800">
                        #{rank!.rank_regione} · {b.regione}
                      </span>
                    )}
                    {showNazionale && (
                      <span className="rounded-full bg-sea-600 px-3 py-1 text-white">
                        #{rank!.rank_nazionale} · {tcy(b.paese ?? "IT")}
                      </span>
                    )}
                  </div>
                );
              }
              // Sotto soglia: nessun rango eletto sui pochi dati disponibili
              return (
                <div className="mt-3">
                  <span className="inline-flex items-center gap-1 rounded-full bg-sea-50 px-3 py-1 text-xs font-medium text-sea-500">
                    {td("rankBuilding", { n: RANK_MIN.comune })}
                  </span>
                </div>
              );
            })()}
            <div className="mt-3 flex flex-wrap gap-2 text-xs text-sea-600">
              <span className="rounded-full bg-sea-50 px-3 py-1">
                {td("reviewsCount", { n: b.reviews_count })}
              </span>
              {b.distanza_ombrelloni_metri != null && (
                <span className="rounded-full bg-sea-50 px-3 py-1">
                  {td("umbrellaDistance", { n: b.distanza_ombrelloni_metri })}
                </span>
              )}
              {categoria && (
                <span className="rounded-full bg-sea-50 px-3 py-1">{categoria}</span>
              )}
              {idConcessione && (
                <span
                  className="rounded-full bg-sea-50 px-3 py-1 font-mono text-[11px]"
                  title={td("concessionTitle")}
                >
                  {td("concessionLabel", { id: idConcessione })}
                </span>
              )}
              {segnalazioni > 0 && (
                <span className="rounded-full bg-amber-100 px-3 py-1 text-amber-800">
                  {td("reportsInReview", { n: segnalazioni })}
                </span>
              )}
            </div>
          </div>
          <div className="rounded-2xl bg-sea-500 px-5 py-3 text-center text-white">
            <div className="text-3xl font-bold leading-none tabular-nums">
              {b.avg_overall == null ? "—" : b.avg_overall.toFixed(1)}
            </div>
            <div className="text-[11px] uppercase tracking-wide opacity-80">{td("scoreOutOf")}</div>
          </div>
        </div>

        {/* Micro-punteggi di categoria */}
        <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2">
          {METRICS.map((m) => (
            <ScoreBar key={m.key} label={tm(m.key)} hint={th(m.key)} value={scoreValue(b, m.key)} />
          ))}
        </div>

        {/* Cosa dicono gli utenti — fatti oggettivi */}
        {(factSummary.length > 0 || boolSummary.length > 0) && (
          <div className="mt-6 rounded-xl bg-sea-50/60 p-4">
            <p className="mb-3 text-sm font-semibold text-sea-800">{td("whatUsersSay")}</p>
            <div className="flex flex-wrap gap-2 text-xs">
              {factSummary.map((f) => (
                <span key={f.key} className="rounded-full bg-white px-3 py-1 text-sea-700 shadow-sm">
                  {tf(`${f.key}.label`)}: <b>{tf(`${f.key}.opt.${f.bestValue}`)}</b>{" "}
                  <span className="text-sea-400">
                    ({Math.round((f.bestN / f.total) * 100)}% · {f.total})
                  </span>
                </span>
              ))}
              {boolSummary.map((f) => (
                <span key={f.key} className="rounded-full bg-white px-3 py-1 text-sea-700 shadow-sm">
                  {tb(f.key)}: <b>{f.pct}% {td("yesShort")}</b>{" "}
                  <span className="text-sea-400">({f.total})</span>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Segnalazione illeciti */}
        <div className="mt-6 border-t border-sea-100 pt-4">
          <SegnalazioneForm beachId={b.id} />
        </div>
      </section>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-5">
        {/* Recensioni */}
        <section className="lg:col-span-3">
          <h2 className="mb-3 text-lg font-semibold text-sea-900">
            {td("reviewsHeading", { n: reviews.length })}
          </h2>
          {reviews.length === 0 ? (
            <p className="rounded-xl bg-white p-6 text-sea-500 shadow-sm">
              {td("noReviews")}
            </p>
          ) : (
            <div className="max-h-[640px] space-y-3 overflow-y-auto pr-1">
              {reviews.map((r) => {
                const vals = METRICS.map(
                  (m) => (r as unknown as Record<string, number | null>)[m.key]
                ).filter((v): v is number => typeof v === "number");
                const overall = vals.reduce((a, v) => a + v, 0) / (vals.length || 1);
                return (
                  <article
                    key={r.id}
                    className="rounded-xl border border-sea-100 bg-white p-4 shadow-sm"
                  >
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <span className="rounded-lg bg-sea-500 px-2 py-0.5 text-sm font-bold text-white tabular-nums">
                          {overall.toFixed(1)}
                        </span>
                        {r.verified ? (
                          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                            {td("verified")}
                          </span>
                        ) : (
                          <span className="rounded-full bg-sea-50 px-2 py-0.5 text-[10px] text-sea-400">
                            {td("notVerified")}
                          </span>
                        )}
                      </span>
                      <span className="flex items-center gap-3">
                        <time className="text-xs text-sea-400">{fmtDate(r.created_at, locale)}</time>
                        <FlagButton reviewId={r.id} />
                      </span>
                    </div>
                    {r.commento ? (
                      <p className="mt-2 text-sm text-sea-800">{r.commento}</p>
                    ) : (
                      <p className="mt-2 text-sm italic text-sea-400">{td("noComment")}</p>
                    )}
                    <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-sea-500">
                      {METRICS.map((m) => {
                        const v = (r as unknown as Record<string, number | null>)[m.key];
                        if (typeof v !== "number") return null;
                        return (
                          <span key={m.key}>
                            {tm(m.key)}: <b className="text-sea-700 tabular-nums">{v}</b>
                          </span>
                        );
                      })}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        {/* Form recensione */}
        <section className="lg:col-span-2">
          <ReviewForm beachId={b.id} isLoggedIn={!!user} />
        </section>
      </div>
    </div>
  );
}
