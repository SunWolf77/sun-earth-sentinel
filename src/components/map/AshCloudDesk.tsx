/**
 * Ash desk — VAAC products. We do not track the cloud.
 */

import { useEffect, useState } from "react";
import { CloudFog, ExternalLink } from "lucide-react";
import { loadWashingtonVaac } from "@/lib/feeds/vaacProxy";
import { VAAC_CENTERS, VAAC_LINKS, vaacFor, type VaacBundle } from "@/lib/feeds/vaac";
import { useObservatory, getFocusNode } from "@/store/observatory";

export function AshCloudDesk({ compact = false }: { compact?: boolean }) {
  const focusNodeId = useObservatory((s) => s.focusNodeId);
  const focus = getFocusNode(focusNodeId);
  const [bundle, setBundle] = useState<VaacBundle | null>(null);

  useEffect(() => {
    let live = true;
    void loadWashingtonVaac().then((b) => {
      if (live) setBundle(b);
    });
    return () => {
      live = false;
    };
  }, []);

  const localVaac =
    focus?.kind === "volcano" && focus.center
      ? vaacFor(focus.center[0], focus.center[1])
      : focus?.kind === "volcano"
        ? vaacFor(
            (focus.bounds[0][0] + focus.bounds[1][0]) / 2,
            (focus.bounds[0][1] + focus.bounds[1][1]) / 2,
          )
        : null;

  if (compact) {
    if (!bundle?.advisories.length && !localVaac) return null;
    const lead = bundle?.advisories[0];
    return (
      <a
        href={lead?.htmlUrl || localVaac?.href || VAAC_LINKS.washingtonMessages}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex min-h-8 max-w-full items-center gap-1 truncate rounded border border-warn/40 bg-warn/10 px-1.5 text-[0.58rem] text-fg"
        title="Official VAAC — not SES tracking"
      >
        <CloudFog className="h-3 w-3 shrink-0 text-warn" />
        <span className="truncate">
          Ash · {lead ? `${lead.volcano} ${lead.issuedUtc}` : localVaac?.name}
        </span>
      </a>
    );
  }

  return (
    <section className="rounded-lg border border-border bg-panel px-3 py-2 text-[0.7rem] text-muted">
      <h3 className="mb-1 flex items-center gap-1.5 text-[0.7rem] font-semibold uppercase tracking-wider text-warn">
        <CloudFog className="h-3.5 w-3.5" />
        Ash · VAAC
      </h3>
      <p className="text-[0.62rem] text-dim">
        Nine ICAO centres issue VAA/VAG. Aviation color on our pins is USGS/INGV — not the
        plume. Washington KML (observed + forecast) can draw on the map when Volcanoes is on.
      </p>
      {localVaac && (
        <p className="mt-1.5 text-fg">
          This desk ·{" "}
          <a
            href={localVaac.href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            {localVaac.name}
          </a>
          <span className="text-dim"> · {localVaac.aor}</span>
        </p>
      )}
      {bundle && (
        <p className="mt-1 font-mono text-[0.62rem] text-fg">{bundle.plain}</p>
      )}
      {bundle?.advisories[0] && (
        <ul className="mt-1.5 space-y-1">
          {bundle.advisories.map((a) => (
            <li key={a.volcano} className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
              <span className="font-semibold text-fg">{a.volcano}</span>
              <span className="font-mono text-dim">{a.issuedUtc}</span>
              {a.htmlUrl && (
                <a href={a.htmlUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                  VAA
                </a>
              )}
              {a.jpegUrl && (
                <a href={a.jpegUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                  VAG
                </a>
              )}
              {a.kmlUrl && (
                <a href={a.kmlUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                  KML
                </a>
              )}
              <span className="text-dim">{a.rings.filter((r) => !r.forecast).length} observed</span>
            </li>
          ))}
        </ul>
      )}
      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[0.62rem]">
        {VAAC_CENTERS.map((c) => (
          <a
            key={c.id}
            href={c.href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            {c.name.replace(" VAAC", "")}
          </a>
        ))}
        <a href={VAAC_LINKS.volcat} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-0.5 text-primary hover:underline">
          VOLCAT <ExternalLink className="h-3 w-3" />
        </a>
        <a href={VAAC_LINKS.hysplit} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
          HYSPLIT
        </a>
      </div>
    </section>
  );
}
