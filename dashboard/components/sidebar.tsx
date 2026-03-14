"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  AlertTriangle,
  FileText,
  Bot,
  Building2,
  ScanSearch,
  Sparkles,
} from "lucide-react";
import { ThemeToggle } from "./theme-toggle";

const navItems = [
  { href: "/", label: "Overview", icon: LayoutDashboard },
  { href: "/audits", label: "Run Audits", icon: ScanSearch },
  { href: "/findings", label: "Findings", icon: AlertTriangle },
  { href: "/report", label: "AI Report", icon: FileText },
  { href: "/agentic", label: "Agentic Audit", icon: Sparkles },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 shrink-0 border-r border-card-border bg-card flex flex-col">
      {/* Logo */}
      <div className="px-6 pt-5 pb-4 border-b border-card-border space-y-4">
        <Link href="/" className="block">
          <span className="text-lg font-extrabold tracking-tight">
            Audit<span style={{ color: "#5ba096" }}>Platz</span>
          </span>
        </Link>
        <div className="flex items-center gap-2.5">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
            style={{ backgroundColor: "#5ba096" }}
          >
            <Bot className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="text-xs font-semibold text-foreground/70 tracking-wide uppercase">
            M&H Wearables
          </span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                isActive
                  ? "bg-accent/15 text-accent shadow-[0_0_20px_rgba(59,130,246,0.1)]"
                  : "text-muted hover:text-foreground hover:bg-foreground/5"
              }`}
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-card-border space-y-1">
        <ThemeToggle />
        <div className="flex items-center gap-2 px-3 py-2 text-xs text-muted">
          <Building2 className="w-3.5 h-3.5" />
          <span>M&H Wearables GmbH</span>
        </div>
      </div>
    </aside>
  );
}
