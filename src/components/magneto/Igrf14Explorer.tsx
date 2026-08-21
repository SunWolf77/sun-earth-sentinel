import { useMemo, useState } from "react";
import { BookOpen, ExternalLink, Layers } from "lucide-react";
import {
  IGRF14_DEGREE,
  IGRF14_EPOCH,
  IGRF14_FACTS,
  IGRF14_MAX_YEAR,
  IGRF14_SV_DEGREE,
  decimalYearNow,
  evaluateIgrf14,
  igrf14DipoleSnapshot,
} from "@/lib/magneto/igrf14";
import { evaluateWmm2025 } from "@/lib/magneto/wmm2025";
import { ModelAccuracyDisclaimer } from "@/components/ops/ModelAccuracyDisclaimer";

const PRESETS = [
  { id: "sydney", label: "Sydney", lat: -33.87, lon: 151.21 },
  { id: "greenwich", label: "Greenwich", lat: 51.48, lon: 0.0 },
  { id: "zero", label: "0°, 0°", lat: 0, lon: 0 },
  { id: "fairbanks", label: "Fairbanks", lat: 64.84, lon: -147.72 },
] as const;

/**
 * Deep IGRF-14 literacy + live coefficient evaluation (degree 13).
 */
export function Igrf14Explorer({ defaultOpen = true }: { defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  const [lat, setLat] = useState(-33.87);
  const [lon, setLon] = useState(151.21);
  const [altKm, setAltKm] = useState(0);
  const [year, setYear] = useState(() => {
    const y = decimalYearNow();
    return Math.min(IGRF14_MAX_YEAR, Math.max(IGRF14_EPOCH, y));
  });

  const igrf = useMemo(
    () => evaluateIgrf14({ lat, lon, altKm, decimalYear: year }),
    [lat, lon, altKm, year],
  );
  const wmm = useMemo(
    () => evaluateWmm2025({ lat, lon, altKm, decimalYear: year }),
    [lat, lon, altKm, year],
  );
  const dipole = useMemo(() => igrf14DipoleSnapshot(year), [year]);

  const dF = igrf.F - wmm.F;
  const dDecl = igrf.decl - wmm.decl;

  return (
    <div className="rounded-lg border border-accent/35 bg-accent/5 px-3 py-2.5">
      <button
        type="button"
        className="flex w-full items-start justify-between gap-2 text-left"
        onClick={() => setOpen((v) => !v)}
      >
        <span className="flex items-start gap-1.5">
          <BookOpen className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent" />
          <span>
            <span className="block text-[0.72rem] font-semibold text-accent">
              IGRF-14 model details
            </span>
            <span className="mt-0.5 block text-[0.65rem] text-dim">
              Degree {IGRF14_DEGREE} · epoch {IGRF14_EPOCH} · SV→{IGRF14_MAX_YEAR} (deg ≤
              {IGRF14_SV_DEGREE}) · vs WMM2025
            </span>
          </span>
        </span>
        <span className="shrink-0 text-[0.62rem] text-primary">{open ? "Hide" : "Show"}</span>
      </button>

      {open && (
        <div className="mt-2 space-y-2.5 border-t border-border/60 pt-2 text-[0.72rem] leading-relaxed text-muted">
          <div className="grid gap-2 sm:grid-cols-3">
            <FactChip
              title="DGRF 2020.0"
              body="Definitive main field for epoch 2020 — locked after data closed."
            />
            <FactChip
              title="IGRF 2025.0"
              body={`Main field to degree ${IGRF14_DEGREE} (Schmidt semi-normalized Gauss coeffs).`}
            />
            <FactChip
              title="SV 2025–2030"
              body={`Linear predictive secular variation to degree ${IGRF14_SV_DEGREE} only.`}
            />
          </div>

          <ul className="list-disc space-y-1 pl-4 text-[0.68rem]">
            {IGRF14_FACTS.map((f) => (
              <li key={f}>{f}</li>
            ))}
          </ul>

          <div className="rounded-md border border-border/70 bg-bg/40 px-2.5 py-2 font-mono text-[0.65rem] text-dim">
            <div className="flex items-center gap-1 text-fg">
              <Layers className="h-3 w-3 text-accent" />
              Axial dipole g₁⁰ @ {year.toFixed(2)}
            </div>
            <p className="mt-1 text-fg">
              g₁₀ = <strong>{dipole.g10.toFixed(1)}</strong> nT · SV{" "}
              <strong>{dipole.g10Sv >= 0 ? "+" : ""}
              {dipole.g10Sv.toFixed(1)}</strong> nT/yr
            </p>
            <p className="mt-1 normal-case tracking-normal text-[0.62rem] text-dim">
              {dipole.note}
            </p>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {PRESETS.map((p) => (
              <button
                key={p.id}
                type="button"
                className="rounded-full border border-border bg-bg/50 px-2 py-0.5 text-[0.62rem] text-muted hover:border-accent/40 hover:text-fg"
                onClick={() => {
                  setLat(p.lat);
                  setLon(p.lon);
                }}
              >
                {p.label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Num label="Lat °" value={lat} onChange={setLat} step={0.1} />
            <Num label="Lon °" value={lon} onChange={setLon} step={0.1} />
            <Num label="Alt km" value={altKm} onChange={setAltKm} step={1} />
            <Num
              label="Year"
              value={year}
              onChange={setYear}
              step={0.1}
              min={IGRF14_EPOCH}
              max={IGRF14_MAX_YEAR}
            />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[320px] text-left text-[0.68rem]">
              <thead>
                <tr className="border-b border-border text-dim">
                  <th className="py-1 pr-2 font-medium">Field</th>
                  <th className="py-1 pr-2 font-medium">IGRF-14</th>
                  <th className="py-1 pr-2 font-medium">WMM2025</th>
                  <th className="py-1 font-medium">Δ</th>
                </tr>
              </thead>
              <tbody className="font-mono text-fg">
                <tr className="border-b border-border/50">
                  <td className="py-1 pr-2 text-muted">Decl °</td>
                  <td className="py-1 pr-2">{igrf.decl.toFixed(2)}</td>
                  <td className="py-1 pr-2">{wmm.decl.toFixed(2)}</td>
                  <td className="py-1">{fmtDelta(dDecl, 2)}</td>
                </tr>
                <tr className="border-b border-border/50">
                  <td className="py-1 pr-2 text-muted">Incl °</td>
                  <td className="py-1 pr-2">{igrf.incl.toFixed(2)}</td>
                  <td className="py-1 pr-2">{wmm.incl.toFixed(2)}</td>
                  <td className="py-1">{fmtDelta(igrf.incl - wmm.incl, 2)}</td>
                </tr>
                <tr className="border-b border-border/50">
                  <td className="py-1 pr-2 text-muted">F nT</td>
                  <td className="py-1 pr-2">{igrf.F.toFixed(0)}</td>
                  <td className="py-1 pr-2">{wmm.F.toFixed(0)}</td>
                  <td className="py-1">{fmtDelta(dF, 0)}</td>
                </tr>
                <tr>
                  <td className="py-1 pr-2 text-muted">H nT</td>
                  <td className="py-1 pr-2">{igrf.H.toFixed(0)}</td>
                  <td className="py-1 pr-2">{wmm.H.toFixed(0)}</td>
                  <td className="py-1">{fmtDelta(igrf.H - wmm.H, 0)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <p className="text-[0.65rem] text-dim">
            Small IGRF−WMM deltas are expected (different teams, degree, SV truncation). Neither
            product is a storm index — Kp/G-scale still own the short-period story.
          </p>

          <div className="flex flex-wrap gap-x-3 gap-y-1">
            <a
              href="https://www.ncei.noaa.gov/products/international-geomagnetic-reference-field"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[0.65rem] text-primary hover:underline"
            >
              NCEI · IGRF product
              <ExternalLink className="h-3 w-3" />
            </a>
            <a
              href="/IGRF14coeffs.txt"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[0.65rem] text-primary hover:underline"
            >
              IGRF14coeffs.txt (bundled)
              <ExternalLink className="h-3 w-3" />
            </a>
            <a
              href="https://doi.org/10.1186/s40623-025-02360-0"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[0.65rem] text-primary hover:underline"
            >
              EPS paper · IGRF-14
              <span className="font-mono text-dim"> doi:10.1186/s40623-025-02360-0</span>
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>

          <ModelAccuracyDisclaimer compact />
        </div>
      )}
    </div>
  );
}

function FactChip({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-md border border-border/70 bg-bg/40 px-2 py-1.5">
      <div className="text-[0.68rem] font-semibold text-fg">{title}</div>
      <p className="mt-0.5 text-[0.62rem] text-dim">{body}</p>
    </div>
  );
}

function Num({
  label,
  value,
  onChange,
  step,
  min,
  max,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  step?: number;
  min?: number;
  max?: number;
}) {
  return (
    <label className="text-[0.62rem] text-dim">
      {label}
      <input
        type="number"
        step={step}
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-0.5 w-full rounded border border-border bg-bg px-2 py-1 font-mono text-sm text-fg"
      />
    </label>
  );
}

function fmtDelta(n: number, digits: number) {
  const s = n.toFixed(digits);
  return n > 0 ? `+${s}` : s;
}
