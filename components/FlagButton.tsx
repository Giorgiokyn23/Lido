"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";

export function FlagButton({ reviewId }: { reviewId: string }) {
  const t = useTranslations("flag");
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  async function flag() {
    if (busy || done) return;
    setBusy(true);
    const supabase = createClient();
    await supabase.rpc("flag_review", { rid: reviewId });
    setBusy(false);
    setDone(true);
  }

  return (
    <button
      onClick={flag}
      disabled={busy || done}
      title={t("tooltip")}
      className="text-[11px] text-sea-400 hover:text-amber-600 disabled:opacity-60"
    >
      {done ? t("flagged") : t("flag")}
    </button>
  );
}
