"use client";

import { Link, usePathname } from "@/i18n/navigation";

/**
 * Il selettore di lingua.
 *
 * Prima era un collegamento fisso a «/»: cambiare lingua riportava sempre
 * alla home, qualunque pagina si stesse leggendo. Chi stava guardando la
 * scheda di un bagno in inglese e passava all'italiano perdeva il bagno.
 *
 * `usePathname` di next-intl restituisce il percorso SENZA il prefisso della
 * lingua, quindi basta ripassarlo chiedendo l'altra lingua: il componente
 * ricostruisce l'indirizzo giusto da solo.
 */
export function CambioLingua({ locale }: { locale: string }) {
  const percorso = usePathname();
  const altra = locale === "en" ? "it" : "en";

  return (
    <Link
      href={percorso}
      locale={altra}
      className="rounded-full border border-sea-200 px-2.5 py-1 text-xs font-semibold text-sea-600 hover:bg-sea-50"
    >
      {locale === "en" ? "IT" : "EN"}
    </Link>
  );
}
