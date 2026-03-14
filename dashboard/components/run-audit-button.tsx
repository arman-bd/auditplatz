"use client";

import { useState } from "react";
import { Play, Loader2, CheckCircle2 } from "lucide-react";
import { useRouter } from "next/navigation";

export function RunAuditButton() {
  const [status, setStatus] = useState<"idle" | "running" | "done">("idle");
  const [log, setLog] = useState("");
  const router = useRouter();

  const runAudit = async () => {
    setStatus("running");
    setLog("Starting audit pipeline...\n");

    try {
      const res = await fetch("/api/audit", { method: "POST" });
      const data = await res.json();

      if (data.success) {
        setLog(data.log || "Audit completed successfully.");
        setStatus("done");
        setTimeout(() => {
          router.refresh();
        }, 1000);
      } else {
        setLog(`Error: ${data.error}`);
        setStatus("idle");
      }
    } catch (err) {
      setLog(`Failed: ${err}`);
      setStatus("idle");
    }
  };

  return (
    <div>
      <button
        onClick={runAudit}
        disabled={status === "running"}
        className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 ${
          status === "running"
            ? "bg-accent/20 text-accent cursor-wait"
            : status === "done"
            ? "bg-low/20 text-low"
            : "bg-accent text-white hover:bg-accent/90 shadow-[0_0_20px_rgba(59,130,246,0.3)] hover:shadow-[0_0_30px_rgba(59,130,246,0.5)]"
        }`}
      >
        {status === "running" ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : status === "done" ? (
          <CheckCircle2 className="w-4 h-4" />
        ) : (
          <Play className="w-4 h-4" />
        )}
        {status === "running"
          ? "Running Audit..."
          : status === "done"
          ? "Audit Complete"
          : "Run Audit"}
      </button>

      {log && (
        <pre className="mt-4 bg-card border border-card-border rounded-xl p-4 text-xs text-foreground/70 font-mono max-h-48 overflow-y-auto whitespace-pre-wrap">
          {log}
        </pre>
      )}
    </div>
  );
}
