"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/client";

/**
 * La porta d'ingresso dei gestori, in fondo alla home.
 *
 * PERCHÉ ORA GIRA NEL BROWSER. La prima versione leggeva la sessione sul
 * server per scegliere l'etichetta del pulsante. Per farlo funzionare avevo
 * messo `force-dynamic` sulla home: cioè la pagina più visitata del sito
 * veniva ricostruita da zero, su Vercel, a ogni singola visita. È il motivo
 * principale per cui il tetto di CPU è saltato.
 *
 * E non era nemmeno corretto: una pagina in cache condivisa non può
 * contenere lo stato di un utente, altrimenti il primo che passa decide che
 * cosa vedono gli altri. Lo stesso ragionamento già fatto per i pulsanti
 * delle liste. La pagina ora è statica, parte dalla versione pubblica, e chi
 * ha un account vede cambiare il pulsante dopo il caricamento.
 */
export function PortaGestori() {
  const t = useTranslations("gestore");
  const [haStabilimenti, setHaStabilimenti] = useState(false);

  useEffect(() => {
    let vivo = true;
    (async () => {
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user || !vivo) return;
        const { data } = await supabase.rpc("miei_stabilimenti");
        if (vivo) setHaStabilimenti(Array.isArray(data) && data.length > 0);
      } catch {
        // Senza sessione leggibile resta la versione pubblica.
      }
    })();
    return () => {
      vivo = false;
    };
  }, []);

  return (
    <section className="rounded-3xl border border-sea-100 bg-white p-6 shadow-sm sm:p-8">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="max-w-xl">
          <h2 className="text-xl font-bold text-sea-900 sm:text-2xl">{t("portaTitolo")}</h2>
          <p className="mt-2 text-sea-600">{t("portaTesto")}</p>
          <p className="mt-2 text-xs text-sea-400">{t("portaGratis")}</p>
        </div>

        <div className="flex shrink-0 flex-col gap-2 sm:items-end">
          <Link
            href={haStabilimenti ? "/area-gestore" : "/area-gestore/rivendica"}
            className="rounded-xl bg-sea-500 px-5 py-3 text-center text-sm font-semibold text-white shadow transition hover:bg-sea-600"
          >
            {haStabilimenti ? t("portaEntra") : t("portaRivendica")}
          </Link>
          <Link href="/per-i-gestori" className="text-center text-sm text-sea-600 hover:underline">
            {t("portaScopri")}
          </Link>
        </div>
      </div>
    </section>
  );
}
