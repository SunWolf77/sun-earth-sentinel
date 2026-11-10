import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, ChevronUp, Check } from "lucide-react";

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
  const [persistedOpen, togglePersisted] = useSectionOpen(storageKey, false);
  const [menuOpen, setMenuOpen] = useState(false);
  const open = dense ? menuOpen : persistedOpen;
  const toggle = dense ? () => setMenuOpen((v) => !v) : togglePersisted;
  const rootRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const [box, setBox] = useState<{ top: number; left: number } | null>(null);
  const current = tabs.find((t) => t.id === value) ?? tabs[0];
  const panelId = `${storageKey}-panel`;

  useEffect(() => {
    if (!dense || !menuOpen) return;
    const place = () => {
      const r = btnRef.current?.getBoundingClientRect();
      if (!r) return;
      setBox({ top: r.bottom + 4, left: r.left });
    };
    place();
    const onPointer = (e: PointerEvent) => {
      const n = e.target as Node;
      if (rootRef.current?.contains(n) || panelRef.current?.contains(n)) return;
      setMenuOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [dense, menuOpen]);

  if (dense) {
    return (
      <div className="relative shrink-0" ref={rootRef}>
        <button
          ref={btnRef}
          type="button"
          className="inline-flex h-8 w-auto shrink-0 items-center gap-1.5 whitespace-nowrap rounded-md border border-border bg-panel px-2.5 text-[0.72rem] font-semibold text-fg shadow-sm"
          aria-expanded={open}
          aria-haspopup="listbox"
          aria-controls={panelId}
          onClick={toggle}
        >
          <span className="whitespace-nowrap text-primary">{current?.label ?? "—"}</span>
          <ChevronDown
            className={`h-3.5 w-3.5 shrink-0 text-muted transition-transform ${open ? "rotate-180" : ""}`}
            aria-hidden
          />
        </button>
        {open &&
          box &&
          createPortal(
            <div
              ref={panelRef}
              id={panelId}
              role="listbox"
              aria-label={label}
              className="fixed z-[5000] min-w-[11.5rem] overflow-hidden rounded-md border border-border bg-bg py-1 shadow-xl"
              style={{ top: box.top, left: box.left }}
            >
              {tabs.map((t) => {
                const on = t.id === value;
                return (
                  <button
                    key={t.id}
                    type="button"
                    role="option"
                    aria-selected={on}
                    title={t.hint}
                    onClick={() => {
                      onChange(t.id);
                      setMenuOpen(false);
                    }}
                    className={`flex w-full items-center justify-between gap-3 whitespace-nowrap px-3 py-1.5 text-left text-[0.75rem] ${
                      on ? "bg-primary/15 font-semibold text-primary" : "text-fg hover:bg-elevated"
                    }`}
                  >
                    <span>{t.label}</span>
                    {on && <Check className="h-3.5 w-3.5 shrink-0" aria-hidden />}
                  </button>
                );
              })}
            </div>,
            document.body,
          )}
      </div>
    );
  }

  return (
    <div className={dense ? "relative shrink-0" : "min-w-0 rounded-lg border border-border bg-panel/90"}>
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
          className={
            dense
              ? "absolute left-0 top-full z-[70] mt-1 flex min-w-[9.5rem] flex-col gap-0.5 rounded-lg border border-border bg-bg/95 p-1 shadow-lg"
              : "flex flex-wrap gap-1 border-t border-border/70 p-1"
          }
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
                onClick={() => {
                  onChange(t.id);
                  if (dense) toggle();
                }}
                className={`min-h-8 rounded-md px-2.5 text-left text-[0.72rem] font-semibold ${
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
