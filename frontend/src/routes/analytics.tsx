import { createFileRoute } from "@tanstack/react-router";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Legend, Line, LineChart, PolarAngleAxis, PolarGrid, Radar, RadarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Panel, PageHeader, chartTooltip, axis, Bar as Meter } from "@/components/sentinel/ui";
import { weekly, hourly, cameras, zones } from "@/components/sentinel/data";
import { meta } from "@/components/sentinel/meta";

export const Route = createFileRoute("/analytics")({
  head: () => meta("Analytics", "PPE trends, daily incidents, safety score, alert frequency, risk analytics and camera performance."),
  component: Analytics,
});

const H = ({ children }: { children: React.ReactElement }) => <div className="h-64"><ResponsiveContainer>{children}</ResponsiveContainer></div>;

function Analytics() {
  const riskZones = zones.map((z, i) => ({ zone: z.zone, risk: [42, 68, 55, 30, 81, 26][i] }));
  return (
    <>
      <PageHeader title="Safety Analytics" subtitle="Trends and performance over the last 7 days" />
      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="PPE Compliance Trend"><H><AreaChart data={weekly}><CartesianGrid stroke="var(--border)" vertical={false} /><XAxis dataKey="day" {...axis} /><YAxis domain={[80, 100]} {...axis} /><Tooltip {...chartTooltip} /><Area dataKey="compliance" stroke="var(--chart-1)" fill="var(--chart-1)" fillOpacity={0.15} strokeWidth={2} /></AreaChart></H></Panel>
        <Panel title="Daily Incidents"><H><BarChart data={weekly}><CartesianGrid stroke="var(--border)" vertical={false} /><XAxis dataKey="day" {...axis} /><YAxis {...axis} /><Tooltip {...chartTooltip} cursor={{ fill: "var(--muted)" }} /><Bar dataKey="incidents" fill="var(--chart-2)" radius={[6, 6, 0, 0]} /></BarChart></H></Panel>
        <Panel title="Worker Safety Score Trend"><H><LineChart data={weekly}><CartesianGrid stroke="var(--border)" vertical={false} /><XAxis dataKey="day" {...axis} /><YAxis domain={[70, 95]} {...axis} /><Tooltip {...chartTooltip} /><Line dataKey="safety" stroke="var(--chart-4)" strokeWidth={2.5} dot={{ r: 3 }} /></LineChart></H></Panel>
        <Panel title="Alert Frequency · Today"><H><BarChart data={hourly}><CartesianGrid stroke="var(--border)" vertical={false} /><XAxis dataKey="hour" {...axis} /><YAxis {...axis} /><Tooltip {...chartTooltip} cursor={{ fill: "var(--muted)" }} /><Legend wrapperStyle={{ fontSize: 12 }} /><Bar dataKey="ppe" stackId="a" fill="var(--chart-1)" name="PPE" /><Bar dataKey="entry" stackId="a" fill="var(--chart-5)" name="Entry" /><Bar dataKey="fire" stackId="a" fill="var(--chart-3)" name="Fire/Smoke" radius={[4, 4, 0, 0]} /></BarChart></H></Panel>
        <Panel title="Risk Score by Zone"><H><RadarChart data={riskZones}><PolarGrid stroke="var(--border)" /><PolarAngleAxis dataKey="zone" tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} /><Radar dataKey="risk" stroke="var(--chart-3)" fill="var(--chart-3)" fillOpacity={0.3} /><Tooltip {...chartTooltip} /></RadarChart></H></Panel>
        <Panel title="Camera Performance">
          <div className="space-y-4">
            {cameras.map((c) => (
              <div key={c.id}>
                <div className="mb-1 flex justify-between text-sm"><span><span className="font-mono text-primary">{c.id}</span> · {c.name}</span><span className="font-mono text-xs text-muted-foreground">{c.fps} fps · {c.uptime}%</span></div>
                <Meter value={c.uptime} tone={c.uptime > 98 ? "success" : c.uptime > 90 ? "warning" : "danger"} />
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </>
  );
}
