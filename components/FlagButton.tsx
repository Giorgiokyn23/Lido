"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function FlagButton({ reviewId }: { reviewId: string }) {
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
      title="Segnala come sospetta / falsa"
      className="text-[11px] text-sea-400 hover:text-amber-600 disabled:opacity-60"
    >
      {done ? "✓ Segnalata" : "⚑ Segnala"}
    </button>
  );
}
