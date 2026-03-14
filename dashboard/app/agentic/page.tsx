"use client";

import { useState, useRef, useEffect } from "react";
import {
  Send,
  Loader2,
  Bot,
  User,
  Wrench,
  Database,
  ChevronDown,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import Markdown from "react-markdown";

interface Step {
  role: "user" | "assistant" | "tool_call" | "tool_result";
  content: string;
  toolName?: string;
  timestamp: string;
}

const SUGGESTED_PROMPTS = [
  "Run a full audit and give me an executive summary of all critical findings",
  "Check if there are any ghost employees still being paid after termination",
  "Investigate cash handling across all store locations — are there patterns of theft?",
  "Audit payroll for overtime violations under German labor law (ArbZG)",
  "Are there any contracts that have expired but are still active?",
  "Look into expense report fraud — any self-approved or suspicious submissions?",
];

// Tool names are dynamic (AI-generated query names), so we just format them nicely
function formatToolName(name?: string): string {
  if (!name) return "Query";
  return name.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function ToolIcon({ name }: { name?: string }) {
  if (name === "query_database") return <Database className="w-3.5 h-3.5" />;
  return <Wrench className="w-3.5 h-3.5" />;
}

function ToolCallBlock({ step }: { step: Step }) {
  const [expanded, setExpanded] = useState(false);
  const label = formatToolName(step.toolName);
  const isSQL = step.content.toLowerCase().startsWith("select") || step.content.toLowerCase().startsWith("with");

  return (
    <div className="ml-10">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 text-xs font-medium text-accent/80 hover:text-accent transition px-3 py-1.5 rounded-lg bg-accent/5 border border-accent/10"
      >
        {isSQL ? <Database className="w-3.5 h-3.5" /> : <ToolIcon name={step.toolName} />}
        <span>{label}</span>
        {expanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
      </button>
      {expanded && (
        <pre className="mt-1.5 ml-1 text-xs text-foreground/50 font-mono bg-background rounded-lg p-3 max-h-60 overflow-auto whitespace-pre-wrap border border-card-border">
          {step.content}
        </pre>
      )}
    </div>
  );
}

function ToolResultBlock({ step }: { step: Step }) {
  const [expanded, setExpanded] = useState(false);
  const label = formatToolName(step.toolName);

  // Try to extract a summary line
  let summary = "";
  try {
    const data = JSON.parse(step.content);
    if (data.totalFindings !== undefined) {
      summary = `${data.totalFindings} findings`;
    } else if (data.rowCount !== undefined) {
      summary = `${data.rowCount} rows returned`;
    } else if (data.active_employees !== undefined) {
      summary = `${data.active_employees} active employees`;
    } else if (data.error) {
      summary = `Error: ${data.error}`;
    }
  } catch {}

  return (
    <div className="ml-10">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 text-xs font-medium text-low/80 hover:text-low transition px-3 py-1.5 rounded-lg bg-low/5 border border-low/10"
      >
        <ToolIcon name={step.toolName} />
        <span>{label} result</span>
        {summary && <span className="text-foreground/40">— {summary}</span>}
        {expanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
      </button>
      {expanded && (
        <pre className="mt-1.5 ml-1 text-xs text-foreground/50 font-mono bg-background rounded-lg p-3 max-h-60 overflow-auto whitespace-pre-wrap border border-card-border">
          {step.content}
        </pre>
      )}
    </div>
  );
}

function AssistantMessage({ content }: { content: string }) {
  return (
    <div className="max-w-none text-sm text-foreground/90 leading-relaxed">
      <Markdown
        components={{
          h1: ({ children }) => <h1 className="text-xl font-bold mt-5 mb-3 text-foreground">{children}</h1>,
          h2: ({ children }) => <h2 className="text-lg font-bold mt-4 mb-2 text-foreground">{children}</h2>,
          h3: ({ children }) => <h3 className="text-base font-semibold mt-3 mb-1.5 text-foreground">{children}</h3>,
          h4: ({ children }) => <h4 className="text-sm font-semibold mt-2 mb-1 text-foreground">{children}</h4>,
          p: ({ children }) => <p className="mb-2">{children}</p>,
          strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
          em: ({ children }) => <em className="italic text-foreground/70">{children}</em>,
          ul: ({ children }) => <ul className="ml-4 mb-3 space-y-1">{children}</ul>,
          ol: ({ children }) => <ol className="ml-4 mb-3 space-y-1 list-decimal">{children}</ol>,
          li: ({ children }) => (
            <li className="flex gap-2">
              <span className="text-accent shrink-0 mt-0.5">•</span>
              <span>{children}</span>
            </li>
          ),
          hr: () => <hr className="my-4 border-card-border" />,
          blockquote: ({ children }) => (
            <blockquote className="border-l-2 border-accent/40 pl-3 my-2 text-foreground/60 italic">{children}</blockquote>
          ),
          code: ({ children, className }) => {
            const isBlock = className?.includes("language-");
            if (isBlock) {
              return (
                <pre className="bg-background rounded-lg p-3 my-2 overflow-x-auto border border-card-border">
                  <code className="text-xs font-mono text-foreground/70">{children}</code>
                </pre>
              );
            }
            return <code className="bg-foreground/10 px-1.5 py-0.5 rounded text-xs font-mono text-accent">{children}</code>;
          },
          pre: ({ children }) => <>{children}</>,
          table: ({ children }) => (
            <div className="my-3 overflow-x-auto rounded-lg border border-card-border">
              <table className="w-full text-xs">{children}</table>
            </div>
          ),
          thead: ({ children }) => <thead className="bg-foreground/5 border-b border-card-border">{children}</thead>,
          tbody: ({ children }) => <tbody className="divide-y divide-card-border">{children}</tbody>,
          tr: ({ children }) => <tr className="hover:bg-foreground/[0.02]">{children}</tr>,
          th: ({ children }) => <th className="px-3 py-2 text-left font-semibold text-foreground/80">{children}</th>,
          td: ({ children }) => <td className="px-3 py-2 text-foreground/70">{children}</td>,
          a: ({ href, children }) => (
            <a href={href} className="text-accent hover:underline" target="_blank" rel="noopener noreferrer">{children}</a>
          ),
        }}
      >
        {content}
      </Markdown>
    </div>
  );
}

export default function AgenticAuditPage() {
  const [prompt, setPrompt] = useState("");
  const [steps, setSteps] = useState<Step[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [steps]);

  const runAudit = async (userPrompt: string) => {
    if (!userPrompt.trim() || isRunning) return;

    setIsRunning(true);
    setSteps([]);
    setPrompt("");

    try {
      const res = await fetch("/api/agentic", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: userPrompt }),
      });

      if (!res.ok) {
        setSteps([
          {
            role: "assistant",
            content: `Error: ${res.statusText}`,
            timestamp: new Date().toISOString(),
          },
        ]);
        setIsRunning(false);
        return;
      }

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6).trim();
            if (data === "[DONE]") continue;
            try {
              const step: Step = JSON.parse(data);
              setSteps((prev) => {
                // For streaming assistant messages: replace the last assistant message
                // if this one has the same role (it's a partial update)
                if (step.role === "assistant" && prev.length > 0) {
                  const lastIdx = prev.length - 1;
                  if (prev[lastIdx].role === "assistant" && step.content.startsWith(prev[lastIdx].content.slice(0, 20))) {
                    return [...prev.slice(0, lastIdx), step];
                  }
                }
                return [...prev, step];
              });
            } catch {}
          }
        }
      }
    } catch (err: any) {
      setSteps((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `Connection error: ${err.message}`,
          timestamp: new Date().toISOString(),
        },
      ]);
    }

    setIsRunning(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      runAudit(prompt);
    }
  };

  const hasStarted = steps.length > 0 || isRunning;

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      {/* Header */}
      <div className="shrink-0 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-accent/15">
            <Sparkles className="w-5 h-5 text-accent" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Agentic Audit</h1>
            <p className="text-sm text-muted">
              Tell the AI what to investigate — it will run audits and query the database autonomously
            </p>
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {!hasStarted ? (
          /* Prompt Suggestions */
          <div className="flex flex-col items-center justify-center h-full">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center bg-accent/10 mb-6">
              <Bot className="w-7 h-7 text-accent" />
            </div>
            <h2 className="text-lg font-semibold mb-1">What would you like to audit?</h2>
            <p className="text-sm text-muted mb-8 max-w-md text-center">
              Describe what you want investigated. The AI will decide which audits to run
              and query the database to build an evidence-based report.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-2xl w-full">
              {SUGGESTED_PROMPTS.map((sp) => (
                <button
                  key={sp}
                  onClick={() => runAudit(sp)}
                  className="text-left text-sm px-4 py-3 rounded-xl bg-card border border-card-border hover:border-accent/30 hover:bg-accent/5 transition-all text-foreground/70 hover:text-foreground"
                >
                  {sp}
                </button>
              ))}
            </div>
          </div>
        ) : (
          /* Chat Stream */
          <div className="space-y-4 pb-4">
            {steps.map((step, i) => {
              if (step.role === "user") {
                return (
                  <div key={i} className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-foreground/10 flex items-center justify-center shrink-0 mt-0.5">
                      <User className="w-4 h-4 text-foreground/60" />
                    </div>
                    <div className="text-sm pt-1.5 text-foreground">{step.content}</div>
                  </div>
                );
              }

              if (step.role === "tool_call") {
                return <ToolCallBlock key={i} step={step} />;
              }

              if (step.role === "tool_result") {
                return <ToolResultBlock key={i} step={step} />;
              }

              if (step.role === "assistant" && step.content) {
                return (
                  <div key={i} className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-accent/15 flex items-center justify-center shrink-0 mt-0.5">
                      <Bot className="w-4 h-4 text-accent" />
                    </div>
                    <div className="flex-1 min-w-0 pt-0.5">
                      <AssistantMessage content={step.content} />
                    </div>
                  </div>
                );
              }

              return null;
            })}

            {isRunning && (
              <div className="flex items-center gap-3 ml-10">
                <Loader2 className="w-4 h-4 animate-spin text-accent" />
                <span className="text-sm text-muted">Investigating...</span>
              </div>
            )}

            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {/* Input */}
      <div className="shrink-0 pt-4 border-t border-card-border">
        <div className="flex gap-3 items-end">
          <textarea
            ref={inputRef}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="e.g. Run a full audit and summarize critical risks..."
            rows={1}
            className="flex-1 resize-none bg-card border border-card-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/20 transition"
            disabled={isRunning}
          />
          <button
            onClick={() => runAudit(prompt)}
            disabled={!prompt.trim() || isRunning}
            className="shrink-0 w-11 h-11 rounded-xl bg-accent text-white flex items-center justify-center hover:bg-accent/90 transition disabled:opacity-40 disabled:cursor-not-allowed shadow-[0_0_15px_rgba(59,130,246,0.2)]"
          >
            {isRunning ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </div>
        <p className="text-xs text-muted mt-2 text-center">
          The AI agent will autonomously call audit tools and query the database to investigate your request
        </p>
      </div>
    </div>
  );
}
