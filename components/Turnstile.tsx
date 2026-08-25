"use client";

import { useEffect } from "react";

// Widget Cloudflare Turnstile (CAPTCHA privacy-friendly).
// Si attiva solo se NEXT_PUBLIC_TURNSTILE_SITE_KEY è configurata:
// senza chiave non renderizza nulla e i form restano funzionanti.
// Il widget inietta automaticamente un input <name="cf-turnstile-response"> nel form.
export function Turnstile() {
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

  useEffect(() => {
    if (!siteKey) return;
    if (document.getElementById("cf-turnstile-script")) return;
    const s = document.createElement("script");
    s.id = "cf-turnstile-script";
    s.src = "https://challenges.cloudflare.com/turnstile/v0/api.js";
    s.async = true;
    s.defer = true;
    document.head.appendChild(s);
  }, [siteKey]);

  if (!siteKey) return null;
  return <div className="cf-turnstile" data-sitekey={siteKey} data-theme="light" />;
}
