/**
 * Antipode — what we measure vs two claims that get mixed.
 * Not a theory we sell. Geometry + links.
 */

import { ExternalLink } from "lucide-react";

const LINKS = [
  {
    href: "https://www.nature.com/articles/s41598-018-30019-2",
    label: "O'Malley et al. 2018",
    hint: "Sci Rep — M6.5+ then M5+ near antipode, 3 d. Mechanics speculative.",
  },
  {
    href: "https://pmc.ncbi.nlm.nih.gov/articles/PMC4461126/",
    label: "Retailleau et al. 2014",
    hint: "Wave focusing at the antipode. Physics, not triggering.",
  },
  {
    href: "https://www.usgs.gov/faqs/can-you-predict-earthquakes",
    label: "USGS — can you predict?",
    hint: "No. Official products stay with agencies.",
  },
] as const;

export function AntipodeExplainer({ compact = false }: { compact?: boolean }) {
  return (
    <details
      id="antipode-info"
      className={
        compact
          ? "mt-2 text-[0.62rem] text-dim"
          : "rounded-xl border border-border bg-panel p-4 text-sm text-muted"
      }
    >
      <summary className="cursor-pointer font-semibold text-muted">
        {compact ? "What antipode means" : "Antipode — what this is"}
      </summary>
      <div className={compact ? "mt-1.5 space-y-1.5" : "mt-2 space-y-2"}>
        <p>
          Antipode = the point opposite an epicentre. We report how many degrees a later large
          rupture sits from that point (0° = exact opposite) and the lag. That is a ruler.
        </p>
        <p>
          Pacific Ring antipodes often land on the Ring — plate geography, not a signal. Two
          different claims get mixed:
        </p>
        <ul className={`list-disc space-y-0.5 ${compact ? "pl-4" : "pl-5"}`}>
          <li>
            <strong className="text-fg">Wave focusing</strong> — energy from a quake can focus at
            the opposite point (core-traversing phases). Real physics. Not a trigger.
          </li>
          <li>
            <strong className="text-fg">Triggering</strong> — one 2018 paper reported M6.5+ more
            often followed by M5+ within ~30° of the antipode in 3 days. Not USGS consensus. Not a
            forecast.
          </li>
        </ul>
        <p>We list pairs under 40° / 14 d so you can look. We do not score cause.</p>
        <ul className="space-y-1">
          {LINKS.map((l) => (
            <li key={l.href}>
              <a
                href={l.href}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
              >
                {l.label}
                <ExternalLink className="h-3 w-3" />
              </a>
              <span className="text-dim"> — {l.hint}</span>
            </li>
          ))}
        </ul>
      </div>
    </details>
  );
}
