"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/client";

// Stato login/logout della barra, lato CLIENT: così il layout (e quindi tutte
// le pagine) non deve più leggere i cookie sul server a ogni richiesta e può
// essere reso staticamente / in cache. Riduce drasticamente il consumo CPU.
export function NavAuth() {
  const t = useTranslations("nav");
  const [email, setEmail] = useState<string | null | undefined>(undefined);

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
    <Link
      href="/login"
      className="rounded-full bg-sea-500 px-4 py-1.5 font-medium text-white hover:bg-sea-600"
    >
      {t("login")}
    </Link>
  );
}
