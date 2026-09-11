"use client";

import { useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { NOTICE_TIPI } from "@/lib/types";

// Segnalazione di una RECENSIONE come contenuto illecito (DSA art. 16):
// motivo, spiegazione, contatto facoltativo e dichiarazione di buona fede.
export function FlagButton({ reviewId }: { reviewId: string }) {
  const t = useTranslations("flag");
  const tn = useTranslations("noticeTipi");
  const [open, setOpen] = useState(false);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [motivo, setMotivo] = useState("");
  const [spiegazione, setSpiegazione] = useState("");
  const [email, setEmail] = useState("");
  const [buonaFede, setBuonaFede] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy || done) return;
    setError(null);
    if (!motivo) return setError(t("errReason"));
    if (!buonaFede) return setError(t("errGoodFaith"));
    setBusy(true);
    const supabase = createClient();
    const { error: err } = await supabase.rpc("submit_review_notice", {
      _rid: reviewId,
      _motivo: motivo,
      _spiegazione: spiegazione,
      _email: email,
      _buonafede: buonaFede,
    });
    setBusy(false);
    if (err) {
      setError(t("errGeneric"));
      return;
    }
    setDone(true);
  }

  if (done) {
    return <span className="text-[11px] text-emerald-600">{t("received")}</span>;
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        title={t("tooltip")}
        className="text-[11px] text-sea-400 hover:text-amber-600"
      >
        {t("flag")}
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
      <form
        onSubmit={submit}
        className="w-full max-w-sm space-y-2 rounded-2xl border border-amber-200 bg-white p-4 text-left shadow-xl"
      >
        <p className="text-sm font-semibold text-amber-900">{t("formTitle")}</p>
        <p className="text-[11px] text-amber-700">{t("formIntro")}</p>

      <select
        value={motivo}
        onChange={(e) => setMotivo(e.target.value)}
        required
        className="w-full rounded-lg border border-amber-300 bg-white px-2 py-1.5 text-xs"
      >
        <option value="" disabled>
          {t("reasonSelect")}
        </option>
        {NOTICE_TIPI.map((n) => (
          <option key={n.value} value={n.value}>
            {tn(n.value)}
          </option>
        ))}
      </select>

      <textarea
        value={spiegazione}
        onChange={(e) => setSpiegazione(e.target.value)}
        rows={2}
        maxLength={2000}
        placeholder={t("explainPlaceholder")}
        className="w-full rounded-lg border border-amber-300 bg-white px-2 py-1.5 text-xs"
      />

      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder={t("emailPlaceholder")}
        className="w-full rounded-lg border border-amber-300 bg-white px-2 py-1.5 text-xs"
      />
      <p className="text-[10px] text-amber-600">{t("emailNote")}</p>

      <label className="flex items-start gap-2 text-[11px] text-amber-800">
        <input
          type="checkbox"
          checked={buonaFede}
          onChange={(e) => setBuonaFede(e.target.checked)}
          className="mt-0.5"
        />
        <span>{t("goodFaith")}</span>
      </label>

      {error && <p className="text-[11px] text-red-700">{error}</p>}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-lg border border-amber-300 px-3 py-1.5 text-[11px] text-amber-800"
        >
          {t("cancel")}
        </button>
        <button
          type="submit"
          disabled={busy}
          className="flex-1 rounded-lg bg-amber-600 px-3 py-1.5 text-[11px] font-semibold text-white disabled:opacity-60"
        >
          {busy ? t("sending") : t("send")}
        </button>
      </div>
      </form>
    </div>
  );
}
