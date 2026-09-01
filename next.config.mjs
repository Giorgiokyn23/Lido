import createNextIntlPlugin from "next-intl/plugin";
import withPWAInit from "@ducanh2912/next-pwa";

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
};

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

// PWA: genera il service worker (public/sw.js) in build.
// disable in sviluppo → così `npm run dev` non usa cache aggressive
// e non ti fa impazzire con contenuti "vecchi" mentre lavori.
const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
  cacheOnFrontEndNav: true,
  aggressiveFrontEndNavCaching: true,
  reloadOnOnline: true,
  workboxOptions: {
    // non mettere in cache le API/auth: i dati devono restare live
    navigateFallbackDenylist: [/^\/auth/, /^\/api/],
  },
});

export default withPWA(withNextIntl(nextConfig));
