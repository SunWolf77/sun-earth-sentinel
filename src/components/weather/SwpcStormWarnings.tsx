import { useMemo, useState } from "react";
import { Bell, ExternalLink, Radio } from "lucide-react";
import { useObservatory } from "@/store/observatory";
import {
  TIER_LABEL,
  parseSwpcAlerts,
  tierTone,
  type SwpcAlertTier,
} from "@/lib/feeds/swpcAlerts";
import { ModelAccuracyDisclaimer } from "@/components/ops/ModelAccuracyDisclaimer";

function scaleNum(s: string | undefined): number {
  const n = parseInt(String(s ?? "0"), 10);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Structured SWPC storm watches / warnings / alerts desk.
 */
export function SwpcStormWarnings({
  defaultOpen,
}: {
  defaultOpen?: boolean;
}) {
  const alerts = useObservatory((s) => s.alerts);
  const scales = useObservatory((s) => s.scales);
  const forecast = useObservatory((s) => s.forecast);

  const g = scaleNum(scales?.G);
  const elevated = g >= 1 || scaleNum(scales?.R) >= 1 || scaleNum(scales?.S) >= 1;

  const [open, setOpen] = useState(() => {
    if (defaultOpen != null) return defaultOpen;
    return elevated;
  });

  const parsed = useMemo(() => parseSwpcAlerts(alerts ?? []), [alerts]);
  const counts = useMemo(() => {
    const c: Record<SwpcAlertTier, number> = {
      warning: 0,
      watch: 0,
      alert: 0,
      summary: 0,
      other: 0,
    };
    for (const a of parsed) c[a.tier] += 1;
    return c;
  }, [parsed]);

  const outlookLine = useMemo(() => {
    if (!forecast?.threeDay) return null;
    const lines = forecast.threeDay.split("\n").map((l) => l.trim()).filter(Boolean);
    // Prefer geomagnetic rationale / greatest expected Kp snippets
    const hit =
      lines.find((l) => /greatest expected|G1|geomagnetic|No G1/i.test(l)) ||
      lines.find((l) => /Rationale/i.test(l));
    return hit?.slice(0, 200) ?? null;
  }, [forecast?.threeDay]);

  return (
    <section className="rounded-xl border border-border bg-panel p-3 sm:p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="flex items-center gap-1.5 text-sm font-semibold text-primary">
            <Bell className="h-4 w-4" />
            SWPC storm warnings
          </h3>
          <p className="mt-0.5 text-[0.68rem] text-dim">
            Official watches · warnings · alerts · live NOAA scales — authority is SWPC.
            Rows drop after 18–72 h so this desk does not archive.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <a
            href="https://www.swpc.noaa.gov/"
            target="_blank"
            rel="noopener noreferrer"
            className="ww-btn min-h-8 text-[0.62rem]"
          >
            <ExternalLink className="h-3 w-3" />
            SWPC
          </a>
          <button
            type="button"
            className="ww-btn min-h-8 text-[0.62rem]"
            onClick={() => setOpen((v) => !v)}
          >
            {open ? "Collapse" : "Expand"}
          </button>
        </div>
      </div>

      {/* Live scale strip */}
      <div className="mt-3 grid grid-cols-3 gap-2">
        {(
          [
            ["R", scales?.R, scales?.RText],
            ["S", scales?.S, scales?.SText],
            ["G", scales?.G, scales?.GText],
          ] as const
        ).map(([letter, val, text]) => {
          const n = scaleNum(val);
          const tone =
            n >= 3
              ? "border-danger/40 text-danger"
              : n >= 1
                ? "border-warn/35 text-warn"
                : "border-border text-fg";
          return (
            <div
              key={letter}
              className={`rounded-lg border bg-bg/40 px-2 py-1.5 ${tone}`}
              title={text || letter}
            >
              <div className="font-mono text-lg font-bold">
                {letter}
                {val ?? "—"}
              </div>
              <div className="truncate text-[0.58rem] capitalize text-dim">
                {text || (letter === "R" ? "Radio" : letter === "S" ? "Radiation" : "Geomagnetic")}
              </div>
            </div>
          );
        })}
      </div>

      {(scales?.G1 || scales?.GPrev || outlookLine) && (
        <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[0.65rem] text-muted">
          {scales?.GPrev != null && (
            <span>
              Prior period G<strong className="text-fg">{scales.GPrev}</strong>
              {scales.GPrevText ? ` · ${scales.GPrevText}` : ""}
            </span>
          )}
          {scales?.G1 != null && (
            <span>
              Forecast day-1 G<strong className="text-fg">{scales.G1}</strong>
              {scales.G2 != null ? ` · day-2 G${scales.G2}` : ""}
            </span>
          )}
          {outlookLine && (
            <span className="w-full text-dim" title={outlookLine}>
              Outlook: {outlookLine}
              {outlookLine.length >= 200 ? "…" : ""}
            </span>
          )}
        </div>
      )}

      <div className="mt-2 flex flex-wrap gap-1.5 text-[0.6rem]">
        {(["warning", "watch", "alert", "summary"] as const).map((t) =>
          counts[t] > 0 ? (
            <span
              key={t}
              className={`rounded-full border px-2 py-0.5 font-medium ${tierTone(t)}`}
            >
              {TIER_LABEL[t]} {counts[t]}
            </span>
          ) : null,
        )}
        {parsed.length === 0 && (
          <span className="rounded-full border border-border px-2 py-0.5 text-dim">
            No active SWPC alert rows
          </span>
        )}
      </div>

      {open && (
        <div className="mt-3 space-y-2">
          {parsed.length === 0 ? (
            <p className="text-[0.75rem] text-muted">
              Feed quiet or no high-level products right now. Scales above still show current R/S/G.
              Check{" "}
              <a
                href="https://www.swpc.noaa.gov/products/alerts-watches-and-warnings"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                SWPC alerts, watches & warnings
              </a>{" "}
              for the full desk.
            </p>
          ) : (
            <ul className="scroll-thin max-h-64 space-y-2 overflow-y-auto">
              {parsed.slice(0, 6).map((a, i) => (
                <li
                  key={`${a.issued ?? i}-${a.title.slice(0, 24)}`}
                  className={`rounded-lg border px-2.5 py-2 ${tierTone(a.tier).replace(/text-\w+/, "text-fg")}`}
                >
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span
                      className={`rounded-full border px-1.5 py-0.5 text-[0.58rem] font-semibold uppercase tracking-wide ${tierTone(a.tier)}`}
                    >
                      {TIER_LABEL[a.tier]}
                    </span>
                    {a.scaleHint && (
                      <span className="inline-flex items-center gap-0.5 font-mono text-[0.65rem] text-primary">
                        <Radio className="h-3 w-3" />
                        {a.scaleHint}
                      </span>
                    )}
                    {a.issued && (
                      <span className="text-[0.6rem] text-dim">{a.issued}</span>
                    )}
                  </div>
                  <p className="mt-1 text-[0.75rem] font-medium leading-snug text-fg">
                    {a.title}
                  </p>
                  {a.body && a.body !== a.title && (
                    <p className="mt-1 whitespace-pre-wrap text-[0.68rem] leading-relaxed text-muted">
                      {a.body.slice(0, 320)}
                      {a.body.length > 320 ? "…" : ""}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          )}

          <ModelAccuracyDisclaimer compact />
        </div>
      )}
    </section>
  );
}
