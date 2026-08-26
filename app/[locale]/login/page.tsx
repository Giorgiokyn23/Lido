"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const t = useTranslations("login");
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

  const strong = (chunks: React.ReactNode) => <strong>{chunks}</strong>;

  return (
    <div className="mx-auto max-w-md">
      <Link href="/" className="text-sm text-sea-500 hover:underline">← Home</Link>
      <div className="mt-4 rounded-2xl border border-sea-100 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-bold text-sea-900">{t("title")}</h1>
        <p className="mt-1 text-sm text-sea-500">{t.rich("intro", { b: strong })}</p>

        {sent ? (
          <div className="mt-6 rounded-xl bg-sea-50 p-4 text-sea-700">
            {t.rich("sent", { email, b: strong })}
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-6 space-y-3">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t("emailPlaceholder")}
              className="w-full rounded-xl border border-sea-200 px-4 py-3 text-sea-900 focus:border-sea-400 focus:outline-none focus:ring-2 focus:ring-sea-200"
            />
            {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-sea-500 px-5 py-3 font-semibold text-white transition hover:bg-sea-600 disabled:opacity-60"
            >
              {loading ? t("submitting") : t("submit")}
            </button>
          </form>
        )}

        <p className="mt-4 text-xs text-sea-400">{t("anonNote")}</p>
      </div>
    </div>
  );
}
