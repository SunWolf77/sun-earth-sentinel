import { useState } from "react";
import { SUPT_ALPHA, SUPT_ANCHORS, SUPT_COPYRIGHT, SUPT_SEED } from "@/lib/supt/probe";
import { OMORI_CONTROL } from "@/lib/supt/etasWhiten";
import { XPerson } from "@/components/ui/XProfileLink";
import { Check, ChevronDown, ChevronRight, Copy, FunctionSquare } from "lucide-react";

/** Frozen probe as shipped in this app (TypeScript port). */
const PROBE_SNIPPET = `// src/lib/supt/probe.ts — frozen α = ${SUPT_ALPHA}, seed ${SUPT_SEED}
// Paul Sheppard SUPT probe · DO NOT retune

export const SUPT_ALPHA = ${SUPT_ALPHA};

export function probe(values: number[]): number | null {
  const x0 = values.filter((v) => Number.isFinite(v));
  if (x0.length < 4) return null;

  const sorted = x0.slice().sort((a, b) => a - b);
  const med = median(sorted);              // even-N: average of two middles
  const m = mad(x0, med);                  // median |x − med|
  const x = x0.map((v) => (v - med) / (m + 1e-12));

  const phi: number[] = [];
  let acc = 0;
  for (const v of x) { acc += v; phi.push(acc); }

  const g: number[] = [];
  for (let i = 1; i < phi.length; i++) g.push(phi[i]! - phi[i - 1]!);
  const meanAbs = g.reduce((s, v) => s + Math.abs(v), 0) / (g.length || 1);
  const gn = g.map((v) => v / (meanAbs + 1e-12));

  const C = new Array(gn.length);
  C[0] = Math.cos(2 * Math.PI * gn[0]!);
  for (let i = 1; i < gn.length; i++) {
    C[i] = SUPT_ALPHA * Math.cos(2 * Math.PI * gn[i]!)
         + (1 - SUPT_ALPHA) * C[i - 1]!;
  }

  // tail rule — Math.floor, never Math.round
  const tail = Math.max(50, Math.floor(0.2 * C.length));
  const slice = C.slice(-tail);
  const meanAbsC = slice.reduce((s, v) => s + Math.abs(v), 0) / (slice.length || 1);
  return -Math.log(meanAbsC + 1e-12);      // ← d_ij
}

// Null test (UI): shuffle sequence, re-probe, z = (d − null_mean) / null_sd
// separated ⇔ |z| ≥ 3 · null is a permitted outcome`;

/**
 * SUPT mathematical derivation — shared UI for About / Rhythm.
 * Frozen probe only; no free-form LLM narrative.
 */
export function SuptMathSection({
  compact = false,
  defaultOpen = true,
}: {
  compact?: boolean;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  if (compact) {
    return (
      <section className="rounded-xl border border-accent/30 bg-panel p-3 sm:p-4">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex min-h-10 w-full items-center gap-2 text-left"
          aria-expanded={open}
        >
          {open ? (
            <ChevronDown className="h-4 w-4 shrink-0 text-accent" />
          ) : (
            <ChevronRight className="h-4 w-4 shrink-0 text-accent" />
          )}
          <FunctionSquare className="h-4 w-4 shrink-0 text-accent" />
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-accent">Technical method (SUPT)</h3>
            <p className="text-[0.65rem] text-dim">
              Optional depth · α = {SUPT_ALPHA} · how d<sub>ij</sub> is built
            </p>
          </div>
        </button>
        {open && (
          <div className="mt-3 border-t border-border/70 pt-3">
            <MathBody dense />
          </div>
        )}
      </section>
    );
  }

  return (
    <section className="rounded-xl border border-accent/35 bg-gradient-to-b from-accent/10 to-panel p-3 sm:p-5">
      <header className="mb-3 sm:mb-4">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-accent sm:text-xl">
          <FunctionSquare className="h-5 w-5" />
          Technical method (SUPT)
        </h2>
        <p className="mt-1 text-xs text-muted sm:text-sm">
          Optional deep dive — the live spacing operator behind Rhythm and Solar timing reads. Probe
          by <XPerson profile="sheppard" /> · α = {SUPT_ALPHA} · seed {SUPT_SEED} (do not retune).
          Everyday UI uses plain “timing / spacing” language first.
        </p>
      </header>
      <MathBody />
    </section>
  );
}

function MathBody({ dense = false }: { dense?: boolean }) {
  const gap = dense ? "space-y-3" : "space-y-4";
  return (
    <div className={gap}>
      <Block title="1. Theory (Sheppard’s Equation)">
        <p className="text-[0.78rem] leading-relaxed text-muted sm:text-sm">
          Observables are treated as resonance-collapsed <strong className="text-fg">proxies</strong>{" "}
          of a source field — not the field itself:
        </p>
        <Formula>
          ψ<sub>i</sub>(Δt, Δφ, Δx) = ∇Φ ∘ R<sup>−1</sup>(𝒫)
        </Formula>
        <p className="text-[0.72rem] leading-relaxed text-dim">
          ψ<sub>i</sub> = observed proxy · Δt,Δφ,Δx = mismeasurement · ∇Φ = source potential
          gradient · R<sup>−1</sup> = inverse resonance collapse on measured parameters 𝒫.
        </p>
      </Block>

      <Block title="2. Input sequence">
        <p className="text-[0.78rem] leading-relaxed text-muted sm:text-sm">
          Any ordered positive series with n ≥ 4 finite values — e.g. quake inter-event gaps,
          flare/CME/X-ray-peak gaps. Order is load-bearing.
        </p>
        <Formula>x₀ = (x₁, …, xₙ), n ≥ 4</Formula>
      </Block>

      <Block title="3. Robust standardize">
        <Formula>
          med = median(x₀) · MAD = median(|x₀ − med|)
          <br />
          x = (x₀ − med) / (MAD + ε) · ε = 10<sup>−12</sup>
        </Formula>
        <p className="text-[0.72rem] text-dim">
          Scale-free, heavy-tail robust. Even-n median averages the two central values (port lock).
        </p>
      </Block>

      <Block title="4. Path → phase → EMA">
        <Formula>
          φ = cumsum(x) · g = diff(φ) · g̃ = g / mean(|g|)
          <br />
          uₖ = cos(2π g̃ₖ)
          <br />
          C₀ = u₀ · Cₖ = α uₖ + (1 − α) Cₖ₋₁ · α = {SUPT_ALPHA}
        </Formula>
        <p className="text-[0.72rem] leading-relaxed text-dim">
          Normalized steps map onto a circle; a long-memory EMA (α = 0.01) accumulates phase
          coherence. Ordered structure keeps |C| larger; shuffle wanders.
        </p>
      </Block>

      <Block title="5. Scalar address dᵢⱼ">
        <Formula>
          T = max(50, ⌊0.2 |C|⌋) · μ_|C| = mean(|C| over last T)
          <br />
          <strong className="text-gold">dᵢⱼ = −log(μ_|C| + ε)</strong>
        </Formula>
        <p className="text-[0.72rem] text-dim">
          Tail uses Math.floor, never round. Large late |C| → small d (coherence). Small |C| → large
          d (vacuum).
        </p>
      </Block>

      <Block title="6. Bands & corpus anchors">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[16rem] text-left text-[0.72rem] sm:text-xs">
            <thead>
              <tr className="border-b border-border text-dim">
                <th className="py-1.5 pr-2 font-medium">Band</th>
                <th className="py-1.5 pr-2 font-medium">dᵢⱼ</th>
                <th className="py-1.5 font-medium">Reading</th>
              </tr>
            </thead>
            <tbody className="text-muted">
              <tr className="border-b border-border/50">
                <td className="py-1.5 pr-2 text-fg">COHERENCE</td>
                <td className="py-1.5 pr-2 font-mono">{`d < 1`}</td>
                <td className="py-1.5">More ordered than chance</td>
              </tr>
              <tr className="border-b border-border/50">
                <td className="py-1.5 pr-2 text-fg">CLUTCH</td>
                <td className="py-1.5 pr-2 font-mono">{`1 ≤ d < 2`}</td>
                <td className="py-1.5">Transitional (cusp ~1.88–1.96)</td>
              </tr>
              <tr className="border-b border-border/50">
                <td className="py-1.5 pr-2 text-fg">SUB-FLOOR</td>
                <td className="py-1.5 pr-2 font-mono">
                  {`2 ≤ d < ${SUPT_ANCHORS.zetaFloor}`}
                </td>
                <td className="py-1.5">Weak structure</td>
              </tr>
              <tr>
                <td className="py-1.5 pr-2 text-fg">VACUUM</td>
                <td className="py-1.5 pr-2 font-mono">{`d ≥ ${SUPT_ANCHORS.zetaFloor}`}</td>
                <td className="py-1.5">ζ floor / sparse</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-[0.72rem] text-dim">
          <strong className="text-fg">Corpus anchors (context only — never fitted live)</strong>
          : ribosome ≈ {SUPT_ANCHORS.ribosome} · tokamak ≈ {SUPT_ANCHORS.tokamak} · CLASH ≈{" "}
          {SUPT_ANCHORS.clash} · ζ floor = {SUPT_ANCHORS.zetaFloor}. Same number line across domains;
          a live d is not scored against these anchors as targets.
        </p>
      </Block>

      <Block title="7. Shuffle null method">
        <p className="text-[0.78rem] leading-relaxed text-muted sm:text-sm">
          A number alone means nothing. Every score ships with a shuffle null: same gaps, random
          order, fixed seed, Fisher–Yates. The Layer asks:{" "}
          <strong className="text-fg">is this address far from a shuffle of itself?</strong>
        </p>
        <Formula>
          d⁽ˢ⁾ = probe(shuffleₛ(x₀)) · z = (dᵢⱼ − d̄_null) / (σ_null + ε)
          <br />
          separated ⇔ |z| ≥ 3 · seed = {SUPT_SEED} · mulberry32 + Fisher–Yates
        </Formula>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[16rem] text-left text-[0.72rem] sm:text-xs">
            <thead>
              <tr className="border-b border-border text-dim">
                <th className="py-1.5 pr-2 font-medium">Outcome</th>
                <th className="py-1.5 font-medium">Reading</th>
              </tr>
            </thead>
            <tbody className="text-muted">
              <tr className="border-b border-border/50">
                <td className="py-1.5 pr-2 font-medium text-fg">Not separated</td>
                <td className="py-1.5">
                  Null. Timing looks like a random reordering of the same gaps. Valid and
                  informative — displayed, never hidden.
                </td>
              </tr>
              <tr className="border-b border-border/50">
                <td className="py-1.5 pr-2 font-medium text-fg">Separated, low d</td>
                <td className="py-1.5">Ordered structure beyond shuffle (timing only).</td>
              </tr>
              <tr className="border-b border-border/50">
                <td className="py-1.5 pr-2 font-medium text-fg">Separated, cusp</td>
                <td className="py-1.5">
                  Landing in 1.88–1.96 alone is not evidence — heavy-tailed noise reaches it ~12% of
                  the time. Check the tails.
                </td>
              </tr>
              <tr>
                <td className="py-1.5 pr-2 font-medium text-fg">Short window</td>
                <td className="py-1.5">
                  {"N < 50: tail can span most of the accumulator. Regime-valid; Layer flags lower precision."}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-[0.72rem] font-medium text-fg">Fisher–Yates implementation</p>
        <Formula>
          for i = n−1 … 1: j = ⌊U·(i+1)⌋ · swap(aᵢ, aⱼ)
          <br />
          U ← mulberry32(seed={SUPT_SEED}) · copy first (never mutates input)
        </Formula>
        <ul className="list-disc space-y-0.5 pl-4 text-[0.68rem] text-dim">
          <li>
            <strong className="text-muted">Same multiset</strong> — only order is destroyed. Null asks
            whether order carried structure, not whether the gap sizes themselves are unusual.
          </li>
          <li>
            <strong className="text-muted">Reproducible</strong> — fixed seed → same null cloud every
            refresh for the same window multiset (plus floating noise only from n-shuffle count).
          </li>
          <li>
            <strong className="text-muted">Uniform j</strong> — j ∈ {"{0…i}"} so every permutation is
            equally likely (Durstenfeld form).
          </li>
        </ul>
      </Block>

      <Block title="8. ETAS aftershock whitening (control)">
        <p className="text-[0.78rem] leading-relaxed text-muted sm:text-sm">
          Objection: seismic structure is “just aftershocks.” Control: temporal ETAS-style intensity
          with Omori–Utsu kernel → compensator residual times →{" "}
          <em>identical</em> frozen probe on whitened gaps.
        </p>
        <Formula>
          λ(t) = μ + Σ<sub>{"tᵢ < t"}</sub> K exp(αₑ(mᵢ−m₀)) (t − tᵢ + c)<sup>−p</sup>
          <br />
          τₖ = ∫₀<sup>tₖ</sup> λ · residual gaps Δτ → probe(Δτ)
        </Formula>
        <ul className="mt-1 list-disc space-y-1 pl-4 text-[0.72rem] text-muted">
          <li>
            <strong className="text-fg">Survives whitening</strong> — not fully explained by
            background + Omori triggering (temporal only).
          </li>
          <li>
            <strong className="text-fg">Vanishes</strong> — raw dᵢⱼ was reading clustering ETAS
            already describes. Still a useful fast proxy.
          </li>
          <li>
            <strong className="text-fg">Both null</strong> — no timing structure either way.
            First-class result.
          </li>
          <li>
            <strong className="text-fg">Insufficient</strong> — fourth verdict / data guard: too
            few events, residual probe null, numerical residual health fail, or suspicious
            structure-only-after-whitening. Never promoted to Survives. (Lite control is fixed
            Omori params, not L-BFGS-B; bound-pin of a full MLE is out of scope here and would
            also route to Insufficient.)
          </li>
        </ul>
        <p className="mt-2 text-[0.72rem] font-medium text-fg">Omori–Utsu control parameters</p>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[18rem] text-left text-[0.68rem] sm:text-[0.72rem]">
            <thead>
              <tr className="border-b border-border text-dim">
                <th className="py-1 pr-2 font-medium">Param</th>
                <th className="py-1 pr-2 font-medium">Value</th>
                <th className="py-1 font-medium">Role</th>
              </tr>
            </thead>
            <tbody className="text-muted">
              <tr className="border-b border-border/40">
                <td className="py-1 pr-2 font-mono text-fg">c</td>
                <td className="py-1 pr-2 font-mono">{OMORI_CONTROL.cDay} d</td>
                <td className="py-1">Time offset — finite rate at the parent shock (Utsu)</td>
              </tr>
              <tr className="border-b border-border/40">
                <td className="py-1 pr-2 font-mono text-fg">p</td>
                <td className="py-1 pr-2 font-mono">{OMORI_CONTROL.p}</td>
                <td className="py-1">Power-law decay of aftershock rate</td>
              </tr>
              <tr className="border-b border-border/40">
                <td className="py-1 pr-2 font-mono text-fg">K</td>
                <td className="py-1 pr-2 font-mono">{OMORI_CONTROL.K}</td>
                <td className="py-1">Productivity scale per trigger</td>
              </tr>
              <tr className="border-b border-border/40">
                <td className="py-1 pr-2 font-mono text-fg">αₑ</td>
                <td className="py-1 pr-2 font-mono">{OMORI_CONTROL.alphaE}</td>
                <td className="py-1">Larger parents spawn more children</td>
              </tr>
              <tr>
                <td className="py-1 pr-2 font-mono text-fg">μ</td>
                <td className="py-1 pr-2 font-mono">
                  {OMORI_CONTROL.muFraction}×n/T
                </td>
                <td className="py-1">Background rate from the window (data-driven)</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="mt-1.5 text-[0.65rem] text-dim">
          Ballpark regional-ETAS values (c ~ 0.01–0.05 d, p ~ 1.0–1.3). Not fitted live — retuning
          would change the control, not the frozen SUPT probe.
        </p>

        <p className="mt-3 text-[0.72rem] font-medium text-fg">Raw d vs whitened d</p>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[18rem] text-left text-[0.68rem] sm:text-[0.72rem]">
            <thead>
              <tr className="border-b border-border text-dim">
                <th className="py-1 pr-2 font-medium">Quantity</th>
                <th className="py-1 font-medium">What it is</th>
              </tr>
            </thead>
            <tbody className="text-muted">
              <tr className="border-b border-border/40">
                <td className="py-1.5 pr-2 font-medium text-fg">Raw dᵢⱼ</td>
                <td className="py-1.5">
                  Frozen probe on <strong className="text-fg">observed</strong> inter-event gaps.
                  Live headline / continuum / Today bar. Includes aftershock clustering if present.
                </td>
              </tr>
              <tr className="border-b border-border/40">
                <td className="py-1.5 pr-2 font-medium text-fg">Whitened dᵢⱼ</td>
                <td className="py-1.5">
                  Same probe on <strong className="text-fg">compensator residual</strong> gaps Δτ
                  after removing a temporal ETAS/Omori intensity. Diagnostic only.
                </td>
              </tr>
              <tr>
                <td className="py-1.5 pr-2 font-medium text-fg">How to read both</td>
                <td className="py-1.5">
                  Raw sep + white sep → structure beyond Omori-like clustering. Raw sep + white null
                  → raw was mostly aftershock cadence. Both null → no timing order either way.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="mt-1.5 text-[0.65rem] text-dim">
          Live Rhythm default = <strong className="text-fg">raw</strong>. Whitened never replaces
          raw in alerts or the hero card. Spatial clustering is out of scope.
        </p>
      </Block>

      <Block title="9. UI implementation (frozen TypeScript)">
        <p className="mb-2 text-[0.78rem] leading-relaxed text-muted sm:text-sm">
          Exact operator used by Rhythm, Solar Interpreter, continuum, and Charts — path{" "}
          <code className="text-primary">src/lib/supt/probe.ts</code> · whitening control{" "}
          <code className="text-primary">src/lib/supt/etasWhiten.ts</code>.
        </p>
        <CodeSnippet code={PROBE_SNIPPET} />
      </Block>

      <div className="rounded-lg border border-border/80 bg-bg/50 px-3 py-2.5 text-[0.68rem] leading-relaxed text-dim">
        <p className="mb-1.5 font-semibold text-fg">Bottom line — what this is not</p>
        <ul className="list-disc space-y-0.5 pl-4">
          <li>Not a magnitude, CME-arrival, or Kp forecast.</li>
          <li>Not a language model — deterministic function of the window numbers.</li>
          <li>Not tunable — α, seed, tail rule, and band edges are frozen (do not retune).</li>
          <li>
            Not a claim that dᵢⱼ is ψᵢ — it is a fixed proxy <em>address</em> on the corpus axis.
          </li>
        </ul>
        <p className="mt-2">
          Timing and amplitude are separate stacks. Same operator on seismic gaps and solar catalog
          gaps; M and R/S/G never fold into dᵢⱼ. Null is displayed, not buried. Anchors are
          context-only, never fitted live.{" "}
          <strong className="text-fg">{SUPT_COPYRIGHT.notice}</strong>.
        </p>
      </div>
    </div>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="mb-1.5 text-[0.7rem] font-semibold uppercase tracking-wider text-primary">
        {title}
      </h3>
      {children}
    </div>
  );
}

function Formula({ children }: { children: React.ReactNode }) {
  return (
    <div className="my-2 overflow-x-auto rounded-md border border-border bg-bg/60 px-3 py-2.5 font-mono text-[0.72rem] leading-relaxed text-primary sm:text-[0.78rem]">
      {children}
    </div>
  );
}

function CodeSnippet({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="relative overflow-hidden rounded-lg border border-border bg-[#0a0c10]">
      <div className="flex items-center justify-between gap-2 border-b border-border/80 px-2.5 py-1.5">
        <span className="truncate font-mono text-[0.62rem] text-dim">
          probe.ts · α = {SUPT_ALPHA} · frozen
        </span>
        <button
          type="button"
          onClick={() => void copy()}
          className="inline-flex min-h-9 shrink-0 items-center gap-1 rounded-md border border-border bg-panel px-2.5 text-[0.65rem] font-medium text-fg hover:bg-elevated"
        >
          {copied ? (
            <>
              <Check className="h-3.5 w-3.5 text-ok" />
              Copied
            </>
          ) : (
            <>
              <Copy className="h-3.5 w-3.5" />
              Copy
            </>
          )}
        </button>
      </div>
      <pre className="scroll-thin max-h-72 overflow-auto p-3 text-[0.65rem] leading-relaxed text-muted sm:max-h-80 sm:text-[0.7rem]">
        <code className="font-mono text-[0.65rem] text-[#c8d0e0] sm:text-[0.7rem]">{code}</code>
      </pre>
    </div>
  );
}
