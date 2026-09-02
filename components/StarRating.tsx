"use client";

import { useId, useState } from "react";
import { useTranslations } from "next-intl";

const AMBER = "#f59e0b";
const GREY = "#e5e7eb";

function StarSVG({ fill, gid }: { fill: number; gid: string }) {
  const pct = `${Math.round(Math.max(0, Math.min(1, fill)) * 100)}%`;
  return (
    <svg viewBox="0 0 20 20" className="h-6 w-6" aria-hidden="true">
      <defs>
        <linearGradient id={gid} x1="0" x2="1" y1="0" y2="0">
          <stop offset={pct} stopColor={AMBER} />
          <stop offset={pct} stopColor={GREY} />
        </linearGradient>
      </defs>
      <path
        d="M10 1.6l2.6 5.3 5.8.8-4.2 4.1 1 5.8L10 15.8l-5.2 2.7 1-5.8L1.6 7.7l5.8-.8z"
        fill={`url(#${gid})`}
        stroke={AMBER}
        strokeWidth="0.6"
      />
    </svg>
  );
}

/**
 * Voto a stelle con mezzo voto. Nessun valore predefinito:
 * parte da "Non valutato" (0) — l'utente sceglie consapevolmente.
 * allowNA: mostra "N/D" per i criteri opzionali.
 * Il valore viaggia in un input hidden: "" (non valutato), "na" oppure "1".."5".
 */
export function StarRating({
  name,
  label,
  allowNA = false,
}: {
  name: string;
  label: string;
  allowNA?: boolean;
}) {
  const t = useTranslations("review");
  const [value, setValue] = useState(0);
  const [na, setNA] = useState(false);
  const [hover, setHover] = useState(0);
  // useId() contiene ":" → non valido come id di gradiente SVG: lo ripulisco
  const uid = "star" + useId().replace(/[^a-zA-Z0-9]/g, "");

  const display = na ? 0 : hover || value;
  const hiddenVal = na ? "na" : value > 0 ? String(value) : "";
  const rated = value > 0 && !na;

  const pick = (v: number) => {
    setNA(false);
    setValue(v);
  };

  return (
    <div className="flex items-center gap-3 rounded-lg px-2 py-1.5 transition hover:bg-sea-50/70">
      <span className="min-w-0 flex-1 truncate text-sm font-medium text-sea-800">{label}</span>

      <div className="flex shrink-0" onMouseLeave={() => setHover(0)}>
        {[1, 2, 3, 4, 5].map((i) => {
          const fill = Math.max(0, Math.min(1, display - (i - 1)));
          return (
            <span key={i} className="relative inline-block h-6 w-6">
              <StarSVG fill={fill} gid={`${uid}-${i}`} />
              <button
                type="button"
                aria-label={`${label}: ${i - 0.5}/5`}
                onMouseEnter={() => setHover(i - 0.5)}
                onClick={() => pick(i - 0.5)}
                className="absolute inset-y-0 left-0 z-10 w-1/2 cursor-pointer"
              />
              <button
                type="button"
                aria-label={`${label}: ${i}/5`}
                onMouseEnter={() => setHover(i)}
                onClick={() => pick(i)}
                className="absolute inset-y-0 right-0 z-10 w-1/2 cursor-pointer"
              />
            </span>
          );
        })}
      </div>

      <span
        className={`w-14 shrink-0 text-right text-xs font-semibold tabular-nums ${
          rated ? "text-sea-700" : "text-sea-300"
        }`}
      >
        {na ? "" : rated ? `${value.toFixed(1)}` : "—"}
      </span>

      {allowNA && (
        <button
          type="button"
          onClick={() => {
            setNA(true);
            setValue(0);
          }}
          className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium transition ${
            na ? "bg-sea-200 text-sea-800" : "bg-white text-sea-400 ring-1 ring-sea-200 hover:bg-sea-100"
          }`}
        >
          {t("na")}
        </button>
      )}

      <input type="hidden" name={name} value={hiddenVal} />
    </div>
  );
}
