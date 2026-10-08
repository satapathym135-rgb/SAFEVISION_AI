import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Panel, PageHeader, SeverityBadge, StatusDot } from "@/components/sentinel/ui";
import { CctvFeed } from "@/components/sentinel/CctvFeed";
import { alerts, cameras } from "@/components/sentinel/data";
import { meta } from "@/components/sentinel/meta";

export const Route = createFileRoute("/live")({
  head: () => meta("Live Monitoring", "Live CCTV feeds with real-time AI detection overlays and alert stream."),
  component: Live,
});

const detections = [
  ["Person", 0.97, "ok"], ["Helmet", 0.94, "ok"], ["Hi-vis vest", 0.92, "ok"], ["No gloves", 0.88, "bad"], ["Forklift", 0.91, "ok"], ["Person", 0.89, "ok"],
] as const;

function Live() {
  const [cam, setCam] = useState(cameras[3]!.id);
  const c = cameras.find((x) => x.id === cam)!;
  return (
    <>
      <PageHeader title="Live Monitoring" subtitle="Real-time computer vision across all plant cameras">
        <select value={cam} onChange={(e) => setCam(e.target.value)} className="glass rounded-lg px-3 py-2 text-sm outline-none">
          {cameras.map((x) => <option key={x.id} value={x.id} className="bg-popover">{x.id} · {x.name}{x.online ? "" : " (offline)"}</option>)}
        </select>
      </PageHeader>
      <div className="grid gap-6 xl:grid-cols-4">
        <div className="space-y-6 xl:col-span-3">
          <Panel>
            {c.online ? <CctvFeed camera={`${c.id} · ${c.name}`} /> : (
              <div className="grid aspect-video place-items-center rounded-lg border bg-background/40 scanline text-center">
                <div><StatusDot tone="danger" /><p className="mt-2 font-mono text-sm text-destructive">SIGNAL LOST · {c.id}</p><p className="text-xs text-muted-foreground">Last frame 21:51:02</p></div>
              </div>
            )}
          </Panel>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-6">
            {cameras.map((x) => (
              <button key={x.id} onClick={() => setCam(x.id)} className={`glass rounded-lg p-3 text-left text-xs transition ${x.id === cam ? "glow-primary" : ""}`}>
                <div className="flex items-center gap-2"><StatusDot tone={x.online ? "success" : "danger"} /><span className="font-mono">{x.id}</span></div>
                <p className="mt-1 truncate text-muted-foreground">{x.name}</p>
              </button>
            ))}
          </div>
        </div>
        <div className="space-y-6">
          <Panel title="Detection Overlay">
            <ul className="space-y-2">
              {detections.map(([n, conf, s], i) => (
                <li key={i} className="flex items-center justify-between text-sm">
                  <span className={s === "bad" ? "text-destructive" : ""}>{n}</span>
                  <span className="font-mono text-xs text-muted-foreground">{(conf * 100).toFixed(0)}%</span>
                </li>
              ))}
            </ul>
          </Panel>
          <Panel title="Alert Stream">
            <ul className="space-y-3">
              {alerts.slice(0, 5).map((a) => (
                <li key={a.id} className="border-l-2 border-primary/40 pl-3">
                  <div className="flex items-center justify-between"><p className="text-sm">{a.type}</p><SeverityBadge s={a.severity} /></div>
                  <p className="font-mono text-[11px] text-muted-foreground">{a.time} · {a.camera}</p>
                </li>
              ))}
            </ul>
          </Panel>
        </div>
      </div>
    </>
  );
}
