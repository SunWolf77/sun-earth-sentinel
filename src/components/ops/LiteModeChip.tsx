import { Gauge } from "lucide-react";
import { useObservatory } from "@/store/observatory";

/** Discoverability: Lite hides catalogs/imagery — offer one-tap upgrade. */
export function LiteModeChip({ className = "" }: { className?: string }) {
  const mode = useObservatory((s) => s.mode);
  const setMode = useObservatory((s) => s.setMode);
  if (mode !== "lite") return null;

  return (
    <div
      className={`flex flex-wrap items-center gap-2 rounded-lg border border-primary/30 bg-primary/10 px-2.5 py-1.5 text-[0.7rem] text-fg ${className}`}
      role="status"
    >
      <Gauge className="h-3.5 w-3.5 text-primary" aria-hidden />
      <span className="min-w-0 flex-1">
        <strong className="text-primary">Lite</strong>
        {" — data saver on. Catalogs, SDO movies & heavy charts off."}
      </span>
      <button
        type="button"
        className="ww-btn min-h-8 px-2 text-[0.62rem]"
        onClick={() => setMode("standard")}
      >
        Standard
      </button>
    </div>
  );
}
