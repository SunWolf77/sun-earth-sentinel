/**
 * Antipode — what we measure vs two claims that get mixed.
 * Papers are DOI links in the copy, not a buried list.
 */

import { doiHref, type Citation } from "@/lib/cite";
import { CitationRow } from "@/components/ops/CitationLink";

export const ANTIPODE_CITES: Citation[] = [
  {
    label: "O’Malley et al. 2018 Sci Rep",
    doi: "10.1038/s41598-018-30019-2",
  },
  {
    label: "Retailleau et al. 2014 GJI",
    doi: "10.1093/gji/ggu309",
  },
  {
    label: "USGS — can you predict earthquakes?",
    url: "https://www.usgs.gov/faqs/can-you-predict-earthquakes",
  },
];

function PaperLink({
  doi,
  children,
}: {
  doi: string;
  children: string;
}) {
  return (
    <a
      href={doiHref(doi)}
      target="_blank"
      rel="noopener noreferrer"
      className="font-medium text-primary underline decoration-primary/40 underline-offset-2 hover:decoration-primary"
    >
      {children}
    </a>
  );
}

export function AntipodeExplainer({ compact = false }: { compact?: boolean }) {
  return (
    <div
      id="antipode-info"
      className={
        compact
          ? "mt-2 text-[0.62rem] text-dim"
          : "rounded-xl border border-border bg-panel p-4 text-sm text-muted"
      }
    >
      <h4
        className={
          compact
            ? "font-semibold uppercase tracking-wider text-muted"
            : "mb-2 text-xs font-medium uppercase tracking-wider text-primary"
        }
      >
        {compact ? "What antipode means" : "Antipode — what this is"}
      </h4>
      <p className={compact ? "mt-1" : ""}>
        Antipode = the point opposite an epicentre. We report offset from that point (0° = exact
        opposite) and lag. That is a ruler. Ring antipodes often land on the Ring — plates, not a
        signal.
      </p>
      <p className={compact ? "mt-1" : "mt-2"}>
        <strong className="text-fg">Wave focusing</strong> — energy can focus at the opposite
        point. Physics, not a trigger.{" "}
        <PaperLink doi="10.1093/gji/ggu309">Retailleau et al., GJI 2014</PaperLink>
        <span className="font-mono text-dim"> doi:10.1093/gji/ggu309</span>
      </p>
      <p className={compact ? "mt-1" : "mt-2"}>
        <strong className="text-fg">Triggering</strong> —{" "}
        <PaperLink doi="10.1038/s41598-018-30019-2">O’Malley et al., Sci Rep 2018</PaperLink>
        <span className="font-mono text-dim"> doi:10.1038/s41598-018-30019-2</span> reported M6.5+
        more often followed by M5+ within ~30° of the antipode in 3 days. Not USGS consensus.
      </p>
      <p className={compact ? "mt-1" : "mt-2"}>
        We list pairs under 40° / 14 d so you can look. We do not score cause.
      </p>
      <CitationRow cites={ANTIPODE_CITES} compact={compact} />
    </div>
  );
}
