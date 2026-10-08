import feed from "@/assets/cctv-floor.jpg";
import { StatusDot } from "./ui";

const boxes = [
  { l: 16, t: 28, w: 7, h: 20, label: "Worker · Helmet ✓ Vest ✓", ok: true },
  { l: 42, t: 19, w: 6, h: 19, label: "Worker · Gloves ✗", ok: false },
  { l: 73, t: 51, w: 7, h: 22, label: "Worker · PPE ✓", ok: true },
];

export function CctvFeed({ camera = "CAM-04 · Shop Floor" }: { camera?: string }) {
  return (
    <div className="relative aspect-video overflow-hidden rounded-lg border">
      <img src={feed} alt="Live CCTV feed of the factory floor" width={1280} height={720} className="h-full w-full object-cover" />
      <div className="absolute inset-0 scanline opacity-60" />
      {boxes.map((b) => (
        <div key={b.label} className={b.ok ? "absolute border-2 border-success" : "absolute border-2 border-destructive"} style={{ left: `${b.l}%`, top: `${b.t}%`, width: `${b.w}%`, height: `${b.h}%` }}>
          <span className={b.ok ? "absolute -top-5 left-0 whitespace-nowrap bg-success px-1 font-mono text-[10px] text-background" : "absolute -top-5 left-0 whitespace-nowrap bg-destructive px-1 font-mono text-[10px] text-destructive-foreground"}>{b.label}</span>
        </div>
      ))}
      <div className="absolute left-3 top-3 flex items-center gap-2 rounded bg-background/70 px-2 py-1 font-mono text-xs backdrop-blur"><StatusDot tone="danger" /> LIVE · {camera}</div>
      <div className="absolute bottom-3 right-3 rounded bg-background/70 px-2 py-1 font-mono text-xs text-primary backdrop-blur">YOLOv8 · 28 FPS · 3 objects</div>
    </div>
  );
}
