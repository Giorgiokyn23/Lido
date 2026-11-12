import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/server";
import { EventoForm } from "@/components/EventoForm";
import { BottoneElimina } from "@/components/BottoneElimina";

export const metadata: Metadata = {
  title: "LidoRank — Eventi",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

type Mio = { beach_id: string; nome: string; localita: string; approvata_il: string | null };
type Evento = {
  id: string;
  titolo: string;
  descrizione: string | null;
  data_inizio: string;
  data_fine: string | null;
};

export default async function EventiGestorePage({
  params: { locale, id },
}: {
  params: { locale: string; id: string };
}) {
  setRequestLocale(locale);
  const t = await getTranslations("gestore");
  const fmt = locale === "en" ? "en-GB" : "it-IT";

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return (
      <div className="mx-auto max-w-xl space-y-4 py-10 text-center">
        <p className="text-sm text-sea-600">{t("loginRequired")}</p>
        <Link
          href="/login"
          className="inline-block rounded-full bg-sea-500 px-5 py-2 font-medium text-white hover:bg-sea-600"
        >
          {t("loginCta")}
        </Link>
      </div>
    );
  }

  const { data: mieiData } = await supabase.rpc("miei_stabilimenti");
  const mio = ((mieiData ?? []) as Mio[]).find((m) => m.beach_id === id);
  if (!mio) notFound();

  // La RLS mostra al gestore anche i propri eventi passati o nascosti.
  const { data: evData } = await supabase
    .from("eventi_gestore")
    .select("id,titolo,descrizione,data_inizio,data_fine")
    .eq("beach_id", id)
    .order("data_inizio", { ascending: true });
  const eventi = (evData ?? []) as Evento[];

  const oggi = new Date().toISOString().slice(0, 10);
  const futuri = eventi.filter((e) => (e.data_fine ?? e.data_inizio) >= oggi);
  const passati = eventi.filter((e) => (e.data_fine ?? e.data_inizio) < oggi);

  const data = (e: Evento) => {
    const i = new Date(e.data_inizio).toLocaleDateString(fmt, { day: "numeric", month: "long" });
    if (!e.data_fine || e.data_fine === e.data_inizio) return i;
    const f = new Date(e.data_fine).toLocaleDateString(fmt, { day: "numeric", month: "long" });
    return `${i} – ${f}`;
  };

  const Riga = ({ e, passato }: { e: Evento; passato?: boolean }) => (
    <li className={`rounded-xl border border-sea-100 px-3 py-2 ${passato ? "opacity-60" : ""}`}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="font-medium text-sea-900">{e.titolo}</div>
          <div className="text-xs text-sea-500">{data(e)}</div>
          {e.descrizione ? (
            <p className="mt-1 text-sm text-sea-600">{e.descrizione}</p>
          ) : null}
        </div>
        <BottoneElimina
          eventoId={e.id}
          beachId={id}
          titolo={e.titolo}
          etichetta={t("evElimina")}
          conferma={t("evConfermaElimina", { titolo: e.titolo })}
        />
      </div>
    </li>
  );

  return (
    <div className="mx-auto max-w-2xl space-y-5 py-6">
      <div>
        <Link href={`/area-gestore/${id}`} className="text-sm text-sea-500 hover:underline">
          {t("backHub")}
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-sea-900">{t("evTitoloPagina")}</h1>
        <p className="text-sm text-sea-500">
          {mio.nome} · {t("evIntro", { max: 10 })}
        </p>
      </div>

      <EventoForm beachId={id} />

      <section className="rounded-2xl border border-sea-100 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-sea-800">{t("evInProgramma")}</h2>
        {futuri.length === 0 ? (
          <p className="mt-2 text-sm text-sea-500">{t("evNessuno")}</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {futuri.map((e) => (
              <Riga key={e.id} e={e} />
            ))}
          </ul>
        )}
      </section>

      {passati.length > 0 ? (
        <section className="rounded-2xl border border-sea-100 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-sea-800">{t("evPassati")}</h2>
          <p className="mt-1 text-xs text-sea-400">{t("evPassatiNota")}</p>
          <ul className="mt-3 space-y-2">
            {passati.map((e) => (
              <Riga key={e.id} e={e} passato />
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
