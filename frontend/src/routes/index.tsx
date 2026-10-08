import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Users,
  ShieldCheck,
  AlertTriangle,
  Flame,
  Gauge,
  Camera,
  Sparkles,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Kpi,
  Panel,
  PageHeader,
  SeverityBadge,
  Bar,
  chartTooltip,
  axis,
  Counter,
} from "@/components/sentinel/ui";
import { weekly, ppeItems } from "@/components/sentinel/data";
import {
  getDashboardSummary,
  getViolations,
  analyzeCameraFrame,
  detectFireSmoke,
} from "@/lib/api";
import { meta } from "@/components/sentinel/meta";
import { useEffect, useRef, useState } from "react";

export const Route = createFileRoute("/")({
  head: () =>
    meta(
      "Control Center",
      "Real-time industrial safety overview: workers, PPE compliance, violations, fire alerts and risk score."
    ),
  component: Dashboard,
});

function Dashboard() {
  const [summary, setSummary] = useState({
    workers_detected: 0,
    compliance_rate: 0,
    violations_today: 0,
    fire_smoke_alerts: 0,
    risk_level: "LOW",
    system_status: "ACTIVE",
  });

  const [alerts, setAlerts] = useState<any[]>([]);
  const [liveDetections, setLiveDetections] = useState<any[]>([]);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const cameraIntervalRef = useRef<number | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Prevent siren from repeatedly playing for the same violation
  const previousViolationKeyRef = useRef("");

  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState("");

  const [aiStatus, setAiStatus] = useState("AI Standby");
  const [detectionCount, setDetectionCount] = useState(0);

  const [fireSmokeResult, setFireSmokeResult] =
    useState<any>(null);

  const [fireSmokeLoading, setFireSmokeLoading] =
    useState(false);

  const [fireSmokeError, setFireSmokeError] =
    useState("");

  // --------------------------------------------------
  // SIREN
  // --------------------------------------------------

  const playSafetySiren = () => {
    try {
      const AudioContextClass =
        window.AudioContext ||
        (window as any).webkitAudioContext;

      if (!AudioContextClass) return;

      const audioContext =
        new AudioContextClass();

      if (audioContext.state === "suspended") {
        audioContext.resume();
      }

      for (let i = 0; i < 3; i++) {
        window.setTimeout(() => {
          const oscillator =
            audioContext.createOscillator();

          const gainNode =
            audioContext.createGain();

          oscillator.type = "square";

          oscillator.frequency.setValueAtTime(
            900,
            audioContext.currentTime
          );

          oscillator.frequency.linearRampToValueAtTime(
            1300,
            audioContext.currentTime + 0.15
          );

          gainNode.gain.setValueAtTime(
            0.25,
            audioContext.currentTime
          );

          oscillator.connect(gainNode);
          gainNode.connect(
            audioContext.destination
          );

          oscillator.start();

          window.setTimeout(() => {
            oscillator.stop();

            if (i === 2) {
              window.setTimeout(() => {
                audioContext.close();
              }, 100);
            }
          }, 350);
        }, i * 500);
      }
    } catch (error) {
      console.error(
        "Safety siren error:",
        error
      );
    }
  };

  // --------------------------------------------------
  // DASHBOARD DATA
  // --------------------------------------------------

  useEffect(() => {
    getDashboardSummary()
      .then(setSummary)
      .catch((error) =>
        console.error(
          "Dashboard API error:",
          error
        )
      );
  }, []);

  useEffect(() => {
    getViolations()
      .then((data) => {
        const violations = Array.isArray(data)
          ? data
          : data?.violations || [];

        const formattedAlerts = violations.map(
          (v: any) => ({
            id: v.id,
            type:
              v.violation_type ||
              "Safety Violation",
            worker_id:
              v.worker_id || "Worker",
            severity:
              v.severity || "HIGH",
            time: v.timestamp
              ? new Date(
                  v.timestamp
                ).toLocaleTimeString()
              : "--:--:--",
            camera:
              v.camera_id || "CAM-01",
            location:
              "Factory Floor",
          })
        );

        setAlerts(formattedAlerts);
      })
      .catch((error) => {
        console.error(
          "Violations API error:",
          error
        );
      });
  }, []);

  // --------------------------------------------------
  // LIVE CAMERA
  // --------------------------------------------------

  const startLiveCamera = async () => {
    try {
      setCameraError("");

      const stream =
        await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });

      cameraStreamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }

      setCameraActive(true);

      const interval =
        window.setInterval(() => {
          analyzeCurrentFrame();
        }, 1000);

      cameraIntervalRef.current =
        interval;
    } catch (error) {
      console.error(error);

      setCameraError(
        "Camera access denied. Please allow camera permission."
      );
    }
  };

  const stopLiveCamera = () => {
    if (cameraIntervalRef.current) {
      window.clearInterval(
        cameraIntervalRef.current
      );

      cameraIntervalRef.current = null;
    }

    if (cameraStreamRef.current) {
      cameraStreamRef.current
        .getTracks()
        .forEach((track) => {
          track.stop();
        });

      cameraStreamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setCameraActive(false);
    setLiveDetections([]);
    setDetectionCount(0);
    setAiStatus("AI Standby");

    previousViolationKeyRef.current = "";
  };

  // --------------------------------------------------
  // LIVE PPE ANALYSIS
  // --------------------------------------------------

  const analyzeCurrentFrame = async () => {
    if (!videoRef.current) return;

    const video = videoRef.current;

    if (
      video.videoWidth === 0 ||
      video.videoHeight === 0
    ) {
      return;
    }

    const canvas =
      canvasRef.current ||
      document.createElement("canvas");

    canvasRef.current = canvas;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const context =
      canvas.getContext("2d");

    if (!context) return;

    context.drawImage(
      video,
      0,
      0,
      canvas.width,
      canvas.height
    );

    canvas.toBlob(
      async (blob) => {
        if (!blob) return;

        try {
          setAiStatus("AI Analyzing...");

          const result =
            await analyzeCameraFrame(blob);

          const workers =
            result?.workers || [];

          setLiveDetections(workers);

          setDetectionCount(
            result?.total_detections ?? 0
          );

          setAiStatus("AI Active");

          // ------------------------------------------
          // PPE VIOLATION DETECTION
          // ------------------------------------------

          const violatingWorkers =
            workers.filter(
              (worker: any) =>
                Array.isArray(
                  worker.violations
                ) &&
                worker.violations.length > 0
            );

          if (
            violatingWorkers.length > 0
          ) {
            const violationKey =
              violatingWorkers
                .map((worker: any) => {
                  const violations =
                    worker.violations
                      .slice()
                      .sort()
                      .join(",");

                  return `${worker.worker_id}:${violations}`;
                })
                .sort()
                .join("|");

            // Siren only when a NEW violation appears
            if (
              violationKey !==
              previousViolationKeyRef.current
            ) {
              previousViolationKeyRef.current =
                violationKey;

              playSafetySiren();

              console.log(
                "🚨 PPE SAFETY VIOLATION:",
                violatingWorkers
              );
            }
          } else {
            // Reset so a future violation
            // can trigger the siren again
            previousViolationKeyRef.current =
              "";
          }
        } catch (error) {
          console.error(error);

          setAiStatus("AI Offline");
        }
      },
      "image/jpeg",
      0.75
    );
  };

  // --------------------------------------------------
  // FIRE / SMOKE
  // --------------------------------------------------

  const handleFireSmokeDetection =
    async (
      event: React.ChangeEvent<HTMLInputElement>
    ) => {
      const file =
        event.target.files?.[0];

      if (!file) return;

      try {
        setFireSmokeLoading(true);
        setFireSmokeError("");

        const result =
          await detectFireSmoke(file);

        setFireSmokeResult(result);

        // Fire / smoke siren
        if (
          result.fire_detected ||
          result.smoke_detected ||
          result.risk_level === "CRITICAL" ||
          result.risk_level === "HIGH"
        ) {
          playSafetySiren();
        }
      } catch (error) {
        console.error(error);

        setFireSmokeError(
          "Fire/Smoke detection failed."
        );
      } finally {
        setFireSmokeLoading(false);
      }
    };

  // --------------------------------------------------
  // UI
  // --------------------------------------------------

  return (
    <>
      <PageHeader
        title="Safety Control Center"
        subtitle="AI-Powered Industrial Safety Intelligence Platform · Plant 01, Pune"
      />

      {/* KPI SECTION */}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
        <Kpi
          label="Workers Detected"
          value={summary.workers_detected}
          icon={Users}
          delta="Live detection"
        />

        <Kpi
          label="PPE Compliance"
          value={summary.compliance_rate}
          decimals={1}
          suffix="%"
          icon={ShieldCheck}
          tone="success"
          delta="Current compliance"
        />

        <Kpi
          label="Active Violations"
          value={summary.violations_today}
          icon={AlertTriangle}
          tone="warning"
          delta="Today"
        />

        <Kpi
          label="Fire Alerts"
          value={summary.fire_smoke_alerts}
          icon={Flame}
          tone="danger"
          delta="Fire / Smoke"
        />

        <Kpi
          label="Risk Score"
          value={34}
          suffix="/100"
          icon={Gauge}
          tone="info"
          delta={summary.risk_level}
        />

        <Kpi
          label="Cameras Online"
          value={5}
          suffix="/6"
          icon={Camera}
          delta="CAM-05 offline"
        />

        {/* MODEL PERFORMANCE */}

        <div className="col-span-2 rounded-xl border border-border bg-card p-4">
          <div className="mb-3">
            <h3 className="text-sm font-semibold">
              AI Model Performance
            </h3>

            <p className="text-xs text-muted-foreground">
              YOLO11s PPE Detection
            </p>
          </div>

          <div className="grid grid-cols-4 gap-3">
            <div className="rounded-lg border bg-background/30 p-3 text-center">
              <p className="text-lg font-semibold">
                82.1%
              </p>
              <p className="text-[10px] text-muted-foreground">
                Precision
              </p>
            </div>

            <div className="rounded-lg border bg-background/30 p-3 text-center">
              <p className="text-lg font-semibold">
                80.2%
              </p>
              <p className="text-[10px] text-muted-foreground">
                Recall
              </p>
            </div>

            <div className="rounded-lg border bg-background/30 p-3 text-center">
              <p className="text-lg font-semibold">
                83.6%
              </p>
              <p className="text-[10px] text-muted-foreground">
                mAP50
              </p>
            </div>

            <div className="rounded-lg border bg-background/30 p-3 text-center">
              <p className="text-lg font-semibold">
                49.3%
              </p>
              <p className="text-[10px] text-muted-foreground">
                mAP50-95
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* LIVE CAMERA + ALERTS */}

      <div className="mt-6 grid gap-6 xl:grid-cols-3">

        {/* LIVE CAMERA */}

        <div className="rounded-2xl border border-border bg-card p-5 xl:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">
                Live Factory Camera
              </h2>

              <p className="text-sm text-muted-foreground">
                Real-time PPE monitoring
              </p>
            </div>

            {!cameraActive ? (
              <button
                onClick={startLiveCamera}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
              >
                Start Live Camera
              </button>
            ) : (
              <button
                onClick={stopLiveCamera}
                className="rounded-lg bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground"
              >
                Stop Camera
              </button>
            )}
          </div>

          {/* CAMERA */}

          <div className="relative aspect-video overflow-hidden rounded-xl bg-black">

            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="h-full w-full object-cover"
            />

            {/* BOUNDING BOXES */}

            {cameraActive &&
              liveDetections.length > 0 && (
                <svg
                  className="pointer-events-none absolute inset-0 h-full w-full"
                  viewBox="0 0 1280 720"
                  preserveAspectRatio="none"
                >
                  {liveDetections.map(
                    (worker: any) => {
                      const bbox =
                        worker.bbox;

                      if (
                        !bbox ||
                        bbox.length !== 4
                      ) {
                        return null;
                      }

                      const [
                        x1,
                        y1,
                        x2,
                        y2,
                      ] = bbox;

                      const width =
                        x2 - x1;

                      const height =
                        y2 - y1;

                      // RED if ANY PPE is missing
                      const hasViolation =
                        Array.isArray(
                          worker.violations
                        ) &&
                        worker.violations
                          .length > 0;

                      const boxColor =
                        hasViolation
                          ? "#ef4444"
                          : "#22c55e";

                      const label =
                        hasViolation
                          ? `${worker.worker_id || "Worker"} · ${worker.compliance_score ?? 0}% · HIGH`
                          : `${worker.worker_id || "Worker"} · ${worker.compliance_score ?? 0}% · SAFE`;

                      return (
                        <g
                          key={
                            worker.worker_id
                          }
                        >
                          {/* Worker box */}

                          <rect
                            x={x1}
                            y={y1}
                            width={width}
                            height={height}
                            fill="transparent"
                            stroke={
                              boxColor
                            }
                            strokeWidth="5"
                            rx="4"
                          />

                          {/* Label background */}

                          <rect
                            x={x1}
                            y={Math.max(
                              0,
                              y1 - 38
                            )}
                            width={
                              hasViolation
                                ? 280
                                : 230
                            }
                            height="34"
                            rx="6"
                            fill={
                              boxColor
                            }
                          />

                          {/* Worker label */}

                          <text
                            x={
                              x1 + 10
                            }
                            y={Math.max(
                              23,
                              y1 - 15
                            )}
                            fill="white"
                            fontSize="18"
                            fontWeight="700"
                          >
                            {label}
                          </text>

                          {/* Missing PPE text */}

                          {hasViolation && (
                            <text
                              x={
                                x1 + 10
                              }
                              y={
                                y2 + 25
                              }
                              fill="#ef4444"
                              fontSize="16"
                              fontWeight="700"
                            >
                              Missing:{" "}
                              {worker.violations.join(
                                ", "
                              )}
                            </text>
                          )}
                        </g>
                      );
                    }
                  )}
                </svg>
              )}

            {/* Offline */}

            {!cameraActive && (
              <div className="absolute inset-0 flex items-center justify-center text-sm text-white">
                Camera is offline
              </div>
            )}

            {/* AI STATUS */}

            {cameraActive && (
              <div className="absolute left-3 top-3 rounded-lg bg-black/70 px-3 py-2 text-xs text-white">
                <span className="mr-2 inline-block h-2 w-2 rounded-full bg-green-400" />
                {aiStatus}
              </div>
            )}

            {/* Worker count */}

            {cameraActive && (
              <div className="absolute right-3 top-3 rounded-lg bg-black/70 px-3 py-2 text-xs text-white">
                Workers:{" "}
                {liveDetections.length}
              </div>
            )}

            {/* PPE ALERT OVERLAY */}

            {cameraActive &&
              liveDetections.some(
                (worker: any) =>
                  Array.isArray(
                    worker.violations
                  ) &&
                  worker.violations.length > 0
              ) && (
                <div className="absolute bottom-3 left-3 right-3 animate-pulse rounded-xl border border-red-500/60 bg-red-950/80 px-4 py-3">
                  <p className="text-sm font-bold text-red-400">
                    🚨 PPE SAFETY VIOLATION
                  </p>

                  <p className="mt-1 text-xs text-white">
                    Missing PPE detected.
                    Safety siren activated.
                  </p>
                </div>
              )}
          </div>

          {cameraError && (
            <p className="mt-3 text-sm text-destructive">
              {cameraError}
            </p>
          )}
        </div>

        {/* ALERT STREAM */}

        <Panel
          title="Alert Stream"
          action={
            <Link
              to="/alerts"
              className="text-xs text-primary hover:underline"
            >
              View all
            </Link>
          }
        >
          <ul className="space-y-3">
            {alerts
              .slice(0, 6)
              .map((a) => {
                const alertType =
                  String(
                    a.type || ""
                  );

                const isPPEViolation =
                  alertType
                    .toUpperCase()
                    .includes("NO-");

                const workerId =
                  a.worker_id ||
                  "Worker";

                return (
                  <li
                    key={a.id}
                    className="rounded-lg border bg-background/30 p-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">

                        <div className="flex items-center gap-2">
                          <span
                            className={`h-2 w-2 rounded-full ${
                              a.severity ===
                              "CRITICAL"
                                ? "bg-red-500"
                                : a.severity ===
                                  "HIGH"
                                ? "bg-orange-500"
                                : "bg-yellow-500"
                            }`}
                          />

                          <p className="truncate text-sm font-semibold">
                            {isPPEViolation
                              ? `PPE Violation · ${workerId}`
                              : alertType}
                          </p>
                        </div>

                        {isPPEViolation && (
                          <p className="mt-1 text-xs text-red-400">
                            Missing:{" "}
                            {alertType}
                          </p>
                        )}

                        <p className="mt-1 font-mono text-[11px] text-muted-foreground">
                          {a.time} ·{" "}
                          {a.camera} ·{" "}
                          {a.location}
                        </p>
                      </div>

                      <SeverityBadge
                        s={a.severity}
                      />
                    </div>
                  </li>
                );
              })}

            {alerts.length === 0 && (
              <li className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
                No active safety alerts
              </li>
            )}
          </ul>
        </Panel>
      </div>

      {/* FIRE / SMOKE */}

      <Panel
        title="🔥 Fire & Smoke Detection"
        className="mt-6"
      >
        <div className="space-y-4">

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">
                YOLO11s Fire + Smoke
              </p>

              <p className="text-xs text-muted-foreground">
                Upload an image for real-time safety analysis
              </p>
            </div>

            <label className="cursor-pointer rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90">
              {fireSmokeLoading
                ? "Analyzing..."
                : "Upload Image"}

              <input
                type="file"
                accept="image/png,image/jpeg,image/jpg"
                className="hidden"
                onChange={
                  handleFireSmokeDetection
                }
              />
            </label>
          </div>

          {fireSmokeError && (
            <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
              {fireSmokeError}
            </div>
          )}

          {fireSmokeResult && (
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">

              <div className="rounded-lg border bg-background/30 p-3 text-center">
                <p className="text-xs text-muted-foreground">
                  Fire
                </p>

                <p
                  className={`mt-1 text-lg font-semibold ${
                    fireSmokeResult.fire_detected
                      ? "text-red-500"
                      : "text-green-500"
                  }`}
                >
                  {fireSmokeResult.fire_detected
                    ? "DETECTED"
                    : "CLEAR"}
                </p>
              </div>

              <div className="rounded-lg border bg-background/30 p-3 text-center">
                <p className="text-xs text-muted-foreground">
                  Smoke
                </p>

                <p
                  className={`mt-1 text-lg font-semibold ${
                    fireSmokeResult.smoke_detected
                      ? "text-orange-500"
                      : "text-green-500"
                  }`}
                >
                  {fireSmokeResult.smoke_detected
                    ? "DETECTED"
                    : "CLEAR"}
                </p>
              </div>

              <div className="rounded-lg border bg-background/30 p-3 text-center">
                <p className="text-xs text-muted-foreground">
                  Risk Level
                </p>

                <p
                  className={`mt-1 text-lg font-semibold ${
                    fireSmokeResult.risk_level ===
                    "CRITICAL"
                      ? "text-red-500"
                      : fireSmokeResult.risk_level ===
                        "HIGH"
                      ? "text-orange-500"
                      : "text-green-500"
                  }`}
                >
                  {
                    fireSmokeResult.risk_level
                  }
                </p>
              </div>

              <div className="rounded-lg border bg-background/30 p-3 text-center">
                <p className="text-xs text-muted-foreground">
                  Confidence
                </p>

                <p className="mt-1 text-lg font-semibold">
                  {fireSmokeResult
                    .detections
                    ?.length
                    ? `${(
                        Math.max(
                          ...fireSmokeResult.detections.map(
                            (d: any) =>
                              d.confidence
                          )
                        ) * 100
                      ).toFixed(1)}%`
                    : "0%"}
                </p>
              </div>
           </div>
         )}
      </div>
    </Panel>
    </>
  );
}