import { createFileRoute } from "@tanstack/react-router";
import { Users, MapPin, Activity } from "lucide-react";
import { Kpi, Panel, PageHeader, Bar, StatusDot } from "@/components/sentinel/ui";
import { workers, zones } from "@/components/sentinel/data";
import { meta } from "@/components/sentinel/meta";

export const Route = createFileRoute("/workers")({
  head: () => meta("Worker Tracking", "Persistent worker tracking with IDs, last seen, movement timeline and zone occupancy."),
  component: Workers,
});

function Workers() {
  return (
    <>
      <PageHeader title="Worker Tracking" subtitle="Anonymous re-identification across cameras" />
      <div className="grid gap-4 md:grid-cols-3">
        <Kpi label="Total Active Workers" value={124} icon={Users} />
        <Kpi label="Zones Monitored" value={6} icon={MapPin} tone="info" />
        <Kpi label="Avg Safety Score" value={86} icon={Activity} tone="success" />
      </div>
      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <Panel title="Persistent Tracking View" className="xl:col-span-2">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="text-left text-xs uppercase tracking-wider text-muted-foreground"><th className="pb-3">Worker ID</th><th>Zone</th><th>Camera</th><th>Last Seen</th><th>PPE</th><th className="w-32">Score</th></tr></thead>
              <tbody>
                {workers.map((w) => (
                  <tr key={w.id} className="border-t transition hover:bg-secondary/40">
                    <td className="py-3 font-mono text-primary">{w.id}</td><td>{w.zone}</td><td className="font-mono text-xs">{w.camera}</td><td className="font-mono text-xs">{w.lastSeen}</td>
                    <td><span className="flex items-center gap-2"><StatusDot tone={w.compliant ? "success" : "danger"} />{w.compliant ? "OK" : "Violation"}</span></td>
                    <td><div className="flex items-center gap-2"><Bar value={w.score} tone={w.score > 85 ? "success" : "warning"} /><span className="font-mono text-xs">{w.score}</span></div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
        <div className="space-y-6">
          <Panel title="Zone Occupancy">
            <div className="space-y-4">
              {zones.map((z) => {
                const p = Math.round((z.occupancy / z.capacity) * 100);
                return <div key={z.zone}><div className="mb-1 flex justify-between text-sm"><span>{z.zone}</span><span className="font-mono text-xs text-muted-foreground">{z.occupancy}/{z.capacity}</span></div><Bar value={p} tone={p > 85 ? "danger" : p > 65 ? "warning" : "primary"} /></div>;
              })}
            </div>
          </Panel>
          <Panel title="Movement · WK-1047">
            <ol className="relative space-y-3 border-l pl-5 text-sm">
              {[["21:12", "Entered Zone A · Gate 2"], ["21:34", "Zone B · Welding Bay"], ["21:40", "Gloves removed — flagged"], ["22:01", "Zone D · Loading Dock"]].map(([t, e]) => (
                <li key={t}><span className="absolute -left-1.5 mt-1.5 h-3 w-3 rounded-full bg-primary" /><span className="font-mono text-xs text-muted-foreground">{t}</span> · {e}</li>
              ))}
            </ol>
          </Panel>
        </div>
      </div>
    </>
  );
}
