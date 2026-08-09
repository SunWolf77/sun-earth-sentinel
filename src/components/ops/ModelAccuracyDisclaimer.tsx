import { useState } from "react";
import { AlertTriangle, ChevronDown, ChevronUp } from "lucide-react";
import { MODEL_ACCURACY_POINTS } from "@/lib/solar/fieldModels";

/**
 * Shared non-alarmist accuracy / authority disclaimer for Solar & Magneto models.
 */
export function ModelAccuracyDisclaimer({
  compact = false,
  defaultOpen = false,
}: {
  compact?: boolean;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  if (compact) {
    return (
      <p className="text-[0.62rem] leading-relaxed text-dim">
        <AlertTriangle className="mr-1 inline h-3 w-3 text-gold" />
        Models & SES synthesis are imperfect. Official watches/warnings:{" "}
        <a
          href="https://www.swpc.noaa.gov/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary hover:underline"
        >
          NOAA SWPC
        </a>
        . Not a forecast service.
      </p>
    );
  }

  return (
    <div className="rounded-lg border border-gold/25 bg-gold/5 px-3 py-2">
      <button
        type="button"
        className="flex w-full items-center justify-between gap-2 text-left"
        onClick={() => setOpen((v) => !v)}
      >
        <span className="inline-flex items-center gap-1.5 text-[0.72rem] font-semibold text-gold">
          <AlertTriangle className="h-3.5 w-3.5" />
          Model accuracy & authority disclaimer
        </span>
        {open ? (
          <ChevronUp className="h-3.5 w-3.5 text-dim" />
        ) : (
          <ChevronDown className="h-3.5 w-3.5 text-dim" />
        )}
      </button>
      {open && (
        <ul className="mt-2 list-disc space-y-1.5 pl-4 text-[0.7rem] leading-relaxed text-muted">
          {MODEL_ACCURACY_POINTS.map((p) => (
            <li key={p}>{p}</li>
          ))}
          <li>
            Always cross-check{" "}
            <a
              href="https://www.swpc.noaa.gov/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              SWPC
            </a>{" "}
            for space weather and{" "}
            <a
              href="https://earthquake.usgs.gov/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              USGS
            </a>{" "}
            for seismicity. SES is free observational tooling, not an official forecast product.
          </li>
        </ul>
      )}
    </div>
  );
}
