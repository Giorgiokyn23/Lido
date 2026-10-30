import QRCode from "qrcode";
import { getTranslations } from "next-intl/server";

/**
 * Centro di condivisione: il gestore attiva i propri clienti in meno di un minuto.
 *
 * REGOLA DI INTEGRITÀ (dalle regole metodologiche di Checco, punto 02):
 * l'invito è NEUTRALE. Il testo è fisso e non modificabile dal gestore proprio
 * per impedire che diventi "lasciaci cinque stelle". Si invita a partecipare,
 * mai a valutare bene. I link portano un parametro di provenienza così che, in
 * futuro, le recensioni sollecitate restino distinguibili da quelle spontanee.
 */
export async function CentroInviti({
  beachId,
  nomeBagno,
}: {
  beachId: string;
  nomeBagno: string;
}) {
  const t = await getTranslations("gestore");
  const base = process.env.NEXT_PUBLIC_SITE_URL || "https://lidorank.com";
  const url = `${base}/lido/${beachId}#scrivi-recensione`;

  const link = (via: string) => `${base}/lido/${beachId}?via=${via}#scrivi-recensione`;
  const messaggio = t("invitoTesto", { nome: nomeBagno });

  const waHref = `https://wa.me/?text=${encodeURIComponent(`${messaggio} ${link("wa")}`)}`;
  const mailHref = `mailto:?subject=${encodeURIComponent(
    t("invitoOggetto", { nome: nomeBagno })
  )}&body=${encodeURIComponent(`${messaggio}\n\n${link("mail")}`)}`;

  // SVG generato lato server: nessuno script, nessuna chiamata esterna,
  // niente JavaScript sul client. Stampabile così com'è.
  const qr = await QRCode.toString(link("qr"), {
    type: "svg",
    errorCorrectionLevel: "M",
    margin: 1,
    width: 220,
    color: { dark: "#155676", light: "#ffffff" },
  });

  return (
    <section className="rounded-2xl border border-sea-100 bg-white p-5 shadow-sm">
      <h2 className="text-sm font-semibold text-sea-800">{t("invitoTitolo")}</h2>
      <p className="mt-1 text-xs text-sea-500">{t("invitoIntro")}</p>

      <div className="mt-4 grid grid-cols-1 gap-5 sm:grid-cols-2">
        <div>
          <div className="rounded-xl border border-sea-100 bg-sea-50/50 p-3 text-sm text-sea-700">
            {messaggio}
          </div>
          <p className="mt-1 text-[11px] text-sea-400">{t("invitoNeutrale")}</p>

          <div className="mt-3 space-y-2">
            <a
              href={waHref}
              target="_blank"
              rel="noopener noreferrer"
              className="block rounded-xl bg-sea-500 px-4 py-2.5 text-center text-sm font-semibold text-white hover:bg-sea-600"
            >
              {t("invitoWhatsapp")}
            </a>
            <a
              href={mailHref}
              className="block rounded-xl border border-sea-300 px-4 py-2.5 text-center text-sm font-semibold text-sea-700 hover:bg-sea-50"
            >
              {t("invitoEmail")}
            </a>
            <div className="rounded-xl border border-sea-200 bg-white px-3 py-2">
              <div className="text-[11px] font-medium uppercase tracking-wide text-sea-400">
                {t("invitoLink")}
              </div>
              <code className="mt-0.5 block break-all text-xs text-sea-700">{url}</code>
            </div>
          </div>
        </div>

        <div className="flex flex-col items-center justify-start">
          <div
            className="rounded-xl border border-sea-100 bg-white p-2"
            // SVG prodotto dalla libreria QR su una URL costruita da noi: contenuto fidato.
            dangerouslySetInnerHTML={{ __html: qr }}
          />
          <p className="mt-2 max-w-[220px] text-center text-[11px] text-sea-500">
            {t("invitoQrNota")}
          </p>
        </div>
      </div>
    </section>
  );
}
