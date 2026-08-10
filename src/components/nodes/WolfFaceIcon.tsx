/**
 * WolfWatch brand mark — geometric wolf face.
 * Monoline gold lockup; replaces the generic network-nodes glyph.
 * Tuned for ~14–20px header / sidebar use.
 */

type Props = {
  className?: string;
  title?: string;
};

/**
 * Angular wolf head: ears · brow · snout · eyes.
 * Single stroke language matches the old network mark weight.
 */
export function WolfFaceIcon({ className = "h-4 w-4", title }: Props) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden={title ? undefined : true}
      role={title ? "img" : "presentation"}
    >
      {title ? <title>{title}</title> : null}
      {/* Left ear */}
      <path
        d="M5 10.5 7.2 3.5 10.5 8.2"
        stroke="currentColor"
        strokeWidth="1.55"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {/* Right ear */}
      <path
        d="M19 10.5 16.8 3.5 13.5 8.2"
        stroke="currentColor"
        strokeWidth="1.55"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {/* Head / cheek hex */}
      <path
        d="M5 10.5 4.2 14.2 7.5 19.5h9l3.3-5.3L19 10.5 16 8.8 12 7.6 8 8.8 5 10.5Z"
        stroke="currentColor"
        strokeWidth="1.55"
        strokeLinejoin="round"
      />
      {/* Brow line */}
      <path
        d="M8.2 11.2h7.6"
        stroke="currentColor"
        strokeWidth="1.35"
        strokeLinecap="round"
      />
      {/* Eyes */}
      <circle cx="9.4" cy="13.15" r="1.05" fill="currentColor" />
      <circle cx="14.6" cy="13.15" r="1.05" fill="currentColor" />
      {/* Snout wedge */}
      <path
        d="M10.2 15.1 12 17.6 13.8 15.1"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {/* Nose tip */}
      <circle cx="12" cy="18.35" r="0.85" fill="currentColor" />
    </svg>
  );
}

/** Filled solid mark for dark panels / larger lockups. */
export function WolfFaceMark({ className = "h-4 w-4", title }: Props) {
  return (
    <svg
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden={title ? undefined : true}
      role={title ? "img" : "presentation"}
    >
      {title ? <title>{title}</title> : null}
      <path
        fill="currentColor"
        d="M7.15 3.2 4.6 10.1 3.7 14l3.5 5.6h9.6l3.5-5.6-.9-3.9-2.55-6.9-3.5 5.1h-.9l.2-1.6L12 6.8l-1.85 1.7.2 1.6h-.9L7.15 3.2Z"
      />
      {/* Face recess */}
      <path
        fill="var(--color-bg, #070b12)"
        d="M7.6 11.1h8.8l1.1 2.2-2.6 4.2H9.1l-2.6-4.2 1.1-2.2Z"
      />
      <circle cx="9.5" cy="13.2" r="1.1" fill="currentColor" />
      <circle cx="14.5" cy="13.2" r="1.1" fill="currentColor" />
      <path
        fill="currentColor"
        d="M10.4 15.2 12 17.4 13.6 15.2 12 16.05 10.4 15.2Z"
      />
      <circle cx="12" cy="18.2" r="0.9" fill="currentColor" />
    </svg>
  );
}
