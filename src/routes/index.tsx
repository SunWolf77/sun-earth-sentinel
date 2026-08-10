import { createFileRoute } from "@tanstack/react-router";

/** Temporary stub — full ObservatoryApp restore in next commit. */
export const Route = createFileRoute("/")({
  component: RestoreStub,
});

function RestoreStub() {
  return (
    <div
      style={{
        minHeight: "100vh",
        margin: 0,
        padding: "1.5rem",
        fontFamily: "system-ui, sans-serif",
        background: "#050a14",
        color: "#e2e8f0",
      }}
    >
      <h1 style={{ color: "#22d3ee", fontSize: "1.1rem" }}>Sun-Earth Sentinel</h1>
      <p style={{ color: "#94a3b8", maxWidth: "28rem", lineHeight: 1.5 }}>
        Route file was briefly corrupted during an automated patch push. Full map
        restore is in progress — this stub keeps the deploy from hard-crashing.
      </p>
      <p style={{ color: "#64748b", fontSize: "0.85rem" }}>
        Safe restore point: commit <code>61aa19b</code>
      </p>
    </div>
  );
}
