"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    setLoading(false);
    if (error) setError(error.message);
    else setSent(true);
  }

  return (
    <div className="mx-auto max-w-md">
      <Link href="/" className="text-sm text-sea-500 hover:underline">← Home</Link>
      <div className="mt-4 rounded-2xl border border-sea-100 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-bold text-sea-900">Accedi a LidoRank</h1>
        <p className="mt-1 text-sm text-sea-500">
          Con un account le tue recensioni risultano <strong>verificate</strong> e pesano di più.
          Ti inviamo un link magico via email: nessuna password da ricordare.
        </p>

        {sent ? (
          <div className="mt-6 rounded-xl bg-sea-50 p-4 text-sea-700">
            Ti abbiamo inviato un link a <strong>{email}</strong>. Aprilo da questo dispositivo per
            entrare. Controlla anche lo spam.
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-6 space-y-3">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="latua@email.it"
              className="w-full rounded-xl border border-sea-200 px-4 py-3 text-sea-900 focus:border-sea-400 focus:outline-none focus:ring-2 focus:ring-sea-200"
            />
            {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-sea-500 px-5 py-3 font-semibold text-white transition hover:bg-sea-600 disabled:opacity-60"
            >
              {loading ? "Invio…" : "Inviami il link di accesso"}
            </button>
          </form>
        )}

        <p className="mt-4 text-xs text-sea-400">
          Puoi anche recensire in forma anonima dalla scheda di un bagno, ma quelle recensioni sono
          marcate come non verificate.
        </p>
      </div>
    </div>
  );
}
