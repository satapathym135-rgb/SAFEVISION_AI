import { useEffect, useState, type ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Severity } from "./data";

export function Panel({ title, action, children, className }: { title?: string; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cn("glass rounded-xl p-5 animate-fade-up", className)}>
      {title && (
        <header className="mb-4 flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">{title}</h3>
          {action}
        </header>
      )}
      {children}
    </section>
  );
}

export function Counter({ value, decimals = 0, suffix = "" }: { value: number; decimals?: number | undefined; suffix?: string | undefined }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    let raf = 0;
    const start = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / 1100);
      setN(value * (1 - Math.pow(1 - p, 3)));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  return <>{n.toFixed(decimals)}{suffix}</>;
}

const tones = {
  primary: "text-primary bg-primary/10",
  success: "text-success bg-success/10",
  warning: "text-warning bg-warning/10",
  danger: "text-destructive bg-destructive/10",
  info: "text-info bg-info/10",
};
export type Tone = keyof typeof tones;

export function Kpi({ label, value, suffix, decimals, icon: Icon, tone = "primary", delta }: { label: string; value: number; suffix?: string; decimals?: number; icon: LucideIcon; tone?: Tone; delta?: string }) {
  return (
    <div className="glass group rounded-xl p-5 transition-all hover:-translate-y-0.5 hover:glow-primary animate-fade-up">
      <div className="flex items-start justify-between">
        <p className="text-xs uppercase tracking-widest text-muted-foreground">{label}</p>
        <span className={cn("grid h-9 w-9 place-items-center rounded-lg", tones[tone])}><Icon className="h-4 w-4" /></span>
      </div>
      <p className="mt-3 font-display text-3xl font-semibold"><Counter value={value} suffix={suffix} decimals={decimals} /></p>
      {delta && <p className="mt-1 font-mono text-xs text-muted-foreground">{delta}</p>}
    </div>
  );
}

export function StatusDot({ tone = "success" }: { tone?: "success" | "danger" | "warning" }) {
  const c = { success: "bg-success text-success/60", danger: "bg-destructive text-destructive/60", warning: "bg-warning text-warning/60" }[tone];
  return <span className={cn("inline-block h-2 w-2 rounded-full pulse-dot", c)} />;
}

export function SeverityBadge({ s }: { s: Severity }) {
  const c = { critical: "bg-destructive/15 text-destructive border-destructive/40", high: "bg-warning/15 text-warning border-warning/40", medium: "bg-info/15 text-info border-info/40", low: "bg-muted text-muted-foreground border-border" }[s];
  return <span className={cn("rounded border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider", c)}>{s}</span>;
}

export function Bar({ value, tone = "primary" }: { value: number; tone?: "primary" | "success" | "warning" | "danger" }) {
  const c = { primary: "bg-primary", success: "bg-success", warning: "bg-warning", danger: "bg-destructive" }[tone];
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
      <div className={cn("h-full rounded-full transition-all duration-1000", c)} style={{ width: `${value}%` }} />
    </div>
  );
}

export function PageHeader({ title, subtitle, children }: { title: string; subtitle: string; children?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold md:text-3xl">{title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
      </div>
      {children}
    </div>
  );
}

export const chartTooltip = {
  contentStyle: { background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 },
  labelStyle: { color: "var(--muted-foreground)" },
};
export const axis = { stroke: "var(--muted-foreground)", fontSize: 11, tickLine: false, axisLine: false };
