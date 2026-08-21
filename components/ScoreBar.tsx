// Progress bar per micro-punteggio di categoria (0..5).
export function ScoreBar({
  label,
  hint,
  value,
}: {
  label: string;
  hint?: string;
  value: number | null;
}) {
  const v = value ?? 0;
  const pct = Math.round((v / 5) * 100);
  return (
    <div className="space-y-1">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-sm font-medium text-sea-800">{label}</span>
        <span className="text-sm font-semibold tabular-nums text-sea-600">
          {value == null ? "—" : v.toFixed(1)}
        </span>
      </div>
      <div className="h-2.5 w-full overflow-hidden rounded-full bg-sea-100">
        <div
          className="h-full rounded-full bg-sea-500 transition-[width] duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
      {hint ? <p className="text-xs text-sea-400">{hint}</p> : null}
    </div>
  );
}
