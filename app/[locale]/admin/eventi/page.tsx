import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { createPublicClient } from "@/lib/supabase/public";
import { ModeraEvento } from "@/components/ModeraEvento";

// Coda di moderazione degli eventi pubblicati dai gestori. Uso interno.
// Doppio controllo, come nelle altre pagine admin: qui l'allowlist
// ADMIN_EMAILS, nel database il ruolo 'admin' nella tabella profili.
export const dynamic = "force-dynamic";

type Evento = {
  id: string;
  beach_id: string;
  titolo: string;
  descrizione: string | null;
  data_inizio: string;
  data_fine: string | null;
  stato: string;
  creato_il: string;
};

export default async function AdminEventiPage({
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

  // Secondo lucchetto: senza il ruolo nel database, Nascondi ed Elimina
  // falliscono. Meglio dirlo qui che far scoprire l'errore al clic.
  const { data: isAdminDb } = await supabase.rpc("e_admin");

  // La policy di lettura della 0078 è «e_gestore_di(beach_id) or e_admin()»:
  // a un amministratore questa query restituisce gli eventi di tutti.
  const { data: evData } = await supabase
    .from("eventi_gestore")
    .select("id,beach_id,titolo,descrizione,data_inizio,data_fine,stato,creato_il")
    .order("data_inizio", { ascending: false })
    .limit(300);
  const eventi = (evData ?? []) as Evento[];

  // I nomi degli stabilimenti stanno su una tabella pubblica: una query sola
  // invece di una join, così la pagina non dipende dalle policy di beaches.
  const nomi = new Map<string, string>();
  if (eventi.length) {
    const pub = createPublicClient();
    const { data: bs } = await pub
      .from("beaches")
      .select("id,nome,localita")
      .in("id", Array.from(new Set(eventi.map((e) => e.beach_id))));
    for (const b of (bs ?? []) as { id: string; nome: string; localita: string }[]) {
      nomi.set(b.id, `${b.nome} — ${b.localita}`);
    }
  }

  const oggi = new Date().toISOString().slice(0, 10);
  const concluso = (e: Evento) => (e.data_fine ?? e.data_inizio) < oggi;

  // In cima quello che è ancora visibile al pubblico, dal più imminente: è
  // l'unico che può fare danno adesso. I conclusi restano sotto, consultabili.
  const prossimi = eventi
    .filter((e) => !concluso(e))
    .sort((a, b) => a.data_inizio.localeCompare(b.data_inizio));
  const passati = eventi.filter(concluso);

  const nascosti = prossimi.filter((e) => e.stato === "nascosto").length;

  const data = (e: Evento) => {
    const f = (g: string) =>
      new Date(g).toLocaleDateString("it-IT", { day: "numeric", month: "long", year: "numeric" });
    if (!e.data_fine || e.data_fine === e.data_inizio) return f(e.data_inizio);
    return `${f(e.data_inizio)} – ${f(e.data_fine)}`;
  };

  const Riga = ({ e, spento }: { e: Evento; spento?: boolean }) => (
    <li
      className={`rounded-2xl border bg-white p-5 shadow-sm ${
        e.stato === "nascosto" ? "border-amber-200" : "border-sea-100"
      } ${spento ? "opacity-60" : ""}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="text-xs font-medium uppercase tracking-wide text-sea-400">
            {nomi.get(e.beach_id) ?? e.beach_id}
          </div>
          <div className="mt-0.5 font-semibold text-sea-900">{e.titolo}</div>
          <div className="text-sm text-sea-500">{data(e)}</div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {e.stato === "nascosto" ? (
            <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-800">
              Nascosto
            </span>
          ) : (
            <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-800">
              Pubblico
            </span>
          )}
          <a
            href={`/lido/${e.beach_id}`}
            className="text-xs text-sea-600 underline underline-offset-2"
          >
            scheda
          </a>
        </div>
      </div>

      {e.descrizione ? (
        <p className="mt-2 whitespace-pre-line text-sm text-sea-700">{e.descrizione}</p>
      ) : (
        <p className="mt-2 text-sm italic text-sea-400">Nessuna descrizione.</p>
      )}

      <ModeraEvento
        eventoId={e.id}
        beachId={e.beach_id}
        titolo={e.titolo}
        nascosto={e.stato === "nascosto"}
      />
    </li>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-sea-900">Eventi pubblicati dai gestori</h1>
        <p className="text-sm text-sea-500">
          {prossimi.length} in programma
          {nascosti > 0 ? `, di cui ${nascosti} già nascosti` : ""} · ogni intervento finisce nel
          registro interno con il tuo nome, la data e il motivo che scrivi. Nascondere toglie
          l&apos;evento dal calendario pubblico ma conserva il testo; eliminare cancella la riga.
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

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-sea-500">
          In programma
        </h2>
        {prossimi.length === 0 ? (
          <p className="rounded-2xl border border-sea-100 bg-white p-5 text-sm text-sea-500 shadow-sm">
            Nessun evento in programma.
          </p>
        ) : (
          <ul className="space-y-3">
            {prossimi.map((e) => (
              <Riga key={e.id} e={e} />
            ))}
          </ul>
        )}
      </section>

      {passati.length > 0 ? (
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-sea-500">
            Conclusi
          </h2>
          <ul className="space-y-3">
            {passati.map((e) => (
              <Riga key={e.id} e={e} spento />
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
