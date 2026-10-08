import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Panel, PageHeader, StatusDot } from "@/components/sentinel/ui";
import { cameras } from "@/components/sentinel/data";
import { meta } from "@/components/sentinel/meta";

export const Route = createFileRoute("/settings")({
  head: () => meta("Settings", "Manage cameras, alert thresholds, notifications, user roles and system preferences."),
  component: Settings,
});

function Toggle({ label, def = true }: { label: string; def?: boolean }) {
  const [on, setOn] = useState(def);
  return (
    <label className="flex cursor-pointer items-center justify-between py-2 text-sm">
      {label}
      <button type="button" onClick={() => setOn(!on)} className={`relative h-5 w-9 rounded-full transition ${on ? "bg-primary" : "bg-muted"}`} aria-pressed={on}>
        <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-foreground transition-all ${on ? "left-[18px]" : "left-0.5"}`} />
      </button>
    </label>
  );
}

function Settings() {
  const [conf, setConf] = useState(75);
  return (
    <>
      <PageHeader title="Settings" subtitle="Platform configuration" />
      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Camera Management" className="lg:col-span-2">
          <div className="grid gap-3 md:grid-cols-3">
            {cameras.map((c) => (
              <div key={c.id} className="flex items-center justify-between rounded-lg border bg-background/30 p-3">
                <div><p className="font-mono text-sm text-primary">{c.id}</p><p className="text-xs text-muted-foreground">{c.name} · {c.zone}</p></div>
                <span className="flex items-center gap-2 text-xs"><StatusDot tone={c.online ? "success" : "danger"} />{c.online ? "Online" : "Offline"}</span>
              </div>
            ))}
          </div>
        </Panel>
        <Panel title="Alert Configuration">
          <div className="mb-3 flex justify-between text-sm"><span>Detection confidence threshold</span><span className="font-mono text-primary">{conf}%</span></div>
          <input type="range" min={50} max={99} value={conf} onChange={(e) => setConf(+e.target.value)} className="w-full accent-[var(--primary)]" />
          <div className="mt-3 divide-y"><Toggle label="PPE violation alerts" /><Toggle label="Fire & smoke alerts" /><Toggle label="Unauthorized entry alerts" /><Toggle label="Auto-escalate critical after 2 min" /></div>
        </Panel>
        <Panel title="Notification Settings">
          <div className="divide-y"><Toggle label="Email notifications" /><Toggle label="SMS for critical alerts" /><Toggle label="WhatsApp alerts" def={false} /><Toggle label="Desktop push" /><Toggle label="Plant siren integration" /></div>
        </Panel>
        <Panel title="User Roles">
          <ul className="space-y-2 text-sm">
            {[["R. Kumar", "Safety Officer"], ["A. Mehta", "Plant Manager"], ["S. Iyer", "Supervisor"], ["Control Room", "Operator"]].map(([n, r]) => (
              <li key={n} className="flex items-center justify-between rounded-lg border bg-background/30 px-3 py-2"><span>{n}</span><span className="rounded bg-secondary px-2 py-0.5 text-xs text-muted-foreground">{r}</span></li>
            ))}
          </ul>
        </Panel>
        <Panel title="System Preferences">
          <div className="divide-y"><Toggle label="Blur worker faces (privacy)" /><Toggle label="Retain evidence for 90 days" /><Toggle label="Edge inference mode" /><Toggle label="Send anonymous telemetry" def={false} /></div>
        </Panel>
      </div>
    </>
  );
}
