import type { ReactNode } from "react";
import { ExternalLink } from "lucide-react";
import { X_PROFILES, type XProfileId, xProfileUrl } from "@/lib/site";

const linkClass =
  "inline-flex items-center gap-0.5 font-semibold text-primary underline decoration-primary/35 underline-offset-2 transition hover:decoration-primary";

/** Clickable @handle → opens X profile in a new tab. */
export function XHandle({
  profile,
  handle,
  showAt = true,
  className = "",
}: {
  /** Known credited profile */
  profile?: XProfileId;
  /** Raw handle if not using a known profile */
  handle?: string;
  showAt?: boolean;
  className?: string;
}) {
  const known = profile ? X_PROFILES[profile] : null;
  const h = (known?.handle || handle || "").replace(/^@/, "");
  if (!h) return null;
  const href = known?.url || xProfileUrl(h);
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`${linkClass} ${className}`}
      title={`Open @${h} on X`}
    >
      {showAt ? `@${h}` : h}
    </a>
  );
}

/** Name + optional @handle, both linked to X. */
export function XPerson({
  profile,
  children,
  className = "",
}: {
  profile: XProfileId;
  children?: ReactNode;
  className?: string;
}) {
  const p = X_PROFILES[profile];
  return (
    <span className={className}>
      <a
        href={p.url}
        target="_blank"
        rel="noopener noreferrer"
        className={linkClass}
        title={`Open @${p.handle} on X`}
      >
        {children ?? p.name}
      </a>{" "}
      <XHandle profile={profile} className="font-medium" />
    </span>
  );
}

/** Compact chip row for Credits / About. */
export function XProfileChips({
  profiles = ["sunwolf", "sheppard"] as XProfileId[],
}: {
  profiles?: XProfileId[];
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {profiles.map((id) => {
        const p = X_PROFILES[id];
        return (
          <a
            key={id}
            href={p.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-md border border-border bg-bg/70 px-2.5 py-1.5 text-[0.68rem] text-fg transition hover:border-primary/40 hover:bg-primary/10"
            title={p.role}
          >
            <span className="font-semibold">{p.name}</span>
            <span className="font-mono text-primary">@{p.handle}</span>
            <ExternalLink className="h-3 w-3 shrink-0 text-dim" />
          </a>
        );
      })}
    </div>
  );
}
