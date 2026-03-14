"use client";

import { useState } from "react";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface ActionButtonProps {
  label: string;
  loadingLabel: string;
  icon: LucideIcon;
  endpoint: string;
  method?: "POST" | "GET";
  onComplete?: () => void;
  variant?: "primary" | "secondary" | "danger";
  size?: "sm" | "md";
}

const variants = {
  primary: "bg-accent text-white hover:bg-accent/90 shadow-[0_0_20px_rgba(59,130,246,0.25)]",
  secondary: "bg-foreground/5 text-foreground border border-card-border hover:bg-foreground/10",
  danger: "bg-critical/15 text-critical border border-critical/30 hover:bg-critical/25",
};

export function ActionButton({
  label,
  loadingLabel,
  icon: Icon,
  endpoint,
  method = "POST",
  onComplete,
  variant = "primary",
  size = "md",
}: ActionButtonProps) {
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [log, setLog] = useState("");

  const run = async () => {
    setStatus("loading");
    setLog("");
    try {
      const res = await fetch(endpoint, { method });
      const data = await res.json();
      if (data.success) {
        setLog(data.log || "Completed successfully.");
        setStatus("done");
        onComplete?.();
        setTimeout(() => setStatus("idle"), 3000);
      } else {
        setLog(data.error || "Failed.");
        setStatus("error");
        setTimeout(() => setStatus("idle"), 5000);
      }
    } catch (err) {
      setLog(`${err}`);
      setStatus("error");
      setTimeout(() => setStatus("idle"), 5000);
    }
  };

  const padding = size === "sm" ? "px-3 py-1.5 text-xs" : "px-4 py-2.5 text-sm";

  return (
    <div>
      <button
        onClick={run}
        disabled={status === "loading"}
        className={`inline-flex items-center gap-2 rounded-xl font-semibold transition-all duration-300 ${padding} ${
          status === "loading"
            ? "bg-accent/20 text-accent cursor-wait"
            : status === "done"
            ? "bg-low/20 text-low"
            : status === "error"
            ? "bg-critical/20 text-critical"
            : variants[variant]
        }`}
      >
        {status === "loading" ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : status === "done" ? (
          <CheckCircle2 className="w-4 h-4" />
        ) : status === "error" ? (
          <XCircle className="w-4 h-4" />
        ) : (
          <Icon className="w-4 h-4" />
        )}
        {status === "loading" ? loadingLabel : status === "done" ? "Done" : status === "error" ? "Failed" : label}
      </button>
      {log && status !== "idle" && (
        <pre className="mt-2 text-xs text-foreground/50 font-mono max-h-32 overflow-y-auto whitespace-pre-wrap">
          {log}
        </pre>
      )}
    </div>
  );
}
