import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ScoreBar } from "@/components/ScoreBar";
import { ReviewForm } from "@/components/ReviewForm";
import { SegnalazioneForm } from "@/components/SegnalazioneForm";
import { FlagButton } from "@/components/FlagButton";
import {
  METRICS,
  FACTS,
  BOOL_FACTS,
  type BeachScore,
  type Review,
  type BeachRanking,
} from "@/lib/types";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data } = await supabase
    .from("beach_scores")
    .select("nome, localita, regione, avg_overall, reviews_count")
    .eq("id", params.id)
    .maybeSingle();
  if (!data) return { title: "Lido — LidoRank" };
  const voto = data.avg_overall != null ? `${data.avg_overall}/5 · ` : "";
  return {
    title: `${data.nome} (${data.localita}) — Recensioni e voti | LidoRank`,
    description: `${voto}${data.reviews_count} recensioni su ${data.nome}, stabilimento balneare a ${data.localita} (${data.regione}): privacy, servizi famiglie, accessibilità, fondale, prezzi. Scrivi la tua.`,
    alternates: { canonical: `/lido/${params.id}` },
  };
}

const scoreValue = (b: BeachScore, key: string) =>
  (b as unknown as Record<string, number | null>)[`avg_${key}`] ?? null;

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("it-IT", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default async function BeachPage({ params }: { params: { id: string } }) {
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

  if (!beach) notFound();
  const b = beach as BeachScore;
  const reviews = (reviewsData ?? []) as Review[];
  const rank = (rankData ?? null) as BeachRanking | null;
  const segnalazioni = (beachRow?.segnalazioni_aperte as number | undefined) ?? 0;
  const idConcessione = (beachRow?.id_concessione as string | undefined) ?? null;
  const categoria = (beachRow?.categoria as string | undefined) ?? null;

  // aggregati fatti oggettivi (dalle recensioni caricate)
  const factSummary = FACTS.map((f) => {
    const vals = reviews
      .map((r) => (r as unknown as Record<string, string | null>)[f.key])
      .filter((v): v is string => !!v);
    const top = f.options
      .map((o) => ({ label: o.label, n: vals.filter((v) => v === o.value).length }))
      .filter((x) => x.n > 0)
      .sort((a, z) => z.n - a.n)[0];
    return vals.length ? { label: f.label, best: top, total: vals.length } : null;
  }).filter(Boolean) as { label: string; best: { label: string; n: number }; total: number }[];

  const boolSummary = BOOL_FACTS.map((bf) => {
    const vals = reviews
      .map((r) => (r as unknown as Record<string, boolean | null>)[bf.key])
      .filter((v): v is boolean => v === true || v === false);
    if (!vals.length) return null;
    const yes = vals.filter(Boolean).length;
    return { label: bf.label, pct: Math.round((yes / vals.length) * 100), total: vals.length };
  }).filter(Boolean) as { label: string; pct: number; total: number }[];

  return (
    <div className="space-y-8">
      <Link href="/" className="inline-block text-sm text-sea-500 hover:underline">
        ← Tutti i lidi
      </Link>

      {/* Profilo */}
      <section className="rounded-2xl border border-sea-100 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-sea-900">{b.nome}</h1>
            <p className="text-sea-500">
              {b.localita} · {b.regione}
            </p>
            {rank && (
              <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold">
                <span className="rounded-full bg-amber-100 px-3 py-1 text-amber-800">
                  #{rank.rank_comune} a {b.localita}
                </span>
                <span className="rounded-full bg-sea-100 px-3 py-1 text-sea-800">
                  #{rank.rank_regione} in {b.regione}
                </span>
                <span className="rounded-full bg-sea-600 px-3 py-1 text-white">
                  #{rank.rank_nazionale} in Italia
                </span>
              </div>
            )}
            <div className="mt-3 flex flex-wrap gap-2 text-xs text-sea-600">
              <span className="rounded-full bg-sea-50 px-3 py-1">
                {b.reviews_count} recensioni
              </span>
              {b.distanza_ombrelloni_metri != null && (
                <span className="rounded-full bg-sea-50 px-3 py-1">
                  {b.distanza_ombrelloni_metri} m tra ombrelloni
                </span>
              )}
              {categoria && (
                <span className="rounded-full bg-sea-50 px-3 py-1">{categoria}</span>
              )}
              {idConcessione && (
                <span
                  className="rounded-full bg-sea-50 px-3 py-1 font-mono text-[11px]"
                  title="Numero della concessione demaniale (fonte SID/MIT)"
                >
                  Concessione n. {idConcessione}
                </span>
              )}
              {segnalazioni > 0 && (
                <span className="rounded-full bg-amber-100 px-3 py-1 text-amber-800">
                  ⚠ {segnalazioni} segnalazion{segnalazioni === 1 ? "e" : "i"} in verifica
                </span>
              )}
            </div>
          </div>
          <div className="rounded-2xl bg-sea-500 px-5 py-3 text-center text-white">
            <div className="text-3xl font-bold leading-none tabular-nums">
              {b.avg_overall == null ? "—" : b.avg_overall.toFixed(1)}
            </div>
            <div className="text-[11px] uppercase tracking-wide opacity-80">punteggio / 5</div>
          </div>
        </div>

        {/* Micro-punteggi di categoria */}
        <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2">
          {METRICS.map((m) => (
            <ScoreBar key={m.key} label={m.label} hint={m.hint} value={scoreValue(b, m.key)} />
          ))}
        </div>

        {/* Cosa dicono gli utenti — fatti oggettivi */}
        {(factSummary.length > 0 || boolSummary.length > 0) && (
          <div className="mt-6 rounded-xl bg-sea-50/60 p-4">
            <p className="mb-3 text-sm font-semibold text-sea-800">Cosa dicono gli utenti</p>
            <div className="flex flex-wrap gap-2 text-xs">
              {factSummary.map((f) => (
                <span key={f.label} className="rounded-full bg-white px-3 py-1 text-sea-700 shadow-sm">
                  {f.label}: <b>{f.best.label}</b>{" "}
                  <span className="text-sea-400">
                    ({Math.round((f.best.n / f.total) * 100)}% · {f.total})
                  </span>
                </span>
              ))}
              {boolSummary.map((f) => (
                <span key={f.label} className="rounded-full bg-white px-3 py-1 text-sea-700 shadow-sm">
                  {f.label}: <b>{f.pct}% sì</b>{" "}
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
            Recensioni ({reviews.length})
          </h2>
          {reviews.length === 0 ? (
            <p className="rounded-xl bg-white p-6 text-sea-500 shadow-sm">
              Ancora nessuna recensione. Sii il primo a recensire questo lido!
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
                            ✓ Verificata
                          </span>
                        ) : (
                          <span className="rounded-full bg-sea-50 px-2 py-0.5 text-[10px] text-sea-400">
                            Non verificata
                          </span>
                        )}
                      </span>
                      <span className="flex items-center gap-3">
                        <time className="text-xs text-sea-400">{fmtDate(r.created_at)}</time>
                        <FlagButton reviewId={r.id} />
                      </span>
                    </div>
                    {r.commento ? (
                      <p className="mt-2 text-sm text-sea-800">{r.commento}</p>
                    ) : (
                      <p className="mt-2 text-sm italic text-sea-400">Nessun commento.</p>
                    )}
                    <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-sea-500">
                      {METRICS.map((m) => {
                        const v = (r as unknown as Record<string, number | null>)[m.key];
                        if (typeof v !== "number") return null;
                        return (
                          <span key={m.key}>
                            {m.label}: <b className="text-sea-700 tabular-nums">{v}</b>
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
