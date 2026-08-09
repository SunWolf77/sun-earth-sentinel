import { useMemo, useState } from "react";
import { Compass, ExternalLink, MapPin } from "lucide-react";
import {
  WMM2025_EPOCH,
  WMM2025_HEADER,
  WMM2025_MAX_YEAR,
  decimalYearNow,
  evaluateWmm2025,
  wmm2025SelfTest,
} from "@/lib/magneto/wmm2025";
import { MAG_STATIONS } from "@/lib/magneto/stations";
import { ModelAccuracyDisclaimer } from "@/components/ops/ModelAccuracyDisclaimer";

const PRESETS = [
  { id: "sydney", label: "Sydney", lat: -33.87, lon: 151.21 },
  { id: "zero", label: "0°, 21°E", lat: 0, lon: 21 },
  { id: "fairbanks", label: "Fairbanks", lat: 64.84, lon: -147.72 },
  { id: "test143", label: "Test 14°N 143°E", lat: 14, lon: 143 },
] as const;

/**
 * Interactive WMM2025 coefficient model sampler.
 */
export function Wmm2025Sampler({ defaultOpen = false }: { defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);

  const [lat, setLat] = useState(-33.87);
  const [lon, setLon] = useState(151.21);
  const [altKm, setAltKm] = useState(0);
  const [year, setYear] = useState(() => {
    const y = decimalYearNow();
    return Math.min(WMM2025_MAX_YEAR, Math.max(WMM2025_EPOCH, y));
  });

  const result = useMemo(
    () =>
      evaluateWmm2025({
        lat,
        lon,
        altKm,
        decimalYear: year,
      }),
    [lat, lon, altKm, year],
  );

  const self = useMemo(() => wmm2025SelfTest(), []);

  return (
    <div className="rounded-lg border border-primary/30 bg-primary/5 px-3 py-2.5">
      <button
        type="button"
        className="flex w-full items-start justify-between gap-2 text-left"
        onClick={() => setOpen((v) => !v)}
      >
        <span className="flex items-start gap-1.5">
          <Compass className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
          <span>
            <span className="block text-[0.72rem] font-semibold text-primary">
              WMM2025 model · coefficient sampler
            </span>
            <span className="mt-0.5 block text-[0.65rem] text-dim">
              Epoch {WMM2025_EPOCH}–{WMM2025_MAX_YEAR} · declination / F / SV · official COF embedded
            </span>
          </span>
        </span>
        <span className="shrink-0 text-[0.62rem] text-primary">{open ? "Hide" : "Show"}</span>
      </button>

      {open && (
        <div className="mt-2 space-y-2.5 border-t border-border/60 pt-2 text-[0.72rem] text-muted">
          <p className="font-mono text-[0.6rem] text-dim">Header · {WMM2025_HEADER.trim()}</p>
          <p>
            Embedded <strong className="text-fg">WMM2025</strong> Gauss coefficients (degree 12) with
            secular variation. Sample the main field at any geodetic point — navigation baseline,
            not a storm forecast.
          </p>

          <div className="flex flex-wrap gap-1.5">
            {PRESETS.map((p) => (
              <button
                key={p.id}
                type="button"
                className="rounded-full border border-border bg-bg/50 px-2 py-0.5 text-[0.62rem] text-muted hover:border-primary/40 hover:text-fg"
                onClick={() => {
                  setLat(p.lat);
                  setLon(p.lon);
                }}
              >
                {p.label}
              </button>
            ))}
            {MAG_STATIONS.filter((s) => s.priority).slice(0, 4).map((s) => (
              <button
                key={s.code}
                type="button"
                className="rounded-full border border-border bg-bg/50 px-2 py-0.5 text-[0.62rem] text-muted hover:border-primary/40 hover:text-fg"
                onClick={() => {
                  setLat(s.lat);
                  setLon(s.lon);
                }}
                title={s.name}
              >
                {s.code}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <label className="text-[0.62rem] text-dim">
              Lat °
              <input
                type="number"
                step={0.1}
                value={lat}
                onChange={(e) => setLat(Number(e.target.value))}
                className="mt-0.5 w-full rounded border border-border bg-bg px-2 py-1 font-mono text-sm text-fg"
              />
            </label>
            <label className="text-[0.62rem] text-dim">
              Lon °
              <input
                type="number"
                step={0.1}
                value={lon}
                onChange={(e) => setLon(Number(e.target.value))}
                className="mt-0.5 w-full rounded border border-border bg-bg px-2 py-1 font-mono text-sm text-fg"
              />
            </label>
            <label className="text-[0.62rem] text-dim">
              Alt km (HAE)
              <input
                type="number"
                step={1}
                value={altKm}
                onChange={(e) => setAltKm(Number(e.target.value))}
                className="mt-0.5 w-full rounded border border-border bg-bg px-2 py-1 font-mono text-sm text-fg"
              />
            </label>
            <label className="text-[0.62rem] text-dim">
              Decimal year
              <input
                type="number"
                step={0.1}
                min={WMM2025_EPOCH}
                max={WMM2025_MAX_YEAR}
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
                className="mt-0.5 w-full rounded border border-border bg-bg px-2 py-1 font-mono text-sm text-fg"
              />
            </label>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Metric label="Decl °" value={result.decl.toFixed(2)} hint={`SV ${result.dDecl >= 0 ? "+" : ""}${result.dDecl.toFixed(2)}°/yr`} />
            <Metric label="Incl °" value={result.incl.toFixed(2)} hint={`SV ${result.dIncl >= 0 ? "+" : ""}${result.dIncl.toFixed(2)}°/yr`} />
            <Metric label="F nT" value={result.F.toFixed(0)} hint={`SV ${result.dF >= 0 ? "+" : ""}${result.dF.toFixed(0)} nT/yr`} />
            <Metric label="H nT" value={result.H.toFixed(0)} hint={`X ${result.X.toFixed(0)} · Y ${result.Y.toFixed(0)}`} />
          </div>

          <p className="flex items-start gap-1.5 text-[0.65rem] text-dim">
            <MapPin className="mt-0.5 h-3 w-3 shrink-0 text-primary" />
            NED frame · Z down · coefficients degree 12 · self-test{" "}
            <strong className={self.ok ? "text-ok" : "text-warn"}>
              {self.ok ? "pass" : "check"}
            </strong>{" "}
            vs NOAA test points
          </p>

          <div className="flex flex-wrap gap-x-3 gap-y-1">
            <a
              href="https://www.ncei.noaa.gov/products/world-magnetic-model"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[0.65rem] text-primary hover:underline"
            >
              NCEI · WMM product
              <ExternalLink className="h-3 w-3" />
            </a>
            <a
              href="/WMM2025.COF"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[0.65rem] text-primary hover:underline"
            >
              WMM2025.COF (bundled)
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>

          <ModelAccuracyDisclaimer compact />
        </div>
      )}
    </div>
  );
}

function Metric({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-md border border-border bg-bg/50 px-2 py-1.5">
      <div className="text-[0.58rem] uppercase tracking-wide text-dim">{label}</div>
      <div className="font-mono text-sm font-semibold text-fg">{value}</div>
      {hint && <div className="text-[0.58rem] text-dim">{hint}</div>}
    </div>
  );
}
