import { createFileRoute } from "@tanstack/react-router";
import {
  HardHat,
  UserCheck,
  UserX,
  Upload,
  LoaderCircle,
  AlertTriangle,
  CheckCircle2,
  Crosshair,
  ShieldAlert,
  RotateCcw,
} from "lucide-react";
import {
  Bar as RBar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Cell,
} from "recharts";
import { useState, useRef, useEffect, useCallback } from "react";
import {
  Kpi,
  Panel,
  PageHeader,
  Counter,
  chartTooltip,
  axis,
  SeverityBadge,
} from "@/components/sentinel/ui";
import { ppeItems, weekly } from "@/components/sentinel/data";
import { meta } from "@/components/sentinel/meta";
import {
  detectPpeImage,
  type PpeDetectionResponse,
} from "@/lib/api";

export const Route = createFileRoute("/ppe")({
  head: () =>
    meta(
      "PPE Compliance",
      "Helmet, vest, gloves, goggles, mask and boots compliance with violation breakdown and trends."
    ),
  component: Ppe,
});

function hexToRgba(hex: string, alpha: number): string {
  let c = hex.replace("#", "");
  if (c.length === 3) {
    c = c
      .split("")
      .map((ch) => ch + ch)
      .join("");
  }
  const num = parseInt(c, 16);
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function getColorForClass(className: string): string {
  const lower = (className || "").toLowerCase();
  if (lower.includes("vest")) return "#f59e0b"; // Amber
  if (lower.includes("helmet")) return "#0284c7"; // Sky Blue
  if (lower.includes("boot")) return "#10b981"; // Emerald
  if (lower.includes("glove")) return "#8b5cf6"; // Purple
  if (lower.includes("goggle")) return "#06b6d4"; // Cyan
  if (lower.includes("mask")) return "#ec4899"; // Pink
  if (lower.includes("person")) return "#6366f1"; // Indigo
  return "#3b82f6"; // Default Blue
}

function Ring({ value, label }: { value: number; label: string }) {
  const r = 34,
    c = 2 * Math.PI * r;
  const color =
    value > 90
      ? "var(--success)"
      : value > 82
        ? "var(--warning)"
        : "var(--destructive)";
  return (
    <div className="glass flex flex-col items-center rounded-xl p-4 animate-fade-up">
      <svg viewBox="0 0 80 80" className="h-24 w-24 -rotate-90">
        <circle
          cx="40"
          cy="40"
          r={r}
          stroke="var(--muted)"
          strokeWidth="6"
          fill="none"
        />
        <circle
          cx="40"
          cy="40"
          r={r}
          stroke={color}
          strokeWidth="6"
          fill="none"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - value / 100)}
          style={{ transition: "stroke-dashoffset 1s" }}
        />
      </svg>
      <p className="-mt-16 mb-10 font-display text-xl font-semibold">
        <Counter value={value} suffix="%" />
      </p>
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  );
}

function Ppe() {
  const violations = ppeItems.map((p) => ({
    name: p.name,
    count: Math.round((100 - p.rate) * 1.3),
  }));

  // State for image upload and detection
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string>("");
  const [result, setResult] = useState<PpeDetectionResponse | null>(null);
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);

  const imageRef = useRef<HTMLImageElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  function selectFile(selected: File | null) {
    setError("");
    setResult(null);

    if (preview) {
      URL.revokeObjectURL(preview);
    }

    if (!selected) {
      setFile(null);
      setPreview("");
      return;
    }

    if (!selected.type.startsWith("image/")) {
      setFile(null);
      setPreview("");
      setError("Please select a valid image file (JPG, PNG, or WEBP).");
      return;
    }

    setFile(selected);
    setPreview(URL.createObjectURL(selected));
  }

  function handleReset() {
    if (preview) {
      URL.revokeObjectURL(preview);
    }
    setFile(null);
    setPreview("");
    setResult(null);
    setError("");
  }

  async function runDetection() {
    if (!file) {
      setError("Please select an image first.");
      return;
    }

    setLoading(true);
    setError("");
    setResult(null);

    try {
      const data = await detectPpeImage(file);
      setResult(data);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not connect to the detection API."
      );
    } finally {
      setLoading(false);
    }
  }

  const drawBoundingBoxes = useCallback(() => {
    const canvas = canvasRef.current;
    const img = imageRef.current;
    if (!canvas || !img) return;

    if (!img.naturalWidth || !img.naturalHeight) return;

    const displayWidth = img.clientWidth;
    const displayHeight = img.clientHeight;
    if (!displayWidth || !displayHeight) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(displayWidth * dpr);
    canvas.height = Math.round(displayHeight * dpr);
    canvas.style.width = `${displayWidth}px`;
    canvas.style.height = `${displayHeight}px`;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.scale(dpr, dpr);

    if (!result) return;

    const scaleX = displayWidth / img.naturalWidth;
    const scaleY = displayHeight / img.naturalHeight;

    // Draw worker boxes first if present
    if (result.workers && result.workers.length > 0) {
      result.workers.forEach((worker) => {
        if (!worker.bbox || worker.bbox.length < 4) return;
        const [wx1, wy1, wx2, wy2] = worker.bbox;
        const x = wx1 * scaleX;
        const y = wy1 * scaleY;
        const w = (wx2 - wx1) * scaleX;
        const h = (wy2 - wy1) * scaleY;

        ctx.save();
        ctx.strokeStyle = "#818cf8";
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 4]);
        ctx.strokeRect(x, y, w, h);

        const label = `${worker.worker_id} (${worker.compliance_score}% PPE)`;
        ctx.font = "bold 11px system-ui, -apple-system, sans-serif";
        const metrics = ctx.measureText(label);
        const bgW = metrics.width + 10;
        const bgH = 18;
        const bgY = Math.max(0, y - bgH);

        ctx.fillStyle = "rgba(79, 70, 229, 0.9)";
        ctx.fillRect(x, bgY, bgW, bgH);

        ctx.fillStyle = "#ffffff";
        ctx.textBaseline = "middle";
        ctx.fillText(label, x + 5, bgY + bgH / 2);
        ctx.restore();
      });
    }

    // Draw PPE detections
    const detections = result.detections ?? [];
    detections.forEach((det) => {
      if (!det.bbox || det.bbox.length < 4) return;
      const [x1, y1, x2, y2] = det.bbox;
      const x = x1 * scaleX;
      const y = y1 * scaleY;
      const w = (x2 - x1) * scaleX;
      const h = (y2 - y1) * scaleY;

      const color = getColorForClass(det.class);

      ctx.save();
      ctx.strokeStyle = color;
      ctx.lineWidth = 2.5;
      ctx.strokeRect(x, y, w, h);

      ctx.fillStyle = hexToRgba(color, 0.12);
      ctx.fillRect(x, y, w, h);

      const confText =
        typeof det.confidence === "number"
          ? `${(det.confidence * 100).toFixed(1)}%`
          : "";
      const label = `${det.class} ${confText}`.trim();

      ctx.font = "bold 11px system-ui, -apple-system, sans-serif";
      const metrics = ctx.measureText(label);
      const bgW = metrics.width + 10;
      const bgH = 18;
      const bgY = Math.max(0, y - bgH);

      ctx.fillStyle = color;
      ctx.fillRect(x, bgY, bgW, bgH);

      ctx.fillStyle = "#ffffff";
      ctx.textBaseline = "middle";
      ctx.fillText(label, x + 5, bgY + bgH / 2);
      ctx.restore();
    });
  }, [result]);

  useEffect(() => {
    drawBoundingBoxes();

    const handleResize = () => {
      drawBoundingBoxes();
    };

    window.addEventListener("resize", handleResize);

    let resizeObserver: ResizeObserver | null = null;
    if (imageRef.current && typeof ResizeObserver !== "undefined") {
      resizeObserver = new ResizeObserver(() => {
        drawBoundingBoxes();
      });
      resizeObserver.observe(imageRef.current);
    }

    return () => {
      window.removeEventListener("resize", handleResize);
      if (resizeObserver) resizeObserver.disconnect();
    };
  }, [drawBoundingBoxes, preview]);

  const detections = result?.detections ?? [];
  const workers = result?.workers ?? [];

  return (
    <>
      <PageHeader
        title="PPE Compliance"
        subtitle="Per-item personal protective equipment detection across all zones"
      />

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
        {ppeItems.map((p) => (
          <Ring key={p.name} value={p.rate} label={`${p.name} Compliance`} />
        ))}
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <Kpi
          label="Compliant Workers"
          value={114}
          icon={UserCheck}
          tone="success"
        />
        <Kpi
          label="Non-Compliant Workers"
          value={10}
          icon={UserX}
          tone="danger"
        />
        <Kpi
          label="Overall Compliance"
          value={92.4}
          decimals={1}
          suffix="%"
          icon={HardHat}
        />
      </div>

      {/* Upload Image & Detect PPE Panel */}
      <Panel
        title="Upload Image & Detect PPE"
        className="mt-6"
        action={
          file ? (
            <button
              type="button"
              onClick={handleReset}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            >
              <RotateCcw className="h-3 w-3" />
              Reset
            </button>
          ) : undefined
        }
      >
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Left Column: Image Selection, Preview & Canvas Overlay, Run Button */}
          <div className="space-y-4">
            <label className="flex cursor-pointer flex-col items-center gap-3 rounded-lg border border-dashed border-border/70 p-6 text-center transition-colors hover:bg-muted/30">
              <Upload className="h-8 w-8 text-primary" />
              <div>
                <span className="text-sm font-medium">
                  {file ? file.name : "Choose an image to detect PPE"}
                </span>
                <p className="mt-1 text-xs text-muted-foreground">
                  Supports JPG, PNG, or WEBP (YOLO11s PPE &amp; ByteTrack)
                </p>
              </div>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => selectFile(e.target.files?.[0] ?? null)}
              />
            </label>

            {preview && (
              <div className="relative mx-auto flex max-h-[460px] w-full items-center justify-center overflow-hidden rounded-lg border bg-black/40">
                <div className="relative inline-block max-w-full">
                  <img
                    ref={imageRef}
                    src={preview}
                    alt="Uploaded image for PPE analysis"
                    onLoad={drawBoundingBoxes}
                    className="block max-h-[460px] w-auto max-w-full object-contain"
                  />
                  <canvas
                    ref={canvasRef}
                    className="pointer-events-none absolute inset-0"
                  />
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={runDetection}
              disabled={!file || loading}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 font-medium text-primary-foreground transition-opacity hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? (
                <LoaderCircle className="h-4 w-4 animate-spin" />
              ) : (
                <HardHat className="h-4 w-4" />
              )}
              {loading ? "Analyzing PPE in Image..." : "Run PPE Detection"}
            </button>

            {error && (
              <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
                <AlertTriangle className="mr-2 inline h-4 w-4" />
                {error}
              </div>
            )}
          </div>

          {/* Right Column: Live Detection Results */}
          <div>
            {!result && !loading ? (
              <div className="flex h-full min-h-[280px] flex-col items-center justify-center rounded-lg border border-dashed border-border/60 p-6 text-center">
                <Crosshair className="h-10 w-10 text-muted-foreground/50" />
                <h4 className="mt-3 text-sm font-semibold">Awaiting Detection</h4>
                <p className="mt-1 max-w-xs text-xs text-muted-foreground">
                  Select an image and click &quot;Run PPE Detection&quot; to inspect
                  helmets, vests, boots, gloves, goggles, and worker compliance.
                </p>
              </div>
            ) : loading ? (
              <div className="flex h-full min-h-[280px] flex-col items-center justify-center rounded-lg border border-border/60 p-6 text-center">
                <LoaderCircle className="h-8 w-8 animate-spin text-primary" />
                <h4 className="mt-3 text-sm font-semibold">
                  Executing YOLO11s Detection...
                </h4>
                <p className="mt-1 text-xs text-muted-foreground">
                  Predicting bounding boxes, matching ByteTrack worker IDs, and saving to database.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Metrics Summary Strip */}
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <div className="rounded-lg border bg-muted/20 p-3">
                    <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
                      Detections
                    </p>
                    <p className="mt-1 font-display text-2xl font-bold">
                      {result.total_detections}
                    </p>
                  </div>
                  <div className="rounded-lg border bg-muted/20 p-3">
                    <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
                      Workers
                    </p>
                    <p className="mt-1 font-display text-2xl font-bold">
                      {result.total_workers}
                    </p>
                  </div>
                  <div className="rounded-lg border bg-muted/20 p-3">
                    <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
                      Tracking
                    </p>
                    <p className="mt-1 font-display text-sm font-semibold text-primary">
                      {result.tracking || "Active"}
                    </p>
                  </div>
                  <div className="rounded-lg border bg-muted/20 p-3">
                    <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
                      Database
                    </p>
                    <p className="mt-1 flex items-center gap-1 font-display text-sm font-semibold text-success">
                      {result.database_saved ? (
                        <>
                          <CheckCircle2 className="h-3.5 w-3.5" /> Saved
                        </>
                      ) : (
                        "Pending"
                      )}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 border-y py-2 text-xs text-muted-foreground">
                  <span>
                    Model: <strong className="text-foreground">{result.model}</strong>
                  </span>
                  {result.filename && (
                    <span className="truncate max-w-[200px]">
                      File: {result.filename}
                    </span>
                  )}
                </div>

                {/* Detected Items List */}
                <div>
                  <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Detected Safety Gear ({detections.length})
                  </h4>

                  {detections.length === 0 ? (
                    <div className="rounded-lg border border-dashed p-4 text-center text-xs text-muted-foreground">
                      No PPE objects detected in this image.
                    </div>
                  ) : (
                    <div className="max-h-60 space-y-2 overflow-y-auto pr-1">
                      {detections.map((det, index) => {
                        const color = getColorForClass(det.class);
                        const confPercent =
                          typeof det.confidence === "number"
                            ? (det.confidence * 100).toFixed(1)
                            : "0";
                        return (
                          <div
                            key={`${det.class}-${index}`}
                            className="flex items-center justify-between gap-3 rounded-lg border bg-card p-2.5 text-sm"
                          >
                            <div className="flex items-center gap-2.5">
                              <span
                                className="h-3 w-3 shrink-0 rounded-full"
                                style={{ backgroundColor: color }}
                              />
                              <div>
                                <p className="font-medium leading-none">
                                  {det.class}
                                </p>
                                {det.bbox && det.bbox.length >= 4 && (
                                  <p className="mt-1 font-mono text-[10px] text-muted-foreground">
                                    [{det.bbox.map((v) => Number(v).toFixed(1)).join(", ")}]
                                  </p>
                                )}
                              </div>
                            </div>
                            <div className="text-right">
                              <span className="font-mono text-xs font-semibold">
                                {confPercent}%
                              </span>
                              <p className="text-[10px] text-muted-foreground">confidence</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Worker Breakdown (if workers detected) */}
                {workers.length > 0 && (
                  <div className="mt-4 pt-2 border-t">
                    <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Worker Compliance Breakdown ({workers.length})
                    </h4>
                    <div className="max-h-56 space-y-2 overflow-y-auto pr-1">
                      {workers.map((worker) => (
                        <div
                          key={worker.worker_id}
                          className="rounded-lg border bg-muted/10 p-3 text-xs"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-mono font-bold text-foreground">
                              {worker.worker_id}
                              {worker.track_id !== null && ` (Track #${worker.track_id})`}
                            </span>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-foreground">
                                {worker.compliance_score}%
                              </span>
                              <SeverityBadge
                                s={
                                  worker.risk_level.toLowerCase() === "high"
                                    ? "high"
                                    : worker.risk_level.toLowerCase() === "medium"
                                      ? "medium"
                                      : "low"
                                }
                              />
                            </div>
                          </div>

                          {/* Gear checklist */}
                          <div className="mt-2 flex flex-wrap gap-1.5 text-[11px]">
                            <span
                              className={`rounded px-1.5 py-0.5 ${
                                worker.helmet
                                  ? "bg-success/15 text-success"
                                  : "bg-destructive/15 text-destructive"
                              }`}
                            >
                              Helmet: {worker.helmet ? "Yes" : "No"}
                            </span>
                            <span
                              className={`rounded px-1.5 py-0.5 ${
                                worker.vest
                                  ? "bg-success/15 text-success"
                                  : "bg-destructive/15 text-destructive"
                              }`}
                            >
                              Vest: {worker.vest ? "Yes" : "No"}
                            </span>
                            <span
                              className={`rounded px-1.5 py-0.5 ${
                                worker.gloves
                                  ? "bg-success/15 text-success"
                                  : "bg-destructive/15 text-destructive"
                              }`}
                            >
                              Gloves: {worker.gloves ? "Yes" : "No"}
                            </span>
                            <span
                              className={`rounded px-1.5 py-0.5 ${
                                worker.goggles
                                  ? "bg-success/15 text-success"
                                  : "bg-destructive/15 text-destructive"
                              }`}
                            >
                              Goggles: {worker.goggles ? "Yes" : "No"}
                            </span>
                            <span
                              className={`rounded px-1.5 py-0.5 ${
                                worker.boots
                                  ? "bg-success/15 text-success"
                                  : "bg-destructive/15 text-destructive"
                              }`}
                            >
                              Boots: {worker.boots ? "Yes" : "No"}
                            </span>
                          </div>

                          {worker.violations && worker.violations.length > 0 && (
                            <div className="mt-2 flex flex-wrap items-center gap-1">
                              <span className="text-[10px] text-destructive flex items-center gap-1 font-medium">
                                <ShieldAlert className="h-3 w-3" /> Violations:
                              </span>
                              {worker.violations.map((v) => (
                                <span
                                  key={v}
                                  className="rounded border border-destructive/30 bg-destructive/10 px-1 py-0.2 text-[10px] text-destructive"
                                >
                                  {v}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <p className="text-[11px] text-muted-foreground">
                  * Live detections from backend model {result.model}. Coordinates
                  are scaled to rendered image dimensions.
                </p>
              </div>
            )}
          </div>
        </div>
      </Panel>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Panel title="Violation Breakdown">
          <div className="h-64">
            <ResponsiveContainer>
              <BarChart data={violations}>
                <CartesianGrid stroke="var(--border)" vertical={false} />
                <XAxis dataKey="name" {...axis} />
                <YAxis {...axis} />
                <Tooltip
                  {...chartTooltip}
                  cursor={{ fill: "var(--muted)" }}
                />
                <RBar dataKey="count" radius={[6, 6, 0, 0]}>
                  {violations.map((v, i) => (
                    <Cell
                      key={i}
                      fill={
                        v.count > 20
                          ? "var(--chart-3)"
                          : "var(--chart-2)"
                      }
                    />
                  ))}
                </RBar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>
        <Panel title="Compliance Trend">
          <div className="h-64">
            <ResponsiveContainer>
              <LineChart data={weekly}>
                <CartesianGrid stroke="var(--border)" vertical={false} />
                <XAxis dataKey="day" {...axis} />
                <YAxis domain={[80, 100]} {...axis} />
                <Tooltip {...chartTooltip} />
                <Line
                  type="monotone"
                  dataKey="compliance"
                  stroke="var(--chart-4)"
                  strokeWidth={2.5}
                  dot={{ r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      </div>
    </>
  );
}

