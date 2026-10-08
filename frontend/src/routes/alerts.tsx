import { createFileRoute } from "@tanstack/react-router";
import { Camera, Clock, MapPin } from "lucide-react";
import feed from "@/assets/cctv-floor.jpg";
import { PageHeader, SeverityBadge } from "@/components/sentinel/ui";
import { alerts } from "@/components/sentinel/data";
import { meta } from "@/components/sentinel/meta";

export const Route = createFileRoute("/alerts")({
  head: () => meta("Safety Alerts", "Safety alert center for PPE violations, fire, smoke and unauthorized entry with evidence."),
  component: Alerts,
});

function Alerts() {
  return (
    <>
      <PageHeader title="Safety Alerts Center" subtitle={`${alerts.length} alerts in the last hour`} />
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {alerts.map((a, i) => (
          <article key={a.id} className={`glass overflow-hidden rounded-xl animate-fade-up ${a.severity === "critical" ? "border-destructive/50" : ""}`}>
            <div className="relative aspect-video overflow-hidden">
              <img src={feed} alt={`Evidence for ${a.type}`} loading="lazy" width={1280} height={720} className="h-full w-full object-cover" style={{ objectPosition: `${(i * 23) % 100}% ${(i * 37) % 100}%`, transform: "scale(1.6)" }} />
              <div className="absolute inset-0 scanline opacity-50" />
              <div className="absolute left-3 top-3"><SeverityBadge s={a.severity} /></div>
              <span className="absolute bottom-2 right-2 rounded bg-background/70 px-1.5 font-mono text-[10px]">{a.id}</span>
            </div>
            <div className="p-4">
              <h3 className="text-lg font-semibold">{a.type}</h3>
              <div className="mt-2 grid grid-cols-3 gap-2 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{a.time}</span>
                <span className="flex items-center gap-1"><Camera className="h-3 w-3" />{a.camera}</span>
                <span className="flex items-center gap-1 truncate"><MapPin className="h-3 w-3" />{a.location}</span>
              </div>
              <div className="mt-4 flex gap-2">
                <button className="flex-1 rounded-lg bg-primary px-3 py-2 text-xs font-medium text-primary-foreground hover:opacity-90">Acknowledge</button>
                <button className="flex-1 rounded-lg border px-3 py-2 text-xs hover:bg-secondary">Escalate</button>
              </div>
            </div>
          </article>
        ))}
      </div>
    </>
  );
}
