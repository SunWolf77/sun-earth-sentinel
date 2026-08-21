/**
 * Language field scorer — harmonic-ai-supt lexicon, not the gap probe.
 */

import { useMemo, useState } from "react";
import { ExternalLink } from "lucide-react";
import {
  COPY_FIELDS,
  COPY_FIELD_PLAIN,
  HARMONIC_AI_REPO,
  logCopyScore,
  readCopyLog,
  scoreCopy,
} from "@/lib/supt/harmonicCopy";
import { XHandle } from "@/components/ui/XProfileLink";

export function HarmonicCopyDesk() {
  const [text, setText] = useState("");
  const [log, setLog] = useState(() => readCopyLog());
  const live = useMemo(() => (text.trim() ? scoreCopy(text) : null), [text]);

  return (
    <section
      id="harmonic-copy"
      className="rounded-xl border border-border bg-panel p-4 text-sm text-muted"
    >
      <h3 className="text-xs font-medium uppercase tracking-wider text-primary">
        Harmonic copy · lexicon
      </h3>
      <p className="mt-1 text-[0.72rem] leading-relaxed">
        Port of{" "}
        <a
          href={HARMONIC_AI_REPO}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary hover:underline"
        >
          harmonic-ai-supt
        </a>{" "}
        by <XHandle profile="sunwolf" />. Keyword fields, not the frozen gap probe.
        Does not predict quakes. Does not train. Flags forecast diction in our own copy.
      </p>
      <textarea
        className="mt-2 min-h-[4.5rem] w-full rounded-md border border-border bg-bg px-2 py-1.5 text-[0.78rem] text-fg"
        placeholder="Paste a headline or brief…"
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      {live && (
        <div className="mt-2 space-y-1.5">
          <div className="flex flex-wrap gap-1.5 font-mono text-[0.62rem]">
            {COPY_FIELDS.map((f) => (
              <span key={f} className="rounded border border-border px-1.5 py-0.5" title={COPY_FIELD_PLAIN[f]}>
                {f} {live.scores[f].toFixed(2)}
              </span>
            ))}
          </div>
          <p className="text-[0.72rem] text-fg">{live.hint}</p>
          {live.flags.length > 0 && (
            <ul className="list-disc pl-4 text-[0.65rem] text-warn">
              {live.flags.map((fl) => (
                <li key={fl.id}>{fl.excerpt}</li>
              ))}
            </ul>
          )}
          {live.repaired !== text && (
            <p className="text-[0.65rem]">
              <span className="text-dim">Linted · </span>
              {live.repaired}
            </p>
          )}
          <button
            type="button"
            className="ww-btn min-h-8 text-[0.62rem]"
            onClick={() => setLog(logCopyScore(text, live))}
          >
            Keep in local log
          </button>
        </div>
      )}
      {log[0] && (
        <p className="mt-2 font-mono text-[0.58rem] text-dim">
          Last log · {log.length} · DDI {log[0].ddi.toFixed(2)} · {log[0].hint}
        </p>
      )}
      <a
        href={HARMONIC_AI_REPO}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-2 inline-flex items-center gap-1 text-[0.62rem] text-primary hover:underline"
      >
        Repo <ExternalLink className="h-3 w-3" />
      </a>
    </section>
  );
}
