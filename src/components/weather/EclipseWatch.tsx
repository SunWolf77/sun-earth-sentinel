/**
 * Eclipse Watch — solar / lunar elevated awareness.
 * Transient shadow realm: observational only · not a forecast.
 */

import { useEffect, useMemo, useState } from "react";
import {
  computeEclipseWatch,
  eclipseTone,
  formatEclipseType,
  type EclipseEvent,
  type EclipseWatchState,
} from "@/lib/astro/eclipses";
import {
  Circle,
  ExternalLink,
  Eye,
  Moon,
  Shield,
  Sun,
  Eclipse,
} from "lucide-react";

function toneBorder(t: ReturnType<typeof eclipseTone>): string {
  switch (t) {
    case "danger":
      return "border-danger/50 bg-danger/10";
    case "warn":
      return "border-warn/45 bg-warn/10";
    case "gold":
      return "border-gold/40 bg-gold/10";
    case "primary":
      return "border-primary/35 bg-primary/8";
    default:
      return "border-border bg-panel";
  }
}

function toneText(t: ReturnType<typeof eclipseTone>): string {
  switch (t) {
    case "danger":
      return "text-danger";
    case "warn":
      return "text-warn";
    case "gold":
      return "text-gold";
    case "primary":
      return "text-primary";
    default:
      return "text-muted";
  }
}

function KindIcon({ e }: { e: EclipseEvent }) {
  if (e.kind === "solar") return <Sun className="h-3.5 w-3.5 shrink-0" />;
  return <Moon className="h-3.5 w-3.5 shrink-0" />;
}

function EventRow({ e, focus }: { e: EclipseEvent; focus?: boolean }) {
  return (
    <li
      className={`rounded-lg border px-2.5 py-2 text-xs ${
        focus
          ? "border-warn/40 bg-bg/60"
          : "border-border/80 bg-bg/40"
      }`}
    >
      <div className="flex flex-wrap items-center gap-1.5">
        <KindIcon e={e} />
        <span className="font-semibold text-fg">{e.name}</span>
        <span className="rounded border border-border px-1 py-0.5 text-[0.55rem] font-semibold uppercase text-dim">
          {formatEclipseType(e)}
        </span>
      </div>
      <p className="mt-0.5 font-mono text-[0.65rem] text-muted">{e.peakLabel}</p>
      <p className="mt-1 text-[0.68rem] leading-snug text-muted">{e.path}</p>
      <p className="mt-0.5 text-[0.62rem] text-dim">{e.regions}</p>
      <div className="mt-1.5 flex flex-wrap gap-2">
        {e.mapUrl && (
          <a
            href={e.mapUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-0.5 text-[0.62rem] font-medium text-primary hover:underline"
          >
            Map / times
            <ExternalLink className="h-2.5 w-2.5" />
          </a>
        )}
        {e.nasaUrl && (
          <a
            href={e.nasaUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-0.5 text-[0.62rem] font-medium text-muted hover:text-primary hover:underline"
          >
            NASA
            <ExternalLink className="h-2.5 w-2.5" />
          </a>
        )}
      </div>
      {e.kind === "solar" && (
        <p className="mt-1.5 flex gap-1 text-[0.6rem] leading-snug text-warn">
          <Shield className="mt-0.5 h-3 w-3 shrink-0" />
          {e.safety}
        </p>
      )}
    </li>
  );
}

export function EclipseWatch({
  compact = false,
  forceOpen = false,
}: {
  compact?: boolean;
  /** When true (e.g. active eclipse day), start expanded */
  forceOpen?: boolean;
}) {
  const [now, setNow] = useState(() => Date.now());
  const [open, setOpen] = useState(() => forceOpen);

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(id);
  }, []);

  const watch: EclipseWatchState = useMemo(
    () => computeEclipseWatch(now),
    [now],
  );

  useEffect(() => {
    if (
      watch.awareness === "active" ||
      watch.awareness === "elevated"
    ) {
      setOpen(true);
    }
  }, [watch.awareness]);

  const tone = eclipseTone(watch.awareness);
  const focus = watch.active ?? watch.elevated ?? watch.next;

  if (compact && watch.awareness === "dormant") {
    return (
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-2 rounded-lg border border-border bg-panel/80 px-2.5 py-2 text-left text-[0.68rem] text-muted hover:border-primary/30"
      >
        <span className="inline-flex items-center gap-1.5">
          <Eclipse className="h-3.5 w-3.5 text-dim" />
          {watch.chip}
        </span>
        <span className="text-dim">{open ? "Hide" : "Open"}</span>
      </button>
    );
  }

  return (
    <section
      className={`rounded-xl border p-3 sm:p-4 ${toneBorder(tone)}`}
      aria-label="Eclipse watch"
    >
      <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h3
            className={`flex items-center gap-1.5 text-sm font-semibold ${toneText(tone)}`}
          >
            <Eclipse className="h-4 w-4" />
            Eclipse watch
          </h3>
          <p className="mt-0.5 text-[0.65rem] text-dim">
            Solar & lunar · transient shadow · observation only
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <span
            className={`rounded-full border px-2 py-0.5 text-[0.58rem] font-bold uppercase tracking-wide ${toneBorder(tone)} ${toneText(tone)}`}
          >
            {watch.awareness}
          </span>
          <button
            type="button"
            className="ww-btn min-h-8 text-[0.62rem]"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
          >
            {open ? "Collapse" : "Details"}
          </button>
        </div>
      </div>

      <p className={`text-sm font-medium leading-snug ${toneText(tone)}`}>
        {watch.headline}
      </p>
      {watch.seasonNote && (
        <p className="mt-1 text-[0.68rem] text-muted">{watch.seasonNote}</p>
      )}

      {focus && (
        <div className="mt-2 flex flex-wrap items-center gap-2 text-[0.68rem] text-muted">
          <span className="inline-flex items-center gap-1 font-mono text-fg">
            <Circle className="h-2.5 w-2.5 fill-current opacity-60" />
            {focus.peakLabel}
          </span>
          {watch.hoursToPeak != null && (
            <span>
              {watch.hoursToPeak >= 0
                ? `T−${Math.abs(watch.hoursToPeak) < 48 ? `${Math.round(watch.hoursToPeak)} h` : `${Math.round(watch.hoursToPeak / 24)} d`}`
                : `T+${Math.abs(watch.hoursToPeak) < 48 ? `${Math.round(-watch.hoursToPeak)} h` : `${Math.round(-watch.hoursToPeak / 24)} d`}`}
            </span>
          )}
          <span className="text-dim">· {focus.syzygy === "new" ? "new moon" : "full moon"}</span>
        </div>
      )}

      {(watch.awareness === "active" || watch.awareness === "elevated") &&
        focus?.kind === "solar" && (
          <p className="mt-2 flex gap-1.5 rounded-md border border-warn/40 bg-bg/50 px-2 py-1.5 text-[0.68rem] leading-snug text-warn">
            <Eye className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>
              <strong className="font-semibold">Eye safety:</strong> {focus.safety}{" "}
              This desk does not issue viewing guidance for your location — check
              local path maps.
            </span>
          </p>
        )}

      {open && (
        <div className="mt-3 space-y-2">
          <p className="text-[0.62rem] uppercase tracking-wider text-dim">
            Upcoming · curated
          </p>
          <ul className="space-y-2">
            {watch.upcoming.map((e) => (
              <EventRow
                key={e.id}
                e={e}
                focus={focus?.id === e.id}
              />
            ))}
            {!watch.upcoming.length && (
              <li className="text-xs text-dim">Catalog empty for this window.</li>
            )}
          </ul>
          <p className="text-[0.6rem] leading-relaxed text-dim">
            Peaks are approximate UTC mid-eclipse for ops awareness. Path geometry
            and local contact times: NASA / timeanddate. Not a forecast · not an
            alert service.
          </p>
        </div>
      )}
    </section>
  );
}

/** Slim chip for pulse / header strips */
export function EclipseWatchChip() {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(id);
  }, []);
  const watch = useMemo(() => computeEclipseWatch(now), [now]);
  if (watch.awareness === "dormant") return null;
  const tone = eclipseTone(watch.awareness);
  return (
    <span
      className={`inline-flex max-w-full items-center gap-1 truncate rounded-full border px-2 py-0.5 text-[0.58rem] font-semibold ${toneBorder(tone)} ${toneText(tone)}`}
      title={watch.headline}
    >
      <Eclipse className="h-3 w-3 shrink-0" />
      {watch.chip}
    </span>
  );
}
