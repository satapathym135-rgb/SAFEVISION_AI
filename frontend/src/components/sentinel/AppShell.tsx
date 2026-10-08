import { useEffect, useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import {
  LayoutDashboard, Video, HardHat, Flame, Users, BellRing, FolderArchive, BarChart3, Bot, Settings,
  ShieldCheck, ChevronsLeft, Bell, Search,X,

} from "lucide-react";
import { cn } from "@/lib/utils";
import { StatusDot } from "./ui";

const nav = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/live", label: "Live Monitoring", icon: Video },
  { to: "/ppe", label: "PPE Compliance", icon: HardHat },
  { to: "/fire", label: "Fire & Smoke", icon: Flame },
  { to: "/workers", label: "Worker Tracking", icon: Users },
  { to: "/alerts", label: "Safety Alerts", icon: BellRing },
  { to: "/evidence", label: "Evidence Center", icon: FolderArchive },
  { to: "/analytics", label: "Analytics", icon: BarChart3 },
  { to: "/assistant", label: "AI Assistant", icon: Bot },
  { to: "/settings", label: "Settings", icon: Settings },
] as const;

function Clock() {
  const [t, setT] = useState<Date | null>(null);
  useEffect(() => {
    setT(new Date());
    const i = setInterval(() => setT(new Date()), 1000);
    return () => clearInterval(i);
  }, []);
  return <span className="font-mono text-sm tabular-nums">{t ? t.toLocaleTimeString([], { hour12: false }) : "--:--:--"}</span>;
}

export function AppShell({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  return (
    <div className="flex min-h-screen">
      <aside className={cn("glass sticky top-0 z-20 flex h-screen shrink-0 flex-col border-r transition-all duration-300", collapsed ? "w-[72px]" : "w-64")}>
        <div className="flex h-16 items-center gap-3 px-4">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary/15 text-primary glow-primary"><ShieldCheck className="h-5 w-5" /></span>
          {!collapsed && (
            <div className="leading-tight">
              <p className="font-display text-lg font-bold tracking-wider">SAFEVISION<span className="text-primary"> AI</span></p>
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Safety Intelligence</p>
            </div>
          )}
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-2">
          {nav.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              activeOptions={{ exact: to === "/" }}
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              activeProps={{ className: "!bg-primary/10 !text-primary glow-primary" }}
              title={label}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {!collapsed && <span className="truncate">{label}</span>}
            </Link>
          ))}
        </nav>
        <button onClick={() => setCollapsed((c) => !c)} className="m-3 flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-xs text-muted-foreground hover:text-foreground">
          <ChevronsLeft className={cn("h-4 w-4 transition-transform", collapsed && "rotate-180")} />
          {!collapsed && "Collapse"}
        </button>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="glass sticky top-0 z-10 flex h-16 items-center gap-4 border-b px-6">
          <div className="hidden items-center gap-2 rounded-lg border bg-background/40 px-3 py-1.5 text-sm text-muted-foreground md:flex md:w-80">
            <Search className="h-4 w-4" /> <input placeholder="Search cameras, workers, incidents…" className="w-full bg-transparent outline-none placeholder:text-muted-foreground" />
          </div>
          <div className="ml-auto flex items-center gap-5">
            <div className="hidden items-center gap-2 rounded-full border border-success/30 bg-success/10 px-3 py-1 text-xs text-success lg:flex">
              <StatusDot /> All systems operational · 5/6 cameras
            </div>
            <Clock />
            <div className="relative">
  <button
    onClick={() => setNotificationsOpen((open) => !open)}
    className="relative text-muted-foreground hover:text-foreground"
    aria-label="Notifications"
  >
    <Bell className="h-5 w-5" />

    <span className="absolute -right-1.5 -top-1.5 grid h-4 w-4 place-items-center rounded-full bg-destructive font-mono text-[9px] text-destructive-foreground">
      7
    </span>
  </button>

  {notificationsOpen && (
    <div className="absolute right-0 top-10 z-50 w-80 rounded-xl border bg-card p-4 shadow-xl">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold">
            Safety Notifications
          </p>
          <p className="text-xs text-muted-foreground">
            Recent safety events
          </p>
        </div>

        <button
          onClick={() => setNotificationsOpen(false)}
          className="text-muted-foreground hover:text-foreground"
          aria-label="Close notifications"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="space-y-2">
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3">
          <p className="text-xs font-semibold text-destructive">
            🔥 Fire / Smoke Alert
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Safety event detected. Immediate inspection required.
          </p>
        </div>

        <div className="rounded-lg border border-warning/30 bg-warning/5 p-3">
          <p className="text-xs font-semibold text-warning">
            ⚠ PPE Violation
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Worker PPE compliance violation detected.
          </p>
        </div>

        <div className="rounded-lg border bg-background/40 p-3">
          <p className="text-xs font-semibold">
            📹 Camera Status
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            One factory camera requires attention.
          </p>
        </div>
      </div>
    </div>
  )}
</div>
            <div className="flex items-center gap-2">
              <span className="grid h-8 w-8 place-items-center rounded-full bg-accent font-display text-xs font-bold text-accent-foreground">SA</span>
              <div className="hidden leading-tight sm:block">
                <p className="text-sm">SAFEVISION ADMIN </p>
                <p className="text-[10px] text-muted-foreground">Safety Officer</p>
              </div>
            </div>
          </div>
        </header>
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
