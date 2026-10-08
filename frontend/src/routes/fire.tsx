import { createFileRoute } from "@tanstack/react-router";
import { Flame, Wind, Phone, Siren, DoorOpen } from "lucide-react";
import { Panel, PageHeader, SeverityBadge, StatusDot } from "@/components/sentinel/ui";
import { alerts } from "@/components/sentinel/data";
import { meta } from "@/components/sentinel/meta";

export const Route = createFileRoute("/fire")({
  head: () => meta("Fire & Smoke Detection", "Fire and smoke status, detection timeline, heat map and emergency response controls."),
  component: Fire,
});

const heat = Array.from({ length: 96 }, (_, i) => {
  const x = i % 12, y = Math.floor(i / 12);
  return Math.max(0, 1 - Math.hypot(x - 9, y - 2) / 6);
});

function Fire() {
  const fireAlerts = alerts.filter((a) => a.type.includes("Fire") || a.type.includes("Smoke"));
  return (
    <>
      <PageHeader title="Fire & Smoke Detection" subtitle="Thermal and visual flame/smoke classification" />
      <div className="grid gap-4 md:grid-cols-2">
        <div className="glass rounded-xl border-destructive/40 p-5 animate-fade-up">
          <div className="flex items-center gap-4">
            <span className="grid h-12 w-12 place-items-center rounded-xl bg-destructive/15 text-destructive"><Flame className="h-6 w-6" /></span>
            <div><p className="text-xs uppercase tracking-widest text-muted-foreground">Fire Status</p><p className="flex items-center gap-2 font-display text-2xl font-semibold text-destructive"><StatusDot tone="danger" /> ACTIVE · Boiler Room</p></div>
          </div>
        </div>
        <div className="glass rounded-xl p-5 animate-fade-up">
          <div className="flex items-center gap-4">
            <span className="grid h-12 w-12 place-items-center rounded-xl bg-warning/15 text-warning"><Wind className="h-6 w-6" /></span>
            <div><p className="text-xs uppercase tracking-widest text-muted-foreground">Smoke Status</p><p className="flex items-center gap-2 font-display text-2xl font-semibold text-warning"><StatusDot tone="warning" /> Elevated · 1 zone</p></div>
          </div>
        </div>
      </div>
      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <Panel title="Thermal Heat Map · Plant Layout" className="xl:col-span-2">
          <div className="grid grid-cols-12 gap-1">
            {heat.map((h, i) => <div key={i} className="aspect-square rounded-sm" style={{ background: `color-mix(in oklab, var(--destructive) ${h * 100}%, color-mix(in oklab, var(--primary) 15%, transparent))` }} />)}
          </div>
          <div className="mt-3 flex justify-between font-mono text-[11px] text-muted-foreground"><span>Zone A</span><span>Zone C</span><span>Zone E · 412°C peak</span></div>
        </Panel>
        <Panel title="Emergency Response">
          <div className="space-y-3">
            {[[Siren, "Trigger Plant Alarm", "bg-destructive text-destructive-foreground"], [Phone, "Call Fire Brigade (101)", "bg-warning text-accent-foreground"], [DoorOpen, "Open Evacuation Routes", "bg-secondary text-secondary-foreground"]].map(([Icon, l, c]) => {
              const I = Icon as typeof Siren;
              return <button key={l as string} className={`flex w-full items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition hover:opacity-90 ${c}`}><I className="h-4 w-4" />{l as string}</button>;
            })}
            <p className="pt-2 text-xs text-muted-foreground">Nearest responders: Team Bravo (ETA 2 min). Sprinklers armed in Zone E.</p>
          </div>
        </Panel>
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Panel title="Detection Timeline">
          <ol className="relative space-y-4 border-l pl-5">
            {[["21:48:10", "Thermal anomaly detected · CAM-05"], ["21:52:30", "Smoke classified (conf. 0.91)"], ["21:58:44", "Temperature exceeds threshold"], ["22:04:12", "Open flame confirmed · Critical alert"]].map(([t, e]) => (
              <li key={t}><span className="absolute -left-1.5 mt-1 h-3 w-3 rounded-full bg-destructive" /><p className="font-mono text-xs text-muted-foreground">{t}</p><p className="text-sm">{e}</p></li>
            ))}
          </ol>
        </Panel>
        <Panel title="Alert History">
          <ul className="space-y-3">
            {[...fireAlerts, { id: "AL-1987", type: "Smoke Detected", severity: "medium" as const, time: "Yesterday 14:22", camera: "CAM-02", location: "Welding Bay" }].map((a) => (
              <li key={a.id} className="flex items-center justify-between rounded-lg border bg-background/30 p-3">
                <div><p className="text-sm">{a.type}</p><p className="font-mono text-[11px] text-muted-foreground">{a.time} · {a.location}</p></div>
                <SeverityBadge s={a.severity} />
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </>
  );
}
