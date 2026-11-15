import { useEffect, useState } from "react";

const CARD = "https://flux-phase.grok.me/api/flux-card";
const DESK = "https://flux-phase.grok.me";

type Card = {
  ok?: boolean;
  pM?: number;
  pX?: number;
  sentence?: string;
  fileThrough?: string;
  lastX?: { line?: string } | null;
};

function pct(n: number | undefined): string {
  return n == null ? "—" : `${Math.round(n * 100)}%`;
}

/** Short card from the published Flux Phase desk. The archive is not loaded here. */
export function FluxPhaseCard() {
  const [card, setCard] = useState<Card | null>(null);
  const [err, setErr] = useState(false);

  useEffect(() => {
    let live = true;
    fetch(CARD)
      .then((res) => {
        if (!res.ok) throw new Error(String(res.status));
        return res.json() as Promise<Card>;
      })
      .then((next) => {
        if (live) setCard(next);
      })
      .catch(() => {
        if (live) setErr(true);
      });
    return () => {
      live = false;
    };
  }, []);

  return (
    <section className="rounded-xl border border-border bg-panel px-3 py-3">
      <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-[0.72rem] font-semibold uppercase tracking-wider text-primary">Long record</h2>
        <a href={DESK} target="_blank" rel="noreferrer" className="text-[0.65rem] font-semibold text-primary">
          Open Flux Phase
        </a>
      </div>
      {err && (
        <p className="text-[0.75rem] text-muted">The long record did not answer. The disk on this page is unchanged.</p>
      )}
      {!card && !err && <p className="text-[0.75rem] text-muted">Reading the long X-ray record…</p>}
      {card?.ok && (
        <>
          <p className="text-[0.9rem] font-medium leading-snug text-fg">{card.sentence}</p>
          <p className="mt-1 text-[0.72rem] text-muted">
            M or X, next 6 h {pct(card.pM)} · X {pct(card.pX)}
            {card.fileThrough ? ` · file through ${card.fileThrough}` : ""}
          </p>
          {card.lastX?.line ? <p className="mt-1 text-[0.68rem] leading-snug text-dim">{card.lastX.line}</p> : null}
          <p className="mt-1 text-[0.6rem] leading-snug text-dim">
            The archive stays on Flux Phase. This page only reads the short card.
          </p>
        </>
      )}
    </section>
  );
}
