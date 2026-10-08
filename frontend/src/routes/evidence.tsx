import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Search } from "lucide-react";
import feed from "@/assets/cctv-floor.jpg";
import { PageHeader, SeverityBadge } from "@/components/sentinel/ui";
import { alerts } from "@/components/sentinel/data";
import { meta } from "@/components/sentinel/meta";

export const Route = createFileRoute("/evidence")({
  head: () => meta("Evidence Center", "Searchable archive of violation snapshots, fire detection screenshots and incident evidence."),
  component: Evidence,
});

const items = Array.from({ length: 16 }, (_, i) => {
  const a = alerts[i % alerts.length]!;
  return { ...a, id: `EV-${3100 + i}`, date: `Oct ${6 - Math.floor(i / 5)}`, cat: a.type.includes("Fire") || a.type.includes("Smoke") ? "Fire" : a.type.includes("Entry") ? "Incident" : "PPE" };
});
const cats = ["All", "PPE", "Fire", "Incident"];

function Evidence() {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("All");
  const list = items.filter((i) => (cat === "All" || i.cat === cat) && `${i.type} ${i.location} ${i.camera} ${i.id}`.toLowerCase().includes(q.toLowerCase()));
  return (
    <>
      <PageHeader title="Evidence Center" subtitle="Tamper-evident incident archive">
        <div className="flex flex-wrap gap-2">
          <div className="glass flex items-center gap-2 rounded-lg px-3 py-2 text-sm"><Search className="h-4 w-4 text-muted-foreground" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search evidence…" className="w-48 bg-transparent outline-none" /></div>
          {cats.map((c) => <button key={c} onClick={() => setCat(c)} className={`rounded-lg px-3 py-2 text-sm transition ${cat === c ? "bg-primary text-primary-foreground" : "glass text-muted-foreground"}`}>{c}</button>)}
        </div>
      </PageHeader>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
        {list.map((e, i) => (
          <figure key={e.id} className="glass group overflow-hidden rounded-xl animate-fade-up">
            <div className="relative aspect-[4/3] overflow-hidden">
              <img src={feed} alt={e.type} loading="lazy" width={1280} height={720} className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.9]" style={{ objectPosition: `${(i * 29) % 100}% ${(i * 41) % 100}%`, transform: "scale(1.7)" }} />
              <div className="absolute inset-0 scanline opacity-40" />
              <div className="absolute right-2 top-2"><SeverityBadge s={e.severity} /></div>
            </div>
            <figcaption className="p-3">
              <p className="text-sm font-medium">{e.type}</p>
              <p className="font-mono text-[11px] text-muted-foreground">{e.id} · {e.date} {e.time} · {e.camera}</p>
            </figcaption>
          </figure>
        ))}
        {list.length === 0 && <p className="col-span-full py-16 text-center text-muted-foreground">No evidence matches your filters.</p>}
      </div>
    </>
  );
}
