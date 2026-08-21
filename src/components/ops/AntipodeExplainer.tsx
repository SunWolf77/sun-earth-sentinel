/**
 * Antipode — what we measure vs two claims that get mixed.
 * Papers are DOI links in the copy, not a buried list.
 */

import { ExternalLink } from "lucide-react";

const PAPER = {
  omalley: {
    href: "https://doi.org/10.1038/s41598-018-30019-2",
    pdf: "https://www.nature.com/articles/s41598-018-30019-2.pdf",
    label: "O’Malley et al. 2018",
  },
  retailleau: {
    href: "https://doi.org/10.1093/gji/ggu309",
    pmc: "https://www.ncbi.nlm.nih.gov/pmc/articles/PMC4461126/",
    label: "Retailleau et al. 2014",
  },
  usgs: {
    href: "https://www.usgs.gov/faqs/can-you-predict-earthquakes",
    label: "USGS FAQ",
  },
} as const;

function PaperLink({
  href,
  children,
}: {
  href: string;
  children: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="font-medium text-primary underline decoration-primary/40 underline-offset-2 hover:decoration-primary"
    >
      {children}
    </a>
  );
}

function PaperRow({ compact }: { compact: boolean }) {
  const chip = compact
    ? "inline-flex min-h-8 items-center gap-1 rounded-lg border border-border px-2 text-[0.62rem] text-muted hover:text-fg"
    : "inline-flex items-center gap-1 rounded-md border border-border bg-elevated px-2.5 py-1.5 text-xs font-medium text-fg hover:border-primary/40";
  return (
    <div className={`flex flex-wrap gap-1.5 ${compact ? "mt-1.5" : "mt-3"}`}>
      <a href={PAPER.omalley.href} target="_blank" rel="noopener noreferrer" className={chip}>
        {PAPER.omalley.label} <ExternalLink className="h-3 w-3" />
      </a>
      <a href={PAPER.omalley.pdf} target="_blank" rel="noopener noreferrer" className={chip}>
        PDF <ExternalLink className="h-3 w-3" />
      </a>
      <a href={PAPER.retailleau.href} target="_blank" rel="noopener noreferrer" className={chip}>
        {PAPER.retailleau.label} <ExternalLink className="h-3 w-3" />
      </a>
      <a href={PAPER.retailleau.pmc} target="_blank" rel="noopener noreferrer" className={chip}>
        PMC <ExternalLink className="h-3 w-3" />
      </a>
      <a href={PAPER.usgs.href} target="_blank" rel="noopener noreferrer" className={chip}>
        {PAPER.usgs.label} <ExternalLink className="h-3 w-3" />
      </a>
    </div>
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
      <h4 className={compact ? "font-semibold uppercase tracking-wider text-muted" : "mb-2 text-xs font-medium uppercase tracking-wider text-primary"}>
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
        <PaperLink href={PAPER.retailleau.href}>Retailleau et al., GJI 2014</PaperLink>
        {" · "}
        <PaperLink href={PAPER.retailleau.pmc}>free PMC</PaperLink>
        .
      </p>
      <p className={compact ? "mt-1" : "mt-2"}>
        <strong className="text-fg">Triggering</strong> —{" "}
        <PaperLink href={PAPER.omalley.href}>O’Malley et al., Sci Rep 2018</PaperLink>
        {" "}
        (<PaperLink href={PAPER.omalley.pdf}>PDF</PaperLink>) reported M6.5+ more often followed by
        M5+ within ~30° of the antipode in 3 days. Not USGS consensus.{" "}
        <PaperLink href={PAPER.usgs.href}>USGS: earthquakes cannot be predicted</PaperLink>
        .
      </p>
      <p className={compact ? "mt-1" : "mt-2"}>
        We list pairs under 40° / 14 d so you can look. We do not score cause.
      </p>
      <PaperRow compact={compact} />
    </div>
  );
}
