import type { ReactNode } from "react";
import { ExternalLink } from "lucide-react";
import { X_PROFILES, type XProfileId, xProfileUrl } from "@/lib/site";

const linkClass =
  "inline-flex items-center gap-0.5 font-semibold text-primary underline decoration-primary/35 underline-offset-2 transition hover:decoration-primary";

function ProfileAvatar({
  profile,
  size = "sm",
}: {
  profile: XProfileId;
  size?: "xs" | "sm" | "md";
}) {
  const p = X_PROFILES[profile];
  const src = p.avatarSrc || p.avatarRemote;
  if (!src) return null;
  const dim =
    size === "xs" ? "h-4 w-4" : size === "md" ? "h-7 w-7" : "h-5 w-5";
  return (
    <img
      src={src}
      alt=""
      width={size === "md" ? 28 : size === "xs" ? 16 : 20}
      height={size === "md" ? 28 : size === "xs" ? 16 : 20}
      className={`${dim} shrink-0 rounded-full object-cover ring-1 ring-border`}
      loading="lazy"
      decoding="async"
    />
  );
}

/** Clickable @handle → opens X profile in a new tab. */
export function XHandle({
  profile,
  handle,
  showAt = true,
  className = "",
  withAvatar = false,
}: {
  /** Known credited profile */
  profile?: XProfileId;
  /** Raw handle if not using a known profile */
  handle?: string;
  showAt?: boolean;
  className?: string;
  /** Show circular avatar when profile has one (SunWolf X pic). */
  withAvatar?: boolean;
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
      className={`${linkClass} ${withAvatar ? "gap-1.5 no-underline hover:underline" : ""} ${className}`}
      title={`Open @${h} on X`}
    >
      {withAvatar && profile ? <ProfileAvatar profile={profile} size="xs" /> : null}
      {showAt ? `@${h}` : h}
    </a>
  );
}

/** Name + optional @handle, both linked to X. */
export function XPerson({
  profile,
  children,
  className = "",
  withAvatar = true,
}: {
  profile: XProfileId;
  children?: ReactNode;
  className?: string;
  /** Default true for SunWolf ID — shows X profile pic when available. */
  withAvatar?: boolean;
}) {
  const p = X_PROFILES[profile];
  const hasAvatar = Boolean(p.avatarSrc || p.avatarRemote);
  return (
    <span className={`inline-flex flex-wrap items-center gap-x-1 ${className}`}>
      <a
        href={p.url}
        target="_blank"
        rel="noopener noreferrer"
        className={`${linkClass} ${hasAvatar && withAvatar ? "gap-1.5 no-underline hover:underline" : ""}`}
        title={`Open @${p.handle} on X`}
      >
        {withAvatar && hasAvatar ? <ProfileAvatar profile={profile} size="sm" /> : null}
        {children ?? p.name}
      </a>{" "}
      <XHandle profile={profile} className="font-medium" />
    </span>
  );
}

/** Compact chip row for Credits / About — avatars when granted. */
export function XProfileChips({
  profiles = ["sunwolf", "sheppard"] as XProfileId[],
}: {
  profiles?: XProfileId[];
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {profiles.map((id) => {
        const p = X_PROFILES[id];
        const hasAvatar = Boolean(p.avatarSrc || p.avatarRemote);
        return (
          <a
            key={id}
            href={p.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-md border border-border bg-bg/70 px-2.5 py-1.5 text-[0.68rem] text-fg transition hover:border-primary/40 hover:bg-primary/10"
            title={p.role}
          >
            {hasAvatar ? <ProfileAvatar profile={id} size="md" /> : null}
            <span className="flex min-w-0 flex-col leading-tight">
              <span className="font-semibold">{p.name}</span>
              <span className="font-mono text-primary">@{p.handle}</span>
            </span>
            <ExternalLink className="h-3 w-3 shrink-0 text-dim" />
          </a>
        );
      })}
    </div>
  );
}

export { ProfileAvatar as XProfileAvatar };
