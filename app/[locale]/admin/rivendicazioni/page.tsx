import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { createPublicClient } from "@/lib/supabase/public";
import { decidiRivendicazione, revocaRivendicazione } from "@/app/actions";

// Coda di approvazione delle rivendicazioni. Uso interno.
// Doppio controllo: qui l'allowlist ADMIN_EMAILS, nel database il ruolo
// 'admin' nella tabella profili (vedi migrazione 0071).
export const dynamic = "force-dynamic";

type Riv = {
  id: string;
  beach_id: string;
  user_id: string;
  nome: string;
  ruolo_dichiarato: string | null;
  telefono: string | null;
  email_contatto: string | null;
  nota: string | null;
  stato: string;
  creata_il: string;
};

export default async function AdminRivendicazioniPage({
  params: { locale },
}: {
  params: { locale: string };
}) {
  setRequestLocale(locale);

  const allow = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const email = user?.email?.toLowerCase() ?? null;
  if (!email || allow.length === 0 || !allow.includes(email)) notFound();

  // Due code distinte: da decidere e già attive (queste ultime si possono revocare).
  const { data } = await supabase
    .from("rivendicazioni")
    .select("id,beach_id,user_id,nome,ruolo_dichiarato,telefono,email_contatto,nota,stato,creata_il")
    .in("stato", ["in_attesa", "approvata"])
    .order("creata_il", { ascending: true });
  const tutte = (data ?? []) as Riv[];
  const righe = tutte.filter((r) => r.stato === "in_attesa");
  const attive = tutte.filter((r) => r.stato === "approvata");

  const nomi = new Map<string, string>();
  if (tutte.length) {
    const pub = createPublicClient();
    const { data: bs } = await pub
      .from("beaches")
      .select("id,nome,localita")
      .in("id", tutte.map((r) => r.beach_id));
    for (const b of (bs ?? []) as { id: string; nome: string; localita: string }[]) {
      nomi.set(b.id, `${b.nome} — ${b.localita}`);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-sea-900">Rivendicazioni da verificare</h1>
        <p className="text-sm text-sea-500">
          {righe.length} in attesa · approva solo dopo aver verificato che la persona gestisca davvero
          lo stabilimento. Le risposte al gestore le scrivi tu da info@lidorank.com: il sito non gli
          manda nessuna email automatica.
        </p>
      </div>

      {righe.length === 0 ? (
        <p className="rounded-2xl border border-sea-100 bg-white p-5 text-sm text-sea-500 shadow-sm">
          Nessuna richiesta in attesa.
        </p>
      ) : (
        <ul className="space-y-3">
          {righe.map((r) => (
            <li key={r.id} className="rounded-2xl border border-sea-100 bg-white p-5 shadow-sm">
              <div className="font-semibold text-sea-900">{nomi.get(r.beach_id) ?? r.beach_id}</div>
              <dl className="mt-2 grid grid-cols-1 gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
                <div>
                  <dt className="inline text-sea-500">Richiedente: </dt>
                  <dd className="inline text-sea-800">{r.nome}</dd>
                </div>
                <div>
                  <dt className="inline text-sea-500">Ruolo dichiarato: </dt>
                  <dd className="inline text-sea-800">{r.ruolo_dichiarato ?? "—"}</dd>
                </div>
                <div>
                  <dt className="inline text-sea-500">Telefono: </dt>
                  <dd className="inline text-sea-800">{r.telefono ?? "—"}</dd>
                </div>
                <div>
                  <dt className="inline text-sea-500">Email: </dt>
                  <dd className="inline text-sea-800">{r.email_contatto ?? "—"}</dd>
                </div>
              </dl>
              {r.nota ? (
                <p className="mt-2 rounded-xl bg-sea-50 px-3 py-2 text-sm text-sea-700">{r.nota}</p>
              ) : null}
              <p className="mt-2 text-xs text-sea-400">
                Richiesta del {new Date(r.creata_il).toLocaleString("it-IT")}
              </p>

              {r.email_contatto ? (
                <a
                  href={`mailto:${r.email_contatto}?subject=${encodeURIComponent(
                    `La tua richiesta per ${nomi.get(r.beach_id) ?? "il tuo stabilimento"} — LidoRank`
                  )}`}
                  className="mt-2 inline-block text-sm font-medium text-sea-600 underline underline-offset-2"
                >
                  Rispondi a {r.email_contatto}
                </a>
              ) : null}

              <form action={decidiRivendicazione} className="mt-3 flex flex-wrap items-center gap-2">
                <input type="hidden" name="rid" value={r.id} />
                <input
                  name="motivo"
                  placeholder="Motivo (solo se respingi)"
                  className="min-w-[200px] flex-1 rounded-lg border border-sea-200 px-3 py-1.5 text-sm"
                />
                <button
                  name="azione"
                  value="approva"
                  className="rounded-lg bg-emerald-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-emerald-700"
                >
                  Approva
                </button>
                <button
                  name="azione"
                  value="respingi"
                  className="rounded-lg border border-red-300 px-4 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50"
                >
                  Respingi
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}

      {/* Rivendiche attive: qui si revoca una scheda già assegnata */}
      <div>
        <h2 className="text-lg font-semibold text-sea-900">Rivendicazioni attive</h2>
        <p className="text-sm text-sea-500">
          {attive.length} schede assegnate. Revocare riporta la scheda a «non rivendicata» e toglie
          il ruolo al gestore. I dati del profilo restano salvati, ma smettono di essere pubblici.
        </p>

        {attive.length === 0 ? (
          <p className="mt-3 rounded-2xl border border-sea-100 bg-white p-5 text-sm text-sea-500 shadow-sm">
            Nessuna rivendica attiva.
          </p>
        ) : (
          <ul className="mt-3 space-y-3">
            {attive.map((r) => (
              <li key={r.id} className="rounded-2xl border border-sea-100 bg-white p-5 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-semibold text-sea-900">
                    {nomi.get(r.beach_id) ?? r.beach_id}
                  </span>
                  <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-800">
                    Attiva
                  </span>
                </div>
                <p className="mt-1 text-sm text-sea-600">
                  {r.nome}
                  {r.email_contatto ? ` · ${r.email_contatto}` : ""}
                </p>

                <form action={revocaRivendicazione} className="mt-3 flex flex-wrap items-center gap-2">
                  <input type="hidden" name="rid" value={r.id} />
                  <input
                    name="motivo"
                    placeholder="Motivo della revoca (consigliato)"
                    className="min-w-[200px] flex-1 rounded-lg border border-sea-200 px-3 py-1.5 text-sm"
                  />
                  <button className="rounded-lg border border-red-300 px-4 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50">
                    Revoca
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
