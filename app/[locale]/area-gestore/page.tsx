import type { Metadata } from "next";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/server";
import { createPublicClient } from "@/lib/supabase/public";
import { rinunciaRivendicazione } from "@/app/actions";

export const metadata: Metadata = {
  title: "LidoRank — Area gestore",
  robots: { index: false, follow: false },
};

// Area riservata: dipende dalla sessione, quindi mai in cache.
export const dynamic = "force-dynamic";

type Mio = { beach_id: string; nome: string; localita: string; approvata_il: string | null };
type Riv = {
  id: string;
  beach_id: string;
  stato: string;
  motivo_rifiuto: string | null;
  creata_il: string;
};

const Stato = ({ stato }: { stato: string }) => {
  const map: Record<string, string> = {
    in_attesa: "bg-amber-50 text-amber-800 border-amber-200",
    approvata: "bg-emerald-50 text-emerald-800 border-emerald-200",
    respinta: "bg-red-50 text-red-700 border-red-200",
  };
  const label: Record<string, string> = {
    in_attesa: "In attesa di verifica",
    approvata: "Approvata",
    respinta: "Respinta",
  };
  return (
    <span className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${map[stato] ?? ""}`}>
      {label[stato] ?? stato}
    </span>
  );
};

export default async function AreaGestorePage({
  params: { locale },
}: {
  params: { locale: string };
}) {
  setRequestLocale(locale);
  const t = await getTranslations("gestore");

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="mx-auto max-w-xl space-y-4 py-10 text-center">
        <h1 className="text-2xl font-bold text-sea-900">{t("areaTitle")}</h1>
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

  // Stabilimenti approvati (funzione security definer, filtra su auth.uid()).
  const { data: mieiData } = await supabase.rpc("miei_stabilimenti");
  const miei = (mieiData ?? []) as Mio[];

  // Le richieste dell'utente. Il filtro su user_id è ESPLICITO e non delegato
  // alla RLS: la policy della 0071 è «user_id = auth.uid() or e_admin()», quindi
  // a un amministratore restituirebbe anche le richieste di tutti gli altri,
  // che in un'area personale non c'entrano nulla. Due lucchetti, non uno.
  const { data: rivData } = await supabase
    .from("rivendicazioni")
    .select("id,beach_id,stato,motivo_rifiuto,creata_il")
    .eq("user_id", user.id)
    .order("creata_il", { ascending: false });
  const richieste = (rivData ?? []) as Riv[];

  // Solo per gli amministratori: la coda di verifica sta altrove, e l'indirizzo
  // non è scritto da nessuna parte. Qui c'è il collegamento, così non va ricordato.
  const { data: eAdmin } = await supabase.rpc("e_admin");
  const en = locale === "en";

  // Nomi degli stabilimenti citati nelle richieste non ancora approvate.
  const idsDaRisolvere = richieste.filter((r) => r.stato !== "approvata").map((r) => r.beach_id);
  const nomi = new Map<string, string>();
  if (idsDaRisolvere.length) {
    const pub = createPublicClient();
    const { data: bs } = await pub.from("beaches").select("id,nome").in("id", idsDaRisolvere);
    for (const b of (bs ?? []) as { id: string; nome: string }[]) nomi.set(b.id, b.nome);
  }

  const inCorso = richieste.filter((r) => r.stato === "in_attesa" || r.stato === "respinta");
  // Serve l'id della rivendica approvata per permettere al gestore di rinunciare.
  const idApprovata = new Map<string, string>(
    richieste.filter((r) => r.stato === "approvata").map((r) => [r.beach_id, r.id])
  );

  return (
    <div className="mx-auto max-w-3xl space-y-6 py-6">
      <div>
        <h1 className="text-2xl font-bold text-sea-900">{t("areaTitle")}</h1>
        <p className="mt-1 text-sm text-sea-500">{t("areaIntro")}</p>
      </div>

      <section className="rounded-2xl border border-sea-100 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-sea-800">{t("mine")}</h2>
        {miei.length === 0 ? (
          <p className="mt-2 text-sm text-sea-500">{t("noneYet")}</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {miei.map((m) => (
              <li
                key={m.beach_id}
                className="flex items-center justify-between gap-3 rounded-xl border border-sea-100 px-3 py-2"
              >
                <div className="min-w-0">
                  <div className="truncate font-medium text-sea-900">{m.nome}</div>
                  <div className="truncate text-xs text-sea-500">{m.localita}</div>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <Link
                    href={`/area-gestore/${m.beach_id}`}
                    className="rounded-full bg-sea-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-sea-600"
                  >
                    {t("editCta")}
                  </Link>
                  <Link
                    href={`/lido/${m.beach_id}`}
                    className="text-sm font-medium text-sea-600 underline underline-offset-2"
                  >
                    {t("openSheet")}
                  </Link>
                  {idApprovata.get(m.beach_id) ? (
                    <form action={rinunciaRivendicazione}>
                      <input type="hidden" name="rid" value={idApprovata.get(m.beach_id)} />
                      <button className="text-sm text-sea-400 underline underline-offset-2 hover:text-red-700">
                        {t("rinuncia")}
                      </button>
                    </form>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-2xl border border-sea-100 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-sea-800">{t("pending")}</h2>
        {inCorso.length === 0 ? (
          <p className="mt-2 text-sm text-sea-500">{t("noPending")}</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {inCorso.map((r) => (
              <li key={r.id} className="rounded-xl border border-sea-100 px-3 py-2">
                <div className="flex items-center justify-between gap-3">
                  <span className="truncate font-medium text-sea-900">
                    {nomi.get(r.beach_id) ?? r.beach_id}
                  </span>
                  <Stato stato={r.stato} />
                </div>
                {r.motivo_rifiuto ? (
                  <p className="mt-1 text-xs text-red-700">{r.motivo_rifiuto}</p>
                ) : null}
                {r.stato === "in_attesa" ? (
                  <form action={rinunciaRivendicazione} className="mt-1">
                    <input type="hidden" name="rid" value={r.id} />
                    <button className="text-xs text-sea-500 underline underline-offset-2 hover:text-red-700">
                      {t("annullaRichiesta")}
                    </button>
                  </form>
                ) : null}
              </li>
            ))}
          </ul>
        )}
        <Link
          href="/area-gestore/rivendica"
          className="mt-4 inline-block rounded-full bg-sea-500 px-4 py-2 text-sm font-medium text-white hover:bg-sea-600"
        >
          {t("claimCta")}
        </Link>
      </section>

      {eAdmin ? (
        <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
          <h2 className="text-sm font-semibold text-amber-900">
            {en ? "Administration" : "Amministrazione"}
          </h2>
          <p className="mt-1 text-xs text-amber-800">
            {en
              ? "You are an administrator. Other people's claims are not shown here: they are in the verification queue."
              : "Sei amministratore. Le richieste degli altri non compaiono qui sopra: stanno nella coda di verifica."}
          </p>
          <div className="mt-3 flex flex-wrap gap-3">
            <Link
              href="/admin/rivendicazioni"
              className="rounded-full bg-amber-500 px-4 py-1.5 text-sm font-semibold text-white hover:bg-amber-600"
            >
              {en ? "Verification queue" : "Coda di verifica"}
            </Link>
            <Link
              href="/admin/eventi"
              className="rounded-full border border-amber-400 px-4 py-1.5 text-sm font-semibold text-amber-900 hover:bg-amber-100"
            >
              {en ? "Moderate events" : "Modera eventi"}
            </Link>
            <Link
              href="/admin"
              className="rounded-full border border-amber-400 px-4 py-1.5 text-sm font-semibold text-amber-900 hover:bg-amber-100"
            >
              {en ? "Statistics" : "Statistiche"}
            </Link>
          </div>
        </section>
      ) : null}
    </div>
  );
}
