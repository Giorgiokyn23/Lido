import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { createPublicClient } from "@/lib/supabase/public";
import { ModeraFoto } from "@/components/ModeraFoto";
import { indirizzoFoto } from "@/lib/foto";

// Coda di moderazione delle foto caricate dagli utenti. Uso interno.
// Doppio controllo come nelle altre pagine admin: qui l'allowlist
// ADMIN_EMAILS, nel database il ruolo 'admin' nella tabella profili.
export const dynamic = "force-dynamic";

type Riga = {
  id: string;
  beach_id: string;
  percorso: string;
  didascalia: string | null;
  stato: string;
  segnalazioni: number;
  creato_il: string;
};

export default async function AdminFotoPage({
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

  const { data: isAdminDb } = await supabase.rpc("e_admin");

  // La funzione della 0089 ordina già: prima le segnalate, poi le recenti.
  // L'ordinamento sta nel database e non qui perché è una regola di
  // moderazione, non di presentazione: deve valere anche da SQL.
  const { data: fotoData, error } = await supabase.rpc("foto_da_moderare", { _limite: 200 });
  const foto = (fotoData ?? []) as Riga[];

  // I nomi dei bagni da una tabella pubblica: una query sola invece di una
  // join, così la pagina non dipende dalle policy di beaches.
  const nomi = new Map<string, string>();
  if (foto.length) {
    const pub = createPublicClient();
    const { data: bs } = await pub
      .from("beaches")
      .select("id,nome,localita")
      .in("id", Array.from(new Set(foto.map((f) => f.beach_id))));
    for (const b of (bs ?? []) as { id: string; nome: string; localita: string }[]) {
      nomi.set(b.id, `${b.nome} — ${b.localita}`);
    }
  }

  const segnalate = foto.filter((f) => f.segnalazioni > 0);
  const resto = foto.filter((f) => f.segnalazioni === 0);
  const nascoste = foto.filter((f) => f.stato === "nascosta").length;

  const quando = (g: string) =>
    new Date(g).toLocaleDateString("it-IT", { day: "numeric", month: "long", year: "numeric" });

  const Scheda = ({ f }: { f: Riga }) => (
    <li
      className={`rounded-2xl border bg-white p-4 shadow-sm ${
        f.segnalazioni > 0
          ? "border-red-200"
          : f.stato === "nascosta"
            ? "border-amber-200"
            : "border-sea-100"
      }`}
    >
      <div className="flex gap-4">
        <a
          href={indirizzoFoto(f.percorso)}
          target="_blank"
          rel="noreferrer"
          className="shrink-0"
          title="Apri a grandezza naturale"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={indirizzoFoto(f.percorso)}
            alt=""
            className="h-28 w-28 rounded-xl object-cover"
          />
        </a>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            {f.segnalazioni > 0 ? (
              <span className="rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-[11px] font-semibold text-red-800">
                {f.segnalazioni} {f.segnalazioni === 1 ? "segnalazione" : "segnalazioni"}
              </span>
            ) : null}
            <span
              className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${
                f.stato === "nascosta"
                  ? "border-amber-200 bg-amber-50 text-amber-800"
                  : "border-emerald-200 bg-emerald-50 text-emerald-800"
              }`}
            >
              {f.stato === "nascosta" ? "Nascosta" : "Pubblica"}
            </span>
          </div>

          <div className="mt-1 truncate text-xs font-medium uppercase tracking-wide text-sea-400">
            {nomi.get(f.beach_id) ?? f.beach_id}
          </div>
          {f.didascalia ? (
            <p className="mt-0.5 text-sm text-sea-800">{f.didascalia}</p>
          ) : (
            <p className="mt-0.5 text-sm italic text-sea-400">Senza didascalia.</p>
          )}
          <div className="mt-1 flex flex-wrap gap-3 text-[11px] text-sea-400">
            <span>{quando(f.creato_il)}</span>
            <a href={`/lido/${f.beach_id}#foto`} className="underline underline-offset-2">
              scheda
            </a>
          </div>

          <ModeraFoto
            id={f.id}
            beachId={f.beach_id}
            percorso={f.percorso}
            stato={f.stato}
          />
        </div>
      </div>
    </li>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-sea-900">Foto caricate dagli utenti</h1>
        <p className="text-sm text-sea-500">
          {foto.length} in archivio
          {segnalate.length > 0 ? `, ${segnalate.length} segnalate` : ""}
          {nascoste > 0 ? `, ${nascoste} già nascoste` : ""} · ogni intervento finisce nel registro
          interno con il tuo nome, la data e il motivo. <strong>Nascondere</strong> toglie la foto
          dalla scheda e si può disfare; <strong>rimuovere</strong> cancella anche il file
          dall&apos;archivio e non si recupera.
        </p>
      </div>

      {isAdminDb === false ? (
        <div className="rounded-2xl border border-amber-300 bg-amber-50 p-5 text-sm text-amber-900">
          <p className="font-semibold">Manca il ruolo amministratore nel database.</p>
          <p className="mt-1">
            La tua email è fra quelle autorizzate, ma nella tabella <code>profili</code> non risulti
            amministratore: puoi vedere questa pagina, non moderare. Esegui una volta sola, nel SQL
            editor di Supabase:
          </p>
          <pre className="mt-2 overflow-x-auto rounded-lg bg-white p-3 text-xs">
{`insert into public.profili (user_id, ruolo)
select id, 'admin' from auth.users where email = '${email}'
on conflict (user_id) do update set ruolo = 'admin';`}
          </pre>
        </div>
      ) : null}

      {error ? (
        <div className="rounded-2xl border border-amber-300 bg-amber-50 p-5 text-sm text-amber-900">
          <p className="font-semibold">La coda non si carica.</p>
          <p className="mt-1">
            Probabilmente la migrazione <code>0089_foto_moderazione.sql</code> non è ancora stata
            eseguita su Supabase. Messaggio del database: <code>{error.message}</code>
          </p>
        </div>
      ) : null}

      {segnalate.length > 0 ? (
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-red-700">
            Segnalate — guarda queste per prime
          </h2>
          <ul className="space-y-3">
            {segnalate.map((f) => (
              <Scheda key={f.id} f={f} />
            ))}
          </ul>
        </section>
      ) : null}

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-sea-500">
          {segnalate.length > 0 ? "Le altre, dalle più recenti" : "Dalle più recenti"}
        </h2>
        {resto.length === 0 ? (
          <p className="rounded-2xl border border-sea-100 bg-white p-5 text-sm text-sea-500 shadow-sm">
            Nessuna foto da esaminare.
          </p>
        ) : (
          <ul className="space-y-3">
            {resto.map((f) => (
              <Scheda key={f.id} f={f} />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
