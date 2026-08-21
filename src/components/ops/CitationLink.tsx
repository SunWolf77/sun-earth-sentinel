import { ExternalLink } from "lucide-react";
import { citationHref, type Citation } from "@/lib/cite";

export function CitationLink({
  cite,
  compact = false,
}: {
  cite: Citation;
  compact?: boolean;
}) {
  const href = citationHref(cite);
  if (!href) {
    return <span>{cite.label}</span>;
  }
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={
        compact
          ? "inline-flex min-h-8 max-w-full items-center gap-1 rounded-lg border border-border px-2 py-0.5 text-[0.62rem] text-muted hover:text-fg"
          : "inline-flex max-w-full items-center gap-1 rounded-md border border-border bg-bg/60 px-2 py-1 text-[0.65rem] text-primary hover:bg-elevated"
      }
      title={cite.doi ? `doi:${cite.doi}` : cite.label}
    >
      <span className="min-w-0 truncate">{cite.label}</span>
      {cite.doi && (
        <span className="shrink-0 font-mono text-[0.58rem] text-dim">doi:{cite.doi}</span>
      )}
      <ExternalLink className="h-3 w-3 shrink-0" />
    </a>
  );
}

export function CitationRow({
  cites,
  compact = false,
}: {
  cites: readonly Citation[];
  compact?: boolean;
}) {
  return (
    <div className={`flex flex-wrap gap-1.5 ${compact ? "mt-1.5" : "mt-2"}`}>
      {cites.map((c) => (
        <CitationLink key={c.doi || c.url || c.label} cite={c} compact={compact} />
      ))}
    </div>
  );
}
