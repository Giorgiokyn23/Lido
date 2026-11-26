"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/client";
import { PortaAccesso } from "@/components/PortaAccesso";

// Stato login/logout della barra, lato CLIENT: così il layout (e quindi tutte
// le pagine) non deve più leggere i cookie sul server a ogni richiesta e può
// essere reso staticamente / in cache. Riduce drasticamente il consumo CPU.
export function NavAuth() {
  const t = useTranslations("nav");
  const [email, setEmail] = useState<string | null | undefined>(undefined);
  const [porta, setPorta] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setEmail(session?.user?.email ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  async function logout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    setEmail(null);
  }

  // Durante il caricamento mostro il pulsante "Accedi" (default neutro).
  if (email) {
    return (
      <div className="flex items-center gap-2">
        {/* Chi è loggato deve poter tornare al proprio pannello da ogni pagina. */}
        <Link
          href="/profilo"
          className="rounded-full bg-sea-50 px-3 py-1 font-medium text-sea-700 hover:bg-sea-100"
        >
          {t("myProfile")}
        </Link>
        {/* «Area gestore» accanto a «Per i gestori» nel menù sembravano la
            stessa voce. Non lo sono — una spiega il progetto a chi non è
            ancora dentro, l'altra è il pannello di chi ha già una scheda —
            ma i nomi non lo dicevano. «Il mio stabilimento» lo dice. */}
        <Link
          href="/area-gestore"
          className="rounded-full bg-sea-50 px-3 py-1 font-medium text-sea-700 hover:bg-sea-100"
        >
          {t("myArea")}
        </Link>
        <span className="hidden max-w-[140px] truncate text-xs text-sea-500 sm:inline">{email}</span>
        <button
          onClick={logout}
          className="rounded-full bg-sea-50 px-3 py-1 font-medium text-sea-700 hover:bg-sea-100"
        >
          {t("logout")}
        </button>
      </div>
    );
  }
  return (
    <>
      {/* Il clic su «Accedi» apre la sovraimpressione invece di portare via
          dalla pagina: qui l'intenzione è già quella, quindi non si sta
          mettendo un ostacolo davanti a niente. Chi preferisce la pagina
          intera ce l'ha ancora, da /login. */}
      <button
        onClick={() => setPorta(true)}
        className="rounded-full bg-sea-500 px-4 py-1.5 font-medium text-white hover:bg-sea-600"
      >
        {t("login")}
      </button>
      <PortaAccesso aperto={porta} onChiudi={() => setPorta(false)} />
    </>
  );
}
