import { useMemo } from "react";
import { useObservatory } from "@/store/observatory";

/** Compact attention history sparkline from store attentionHistory. */
export function AttentionSparkline({
  height = 28,
  className = "",
  showLabel = true,
}: {
  height?: number;
  className?: string;
  showLabel?: boolean;
}) {
  const hist = useObservatory((s) => s.attentionHistory);
  const pts = useMemo(() => {
    return hist.slice(-24).map((p) => ({
      t: p.t,
      a: Math.max(0, Math.min(100, Number(p.attention) || 0)),
    }));
  }, [hist]);

  if (pts.length < 2) {
    return showLabel ? null : null;
  }

  const w = 120;
  const h = height;
  const pad = 2;
  const maxA = Math.max(10, ...pts.map((p) => p.a));
  const minA = 0;
  const span = Math.max(1, maxA - minA);
  const pairs = pts.map((p, i) => {
    const x = pad + (i / (pts.length - 1)) * (w - pad * 2);
    const y = h - pad - ((p.a - minA) / span) * (h - pad * 2);
    return [x, y] as const;
  });
  const last = pts[pts.length - 1]!;
  const stroke =
    last.a >= 70 ? "var(--color-danger)" : last.a >= 40 ? "var(--color-warn)" : "var(--color-primary)";
  const d = pairs.map((p, i) => `${i === 0 ? "M" : "L"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");
  const lx = pairs[pairs.length - 1]![0];
  const ly = pairs[pairs.length - 1]![1];

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {showLabel && (
        <span className="shrink-0 text-[0.65rem] uppercase tracking-wide text-dim">Attn</span>
      )}
      <svg
        width={w}
        height={h}
        viewBox={`0 0 ${w} ${h}`}
        className="overflow-visible"
        aria-label={`Attention trend, latest ${Math.round(last.a)}`}
        role="img"
      >
        <path d={d} fill="none" stroke={stroke} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
        <circle cx={lx} cy={ly} r="2.5" fill={stroke} />
      </svg>
      <span className="font-mono text-[0.7rem] tabular-nums text-fg">{Math.round(last.a)}</span>
    </div>
  );
}
