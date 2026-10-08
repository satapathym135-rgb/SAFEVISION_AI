import { createFileRoute } from "@tanstack/react-router";
import { HardHat, UserCheck, UserX } from "lucide-react";
import { Bar as RBar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Cell } from "recharts";
import { Kpi, Panel, PageHeader, Counter, chartTooltip, axis } from "@/components/sentinel/ui";
import { ppeItems, weekly } from "@/components/sentinel/data";
import { meta } from "@/components/sentinel/meta";

export const Route = createFileRoute("/ppe")({
  head: () => meta("PPE Compliance", "Helmet, vest, gloves, goggles, mask and boots compliance with violation breakdown and trends."),
  component: Ppe,
});

function Ring({ value, label }: { value: number; label: string }) {
  const r = 34, c = 2 * Math.PI * r;
  const color = value > 90 ? "var(--success)" : value > 82 ? "var(--warning)" : "var(--destructive)";
  return (
    <div className="glass flex flex-col items-center rounded-xl p-4 animate-fade-up">
      <svg viewBox="0 0 80 80" className="h-24 w-24 -rotate-90">
        <circle cx="40" cy="40" r={r} stroke="var(--muted)" strokeWidth="6" fill="none" />
        <circle cx="40" cy="40" r={r} stroke={color} strokeWidth="6" fill="none" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - value / 100)} style={{ transition: "stroke-dashoffset 1s" }} />
      </svg>
      <p className="-mt-16 mb-10 font-display text-xl font-semibold"><Counter value={value} suffix="%" /></p>
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  );
}

function Ppe() {
  const violations = ppeItems.map((p) => ({ name: p.name, count: Math.round((100 - p.rate) * 1.3) }));
  return (
    <>
      <PageHeader title="PPE Compliance" subtitle="Per-item personal protective equipment detection across all zones" />
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
        {ppeItems.map((p) => <Ring key={p.name} value={p.rate} label={`${p.name} Compliance`} />)}
      </div>
      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <Kpi label="Compliant Workers" value={114} icon={UserCheck} tone="success" />
        <Kpi label="Non-Compliant Workers" value={10} icon={UserX} tone="danger" />
        <Kpi label="Overall Compliance" value={92.4} decimals={1} suffix="%" icon={HardHat} />
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Panel title="Violation Breakdown">
          <div className="h-64"><ResponsiveContainer><BarChart data={violations}>
            <CartesianGrid stroke="var(--border)" vertical={false} /><XAxis dataKey="name" {...axis} /><YAxis {...axis} /><Tooltip {...chartTooltip} cursor={{ fill: "var(--muted)" }} />
            <RBar dataKey="count" radius={[6, 6, 0, 0]}>{violations.map((v, i) => <Cell key={i} fill={v.count > 20 ? "var(--chart-3)" : "var(--chart-2)"} />)}</RBar>
          </BarChart></ResponsiveContainer></div>
        </Panel>
        <Panel title="Compliance Trend">
          <div className="h-64"><ResponsiveContainer><LineChart data={weekly}>
            <CartesianGrid stroke="var(--border)" vertical={false} /><XAxis dataKey="day" {...axis} /><YAxis domain={[80, 100]} {...axis} /><Tooltip {...chartTooltip} />
            <Line type="monotone" dataKey="compliance" stroke="var(--chart-4)" strokeWidth={2.5} dot={{ r: 3 }} />
          </LineChart></ResponsiveContainer></div>
        </Panel>
      </div>
    </>
  );
}
