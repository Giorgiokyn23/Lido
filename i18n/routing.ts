import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["it", "en"],
  defaultLocale: "it",
  // 'as-needed': l'italiano resta senza prefisso (/, /classifiche),
  // l'inglese va sotto /en. Così gli URL già indicizzati non cambiano.
  localePrefix: "as-needed",
});
