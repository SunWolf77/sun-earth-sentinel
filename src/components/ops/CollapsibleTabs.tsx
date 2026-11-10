import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

export type CollapsibleTab = {
  id: string;
  label: string;
  hint?: string;
};

/** Same open/close on every section strip. Closed until the user asks. */
export function SectionToggle({
  open,
  onClick,
  controls,
  dense = false,
  closedLabel = "Open",
}: {
  open: boolean;
  onClick: () => void;
  controls?: string;
  dense?: boolean;
  closedLabel?: string;
}) {
  return (
    <button
      type="button"
      className={`inline-flex shrink-0 items-center gap-1 rounded-md border border-primary/40 bg-bg font-semibold text-primary ${
        dense ? "min-h-7 px-2 text-[0.62rem]" : "min-h-9 px-2.5 text-[0.68rem]"
      }`}
      aria-expanded={open}
      aria-controls={controls}
      onClick={onClick}
    >
      {open ? <ChevronUp className="h-3.5 w-3.5" aria-hidden /> : <ChevronDown className="h-3.5 w-3.5" aria-hidden />}
      {open ? "Close" : closedLabel}
    </button>
  );
}

export function useSectionOpen(storageKey: string, fallback = false): [boolean, () => void] {
  const [open, setOpen] = useState(() => {
    if (typeof window === "undefined") return fallback;
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw === "1") return true;
      if (raw === "0") return false;
    } catch {
      /* */
    }
    return fallback;
  });
  const toggle = () => {
    setOpen((v) => {
      const next = !v;
      try {
        localStorage.setItem(storageKey, next ? "1" : "0");
      } catch {
        /* */
      }
      return next;
    });
  };
  return [open, toggle];
}

export function CollapsibleTabs({
  label,
  tabs,
  value,
  onChange,
  storageKey,
  dense = false,
}: {
  label: string;
  tabs: CollapsibleTab[];
  value: string;
  onChange: (id: string) => void;
  storageKey: string;
  /** One line, no card. For the header. */
  dense?: boolean;
}) {
  const [open, toggle] = useSectionOpen(storageKey, false);
  const current = tabs.find((t) => t.id === value) ?? tabs[0];
  const panelId = `${storageKey}-panel`;

  return (
    <div className={dense ? "min-w-0" : "min-w-0 rounded-lg border border-border bg-panel/90"}>
      <div className={`flex items-center gap-1.5 ${dense ? "" : "px-2 py-1"}`}>
        <div className="min-w-0">
          <p className={`truncate font-semibold text-fg ${dense ? "text-[0.72rem] leading-none" : "text-[0.72rem]"}`}>
            {!dense && (
              <>
                <span className="font-medium uppercase tracking-wide text-dim">{label}</span>
                <span className="text-dim"> · </span>
              </>
            )}
            <span className="text-primary">{current?.label ?? "—"}</span>
          </p>
          {!dense && current?.hint && (
            <p className="truncate text-[0.6rem] text-dim">{current.hint}</p>
          )}
        </div>
        <SectionToggle open={open} onClick={toggle} controls={panelId} dense={dense} />
      </div>
      {open && (
        <div
          id={panelId}
          role="tablist"
          aria-label={label}
          className={`flex flex-wrap gap-1 ${dense ? "pt-1" : "border-t border-border/70 p-1"}`}
        >
          {tabs.map((t) => {
            const on = t.id === value;
            return (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={on}
                title={t.hint}
                onClick={() => onChange(t.id)}
                className={`min-h-8 rounded-md px-2.5 text-[0.72rem] font-semibold ${
                  on ? "bg-primary/15 text-primary" : "text-muted hover:bg-elevated hover:text-fg"
                }`}
              >
                {t.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
